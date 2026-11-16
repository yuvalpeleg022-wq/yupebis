"""Stage 1 - project setup: scene, units, collections, cameras, preview lights,
render settings, reference images. Output: work/doom_v001.blend"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import doomlib as L

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.name = "DOOM"

# units: metres, Z up
sc.unit_settings.system = "METRIC"
sc.unit_settings.scale_length = 1.0
sc.unit_settings.length_unit = "METERS"
sc.render.fps = 24
sc.frame_start, sc.frame_end = 1, 120

# collection layout
root = sc.collection
for name in ("REF", "CHARACTER", "RIG", "CAMERAS", "LIGHTS", "HELPERS"):
    L.collection(name)
char = bpy.data.collections["CHARACTER"]
for name in ("BODY", "MASK", "ARMOR", "CLOTH", "UNDERSUIT"):
    L.collection(name, char)
bpy.data.collections["REF"].hide_render = True
bpy.data.collections["HELPERS"].hide_render = True

# render: Cycles CPU, AgX, transparent film (no background for now)
sc.render.engine = "CYCLES"
sc.cycles.device = "CPU"
sc.cycles.samples = 64
sc.cycles.use_adaptive_sampling = True
sc.cycles.use_denoising = True
sc.cycles.denoiser = "OPENIMAGEDENOISE"
sc.cycles.max_bounces = 8
sc.cycles.glossy_bounces = 6
sc.cycles.transmission_bounces = 6
sc.render.film_transparent = True
sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"

# world: very dark neutral, low contribution (lights do the work)
world = bpy.data.worlds.new("WORLD_studio")
sc.world = world
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.02, 0.022, 0.025, 1)
bg.inputs["Strength"].default_value = 0.3

# camera targets
cams = bpy.data.collections["CAMERAS"]
def empty(name, loc):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.empty_display_size = 0.1
    cams.objects.link(e)
    return e
tgt_body = empty("TGT_body", (0, 0, 0.98))
tgt_head = empty("TGT_head", (0, 0, 1.74))

def camera(name, loc, lens=50, ortho=None, target=None, rot=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.clip_start, cd.clip_end = 0.05, 100
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd)
    ob.location = loc
    if rot:
        ob.rotation_euler = [math.radians(a) for a in rot]
    cams.objects.link(ob)
    if target:
        L.track_to(ob, target)
    return ob

camera("CAM_front", (0, -10, 0.98), ortho=2.25, rot=(90, 0, 0))
camera("CAM_side", (10, 0, 0.98), ortho=2.25, rot=(90, 0, 90))
camera("CAM_back", (0, 10, 0.98), ortho=2.25, rot=(90, 0, 180))
camera("CAM_34", (3.0, -4.6, 1.35), lens=85, target=tgt_body)
camera("CAM_hero", (0.35, -3.0, 0.85), lens=35, target=tgt_head)   # low angle, like ref 2
camera("CAM_mask", (0.18, -1.15, 1.76), lens=85, target=tgt_head)
sc.camera = bpy.data.objects["CAM_34"]

# preview studio lighting (area lights; final cinematic lighting is a later stage)
lights = bpy.data.collections["LIGHTS"]
def area(name, loc, energy, size, color, target):
    ld = bpy.data.lights.new(name, "AREA")
    ld.energy, ld.size, ld.color = energy, size, color
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    lights.objects.link(ob)
    L.track_to(ob, target)
    return ob
area("LGT_key", (-2.2, -2.6, 2.9), 900, 1.6, (1.0, 0.96, 0.9), tgt_body)
area("LGT_fill", (2.6, -2.0, 1.4), 260, 2.5, (0.85, 0.9, 1.0), tgt_body)
area("LGT_rim_L", (-1.8, 2.4, 2.4), 700, 1.0, (0.9, 0.95, 1.0), tgt_head)
area("LGT_rim_R", (2.0, 2.2, 2.0), 600, 1.0, (1.0, 0.92, 0.85), tgt_body)

# reference images (packed into the .blend so they travel with it)
ref = bpy.data.collections["REF"]
for fname, loc, rot, size in (
        ("ref_museum.jpg", (-1.6, 0.6, 1.0), (90, 0, 0), 2.2),
        ("ref_cinematic.webp", (1.9, 0.6, 1.2), (90, 0, 0), 2.4)):
    img = bpy.data.images.load(os.path.join(L.REFS, fname))
    img.pack()
    e = bpy.data.objects.new("REF_" + fname.split(".")[0], None)
    e.empty_display_type = "IMAGE"
    e.data = img
    e.empty_display_size = size
    e.location = loc
    e.rotation_euler = [math.radians(a) for a in rot]
    e.use_empty_image_alpha = True
    e.color[3] = 0.6
    ref.objects.link(e)

# inspection
print("COLLECTIONS", [c.name for c in bpy.data.collections])
print("CAMERAS", [o.name for o in cams.objects if o.type == "CAMERA"])
print("LIGHTS", [o.name for o in lights.objects])
print("RENDER", sc.render.engine, sc.cycles.device, sc.view_settings.view_transform,
      sc.view_settings.look, "transparent=%s" % sc.render.film_transparent)
L.save_version(1, "Stage 1 setup: collections, cameras, preview lights, render settings, refs")
