"""Stage 6 - cloth: long cape + deep hood with shoulder mantle.

Reference (poster / cinematic still): a deep hood of heavy dark fabric whose
peak projects past the mask (face in shadow); it continues into a mantle that
covers the shoulders and falls down the front, framing the chest plate; a
long cape hangs from the shoulders to the ground behind.

Cloth is simulated in the presentation pose (doomlib.hero_pose: arms at the
sides, fists), as productions simulate per shot. Order:
  1. cape: parametric flared panel pinned along the upper back -> 70 frames
  2. hood + mantle: parametric rings (closed crown, face window, flared mantle)
     pinned on the head, free mantle -> 55 frames, colliding with the cape too
Each settled drape is frozen into the mesh (it is pose-specific); the Cloth
modifier stays configured on the object (disabled) to re-simulate in another
pose. Colliders use un-subdivided meshes for speed.
Output: work/doom_v006.blend + renders/s06_*.png
"""
import sys, os, json, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.interpolate import CubicSpline
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import doomlib as L

L.open_version(5)
sc = bpy.context.scene
rig = bpy.data.objects["DOOM_rig"]
L.hero_pose(rig)
suit = bpy.data.objects["DOOM_undersuit"]
cowl = bpy.data.objects["DOOM_cowl"]
mask = bpy.data.objects["DOOM_mask"]
boots = bpy.data.objects["DOOM_boots"]
gloves = bpy.data.objects["DOOM_gloves"]
CLOTH = bpy.data.collections["CLOTH"]

# ------------------------------------------------------------ colliders
proxy = mask.copy(); proxy.data = mask.data.copy(); proxy.name = "COL_mask_proxy"
proxy.modifiers.clear(); proxy.parent = None
bpy.data.collections["HELPERS"].objects.link(proxy)
proxy.matrix_world = mask.matrix_world.copy()
proxy.modifiers.new("Dec", "DECIMATE").ratio = 0.05
proxy.hide_render = True
colliders = [suit, cowl, boots, gloves, proxy]
for o in colliders:
    o.modifiers.new("Collision", "COLLISION")
    i = o.modifiers.find("Subdivision")
    if i >= 0:
        o.modifiers.move(o.modifiers.find("Collision"), i)   # collide before subdivision
    o.collision.thickness_outer = 0.005
    o.collision.cloth_friction = 10.0

def trees():
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for o in colliders + [x for x in CLOTH.objects]:
        e = o.evaluated_get(dg); m = e.to_mesh()
        b = bmesh.new(); b.from_mesh(m); b.transform(o.matrix_world)
        out.append(BVHTree.FromBMesh(b)); b.free(); e.to_mesh_clear()
    return out

