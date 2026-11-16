"""Stage 6 - hood + shoulder mantle (cloth).

Reference: the poster / cinematic stills - a deep hood of heavy dark fabric whose
peak projects past the mask (face in shadow), continuing into a mantle that
drapes over the shoulders and falls down the front, framing the chest plate.

1. parametric quad surface: horizontal rings (crown -> head -> neck -> mantle)
   open at the front, spline-interpolated profile
2. pre-pass: push any vertex that starts inside/near the colliders outward
3. cloth simulation (pin ramp: crown/back pinned, face sides + mantle free) with
   the undersuit, cowl and a decimated mask proxy as colliders, 50 frames
4. freeze the settled drape, give it thickness, copy skin weights from the
   nearest cowl/suit vertex so it follows the rig; the Cloth modifier stays on
   the object (disabled) for re-simulation in a pose
Output: work/doom_v006.blend + renders/s06_*.png
"""
import sys, os, json, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.interpolate import CubicSpline
import bpy, bmesh
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree
import doomlib as L

L.open_version(5)
sc = bpy.context.scene
rig = bpy.data.objects["DOOM_rig"]
suit = bpy.data.objects["DOOM_undersuit"]
cowl = bpy.data.objects["DOOM_cowl"]
mask = bpy.data.objects["DOOM_mask"]

# ------------------------------------------------------------ profile rings
#        z      rx     ry     cy    theta_max(deg, 180 = front centre)
P = np.array([
    [1.995, 0.010, 0.020, -0.075, 120],
    [1.980, 0.090, 0.120, -0.075, 140],
    [1.945, 0.132, 0.172, -0.062, 150],
    [1.890, 0.150, 0.190, -0.050, 152],
    [1.830, 0.156, 0.196, -0.040, 150],
    [1.770, 0.156, 0.190, -0.030, 148],
    [1.710, 0.150, 0.180, -0.020, 150],
    [1.650, 0.146, 0.166, -0.010, 156],
    [1.600, 0.165, 0.165, 0.000, 160],
    [1.560, 0.225, 0.185, 0.000, 158],
    [1.520, 0.295, 0.215, 0.005, 156],
    [1.470, 0.335, 0.235, 0.010, 155],
    [1.400, 0.355, 0.245, 0.010, 155],
    [1.320, 0.365, 0.255, 0.010, 155],
])
NV, NU = 46, 76
k = np.arange(len(P))
spl = CubicSpline(k, P, axis=0, bc_type="natural")
rings = spl(np.linspace(0, len(P) - 1, NV))
verts, uvs = [], []
for j, (z, rx, ry, cy, tmax) in enumerate(rings):
    for i in range(NU):
        t = math.radians(-tmax + 2 * tmax * i / (NU - 1))
        verts.append((rx * math.sin(t), cy + ry * math.cos(t), z))
faces = [(j * NU + i, j * NU + i + 1, (j + 1) * NU + i + 1, (j + 1) * NU + i)
         for j in range(NV - 1) for i in range(NU - 1)]
