"""Stage 10b - cloak refinement (back-view poster).

The first final cloak caught on every armour detail (belt, skirt, wraps) and
clung to the back. Production fix: collide the cloak only with a smooth
collision hull (voxel-remeshed union of body layers + skirt + armour, smoothed,
inflated) and the floor, so it hangs off the shoulders/back in long vertical
folds and fans out on the floor. Hood, skirt and armour are unchanged.
Output: work/doom_v011.blend + renders/s10b_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from mathutils import Vector
import doomlib as L
import clothlib as C

QUICK = bool(os.environ.get("DOOM_QUICK"))
L.open_version(10)
sc = bpy.context.scene
O = bpy.data.objects
old = O["DOOM_cape"]; me_old = old.data; bpy.data.objects.remove(old); bpy.data.meshes.remove(me_old)

# ------------------------------------------------------------ smooth collision hull
parts = [O[n] for n in ("DOOM_undersuit", "DOOM_cowl", "DOOM_boots", "DOOM_gloves", "DOOM_skirt")]
parts += [o for o in bpy.data.collections["ARMOR"].objects if o.type == "MESH"]
dg = bpy.context.evaluated_depsgraph_get()
bm = bmesh.new()
for o in parts:
    e = o.evaluated_get(dg); m = e.to_mesh()
    t = bmesh.new(); t.from_mesh(m); t.transform(o.matrix_world)
    tm = bpy.data.meshes.new("_t"); t.to_mesh(tm); t.free(); bm.from_mesh(tm); bpy.data.meshes.remove(tm)
    e.to_mesh_clear()
hme = bpy.data.meshes.new("COL_cape_hull"); bm.to_mesh(hme); bm.free()
hull = O.new("COL_cape_hull", hme) if False else bpy.data.objects.new("COL_cape_hull", hme)
cc = bpy.data.collections.new("CAPE_COLLIDERS"); bpy.data.collections["HELPERS"].children.link(cc)
cc.objects.link(hull)
rm = hull.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.022
dg = bpy.context.evaluated_depsgraph_get()
hm2 = bpy.data.meshes.new_from_object(hull.evaluated_get(dg)); hull.modifiers.clear(); hull.data = hm2
bpy.data.meshes.remove(hme)
b2 = bmesh.new(); b2.from_mesh(hm2)
for _ in range(8):
    bmesh.ops.smooth_vert(b2, verts=b2.verts[:], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
b2.normal_update()
for v in b2.verts: v.co += v.normal * 0.012
b2.to_mesh(hm2); b2.free()
hull.hide_render = True
C.add_collider(hull, 0.004, 1.5)
floor = O["FLOOR_shadow_catcher"]
cc.objects.link(floor)
print("HULL verts=%d" % len(hm2.vertices))

# ------------------------------------------------------------ cloak
VELVET = bpy.data.materials["MAT_cloak_velvet"]
cape = C.build("DOOM_cape", C.cape_points(span=98.0), (4.0, 6.0), bpy.data.collections["CLOTH"])
print("CAPE prepass", C.prepass(cape, [hull], clear=0.016))
C.simulate(cape, lambda v: 1.0 if v.co.z > 1.505 else 0.0, 2 if QUICK else 85, mass=1.2, bend=16.0, wind=0.8,
           collide_with=cc)
C.finish(cape, 0.006, VELVET)
pen = 0
for t in C.trees([hull]):
    for v in cape.data.vertices:
        loc, nrm, idx, d = t.find_nearest(v.co, 0.03)
        if loc is not None and (v.co - loc).dot(nrm) < -0.002: pen += 1
print("CHECK", json.dumps(L.mesh_report(cape)), "inside_hull=%d" % pen)

# ------------------------------------------------------------ renders
for o in bpy.data.collections["REF"].objects: o.hide_render = True
paths = [L.render_view(c, "s10b_full_%s.png" % c[4:], res=(460, 700), samples=48)
         for c in ("CAM_front", "CAM_34", "CAM_side", "CAM_back", "CAM_back_low")]
L.contact_sheet(paths, ["front", "3/4", "side", "back", "back low (stair poster)"], "s10b_full_sheet.jpg")
if not QUICK:
    L.save_version(11, "Stage 10b cloak refined: smooth collision hull + floor, stiffer velvet, long vertical folds")
