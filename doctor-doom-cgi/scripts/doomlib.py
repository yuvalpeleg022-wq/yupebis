"""Shared helpers for the Doctor Doom CGI pipeline (headless Blender 5.1.2 via bpy).

Every stage script: open the previous version, do one coherent stage of work,
inspect, render previews, save the next version. Nothing builds the whole
character in one go.
"""
import os
import json
import math
import time

import bpy

PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(PROJECT, "work")
RENDERS = os.path.join(PROJECT, "renders")
REFS = os.path.join(PROJECT, "refs")
ASSETS = os.path.join(PROJECT, "assets")
MPFB = os.path.join(ASSETS, "mpfb2")

for _d in (WORK, RENDERS):
    os.makedirs(_d, exist_ok=True)


# --------------------------------------------------------------------- files
def version_path(n):
    return os.path.join(WORK, "doom_v%03d.blend" % n)


def open_version(n):
    path = version_path(n)
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    bpy.ops.wm.open_mainfile(filepath=path)
    return path


def save_version(n, note):
    path = version_path(n)
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)
    log = os.path.join(WORK, "versions.json")
    data = json.load(open(log)) if os.path.exists(log) else []
    data = [d for d in data if d["version"] != n]
    data.append({"version": n, "file": os.path.basename(path), "note": note,
                 "saved": time.strftime("%Y-%m-%d %H:%M:%S")})
    json.dump(sorted(data, key=lambda d: d["version"]), open(log, "w"), indent=1)
    print("SAVED", path, "%.1f MB" % (os.path.getsize(path) / 1e6))
    return path


# --------------------------------------------------------------- collections
def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def move_to(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


# ----------------------------------------------------------------- rendering
def render_view(camera_name, out_name, res=(600, 900), samples=48,
                engine="CYCLES"):
    sc = bpy.context.scene
    old = (sc.camera, sc.render.resolution_x, sc.render.resolution_y,
           sc.render.resolution_percentage, sc.cycles.samples, sc.render.engine)
    sc.camera = bpy.data.objects[camera_name]
    sc.render.engine = engine
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    path = os.path.join(RENDERS, out_name)
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print("RENDER %s %.1fs -> %s" % (camera_name, time.time() - t, path))
    (sc.camera, sc.render.resolution_x, sc.render.resolution_y,
     sc.render.resolution_percentage, sc.cycles.samples, sc.render.engine) = old
    return path


def contact_sheet(paths, labels, out_name, bg=(58, 60, 66), pad=12):
    """Composite transparent renders side by side on a neutral backdrop."""
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert("RGBA") for p in paths]
    h = max(i.height for i in ims)
    w = sum(i.width for i in ims) + pad * (len(ims) + 1)
    sheet = Image.new("RGBA", (w, h + pad * 2 + 22), bg + (255,))
    d = ImageDraw.Draw(sheet)
    x = pad
    for im, lab in zip(ims, labels):
        sheet.alpha_composite(im, (x, pad + 22))
        d.text((x + 4, pad + 2), lab, fill=(225, 225, 225, 255))
        x += im.width + pad
    path = os.path.join(RENDERS, out_name)
    sheet.convert("RGB").save(path, quality=92)
    print("SHEET", path)
    return path


# ------------------------------------------------------------------ inspect
def mesh_report(obj):
    import bmesh
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    nonmanifold = sum(1 for e in bm.edges if not e.is_manifold)
    boundary = sum(1 for e in bm.edges if e.is_boundary)
    ngons = sum(1 for f in bm.faces if len(f.verts) > 4)
    tris = sum(1 for f in bm.faces if len(f.verts) == 3)
    bm.free()
    dims = [round(v, 3) for v in obj.dimensions]
    return {"name": obj.name, "verts": len(me.vertices), "faces": len(me.polygons),
            "tris": tris, "ngons": ngons, "boundary_edges": boundary,
            "nonmanifold_edges": nonmanifold, "dims_m": dims}


def _sock(sockets, name, typ):
    return next(x for x in sockets if x.name == name and x.type == typ)


