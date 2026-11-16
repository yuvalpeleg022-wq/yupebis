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


def track_to(obj, target):
    c = obj.constraints.get("TRACK") or obj.constraints.new("TRACK_TO")
    c.name = "TRACK"
    c.target = target
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
