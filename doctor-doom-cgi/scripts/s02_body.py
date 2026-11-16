"""Stage 2 - anatomical body.

MakeHuman / MPFB2 base mesh (CC0) + MakeHuman macro targets (CC0) blended with
MakeHuman's own macro-weight formulas: adult male, high muscle, tall, ideal
proportions, plus regional targets (V-shape torso, shoulders, neck, arms).
Keeps the original vertex index in the `mh_index` attribute so MPFB rig
weights can be mapped later. Joint helper centroids become empties for rigging.
Output: work/doom_v002.blend + renders/s02_body_*.png
"""
import sys, os, gzip, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from mathutils import Vector, kdtree
import doomlib as L

TARGET_HEIGHT = 1.90  # metres, bare-foot body
MACRO = dict(gender=1.0, age=0.6, muscle=1.0, weight=0.68, height=0.7,
             proportions=1.0, race={"caucasian": 1.0})
REGIONAL = {
    # heavy, broad upper body
    "torso/torso-vshape-incr": 0.6,
    "torso/measure-shoulder-dist-incr": 0.5,
    "torso/measure-bust-circ-incr": 0.45,
    "torso/measure-frontchest-dist-incr": 0.3,
    "torso/torso-muscle-pectoral-incr": 0.6,
    "torso/torso-muscle-dorsi-incr": 0.6,
    "torso/torso-scale-depth-incr": 0.25,
    "neck/measure-neck-circ-incr": 0.6,
    "stomach/stomach-tone-incr": 0.4,
    # narrower, less curved hips
    "hip/hip-scale-horiz-decr": 0.35,
    "torso/measure-hips-circ-decr": 0.3,
    "buttocks/buttocks-volume-decr": 0.45,
    # limbs
    "arms/l-upperarm-muscle-incr": 0.7, "arms/r-upperarm-muscle-incr": 0.7,
    "arms/l-upperarm-shoulder-muscle-incr": 0.7, "arms/r-upperarm-shoulder-muscle-incr": 0.7,
    "arms/l-upperarm-scale-horiz-incr": 0.35, "arms/r-upperarm-scale-horiz-incr": 0.35,
    "arms/l-upperarm-scale-depth-incr": 0.35, "arms/r-upperarm-scale-depth-incr": 0.35,
    "arms/l-lowerarm-muscle-incr": 0.6, "arms/r-lowerarm-muscle-incr": 0.6,
    "arms/l-lowerarm-scale-horiz-incr": 0.3, "arms/r-lowerarm-scale-horiz-incr": 0.3,
    "legs/l-upperleg-muscle-incr": 0.5, "legs/r-upperleg-muscle-incr": 0.5,
    "legs/l-upperleg-scale-horiz-incr": 0.2, "legs/r-upperleg-scale-horiz-incr": 0.2,
    "legs/l-lowerleg-muscle-incr": 0.5, "legs/r-lowerleg-muscle-incr": 0.5,
}
TDIR = os.path.join(L.MPFB, "targets")

# ------------------------------------------------------------ parse base.obj
verts, uvs, faces, fuv, fgroup = [], [], [], [], []
group_names, gid = [], -1
for line in open(os.path.join(L.MPFB, "3dobjs", "base.obj")):
    if line.startswith("v "):
        verts.append([float(x) for x in line.split()[1:4]])
    elif line.startswith("vt "):
        uvs.append([float(x) for x in line.split()[1:3]])
    elif line.startswith("g "):
        name = line[2:].strip()
        if name not in group_names:
            group_names.append(name)
        gid = group_names.index(name)
    elif line.startswith("f "):
        vi, ti = [], []
        for tok in line.split()[1:]:
            p = tok.split("/")
            vi.append(int(p[0]) - 1)
            ti.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
        faces.append(vi); fuv.append(ti); fgroup.append(gid)
V = np.array(verts, dtype=np.float64)
print("BASE verts=%d faces=%d groups=%d" % (len(V), len(faces), len(group_names)))

