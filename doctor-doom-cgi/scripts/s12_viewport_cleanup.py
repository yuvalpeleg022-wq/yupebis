"""Stage 12 - viewport cleanup for opening the file in Blender.

Problem reported: in the Blender viewport the body looked white. Causes:
  * simulation helpers (COL_cape_hull - a smooth hull around the whole body
    used as the cloak collider - and COL_mask_proxy) were hidden only from the
    render, so in the viewport they covered the character
  * every material still had Blender's default (white) viewport colour and the
    file opened in Solid shading
Fix: hide helper collections/objects in the viewport, give every material a
viewport colour/metallic/roughness matching its shader, open in Material
Preview through the hero camera, show the floor as wire. Then verify with a
Workbench render of exactly what is visible in the viewport.
Output: work/doom_v013.blend + renders/s12_viewport_check.png
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import doomlib as L

L.open_version(12)
sc = bpy.context.scene
vl = bpy.context.view_layer

# 1) helpers out of the viewport
for cname in ("HELPERS", "REF", "LIGHTS"):
    c = bpy.data.collections.get(cname)
    if c: c.hide_viewport = True
for o in bpy.data.objects:
    if o.type == "MESH" and o.hide_render:
        o.hide_viewport = True
floor = bpy.data.objects.get("FLOOR_shadow_catcher")
if floor:
    floor.hide_viewport = False; floor.display_type = "WIRE"

# 2) viewport colours that match the shaders
VP = {
    "MAT_armor_aged_steel": ((0.07, 0.07, 0.075), 1.0, 0.45),
    "MAT_chest_tiles": ((0.08, 0.08, 0.085), 1.0, 0.42),
    "MAT_mask_aged_steel": ((0.16, 0.12, 0.07), 1.0, 0.4),
    "MAT_medallion_silver": ((0.40, 0.40, 0.40), 1.0, 0.3),
    "MAT_chainmail_dark_steel": ((0.06, 0.06, 0.06), 1.0, 0.5),
    "MAT_cloak_velvet": ((0.02, 0.07, 0.035), 0.0, 0.8),
    "MAT_hood_heavy_wool": ((0.02, 0.07, 0.035), 0.0, 0.8),
    "MAT_tunic_skirt_wool": ((0.02, 0.055, 0.03), 0.0, 0.85),
    "MAT_tunic_padded_fabric": ((0.02, 0.045, 0.025), 0.0, 0.85),
    "MAT_cowl_black_knit": ((0.02, 0.02, 0.022), 0.0, 0.9),
    "MAT_leather_black": ((0.03, 0.026, 0.022), 0.0, 0.55),
    "MAT_leather_black_boot": ((0.03, 0.026, 0.022), 0.0, 0.55),
    "MAT_armwrap_cloth": ((0.13, 0.11, 0.06), 0.0, 0.85),
    "MAT_skin_placeholder": ((0.55, 0.40, 0.34), 0.0, 0.5),
    "MAT_eye_placeholder": ((0.04, 0.04, 0.04), 0.0, 0.1),
}
for m in bpy.data.materials:
    col, met, rough = VP.get(m.name, ((0.06, 0.06, 0.06), 0.0, 0.6))
    m.diffuse_color = col + (1.0,); m.metallic = met; m.roughness = rough
print("VIEWPORT colours set on", len(bpy.data.materials), "materials")

# 3) open in Material Preview through the hero camera
sc.camera = bpy.data.objects["CAM_final_hero"]
for scr in bpy.data.screens:
    for a in scr.areas:
        if a.type == "VIEW_3D":
            sp = a.spaces.active
            sp.shading.color_type = "MATERIAL"
            if scr.name == "Layout":
                sp.shading.type = "MATERIAL"
                sp.region_3d.view_perspective = "CAMERA"
L.save_version(13, "Stage 12 viewport cleanup: helpers hidden in viewport, material viewport colours, Material Preview")

# 4) verification: render exactly what the viewport shows (Workbench, material colours)
for o in bpy.data.objects:
    o.hide_render = not o.visible_get(view_layer=vl)
shown = sorted(o.name for o in bpy.data.objects if o.type == "MESH" and o.visible_get(view_layer=vl))
print("VISIBLE_IN_VIEWPORT", len(shown), [n for n in shown if n.startswith(("COL_", "HLP_", "FLOOR"))])
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.color_type = "MATERIAL"; sc.display.shading.light = "STUDIO"
sc.render.film_transparent = False
L.render_view("CAM_final_hero", "s12_viewport_check.png", res=(960, 540), samples=1, engine="BLENDER_WORKBENCH")