def wool():
    m = bpy.data.materials.get("MAT_hood_heavy_wool")
    if m: return m
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
    L._sock(mix.inputs, "A", "RGBA").default_value = (0.0045, 0.0075, 0.0055, 1)
    L._sock(mix.inputs, "B", "RGBA").default_value = (0.009, 0.015, 0.010, 1)
    l.new(noise.outputs["Fac"], mix.inputs["Factor"])
    l.new(L._sock(mix.outputs, "Result", "RGBA"), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Sheen Weight"].default_value = 0.45; b.inputs["Sheen Roughness"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = (0.10, 0.17, 0.11, 1)
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.2; bump.inputs["Distance"].default_value = 0.0006
    l.new(mx.outputs["Value"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def build(name, rings_pts, NU, NV, uv_scale, close_mask=None):
    """rings_pts: (NV, NU, 3) positions. close_mask[j]=True merges the ring's two
    end columns (closed ring)."""
    verts = rings_pts.reshape(-1, 3).tolist()
    faces = [(j * NU + i, j * NU + i + 1, (j + 1) * NU + i + 1, (j + 1) * NU + i)
             for j in range(NV - 1) for i in range(NU - 1)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            uvl.data[li].uv = ((vi % NU) / (NU - 1) * uv_scale[0], 1 - (vi // NU) / (NV - 1) * uv_scale[1])
    ob = bpy.data.objects.new(name, me); CLOTH.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    # cap any small closed boundary loop at the crown
    bnd = [e for e in bm.edges if e.is_boundary]
    if close_mask is not None:
        top_edges = [e for e in bnd if all(v.co.z > 1.985 for v in e.verts)]
        if top_edges:
            res = bmesh.ops.holes_fill(bm, edges=top_edges, sides=200)
            if res["faces"]:
                bmesh.ops.poke(bm, faces=res["faces"])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return ob

def prepass(ob, clear=0.014):
    ts = trees()
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    pushed = 0
    for it in range(3):
        for v in bm.verts:
            for t in ts:
                loc, nrm, idx, d = t.find_nearest(v.co, 0.06)
                if loc is None or d < 1e-9: continue
                sd = (v.co - loc).dot(nrm)
                if sd < clear:
                    v.co = loc + nrm * clear; pushed += 1
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.25,
                              use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(me); bm.free()
    return pushed

def simulate(ob, pin_fn, frames, mass, bend, tension=35):
    pin = ob.vertex_groups.new(name="pin")
    for v in ob.data.vertices:
        pin.add([v.index], pin_fn(v), "REPLACE")
    cl = ob.modifiers.new("Cloth", "CLOTH")
    s = cl.settings
    s.quality = 8; s.mass = mass
    s.tension_stiffness = s.compression_stiffness = tension
    s.shear_stiffness = 12; s.bending_stiffness = bend; s.air_damping = 2.0
    s.vertex_group_mass = "pin"; s.pin_stiffness = 2.0
    cs = cl.collision_settings
    cs.distance_min = 0.006; cs.collision_quality = 4
    cs.use_self_collision = True; cs.self_distance_min = 0.004
    cl.point_cache.frame_start, cl.point_cache.frame_end = 1, frames
    sc.frame_start, sc.frame_end = 1, frames
    t0 = time.time()
    for f in range(1, frames + 1):
        sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    settled = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    co = np.array([v.co[:] for v in settled.vertices])
    for v, p in zip(ob.data.vertices, settled.vertices):
        v.co = p.co
    bpy.data.meshes.remove(settled)
    sc.frame_set(1)
    cl.show_viewport = False; cl.show_render = False
    ob["cloth_baked_pose"] = "HERO"
    print("SIM %s %d frames %.1fs bbox %s %s nan=%s" % (ob.name, frames, time.time() - t0,
          co.min(0).round(3), co.max(0).round(3), bool(np.isnan(co).any())))

def finish(ob, thick):
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = thick; sol.offset = -1.0
    sub = ob.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 1, 2
    ob.data.materials.clear(); ob.data.materials.append(wool())
    ob.modifiers.new("CollisionCloth", "COLLISION")
    ob.modifiers.move(ob.modifiers.find("CollisionCloth"), ob.modifiers.find("Subdivision"))
    ob.collision.thickness_outer = 0.004

# ------------------------------------------------------------ 1. cape
NUc, NVc = 58, 100
cape_pts = np.zeros((NVc, NUc, 3))
for j in range(NVc):
    v = j / (NVc - 1)
    rx, ry, cy = 0.235 + 0.46 * v ** 0.9, 0.15 + 0.30 * v ** 0.9, 0.035
    for i in range(NUc):
        phi = math.radians(-100 + 200 * i / (NUc - 1))
        z = 1.545 - 0.025 * abs(phi) / math.radians(100) - v * 1.50
        cape_pts[j, i] = (rx * math.sin(phi), cy + ry * math.cos(phi), z)
cape = build("DOOM_cape", cape_pts, NUc, NVc, (3.0, 4.0))
print("CAPE prepass pushed", prepass(cape))
simulate(cape, lambda v: 1.0 if v.co.z > 1.505 else 0.0, 70, mass=0.9, bend=2.5)
finish(cape, 0.006)

# ------------------------------------------------------------ 2. hood + mantle
#        z      rx     ry     cy    theta_max (180 = closed ring)
P = np.array([
    [1.998, 0.030, 0.040, -0.072, 180],
    [1.982, 0.095, 0.125, -0.072, 180],
    [1.948, 0.133, 0.172, -0.062, 168],
    [1.890, 0.150, 0.190, -0.050, 152],
    [1.830, 0.156, 0.196, -0.040, 150],
    [1.770, 0.156, 0.190, -0.030, 148],
    [1.710, 0.150, 0.180, -0.020, 150],
    [1.650, 0.146, 0.166, -0.010, 156],
    [1.600, 0.165, 0.165, 0.000, 160],
    [1.560, 0.240, 0.195, 0.000, 158],
    [1.505, 0.330, 0.235, 0.008, 156],
    [1.430, 0.395, 0.265, 0.012, 154],
    [1.340, 0.430, 0.285, 0.012, 152],
    [1.240, 0.450, 0.300, 0.012, 151],
    [1.140, 0.460, 0.310, 0.012, 150],
])
NVh, NUh = 58, 80
spl = CubicSpline(np.arange(len(P)), P, axis=0, bc_type="natural")
R = spl(np.linspace(0, len(P) - 1, NVh))
R[:, 4] = np.clip(R[:, 4], 0, 180)
hood_pts = np.zeros((NVh, NUh, 3))
for j, (z, rx, ry, cy, tmax) in enumerate(R):
    for i in range(NUh):
        t = math.radians(-tmax + 2 * tmax * i / (NUh - 1))
        hood_pts[j, i] = (rx * math.sin(t), cy + ry * math.cos(t), z)
hood = build("DOOM_hood", hood_pts, NUh, NVh, (2.4, 2.0), close_mask=True)
print("HOOD prepass pushed", prepass(hood, clear=0.012))
def hood_pin(v):
    z = v.co.z
    w = min(1.0, max(0.0, (z - 1.64) / (1.82 - 1.64)))
    if v.co.y > -0.03 and z > 1.70: w = 1.0
    return w
simulate(hood, hood_pin, 55, mass=0.5, bend=1.5)
finish(hood, 0.005)

# ------------------------------------------------------------ checks
ts = trees()
for ob in (cape, hood):
    pen = 0
    for v in ob.data.vertices:
        for t in ts[:4]:
            loc, nrm, idx, d = t.find_nearest(v.co, 0.03)
            if loc is not None and (v.co - loc).dot(nrm) < -0.001:
                pen += 1; break
    print("CHECK", ob.name, json.dumps(L.mesh_report(ob)), "penetrating=%d" % pen)

# ------------------------------------------------------------ renders
for o in bpy.data.collections["REF"].objects: o.hide_render = True
paths = [L.render_view(c, "s06_cloth_%s.png" % c[4:], res=(460, 700), samples=40) for c in ("CAM_front", "CAM_side", "CAM_34", "CAM_back")]
L.contact_sheet(paths, ["front", "side", "3/4", "back"], "s06_cloth_sheet.jpg")
cm = bpy.data.objects["CAM_mask"]; th = bpy.data.objects["TGT_head"]
shots = []
for name, off in (("front", (0.0, -1.05, -0.05)), ("34", (0.6, -0.85, 0.0)), ("low", (0.25, -0.9, -0.35))):
    cm.location = th.location + Vector(off)
    shots.append(L.render_view("CAM_mask", "s06_hood_close_%s.png" % name, res=(540, 640), samples=48))
L.contact_sheet(shots, ["close front", "close 3/4", "low angle (ref 2)"], "s06_hood_close.jpg")
L.save_version(6, "Stage 6 cloth in HERO pose: cape + hood/mantle, cloth-sim drapes (frozen), heavy wool")
