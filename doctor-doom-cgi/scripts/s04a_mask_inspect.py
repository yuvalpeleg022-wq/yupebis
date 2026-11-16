"""Stage 4a - inspect the AI-generated mask GLB in isolation (no changes to the
production file). Reports geometry/material stats and renders clay + textured
views from front / side / 3-4."""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import doomlib as L

GLB = os.path.join(L.ASSETS, "ai_mask", "doom_mask_prism31.glb")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
rep = {"objects": len(meshes)}
for o in meshes:
    rep[o.name] = L.mesh_report(o)
    rep[o.name]["materials"] = [m.name for m in o.data.materials]
    rep[o.name]["uv_layers"] = [u.name for u in o.data.uv_layers]
rep["images"] = [(i.name, list(i.size)) for i in bpy.data.images]
print("REPORT " + json.dumps(rep))

# frame it: centre at origin, measure
o = meshes[0]
bpy.context.view_layer.objects.active = o
bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
ctr, size = (mn + mx) / 2, mx - mn
print("BBOX min=%s max=%s size=%s" % (tuple(round(x, 3) for x in mn), tuple(round(x, 3) for x in mx), tuple(round(x, 3) for x in size)))

sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("w"); sc.world = w
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
tgt = bpy.data.objects.new("tgt", None); tgt.location = ctr; sc.collection.objects.link(tgt)
for name, loc, e in (("key", (-1.5, -2.5, 2.0), 400), ("fill", (2.0, -1.5, 0.5), 120), ("rim", (0.5, 2.5, 1.5), 300)):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = e * max(size) ** 2; ld.size = 1.0 * max(size)
    lo = bpy.data.objects.new(name, ld); lo.location = ctr + Vector(loc) * max(size); sc.collection.objects.link(lo); L.track_to(lo, tgt)
cd = bpy.data.cameras.new("cam"); cd.type = "ORTHO"; cd.ortho_scale = max(size) * 1.25
cam = bpy.data.objects.new("CAM_inspect", cd); sc.collection.objects.link(cam); L.track_to(cam, tgt)

# glTF importer: Y-up converted to Z-up; the generated asset's "front" is usually -Y.
views = [("front", Vector((0, -1, 0))), ("side", Vector((1, 0, 0))), ("3-4", Vector((0.7, -0.7, 0.15))), ("back", Vector((0, 1, 0)))]
clay = bpy.data.materials.new("clay"); clay.diffuse_color = (0.7, 0.7, 0.7, 1)
cb = clay.node_tree.nodes["Principled BSDF"]; cb.inputs["Base Color"].default_value = (0.55, 0.55, 0.57, 1); cb.inputs["Roughness"].default_value = 0.45
orig = [s.material for s in o.material_slots]
paths, labels = [], []
for mode in ("textured", "clay"):
    for s in o.material_slots:
        s.material = clay if mode == "clay" else orig[o.material_slots[:].index(s)]
    for vname, d in views:
        cam.location = ctr + d.normalized() * max(size) * 4
        paths.append(L.render_view("CAM_inspect", "s04a_mask_%s_%s.png" % (mode, vname.replace("-", "")), res=(420, 420), samples=24))
        labels.append("%s %s" % (mode, vname))
L.contact_sheet(paths[:4], labels[:4], "s04a_mask_textured.jpg")
L.contact_sheet(paths[4:], labels[4:], "s04a_mask_clay.jpg")
