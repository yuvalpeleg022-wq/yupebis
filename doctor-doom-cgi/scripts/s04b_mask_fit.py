"""Stage 4b - fit the AI mask to the rigged head.

1. import GLB, rotate to face -Y, decimate 1.9M -> ~380k tris (hero asset)
2. find the mask's eye openings by ray-casting its silhouette (holes inside it)
3. scale so the eye openings match the body's eye spacing, place them on the
   eyes, then push forward until no face vertex pokes through (>= 4 mm gap)
4. look-dev: keep the generated PBR maps, add procedural micro-scratches and
   roughness breakup on top
5. parent to the head deform bone, render close-ups next to the reference
Output: work/doom_v004.blend + renders/s04b_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import doomlib as L

GLB = os.path.join(L.ASSETS, "ai_mask", "doom_mask_prism31.glb")
L.open_version(3)
sc = bpy.context.scene
J = json.load(open(os.path.join(L.WORK, "joints_v002.json")))
rig = bpy.data.objects["DOOM_rig"]
body = bpy.data.objects["DOOM_body"]

# ------------------------------------------------------------------ import
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=GLB)
mask = [o for o in bpy.data.objects if o not in before and o.type == "MESH"][0]
for o in [o for o in bpy.data.objects if o not in before and o is not mask]:
    bpy.data.objects.remove(o)
mask.name = "DOOM_mask"
mask.data.name = "DOOM_mask"
L.move_to(mask, bpy.data.collections["MASK"])
mask.parent = None
mask.matrix_world = Matrix.Rotation(math.radians(-90), 4, "Z") @ mask.matrix_world
bpy.context.view_layer.update()
mask.data.transform(mask.matrix_world); mask.matrix_world = Matrix.Identity(4)

dec = mask.modifiers.new("Decimate", "DECIMATE"); dec.ratio = 0.2
dg = bpy.context.evaluated_depsgraph_get()
me = bpy.data.meshes.new_from_object(mask.evaluated_get(dg))
old = mask.data; mask.modifiers.clear(); mask.data = me; me.name = "DOOM_mask"
bpy.data.meshes.remove(old)
for p in mask.data.polygons: p.use_smooth = True
print("DECIMATED", L.mesh_report(mask))

# ------------------------------------------------------------- eye openings
def bvh_of(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.transform(ob.matrix_world)
    t = BVHTree.FromBMesh(bm); bm.free(); return t
co = np.array([v.co[:] for v in mask.data.vertices])
mn, mx = co.min(0), co.max(0)
tree = bvh_of(mask)
step = (mx[0] - mn[0]) / 200
xs = np.arange(mn[0], mx[0], step); zs = np.arange(mn[2], mx[2], step)
hit = np.zeros((len(zs), len(xs)), bool)
for i, z in enumerate(zs):
    for k, x in enumerate(xs):
        hit[i, k] = tree.ray_cast(Vector((x, mn[1] - 1, z)), Vector((0, 1, 0)))[0] is not None
holes = ndimage.binary_fill_holes(hit) & ~hit
lab, n = ndimage.label(holes)
comps = []
for c in range(1, n + 1):
    ii, kk = np.nonzero(lab == c)
    comps.append((len(ii), float(xs[kk].mean()), float(zs[ii].mean())))
upper = sorted([c for c in comps if c[2] > (mn[2] + mx[2]) / 2], reverse=True)[:2]
upper.sort(key=lambda c: c[1])
print("HOLES total=%d upper=%s" % (n, [(a, round(b, 3), round(c, 3)) for a, b, c in upper]))
(_, exR, ezR), (_, exL, ezL) = upper  # -X is the character's right
mask_eye_dist = exL - exR
mask_eye_mid = Vector(((exL + exR) / 2, 0, (ezL + ezR) / 2))

eyeL, eyeR = Vector(J["l-eye"]), Vector(J["r-eye"])
eye_mid = (eyeL + eyeR) / 2
print("EYES body_dist=%.4f mask_hole_dist(units)=%.4f" % ((eyeL - eyeR).length, mask_eye_dist))

# face region of the (rest-pose) body: front half of the head, brow to chin
dg = bpy.context.evaluated_depsgraph_get()
bme = body.evaluated_get(dg).to_mesh()
bco = np.array([v.co[:] for v in bme.vertices]); body.evaluated_get(dg).to_mesh_clear()
face = bco[(bco[:, 2] > eye_mid.z - 0.14) & (bco[:, 2] < eye_mid.z + 0.09) &
           (np.abs(bco[:, 0]) < 0.085) & (bco[:, 1] < eye_mid.y + 0.04)]
tris = [p.vertices[:] for p in mask.data.loop_triangles] if mask.data.loop_triangles else None
mask.data.calc_loop_triangles()
tris = [t.vertices[:] for t in mask.data.loop_triangles]
mco0 = np.array([v.co[:] for v in mask.data.vertices])

def place(s, dy):
    return (mco0 - np.array(mask_eye_mid)) * s + np.array(eye_mid) + np.array((0, dy, 0))

def clearance(coords):
    t = BVHTree.FromPolygons(coords.tolist(), tris)
    pokes, gaps = [], []
    for v in face:
        v = Vector(v)
        f = t.ray_cast(v, Vector((0, -1, 0)), 0.25)
        b = t.ray_cast(v, Vector((0, 1, 0)), 0.04)
        if b[0] is not None and (f[0] is None or b[3] < f[3]):
            pokes.append(b[3])
        elif f[0] is not None:
            gaps.append(f[3])
    return pokes, gaps

def fit(s):
    dy = 0.0
    for _ in range(8):
        pokes, gaps = clearance(place(s, dy))
        if pokes:
            dy -= max(pokes) + 0.004
        elif gaps and min(gaps) > 0.010:
            dy += min(gaps) - 0.005
        else:
            break
    return dy, pokes, gaps

H = mx[2] - mn[2]
results = []
for height in (0.23, 0.245, 0.26, 0.275, 0.29, 0.305):
    s = height / H
    dy, pokes, gaps = fit(s)
    med = float(np.median(gaps)) if gaps else 1.0
    cover = len(gaps) / len(face)
    results.append((med, height, s, dy, len(pokes), cover))
    print("FIT height=%.3f s=%.4f push_mm=%.1f pokes=%d covered=%.0f%% median_gap_mm=%.1f p90_gap_mm=%.1f" %
          (height, s, -dy * 1000, len(pokes), 100 * cover, med * 1000, 1000 * float(np.percentile(gaps, 90)) if gaps else 0))
ok = [r for r in results if r[4] == 0 and r[5] > 0.55]
med, height, s, dy, _, cover = min(ok or results)
print("CHOSEN height=%.3f s=%.4f push_mm=%.1f median_gap_mm=%.1f covered=%.0f%%" % (height, s, -dy * 1000, med * 1000, 100 * cover))
for v, c in zip(mask.data.vertices, place(s, dy)):
    v.co = c
mask.data.update()

# origin at the eye midpoint, smooth shading
mco = np.array([v.co[:] for v in mask.data.vertices])
print("MASK_FIT size_m=%s eyes_z=%.3f" % (tuple(np.round(mco.max(0) - mco.min(0), 3)), eye_mid.z))

# --------------------------------------------------------------- look-dev
mat = mask.data.materials[0]; mat.name = "MAT_mask_aged_steel"
nt = mat.node_tree; nodes, links = nt.nodes, nt.links
bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
nmap = next((n for n in nodes if n.type == "NORMAL_MAP"), None)
tc = nodes.new("ShaderNodeTexCoord")
mapping = nodes.new("ShaderNodeMapping"); mapping.inputs["Scale"].default_value = (60, 60, 60)
links.new(tc.outputs["Object"], mapping.inputs["Vector"])
scr = nodes.new("ShaderNodeTexWave"); scr.wave_type = "BANDS"; scr.inputs["Scale"].default_value = 3.0
scr.inputs["Distortion"].default_value = 18.0; scr.inputs["Detail"].default_value = 6
links.new(mapping.outputs["Vector"], scr.inputs["Vector"])
ramp = nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].position = 0.92; ramp.color_ramp.elements[1].position = 0.97
links.new(scr.outputs["Fac"], ramp.inputs["Fac"])
noise = nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 140; noise.inputs["Detail"].default_value = 10
links.new(tc.outputs["Object"], noise.inputs["Vector"])
mixh = nodes.new("ShaderNodeMath"); mixh.operation = "MULTIPLY_ADD"
links.new(ramp.outputs["Color"], mixh.inputs[0]); mixh.inputs[1].default_value = 1.0
mixh.inputs[2].default_value = 0.0
links.new(noise.outputs["Fac"], mixh.inputs[2]) if False else None
bump = nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0004
links.new(mixh.outputs[0], bump.inputs["Height"])
if nmap:
    links.new(nmap.outputs["Normal"], bump.inputs["Normal"])
links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
bump2 = nodes.new("ShaderNodeBump"); bump2.inputs["Strength"].default_value = 0.08; bump2.inputs["Distance"].default_value = 0.0002
links.new(noise.outputs["Fac"], bump2.inputs["Height"]); links.new(bump.outputs["Normal"], bump2.inputs["Normal"])
links.new(bump2.outputs["Normal"], bsdf.inputs["Normal"])
# roughness breakup: existing roughness * (0.8..1.2 noise), scratches shinier
rlink = next((l for l in links if l.to_socket == bsdf.inputs["Roughness"]), None)
rmul = nodes.new("ShaderNodeMath"); rmul.operation = "MULTIPLY"
rn = nodes.new("ShaderNodeMapRange"); rn.inputs["To Min"].default_value = 0.8; rn.inputs["To Max"].default_value = 1.2
links.new(noise.outputs["Fac"], rn.inputs["Value"]); links.new(rn.outputs["Result"], rmul.inputs[1])
if rlink:
    links.new(rlink.from_socket, rmul.inputs[0])
else:
    rmul.inputs[0].default_value = bsdf.inputs["Roughness"].default_value
rsub = nodes.new("ShaderNodeMath"); rsub.operation = "SUBTRACT"; rsub.use_clamp = True
links.new(rmul.outputs[0], rsub.inputs[0]); links.new(ramp.outputs["Color"], rsub.inputs[1])
links.new(rsub.outputs[0], bsdf.inputs["Roughness"])
print("LOOKDEV nodes=%d normal_map=%s roughness_linked=%s" % (len(nodes), bool(nmap), bool(rlink)))

# ----------------------------------------------------------------- rigging
wm = mask.matrix_world.copy()
mask.parent = rig; mask.parent_type = "BONE"; mask.parent_bone = "DEF-spine.006"
bpy.context.view_layer.update()
mask.matrix_world = wm
bpy.context.view_layer.update()

# ------------------------------------------------------------------ renders
tgt = bpy.data.objects["TGT_head"]; tgt.location = (0, eye_mid.y - 0.03, eye_mid.z - 0.03)
cam = bpy.data.objects["CAM_mask"]
paths, labels = [], []
for name, off in (("front", (0.0, -1.25, 0.02)), ("34", (0.75, -1.0, 0.08)), ("side", (1.2, -0.05, 0.02))):
    cam.location = tgt.location + Vector(off)
    paths.append(L.render_view("CAM_mask", "s04b_mask_%s.png" % name, res=(540, 640), samples=48)); labels.append("mask " + name)
cam.location = tgt.location + Vector((0.18, -1.15, 0.02))
L.contact_sheet(paths, labels, "s04b_mask_sheet.jpg")
L.save_version(4, "Stage 4 mask: AI base (Prism 3.1) decimated, eye-aligned, clearance-checked, aged-steel look-dev, head-bone parented")