me = bpy.data.meshes.new("DOOM_hood")
me.from_pydata(verts, [], faces); me.update()
uvl = me.uv_layers.new(name="UVMap")
for p in me.polygons:
    for li, vi in zip(p.loop_indices, p.vertices):
        uvl.data[li].uv = ((vi % NU) / (NU - 1) * 2.4, 1 - (vi // NU) / (NV - 1) * 1.6)
hood = bpy.data.objects.new("DOOM_hood", me)
bpy.data.collections["CLOTH"].objects.link(hood)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
# outward = normals pointing away from the head axis
c = Vector((0, -0.03, 1.75))
out = sum(1 for f in bm.faces if (f.calc_center_median() - c).dot(f.normal) > 0)
if out < len(bm.faces) / 2:
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True

# ------------------------------------------------------------ colliders
dg = bpy.context.evaluated_depsgraph_get()
def bvh_eval(ob):
    e = ob.evaluated_get(dg); m = e.to_mesh()
    bm2 = bmesh.new(); bm2.from_mesh(m); bm2.transform(ob.matrix_world)
    t = BVHTree.FromBMesh(bm2); bm2.free(); e.to_mesh_clear(); return t
proxy = mask.copy(); proxy.data = mask.data.copy(); proxy.name = "COL_mask_proxy"
proxy.modifiers.clear()
bpy.data.collections["HELPERS"].objects.link(proxy)
proxy.matrix_world = mask.matrix_world.copy(); proxy.parent = None
d = proxy.modifiers.new("Dec", "DECIMATE"); d.ratio = 0.05
dg.update()
trees = [bvh_eval(o) for o in (suit, cowl, proxy)]

# pre-pass: nothing may start inside or closer than 12 mm to a collider
bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
pushed = 0
for it in range(3):
    for v in bm.verts:
        for t in trees:
            loc, nrm, idx, dist = t.find_nearest(v.co, 0.05)
            if loc is None: continue
            sd = (v.co - loc).dot(nrm)
            if sd < 0.012:
                v.co = loc + nrm * 0.012; pushed += 1
    bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.3,
                          use_axis_x=True, use_axis_y=True, use_axis_z=True)
bm.to_mesh(me); bm.free()
print("PREPASS pushed", pushed)

for o in (suit, cowl, proxy):
    col = o.modifiers.new("Collision", "COLLISION")
    o.collision.thickness_outer = 0.004
    o.collision.cloth_friction = 8.0
proxy.hide_render = True

# ------------------------------------------------------------ pin ramp
pin = hood.vertex_groups.new(name="pin")
for v in me.vertices:
    z = v.co.z
    back = (v.co.y + 0.03) > 0.0  # behind the ear line
    w = min(1.0, max(0.0, (z - 1.64) / (1.82 - 1.64)))
    if back and z > 1.70: w = 1.0
    pin.add([v.index], w, "REPLACE")

# ------------------------------------------------------------ cloth sim
cl = hood.modifiers.new("Cloth", "CLOTH")
s = cl.settings
s.quality = 8
s.mass = 0.45
s.tension_stiffness = s.compression_stiffness = 35
s.shear_stiffness = 12
s.bending_stiffness = 1.2
s.air_damping = 2.0
s.vertex_group_mass = "pin"
s.pin_stiffness = 2.0
cs = cl.collision_settings
cs.distance_min = 0.005
cs.use_self_collision = True
cs.self_distance_min = 0.003
cs.collision_quality = 4
FRAMES = 50
cl.point_cache.frame_start, cl.point_cache.frame_end = 1, FRAMES
sc.frame_start, sc.frame_end = 1, FRAMES
t0 = time.time()
for f in range(1, FRAMES + 1):
    sc.frame_set(f)
print("CLOTH %d frames %.1fs" % (FRAMES, time.time() - t0))

# freeze the settled drape
dg = bpy.context.evaluated_depsgraph_get()
settled = bpy.data.meshes.new_from_object(hood.evaluated_get(dg))
co = np.array([v.co[:] for v in settled.vertices])
print("DRAPE bbox", co.min(0).round(3), co.max(0).round(3), "nan", bool(np.isnan(co).any()))
for v, p in zip(me.vertices, settled.vertices):
    v.co = p.co
bpy.data.meshes.remove(settled)
sc.frame_set(1)
cl.show_viewport = False; cl.show_render = False  # kept configured for re-sim in a pose

# penetration check after settling
dg = bpy.context.evaluated_depsgraph_get()
pen = 0
for v in me.vertices:
    for t in trees[:2]:
        loc, nrm, idx, dist = t.find_nearest(v.co, 0.03)
        if loc is not None and (v.co - loc).dot(nrm) < 0.0:
            pen += 1; break
print("PENETRATING verts", pen, "of", len(me.vertices))

# ------------------------------------------------------------ thickness, hem, rig
sol = hood.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = 0.005; sol.offset = -1.0
sol.use_rim = True
sub = hood.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 1, 2
src = []
for o in (cowl, suit):
    for v in o.data.vertices:
        src.append((o, v))
kd = kdtree.KDTree(len(src))
for n, (o, v) in enumerate(src): kd.insert(o.matrix_world @ v.co, n)
kd.balance()
groups = {}
for v in me.vertices:
    near = kd.find_n(v.co, 4)
    acc = {}
    for _, n, dist in near:
        o, sv = src[n]
        w0 = 1.0 / max(dist, 1e-4)
        for g in sv.groups:
            nm = o.vertex_groups[g.group].name
            acc[nm] = acc.get(nm, 0) + g.weight * w0
    tot = sum(acc.values())
    for nm, w in acc.items():
        if nm not in groups: groups[nm] = hood.vertex_groups.new(name=nm)
        groups[nm].add([v.index], w / tot, "REPLACE")
arm = hood.modifiers.new("Armature", "ARMATURE"); arm.object = rig
hood.modifiers.move(hood.modifiers.find("Armature"), 0)
hood.parent = rig

# ------------------------------------------------------------ material
m = bpy.data.materials.new("MAT_hood_heavy_wool")
n, l = m.node_tree.nodes, m.node_tree.links
b = n["Principled BSDF"]
tc = n.new("ShaderNodeTexCoord"); mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (260, 260, 260)
l.new(tc.outputs["UV"], mp.inputs["Vector"])
w1 = n.new("ShaderNodeTexWave"); w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 1.0
w2 = n.new("ShaderNodeTexWave"); w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 1.0
l.new(mp.outputs["Vector"], w1.inputs["Vector"]); l.new(mp.outputs["Vector"], w2.inputs["Vector"])
mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
l.new(w1.outputs["Fac"], mx.inputs[0]); l.new(w2.outputs["Fac"], mx.inputs[1])
noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 30; noise.inputs["Detail"].default_value = 10
l.new(tc.outputs["UV"], noise.inputs["Vector"])
mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
A = next(x for x in mix.inputs if x.name == "A" and x.type == "RGBA"); B = next(x for x in mix.inputs if x.name == "B" and x.type == "RGBA")
A.default_value = (0.0045, 0.0075, 0.0055, 1); B.default_value = (0.009, 0.015, 0.010, 1)
l.new(noise.outputs["Fac"], mix.inputs["Factor"])
l.new(next(x for x in mix.outputs if x.name == "Result" and x.type == "RGBA"), b.inputs["Base Color"])
b.inputs["Roughness"].default_value = 0.92
b.inputs["Sheen Weight"].default_value = 0.45; b.inputs["Sheen Roughness"].default_value = 0.35
b.inputs["Sheen Tint"].default_value = (0.10, 0.17, 0.11, 1)
bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.2; bump.inputs["Distance"].default_value = 0.0006
l.new(mx.outputs["Value"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
me.materials.append(m)

# ------------------------------------------------------------ inspection
print("HOOD", json.dumps(L.mesh_report(hood)))
for o in bpy.data.collections["REF"].objects: o.hide_render = True
paths, labels = [], []
for cam, lab in (("CAM_front", "front"), ("CAM_side", "side"), ("CAM_34", "3/4"), ("CAM_back", "back")):
    paths.append(L.render_view(cam, "s06_hood_%s.png" % cam[4:], res=(460, 700), samples=40)); labels.append(lab)
L.contact_sheet(paths, labels, "s06_hood_sheet.jpg")
cm = bpy.data.objects["CAM_mask"]; th = bpy.data.objects["TGT_head"]
shots = []
for name, off in (("front", (0.0, -1.05, -0.05)), ("34", (0.6, -0.85, 0.0)), ("low", (0.25, -0.9, -0.35))):
    cm.location = th.location + Vector(off)
    shots.append(L.render_view("CAM_mask", "s06_hood_close_%s.png" % name, res=(540, 640), samples=48))
L.contact_sheet(shots, ["close front", "close 3/4", "low angle (ref 2)"], "s06_hood_close.jpg")
L.save_version(6, "Stage 6 hood + mantle: parametric quad hood, cloth-sim drape, thickness, rig weights, heavy wool shader")
