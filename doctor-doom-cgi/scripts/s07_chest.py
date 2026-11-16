"""Stage 7 - chest plate, medallions, chain, side straps.

Reference (cinematic still + poster): a lamellar chest plate of 6 x 7 square
tiles, each tile a raised plate with a recessed panel and a square/diamond
knot emblem, rows separated by bands of small rivets, framed at the sides by
dark straps; two round medallions at the collar corners (left: star, right:
hammer glyph) joined by a hanging chain.

Construction: the plate surface is a smoothed depth map of the undersuit seen
from the front (always >= 6 mm in front of it); tiles are built with nested
insets on real geometry, the knot motif is a procedural bump aligned to the
tile grid; rivets/links are real meshes. Plate weights = spine weights of the
nearest suit vertices; medallions + chain are parented to the chest bone.
Output: work/doom_v007.blend + renders/s07_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.interpolate import RegularGridInterpolator
import bpy, bmesh
from mathutils import Vector, Matrix, kdtree
from mathutils.bvhtree import BVHTree
import doomlib as L

L.open_version(6)
sc = bpy.context.scene
rig = bpy.data.objects["DOOM_rig"]
rig.data.pose_position = "REST"   # armour is built and bound in the rest pose
bpy.context.view_layer.update()
suit = bpy.data.objects["DOOM_undersuit"]
ARMOR = bpy.data.collections["ARMOR"]
STEEL = L.aged_steel()
SILVER = L.aged_steel("MAT_medallion_silver", base=(0.10, 0.10, 0.105), edge=(0.62, 0.60, 0.56), rough=(0.24, 0.42))
LEATHER = bpy.data.materials["MAT_leather_black"]

# ------------------------------------------------------------ depth map
dg = bpy.context.evaluated_depsgraph_get()
e = suit.evaluated_get(dg); m = e.to_mesh()
bm = bmesh.new(); bm.from_mesh(m); bm.transform(suit.matrix_world)
tree = BVHTree.FromBMesh(bm); bm.free(); e.to_mesh_clear()
xs = np.linspace(-0.24, 0.24, 97); zs = np.linspace(1.00, 1.60, 121)
raw = np.full((len(zs), len(xs)), np.nan)
for j, z in enumerate(zs):
    for i, x in enumerate(xs):
        hit = tree.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if hit[0] is not None:
            raw[j, i] = hit[0].y
mask_nan = np.isnan(raw)
raw[mask_nan] = np.nanmax(raw)
GAP = 0.006
yp = raw - GAP
for sig in (3.0, 1.5):
    yp = np.minimum(gaussian_filter(yp, sig), raw - GAP)
Yf = RegularGridInterpolator((zs, xs), yp)
def surf(x, z):
    y = float(Yf((z, x)))
    h = 0.002
    fx = (float(Yf((z, x + h))) - float(Yf((z, x - h)))) / (2 * h)
    fz = (float(Yf((z + h, x))) - float(Yf((z - h, x)))) / (2 * h)
    return Vector((x, y, z)), Vector((fx, -1.0, fz)).normalized()

# ------------------------------------------------------------ plate layout
NC, NR = 6, 7
TW, VG, TH, BAND, FRAME = 0.042, 0.008, 0.044, 0.012, 0.010
TOP = 1.49
W = NC * TW + (NC - 1) * VG
X0 = -W / 2
xb = [X0 - FRAME, X0]
for c in range(NC):
    xb += [X0 + c * (TW + VG) + TW] + ([X0 + (c + 1) * (TW + VG)] if c < NC - 1 else [])
xb += [-X0 + FRAME]
zb = [TOP, TOP - BAND]
for r in range(NR):
    zt = TOP - BAND - r * (TH + BAND)
    zb += [zt - TH] + ([zt - TH - BAND] if r < NR - 1 else [])
zb += [zb[-1] - BAND]
xb, zb = sorted(set(round(v, 6) for v in xb)), sorted(set(round(v, 6) for v in zb), reverse=True)
tile_x = {round(X0 + c * (TW + VG), 6) for c in range(NC)}
tile_z = {round(TOP - BAND - r * (TH + BAND), 6) for r in range(NR)}
print("PLATE x %.3f..%.3f z %.3f..%.3f  cells %dx%d" % (xb[0], xb[-1], zb[-1], zb[0], len(xb) - 1, len(zb) - 1))

bm = bmesh.new()
grid = {}
for j, z in enumerate(zb):
    for i, x in enumerate(xb):
        grid[i, j] = bm.verts.new(surf(x, z)[0])
tiles = []
for j in range(len(zb) - 1):
    for i in range(len(xb) - 1):
        f = bm.faces.new((grid[i, j], grid[i, j + 1], grid[i + 1, j + 1], grid[i + 1, j]))
        if round(xb[i], 6) in tile_x and round(zb[j], 6) in tile_z:
            tiles.append(f)
bm.normal_update()
if sum(f.normal.y for f in bm.faces) > 0:
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.normal_update()
for thick, depth in ((0.0022, 0.0035), (0.0035, -0.0012), (0.0055, 0.0014), (0.0025, -0.0007)):
    bmesh.ops.inset_individual(bm, faces=tiles, thickness=thick, depth=depth, use_even_offset=True)
pme = bpy.data.meshes.new("DOOM_chest_plate"); bm.to_mesh(pme); bm.free()
plate = bpy.data.objects.new("DOOM_chest_plate", pme); ARMOR.objects.link(plate)
print("TILES", len(tiles), json.dumps(L.mesh_report(plate)))

# knot emblem: square + diamond outline bump aligned to the tile grid
pmat = STEEL.copy(); pmat.name = "MAT_chest_tiles"
n, l = pmat.node_tree.nodes, pmat.node_tree.links
b = n["Principled BSDF"]
last_bump = b.inputs["Normal"].links[0].from_node
tc = n.new("ShaderNodeTexCoord"); sep = n.new("ShaderNodeSeparateXYZ"); l.new(tc.outputs["Object"], sep.inputs[0])
def cell(axis_out, origin, pitch):
    a = n.new("ShaderNodeMath"); a.operation = "SUBTRACT"; a.inputs[1].default_value = origin
    l.new(axis_out, a.inputs[0])
    d = n.new("ShaderNodeMath"); d.operation = "DIVIDE"; d.inputs[1].default_value = pitch; l.new(a.outputs[0], d.inputs[0])
    f = n.new("ShaderNodeMath"); f.operation = "FRACT"; l.new(d.outputs[0], f.inputs[0])
    s = n.new("ShaderNodeMath"); s.operation = "SUBTRACT"; s.inputs[1].default_value = 0.5; l.new(f.outputs[0], s.inputs[0])
    ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; l.new(s.outputs[0], ab.inputs[0])
    return ab.outputs[0]
u = cell(sep.outputs["X"], X0 + TW / 2 - (TW + VG) / 2, TW + VG)
v = cell(sep.outputs["Z"], TOP - BAND - TH / 2 - (TH + BAND) / 2, TH + BAND)
sq = n.new("ShaderNodeMath"); sq.operation = "MAXIMUM"; l.new(u, sq.inputs[0]); l.new(v, sq.inputs[1])
dm = n.new("ShaderNodeMath"); dm.operation = "ADD"; l.new(u, dm.inputs[0]); l.new(v, dm.inputs[1])
dm2 = n.new("ShaderNodeMath"); dm2.operation = "MULTIPLY"; dm2.inputs[1].default_value = 0.72; l.new(dm.outputs[0], dm2.inputs[0])
def band(val, lo, hi):
    c = n.new("ShaderNodeFloatCurve"); cv = c.mapping.curves[0]
    cv.points[0].location = (0, 0); cv.points[1].location = (1, 0)
    for x, y in ((lo - 0.015, 0), (lo, 1), (hi, 1), (hi + 0.015, 0)):
        cv.points.new(x, y)
    c.mapping.update()
    l.new(val, c.inputs["Value"]); return c.outputs[0]
k1, k2 = band(sq.outputs[0], 0.085, 0.11), band(dm2.outputs[0], 0.10, 0.125)
knot = n.new("ShaderNodeMath"); knot.operation = "MAXIMUM"; l.new(k1, knot.inputs[0]); l.new(k2, knot.inputs[1])
kb = n.new("ShaderNodeBump"); kb.inputs["Strength"].default_value = 0.8; kb.inputs["Distance"].default_value = 0.0008
l.new(knot.outputs[0], kb.inputs["Height"]); l.new(last_bump.outputs["Normal"], kb.inputs["Normal"])
l.new(kb.outputs["Normal"], b.inputs["Normal"])
pme.materials.append(pmat)
for o, mods in ((plate, (("Solidify", "SOLIDIFY"), ("Bevel", "BEVEL"), ("WeightedNormal", "WEIGHTED_NORMAL"))),):
    sol = o.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = 0.003; sol.offset = 1.0
    bv = o.modifiers.new("Bevel", "BEVEL"); bv.width = 0.0005; bv.segments = 2; bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(30)
    o.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
for p in pme.polygons: p.use_smooth = True

# ------------------------------------------------------------ rivets
def rivet(bm, p, nrm, r=0.0019, squash=0.55):
    M = Matrix.Translation(p + nrm * 0.0004) @ nrm.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((1, 1, squash, 1))
    bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=r, matrix=M)
rbm = bmesh.new()
band_z = [TOP - BAND / 2] + [TOP - BAND - TH - r * (TH + BAND) - BAND / 2 for r in range(NR)]
for z in band_z:
    for x in np.arange(X0 + 0.004, -X0 - 0.003, 0.0105):
        p, nr = surf(float(x), z); rivet(rbm, p, nr)
for sx in (-1, 1):
    x = sx * (W / 2 + FRAME / 2)
    for z in np.arange(zb[-1] + 0.006, TOP - 0.004, 0.0105):
        p, nr = surf(x, float(z)); rivet(rbm, p, nr)
rme = bpy.data.meshes.new("DOOM_chest_rivets"); rbm.to_mesh(rme); rbm.free()
for p in rme.polygons: p.use_smooth = True
rivets = bpy.data.objects.new("DOOM_chest_rivets", rme); ARMOR.objects.link(rivets)
rme.materials.append(STEEL)
print("RIVETS verts=%d" % len(rme.vertices))

# ------------------------------------------------------------ side straps
sbm = bmesh.new()
for sx in (-1, 1):
    xin = sx * (W / 2 + FRAME); xout = sx * (W / 2 + FRAME + 0.024)
    zz = np.linspace(zb[-1] - 0.03, TOP + 0.03, 40)
    rows = []
    for z in zz:
        rows.append([sbm.verts.new(surf(x, float(z))[0] + surf(x, float(z))[1] * 0.0005) for x in (xin, (xin + xout) / 2, xout)])
    for a, b2 in zip(rows[:-1], rows[1:]):
        for k in range(2):
            sbm.faces.new((a[k], a[k + 1], b2[k + 1], b2[k]))
sbm.normal_update()
if sum(f.normal.y for f in sbm.faces) > 0:
    bmesh.ops.reverse_faces(sbm, faces=sbm.faces[:])
sme = bpy.data.meshes.new("DOOM_chest_straps"); sbm.to_mesh(sme); sbm.free()
straps = bpy.data.objects.new("DOOM_chest_straps", sme); ARMOR.objects.link(straps)
sme.materials.append(LEATHER)
sol = straps.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = 0.004; sol.offset = 1.0
bv = straps.modifiers.new("Bevel", "BEVEL"); bv.width = 0.0008; bv.segments = 2
for p in sme.polygons: p.use_smooth = True

# ------------------------------------------------------------ medallions
def medallion(name, cx, glyph):
    p, nr = surf(cx, TOP + 0.006)
    nr = (nr + Vector((0, -0.6, 0.25))).normalized()
    bm = bmesh.new()
    R, T = 0.050, 0.010
    ring = [bm.verts.new((R * math.cos(a), R * math.sin(a), 0)) for a in np.linspace(0, 2 * math.pi, 72, endpoint=False)]
    face = bm.faces.new(ring)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    top = [g for g in ext["geom"] if isinstance(g, bmesh.types.BMFace)][0]
    bmesh.ops.translate(bm, vec=(0, 0, T), verts=top.verts)
    bm.normal_update()
    bmesh.ops.inset_individual(bm, faces=[top], thickness=0.005, depth=-0.0018)   # raised rim
    bmesh.ops.inset_individual(bm, faces=[top], thickness=0.004, depth=0.0006)    # inner ring
    bmesh.ops.inset_individual(bm, faces=[top], thickness=0.0015, depth=-0.0008)
    # glyph boxes on the face
    zf = T - 0.0018 + 0.0006 - 0.0008
    def box(cx2, cy2, w, h, d=0.0028, rot=0.0):
        Mb = Matrix.Translation((cx2, cy2, zf + d / 2)) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Diagonal((w, h, d, 1))
        bmesh.ops.create_cube(bm, size=1.0, matrix=Mb)
    if glyph == "star":
        for k in range(8):
            a = k * math.pi / 4
            ln = 0.030 if k % 2 == 0 else 0.020
            box(math.cos(a) * ln / 2, math.sin(a) * ln / 2, ln, 0.0032 if k % 2 == 0 else 0.0024, rot=a)
        cyl = bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.006, radius2=0.006, depth=0.004,
                                    matrix=Matrix.Translation((0, 0, zf + 0.002)))
    else:  # hammer glyph
        box(0, -0.004, 0.0045, 0.040)
        box(0, 0.016, 0.028, 0.0075)
        box(0, -0.018, 0.016, 0.0035)
        box(0, 0.0045, 0.012, 0.0035)
    me2 = bpy.data.meshes.new(name); bm.to_mesh(me2); bm.free()
    ob = bpy.data.objects.new(name, me2); ARMOR.objects.link(ob)
    ob.matrix_world = Matrix.Translation(p + nr * 0.004) @ nr.to_track_quat("Z", "Y").to_matrix().to_4x4()
    me2.materials.append(SILVER)
    bvm = ob.modifiers.new("Bevel", "BEVEL"); bvm.width = 0.0005; bvm.segments = 2; bvm.limit_method = "ANGLE"
    ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
    for pp in me2.polygons: pp.use_smooth = True
    return ob, p + nr * 0.004 + nr * 0.012
medL, anchorL = medallion("DOOM_medallion_L", W / 2 + FRAME + 0.002, "hammer")   # character's left (+X)
medR, anchorR = medallion("DOOM_medallion_R", -(W / 2 + FRAME + 0.002), "star")

# ------------------------------------------------------------ chain
cbm = bmesh.new()
def link_mesh(bm, M, Rx=0.0075, Ry=0.0045, r=0.0014, nu=16, nv=8):
    vs = []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        c = Vector((Rx * math.cos(a), Ry * math.sin(a), 0))
        out = Vector((math.cos(a) * Ry, math.sin(a) * Rx, 0)).normalized()
        ring = []
        for j in range(nv):
            b2 = 2 * math.pi * j / nv
            pt = c + out * (r * math.cos(b2)) + Vector((0, 0, r * math.sin(b2)))
            ring.append(bm.verts.new(M @ pt))
        vs.append(ring)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((vs[i][j], vs[(i + 1) % nu][j], vs[(i + 1) % nu][(j + 1) % nv], vs[i][(j + 1) % nv]))
xa, xb2 = anchorR.x + 0.03, anchorL.x - 0.03
sag = 0.032
nlinks = 23
pts = []
for k in range(nlinks):
    t = k / (nlinks - 1)
    x = xa + (xb2 - xa) * t
    z = (anchorR.z + (anchorL.z - anchorR.z) * t) - 0.012 - sag * (1 - (2 * t - 1) ** 2)
    p, nr = surf(x, z)
    pts.append(p + nr * 0.014)
for k, p in enumerate(pts):
    d = (pts[min(k + 1, nlinks - 1)] - pts[max(k - 1, 0)]).normalized()
    q = d.to_track_quat("X", "Y")
    M = Matrix.Translation(p) @ q.to_matrix().to_4x4() @ Matrix.Rotation(math.pi / 2 * (k % 2), 4, "X")
    link_mesh(cbm, M)
cme = bpy.data.meshes.new("DOOM_chain"); cbm.to_mesh(cme); cbm.free()
for p in cme.polygons: p.use_smooth = True
chain = bpy.data.objects.new("DOOM_chain", cme); ARMOR.objects.link(chain)
cme.materials.append(SILVER)
print("CHAIN links=%d span=%.3f" % (nlinks, (pts[-1] - pts[0]).length))

# ------------------------------------------------------------ rigging
bone = "DEF-spine.003"
for ob in (medL, medR, chain, rivets):
    wm = ob.matrix_world.copy()
    ob.parent = rig; ob.parent_type = "BONE"; ob.parent_bone = bone
    bpy.context.view_layer.update(); ob.matrix_world = wm
src = [(v.co.copy(), v.groups) for v in suit.data.vertices]
kd = kdtree.KDTree(len(src))
for i2, (c2, _) in enumerate(src): kd.insert(c2, i2)
kd.balance()
for ob in (plate, straps):
    groups = {}
    for v in ob.data.vertices:
        acc = {}
        for _, i2, dist in kd.find_n(v.co, 6):
            for g in src[i2][1]:
                nm = suit.vertex_groups[g.group].name
                if nm.startswith("DEF-spine"):
                    acc[nm] = acc.get(nm, 0) + g.weight / max(dist, 1e-3)
        if not acc: acc = {bone: 1.0}
        tot = sum(acc.values())
        for nm, w in acc.items():
            if nm not in groups: groups[nm] = ob.vertex_groups.new(name=nm)
            groups[nm].add([v.index], w / tot, "REPLACE")
    a = ob.modifiers.new("Armature", "ARMATURE"); a.object = rig
    ob.modifiers.move(ob.modifiers.find("Armature"), 0)
    ob.parent = rig

# ------------------------------------------------------------ renders (presentation pose)
rig.data.pose_position = "POSE"
bpy.context.view_layer.update()
for o in bpy.data.collections["REF"].objects: o.hide_render = True
cd = bpy.data.objects["CAM_detail"]; td = bpy.data.objects["TGT_detail"]
td.location = (0, -0.12, 1.30)
shots = []
for name, off, lens in (("front", (0.0, -1.1, 0.05), 50), ("34", (0.55, -0.95, 0.12), 50), ("medallion", (0.25, -0.45, 0.25), 70)):
    if name == "medallion":
        td.location = (0.12, -0.15, 1.47)
    cd.location = td.location + Vector(off); cd.data.lens = lens
    shots.append(L.render_view("CAM_detail", "s07_chest_%s.png" % name, res=(620, 620), samples=64))
L.contact_sheet(shots, ["chest front", "chest 3/4", "medallion + chain"], "s07_chest_sheet.jpg")
paths = [L.render_view(c, "s07_full_%s.png" % c[4:], res=(460, 700), samples=40) for c in ("CAM_front", "CAM_34")]
L.contact_sheet(paths, ["front", "3/4"], "s07_full_sheet.jpg")
L.save_version(7, "Stage 7 chest: 6x7 tile lamellar plate with knot emblems, rivet bands, straps, medallions, chain")