def aged_steel(name="MAT_armor_aged_steel", base=(0.030, 0.031, 0.034), edge=(0.30, 0.25, 0.19),
               rough=(0.38, 0.62), scratch_scale=55.0):
    """Procedural aged dark steel (Cycles): base gunmetal, worn brighter edges
    (Bevel-node curvature), dirt in cavities (local AO), scratches + micro noise
    bump, roughness breakup. Shared by all armour pieces."""
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    n, l = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    b.inputs["Metallic"].default_value = 1.0
    geo = n.new("ShaderNodeNewGeometry")
    bev = n.new("ShaderNodeBevel"); bev.samples = 6; bev.inputs["Radius"].default_value = 0.0015
    dot = n.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    l.new(geo.outputs["Normal"], dot.inputs[0]); l.new(bev.outputs["Normal"], dot.inputs[1])
    edge_m = n.new("ShaderNodeMapRange"); edge_m.inputs["From Min"].default_value = 0.995
    edge_m.inputs["From Max"].default_value = 0.93
    l.new(dot.outputs["Value"], edge_m.inputs["Value"])
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 90; nz.inputs["Detail"].default_value = 12
    l.new(tc.outputs["Object"], nz.inputs["Vector"])
    wear = n.new("ShaderNodeMath"); wear.operation = "MULTIPLY"
    l.new(edge_m.outputs["Result"], wear.inputs[0]); l.new(nz.outputs["Fac"], wear.inputs[1])
    wear2 = n.new("ShaderNodeMapRange"); wear2.inputs["From Min"].default_value = 0.15; wear2.inputs["From Max"].default_value = 0.45
    l.new(wear.outputs["Value"], wear2.inputs["Value"])
    ao = n.new("ShaderNodeAmbientOcclusion"); ao.only_local = True; ao.inputs["Distance"].default_value = 0.006
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    _sock(col.inputs, "A", "RGBA").default_value = base + (1,)
    _sock(col.inputs, "B", "RGBA").default_value = edge + (1,)
    l.new(wear2.outputs["Result"], col.inputs["Factor"])
    dirt = n.new("ShaderNodeMix"); dirt.data_type = "RGBA"
    _sock(dirt.inputs, "A", "RGBA").default_value = (0.006, 0.006, 0.006, 1)
    l.new(_sock(col.outputs, "Result", "RGBA"), _sock(dirt.inputs, "B", "RGBA"))
    l.new(ao.outputs["AO"], dirt.inputs["Factor"])
    l.new(_sock(dirt.outputs, "Result", "RGBA"), b.inputs["Base Color"])
    r = n.new("ShaderNodeMapRange")
    r.inputs["To Min"].default_value, r.inputs["To Max"].default_value = rough
    l.new(nz.outputs["Fac"], r.inputs["Value"])
    r2 = n.new("ShaderNodeMath"); r2.operation = "SUBTRACT"; r2.use_clamp = True
    l.new(r.outputs["Result"], r2.inputs[0]); l.new(wear2.outputs["Result"], r2.inputs[1])
    r3 = n.new("ShaderNodeMath"); r3.operation = "MAXIMUM"; r3.inputs[1].default_value = 0.22
    l.new(r2.outputs["Value"], r3.inputs[0]); l.new(r3.outputs["Value"], b.inputs["Roughness"])
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scratch_scale,) * 3
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    wv = n.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 3.0; wv.inputs["Distortion"].default_value = 16
    wv.inputs["Detail"].default_value = 6; l.new(mp.outputs["Vector"], wv.inputs["Vector"])
    cr = n.new("ShaderNodeMapRange"); cr.inputs["From Min"].default_value = 0.93; cr.inputs["From Max"].default_value = 0.98
    l.new(wv.outputs["Fac"], cr.inputs["Value"])
    bump1 = n.new("ShaderNodeBump"); bump1.inputs["Strength"].default_value = 0.25; bump1.inputs["Distance"].default_value = 0.0003
    l.new(cr.outputs["Result"], bump1.inputs["Height"])
    bump2 = n.new("ShaderNodeBump"); bump2.inputs["Strength"].default_value = 0.08; bump2.inputs["Distance"].default_value = 0.0002
    l.new(nz.outputs["Fac"], bump2.inputs["Height"]); l.new(bump1.outputs["Normal"], bump2.inputs["Normal"])
    l.new(bump2.outputs["Normal"], b.inputs["Normal"])
    return m


def track_to(obj, target):
    c = obj.constraints.get("TRACK") or obj.constraints.new("TRACK_TO")
    c.name = "TRACK"
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
