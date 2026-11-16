"""Stage 11 - cinematic lighting + final renders (Cycles, 1920x1080, transparent
background as requested, floor = invisible shadow catcher).

Lighting after the posters: dark green ambience, strong green-tinted rim lights
carving the hood/cloak silhouette, soft warm key from above-front, a top spot on
hood and shoulders, low cool fill.
Frames: hero low-angle front 3/4, low back view (stair poster), mask close-up.
Output: renders/final_*.png + work/doom_v012.blend
"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import doomlib as L

QUICK = bool(os.environ.get("DOOM_QUICK"))
L.open_version(11)
sc = bpy.context.scene
O = bpy.data.objects
for o in bpy.data.collections["LIGHTS"].objects:
    o.hide_render = True
for o in bpy.data.collections["REF"].objects:
    o.hide_render = True
lights = L.collection("LIGHTS_FINAL")
tgt = bpy.data.objects.new("TGT_final", None); tgt.location = (0, 0.05, 1.25); lights.objects.link(tgt)
tgt_head = bpy.data.objects.new("TGT_final_head", None); tgt_head.location = (0, -0.06, 1.72); lights.objects.link(tgt_head)

def light(name, kind, loc, energy, color, size=1.0, target=tgt, spot=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = color
    if kind == "AREA": ld.size = size
    if kind == "SPOT": ld.spot_size = math.radians(spot or 35); ld.spot_blend = 0.6; ld.shadow_soft_size = 0.15
    ob = bpy.data.objects.new(name, ld); ob.location = loc; lights.objects.link(ob); L.track_to(ob, target)
    return ob
light("LGT_key_warm", "AREA", (1.9, -2.6, 3.3), 170, (1.0, 0.9, 0.78), 1.6)
light("LGT_rim_green_L", "AREA", (-2.3, 1.9, 2.7), 380, (0.55, 1.0, 0.62), 1.0, tgt_head)
light("LGT_rim_green_R", "AREA", (2.4, 1.7, 2.1), 280, (0.72, 1.0, 0.78), 1.0)
light("LGT_top_spot", "SPOT", (0.2, -0.6, 4.2), 320, (0.9, 1.0, 0.92), target=tgt_head, spot=30)
light("LGT_fill_cool", "AREA", (0.0, -3.2, 0.7), 35, (0.7, 0.85, 1.0), 2.5)
world = sc.world
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.004, 0.009, 0.005, 1); bg.inputs["Strength"].default_value = 0.35

# cloak look-dev: darker velvet, restrained sheen (posters read almost black-green)
from doomlib import _sock
for mn in ("MAT_cloak_velvet", "MAT_tunic_skirt_wool", "MAT_hood_heavy_wool"):
    m = bpy.data.materials.get(mn)
    if not m: continue
    bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Sheen Weight"].default_value = 0.30 if mn == "MAT_cloak_velvet" else 0.2
    bs.inputs["Sheen Roughness"].default_value = 0.4
    bs.inputs["Specular IOR Level"].default_value = 0.12   # cloth: almost no broad dielectric sheen
    bs.inputs["Sheen Tint"].default_value = (0.13, 0.27, 0.16, 1)
    bs.inputs["Roughness"].default_value = 0.84
    mix = bs.inputs["Base Color"].links[0].from_node
    _sock(mix.inputs, "A", "RGBA").default_value = (0.0035, 0.0080, 0.0045, 1)
    _sock(mix.inputs, "B", "RGBA").default_value = (0.0075, 0.0160, 0.0090, 1)
for mn in ("MAT_tunic_padded_fabric", "MAT_cowl_black_knit", "MAT_armwrap_cloth"):
    m = bpy.data.materials.get(mn)
    if m: m.node_tree.nodes["Principled BSDF"].inputs["Specular IOR Level"].default_value = 0.2
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
sc.cycles.samples = 16 if QUICK else 192
sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.02
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"

cams = bpy.data.collections["CAMERAS"]
def cam(name, loc, lens, target):
    cd = bpy.data.cameras.new(name); cd.lens = lens
    cd.dof.use_dof = True; cd.dof.focus_object = target; cd.dof.aperture_fstop = 4.0
    ob = bpy.data.objects.new(name, cd); ob.location = loc; cams.objects.link(ob); L.track_to(ob, target)
    return ob
hero_tgt = bpy.data.objects.new("TGT_hero", None); hero_tgt.location = (0, 0.1, 1.0); cams.objects.link(hero_tgt)
back_tgt = bpy.data.objects.new("TGT_back", None); back_tgt.location = (0, 0.5, 0.95); cams.objects.link(back_tgt)
cam("CAM_final_hero", (1.0, -3.4, 0.55), 28, hero_tgt)
cam("CAM_final_back", (0.25, 3.15, 0.42), 30, back_tgt)
cam("CAM_final_mask", (0.32, -1.15, 1.62), 85, tgt_head)

res = (960, 540) if QUICK else (1920, 1080)
out = []
for c, name in (("CAM_final_hero", "final_hero"), ("CAM_final_back", "final_back"), ("CAM_final_mask", "final_mask")):
    out.append(L.render_view(c, ("quick_" if QUICK else "") + name + ".png", res=res, samples=sc.cycles.samples))
print("FINAL", out)
if not QUICK:
    L.save_version(12, "Stage 11 cinematic lighting + final 1920x1080 renders (hero, back, mask)")
