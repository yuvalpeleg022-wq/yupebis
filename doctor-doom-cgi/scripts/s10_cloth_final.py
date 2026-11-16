"""Stage 10 - final cloth over all armour (hero pose).

Order: tunic skirt -> cape -> hood/mantle, each colliding with the body layers,
all armour and the cloth simulated before it. Heavier, stiffer wool for broad
folds, lower friction, and a light wind field so the cape flows back and to the
character's right as in the poster. Afterwards the medallions (+ chain) are
moved on top of the mantle so they read as the cloak clasps (cinematic still).
Output: work/doom_v010.blend + renders/s10_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from mathutils import Vector, Matrix
import doomlib as L
import clothlib as C

L.open_version(9)
sc = bpy.context.scene
rig = bpy.data.objects["DOOM_rig"]
L.hero_pose(rig)
CLOTH = bpy.data.collections["CLOTH"]
for n in ("DOOM_cape", "DOOM_hood"):
    o = bpy.data.objects.get(n)
    if o:
        me = o.data; bpy.data.objects.remove(o); bpy.data.meshes.remove(me)
O = bpy.data.objects
armor = [o for o in bpy.data.collections["ARMOR"].objects
         if o.type == "MESH" and not any(k in o.name for k in ("rivet", "chain", "medallion", "gauntlet"))]
body_layers = [O[n] for n in ("DOOM_undersuit", "DOOM_cowl", "DOOM_boots", "DOOM_gloves", "COL_mask_proxy")]
for o in body_layers + armor:
    C.add_collider(o, 0.005, 4.0)
print("COLLIDERS", len(body_layers + armor))

wind = O.new("FX_wind", None) if False else bpy.data.objects.new("FX_wind", None)
sc.collection.objects.link(wind)
wind.empty_display_type = "SINGLE_ARROW"
wind.location = (0.3, -2.0, 1.0)
wind.rotation_euler = Vector((-0.5, 0.85, 0.12)).to_track_quat("Z", "Y").to_euler()
bpy.context.view_layer.objects.active = wind
wind.field.type = "WIND"; wind.field.strength = 2.5; wind.field.noise = 0.4; wind.field.flow = 0.0

# ------------------------------------------------------------ tunic skirt
dg = bpy.context.evaluated_depsgraph_get()
suit_tree = C.trees([O["DOOM_undersuit"]])[0]
def hip_r(phi, z):
    d = Vector((math.sin(phi), -math.cos(phi), 0)); c0 = Vector((0, 0.01, z))
    h = suit_tree.ray_cast(c0, d, 0.5)
    return h[3] if h[0] is not None else 0.17
panels = [(-88, -2), (2, 88), (92, 178), (-178, -92)]
NUp, NVp = 22, 42
skirt_pts = []
for a0, a1 in panels:
    P = np.zeros((NVp, NUp, 3))
    for i in range(NUp):
        phi = math.radians(a0 + (a1 - a0) * i / (NUp - 1))
        r0 = hip_r(phi, 1.0) + 0.008
        for j in range(NVp):
            v = j / (NVp - 1)
            z = 1.02 - v * 0.60
            r = r0 + 0.11 * v ** 1.2
            P[j, i] = (r * math.sin(phi), 0.01 - r * math.cos(phi), z)
    skirt_pts.append(P)
skirt_obs = []
for k, P in enumerate(skirt_pts):
    ob = C.build("DOOM_skirt_%d" % k, P, (1.2, 2.0), CLOTH)
    skirt_obs.append(ob)
# join the four panels into one cloth object (self-collision between panels)
bpy.ops.object.select_all(action="DESELECT")
for ob in skirt_obs: ob.select_set(True)
bpy.context.view_layer.objects.active = skirt_obs[0]
bpy.ops.object.join()
skirt = bpy.context.view_layer.objects.active; skirt.name = "DOOM_skirt"; skirt.data.name = "DOOM_skirt"
print("SKIRT prepass", C.prepass(skirt, body_layers + armor, clear=0.010))
C.simulate(skirt, lambda v: 1.0 if v.co.z > 1.005 else 0.0, 50, mass=0.6, bend=6.0, wind=0.25)
C.finish(skirt, 0.005, C.wool("MAT_tunic_skirt_wool", (0.004, 0.009, 0.005), (0.009, 0.018, 0.010), sheen=0.35))

# ------------------------------------------------------------ floor (shadow catcher) + cape
bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0, 0.8, 0.0))
floor = bpy.context.object; floor.name = "FLOOR_shadow_catcher"
floor.is_shadow_catcher = True
C.add_collider(floor, 0.004, 6.0)
VELVET = C.wool("MAT_cloak_velvet", (0.0055, 0.013, 0.0075), (0.011, 0.024, 0.014), sheen=0.85)
vb = VELVET.node_tree.nodes["Principled BSDF"]
vb.inputs["Sheen Tint"].default_value = (0.22, 0.42, 0.26, 1); vb.inputs["Sheen Roughness"].default_value = 0.3
vb.inputs["Roughness"].default_value = 0.78
cape = C.build("DOOM_cape", C.cape_points(), (4.0, 6.0), CLOTH)
print("CAPE prepass", C.prepass(cape, body_layers + armor + [skirt]))
C.simulate(cape, lambda v: 1.0 if v.co.z > 1.505 else 0.0, 80, mass=1.2, bend=12.0, wind=0.6)
C.finish(cape, 0.006, VELVET)

# ------------------------------------------------------------ hood + mantle
hood = C.build("DOOM_hood", C.hood_points(), (2.4, 2.0), CLOTH, cap_top_z=1.985)
print("HOOD prepass", C.prepass(hood, body_layers + armor + [cape], clear=0.012))
C.simulate(hood, C.hood_pin, 55, mass=0.5, bend=3.0, wind=0.15)
C.finish(hood, 0.005, VELVET)

# ------------------------------------------------------------ medallions as clasps over the mantle
ht = C.trees([hood])[0]
moved = []
for n in ("DOOM_medallion_L", "DOOM_medallion_R"):
    m = O[n]
    c = m.matrix_world.translation.copy()
    hit = ht.ray_cast(c + Vector((0, 0.05, 0)), Vector((0, -1, 0)), 0.2)
    if hit[0] is not None and hit[0].y < c.y + 0.004:
        dy = hit[0].y - c.y - 0.012
        m.matrix_world = Matrix.Translation((0, dy, 0)) @ m.matrix_world
        moved.append(dy)
if moved:
    ch = O["DOOM_chain"]
    ch.matrix_world = Matrix.Translation((0, min(moved), 0)) @ ch.matrix_world
print("CLASPS moved", [round(d, 3) for d in moved])

# ------------------------------------------------------------ checks + renders
ts = C.trees(body_layers[:4] + armor)
for ob in (skirt, cape, hood):
    pen = 0
    for v in ob.data.vertices:
        for t in ts:
            loc, nrm, idx, d = t.find_nearest(v.co, 0.03)
            if loc is not None and (v.co - loc).dot(nrm) < -0.002:
                pen += 1; break
    print("CHECK", ob.name, json.dumps(L.mesh_report(ob)), "penetrating=%d" % pen)
for o in bpy.data.collections["REF"].objects: o.hide_render = True
for c in ("CAM_front", "CAM_side", "CAM_back"):
    O[c].data.ortho_scale = 2.9; O[c].location.z = 1.0
cd0 = bpy.data.cameras.new("CAM_back_low"); cd0.lens = 35
cbl = bpy.data.objects.new("CAM_back_low", cd0); bpy.data.collections["CAMERAS"].objects.link(cbl)
cbl.location = (0.25, 4.2, 0.55); tb = bpy.data.objects.new("TGT_back_low", None); tb.location = (0, 0.4, 1.05)
bpy.data.collections["CAMERAS"].objects.link(tb); L.track_to(cbl, tb)
paths = [L.render_view(c, "s10_full_%s.png" % c[4:], res=(460, 700), samples=48) for c in ("CAM_front", "CAM_34", "CAM_side", "CAM_back", "CAM_back_low")]
L.contact_sheet(paths, ["front", "3/4", "side", "back", "back low (stair poster)"], "s10_full_sheet.jpg")
cd = O["CAM_detail"]; td = O["TGT_detail"]
shots = []
for name, tgt, off, lens in (("chest", Vector((0, -0.12, 1.38)), (0.3, -1.05, 0.05), 45),
                             ("hood", Vector((0, -0.08, 1.70)), (0.35, -1.0, -0.05), 50)):
    td.location = tgt; cd.location = tgt + Vector(off); cd.data.lens = lens
    shots.append(L.render_view("CAM_detail", "s10_%s.png" % name, res=(600, 600), samples=64))
L.contact_sheet(shots, ["chest + clasps", "hood"], "s10_detail_sheet.jpg")
L.save_version(10, "Stage 10 final cloth in HERO pose over armour: skirt, cape (wind), hood/mantle, medallion clasps")