# ------------------------------------------------------------ targets
def load_target(rel):
    path = os.path.join(TDIR, rel + ".target.gz")
    if not os.path.exists(path):
        return None
    idx, off = [], []
    with gzip.open(path, "rt") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln or ln.startswith("#"):
                continue
            p = ln.split()
            idx.append(int(p[0])); off.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(off, dtype=np.float64).reshape(-1, 3)

applied, missing = [], []
def apply(rel, w):
    if w <= 1e-6:
        return
    t = load_target(rel)
    if t is None:
        missing.append(rel); return
    V[t[0]] += t[1] * w
    applied.append((rel, round(w, 3)))

def split3(v, lo, mid, hi):
    if v < 0.5:
        a = max(0.0, 1 - v * 2); return {lo: a, mid: 1 - a}
    a = max(0.0, v * 2 - 1); return {hi: a, mid: 1 - a}

g = MACRO["gender"]; gw = {"female": 1 - g, "male": g}
a = MACRO["age"]
if a < 0.5:
    young = max(0.0, (a - 0.1875) * 3.2)
    aw = {"baby": max(0.0, 1 - a * 5.333), "young": young,
          "child": max(0.0, min(1.0, 5.333 * a) - young), "old": 0.0}
else:
    old = max(0.0, a * 2 - 1); aw = {"old": old, "young": 1 - old}
mw = split3(MACRO["muscle"], "minmuscle", "averagemuscle", "maxmuscle")
ww = split3(MACRO["weight"], "minweight", "averageweight", "maxweight")
h = MACRO["height"]; hw = {"minheight": max(0.0, 1 - h * 2)} if h < 0.5 else {"maxheight": max(0.0, h * 2 - 1)}
p = MACRO["proportions"]; pw = {"uncommonproportions": max(0.0, 1 - p * 2)} if p < 0.5 else {"idealproportions": max(0.0, p * 2 - 1)}

for gk, gv in gw.items():
    for ak, av in aw.items():
        if gv * av <= 0: continue
        for rk, rv in MACRO["race"].items():
            apply("macrodetails/%s-%s-%s" % (rk, gk, ak), rv * gv * av)
        for mk, mv in mw.items():
            for wk, wv in ww.items():
                base = gv * av * mv * wv
                if base <= 0: continue
                apply("macrodetails/universal-%s-%s-%s-%s" % (gk, ak, mk, wk), base)
                for hk, hv in hw.items():
                    apply("macrodetails/height/%s-%s-%s-%s-%s" % (gk, ak, mk, wk, hk), base * hv)
                for pk, pv in pw.items():
                    apply("macrodetails/proportions/%s-%s-%s-%s-%s" % (gk, ak, mk, wk, pk), base * pv)
for rel, w in REGIONAL.items():
    apply(rel, w)
print("TARGETS applied=%d missing=%d" % (len(applied), len(missing)))
for m in missing: print("  MISSING", m)

# ------------------------------------------------------------ to Blender space
# OBJ is Y-up, decimetres, facing +Z  ->  Blender Z-up metres facing -Y
B = np.stack([V[:, 0], -V[:, 2], V[:, 1]], axis=1) * 0.1
gi = {n: i for i, n in enumerate(group_names)}
body_faces = [i for i, gg in enumerate(fgroup) if gg == gi["body"]]
body_vid = sorted({v for i in body_faces for v in faces[i]})
zmin, zmax = B[body_vid, 2].min(), B[body_vid, 2].max()
s = TARGET_HEIGHT / (zmax - zmin)
B[:, 2] -= zmin
B *= s
print("HEIGHT raw=%.3f m scale=%.4f -> %.3f m" % (zmax - zmin, s, TARGET_HEIGHT))

# ------------------------------------------------------------ build objects
L.open_version(1)

def build(name, group_list, col):
    sel = [i for i, gg in enumerate(fgroup) if group_names[gg] in group_list]
    vid = sorted({v for i in sel for v in faces[i]})
    remap = {v: k for k, v in enumerate(vid)}
    me = bpy.data.meshes.new(name)
    me.from_pydata(B[vid].tolist(), [], [[remap[v] for v in faces[i]] for i in sel])
    me.update()
    uvl = me.uv_layers.new(name="UVMap")
    li = 0
    for i in sel:
        for t in fuv[i]:
            uvl.data[li].uv = uvs[t] if t >= 0 else (0, 0)
            li += 1
    attr = me.attributes.new("mh_index", "INT", "POINT")
    attr.data.foreach_set("value", vid)
    me.shade_smooth() if hasattr(me, "shade_smooth") else None
    for poly in me.polygons:
        poly.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    return ob

body = build("DOOM_body", ["body"], bpy.data.collections["BODY"])
eyes = build("DOOM_eyes", ["helper-l-eye", "helper-r-eye"], bpy.data.collections["BODY"])
tights = build("HLP_tights", ["helper-tights"], bpy.data.collections["HELPERS"])
for ob, lv in ((body, 2), (eyes, 2)):
    m = ob.modifiers.new("Subdivision", "SUBSURF")
    m.levels, m.render_levels = 1, lv

# joint centroids -> empties (rig placement reference)
rigref = L.collection("RIG_REF", bpy.data.collections["HELPERS"])
joints = {}
for name, idx in gi.items():
    if not name.startswith("joint-"):
        continue
    vid = sorted({v for i, gg in enumerate(fgroup) if gg == idx for v in faces[i]})
    c = B[vid].mean(axis=0)
    e = bpy.data.objects.new("J_" + name[6:], None)
    e.location = c.tolist(); e.empty_display_size = 0.02
    rigref.objects.link(e)
    joints[name[6:]] = [round(float(x), 4) for x in c]
json.dump(joints, open(os.path.join(L.WORK, "joints_v002.json"), "w"), indent=0)
np.save(os.path.join(L.WORK, "basemesh_v002.npy"), B)  # all 19158 deformed verts, Blender space

# materials (placeholders; real look-dev is a later stage)
def mat(name, color, rough, sss=0.0, metal=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
        b.inputs["Subsurface Scale"].default_value = 0.01
    return m
body.data.materials.append(mat("MAT_skin_placeholder", (0.62, 0.48, 0.42, 1), 0.48, sss=0.2))
eyes.data.materials.append(mat("MAT_eye_placeholder", (0.05, 0.05, 0.05, 1), 0.05))

# ------------------------------------------------------------ inspection
rep = L.mesh_report(body)
co = np.array([v.co[:] for v in body.data.vertices])
kd = kdtree.KDTree(len(co))
for i, c in enumerate(co): kd.insert(c, i)
kd.balance()
mirror_err = max(kd.find((-c[0], c[1], c[2]))[2] for c in co)
def dist(a, b): return round(float(np.linalg.norm(np.array(joints[a]) - np.array(joints[b]))), 3)
rep.update({
    "mirror_max_err_mm": round(mirror_err * 1000, 2),
    "shoulder_width_m(joint)": dist("l-shoulder", "r-shoulder") if "l-shoulder" in joints else None,
    "body_width_m": round(float(co[:, 0].max() - co[:, 0].min()), 3),
    "head_top_z": round(float(co[:, 2].max()), 3),
    "joints": len(joints),
    "eyes_verts": len(eyes.data.vertices),
})
print("REPORT " + json.dumps(rep))
print("JOINT_NAMES", sorted(joints)[:60])

# ------------------------------------------------------------ previews
for ob in bpy.data.collections["REF"].objects: ob.hide_render = True
shots = [("CAM_front", "front"), ("CAM_side", "side"), ("CAM_34", "3/4")]
paths = [L.render_view(c, "s02_body_%s.png" % c[4:], res=(500, 760), samples=32) for c, _ in shots]
L.contact_sheet(paths, [l for _, l in shots], "s02_body_sheet.jpg")
L.save_version(2, "Stage 2 body: MakeHuman base + macro/regional targets, 1.90 m, joints, eyes")
