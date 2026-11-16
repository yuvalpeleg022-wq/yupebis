"""Stage 5 - undersuit layers (the clothing under the armour).

Every garment is a duplicate of the high-res body restricted to a region chosen
by the dominant skin-weight bone, pushed out along the normals, given real
thickness (Solidify) and keeping the body's skin weights, so it deforms exactly
like the body:
  DOOM_undersuit  torso / arms / thighs / upper shins - dark green padded tunic
                  fabric on the torso and legs, dark-steel chainmail on the arms
  DOOM_gloves     hands - black leather
  DOOM_boots      feet + lower shins - black leather
  DOOM_cowl       head + neck - black knit balaclava with eye openings
                  (dark eye holes behind the mask, as in the references)
Output: work/doom_v005.blend + renders/s05_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, bmesh
from mathutils import Vector
import doomlib as L

L.open_version(4)
body = bpy.data.objects["DOOM_body"]
rig = bpy.data.objects["DOOM_rig"]
J = json.load(open(os.path.join(L.WORK, "joints_v002.json")))
me = body.data
names = {vg.index: vg.name for vg in body.vertex_groups}

# clean geometric regions on the rest-pose body (face centres)
FC = [p.center.copy() for p in me.polygons]
def side_axis(s, a, b):
    A, Bv = Vector(J[s + "-" + a]), Vector(J[s + "-" + b])
    return A, (Bv - A).normalized()
def dist_to_line(c, A, d):
    v = c - A
    return (v - d * v.dot(d)).length
SH = {s: side_axis(s, "shoulder", "elbow") for s in ("l", "r")}
WR = {s: side_axis(s, "elbow", "hand") for s in ("l", "r")}
HAND = {s: Vector(J[s + "-hand"]) for s in ("l", "r")}
def dist_seg(c, A, Bv):
    d = Bv - A; t = max(0.0, min(1.0, (c - A).dot(d) / d.length_squared))
    return (c - (A + d * t)).length
def is_arm(c):
    s = "l" if c.x > 0 else "r"
    A, d = SH[s]
    S, E, H = Vector(J[s + "-shoulder"]), Vector(J[s + "-elbow"]), Vector(J[s + "-hand"])
    return abs(c.x) > 0.15 and (c - A).dot(d) > 0.0 and min(dist_seg(c, S, E), dist_seg(c, E, H)) < 0.1
def wrist_t(c):
    s = "l" if c.x > 0 else "r"
    E, d = WR[s]
    return (c - HAND[s]).dot(d)
COWL_Z, SUIT_TOP_Z, BOOT_Z, SUIT_LOW_Z = 1.58, 1.62, 0.30, 0.27
def in_cowl(c): return c.z > COWL_Z and abs(c.x) < 0.14
def in_glove(c): return abs(c.x) > 0.3 and wrist_t(c) > -0.025
def in_suit(c):
    if c.z < SUIT_LOW_Z or c.z > 1.70: return False
    if abs(c.x) > 0.3 and wrist_t(c) > 0.0: return False
    return not (c.z > SUIT_TOP_Z and abs(c.x) < 0.14)
def in_boot(c): return c.z < BOOT_Z
# ------------------------------------------------------------- materials
def principled(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]

def sock(sockets, name, typ="RGBA"):
    return next(x for x in sockets if x.name == name and x.type == typ)

def uvscaled(nodes, links, scale):
    tc = nodes.new("ShaderNodeTexCoord"); mp = nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    links.new(tc.outputs["UV"], mp.inputs["Vector"]); return mp.outputs["Vector"]

def fabric_padded():
    m, n, l, b = principled("MAT_tunic_padded_fabric")
    uv = uvscaled(n, l, 420)
    w1 = n.new("ShaderNodeTexWave"); w1.wave_type = "BANDS"; w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 1.0
    w2 = n.new("ShaderNodeTexWave"); w2.wave_type = "BANDS"; w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 1.0
    for w in (w1, w2): l.new(uv, w.inputs["Vector"])
    weave = n.new("ShaderNodeMath"); weave.operation = "MAXIMUM"
    l.new(w1.outputs["Fac"], weave.inputs[0]); l.new(w2.outputs["Fac"], weave.inputs[1])
    # quilting: large diamond stitching
    uvq = uvscaled(n, l, 22)
    q1 = n.new("ShaderNodeTexWave"); q1.wave_type = "BANDS"; q1.bands_direction = "DIAGONAL"; q1.inputs["Scale"].default_value = 1.0
    q1.wave_profile = "TRI"; l.new(uvq, q1.inputs["Vector"])
    mp2 = n.new("ShaderNodeMapping"); mp2.inputs["Rotation"].default_value = (0, 0, math.radians(90))
    l.new(uvq, mp2.inputs["Vector"])
    q2 = n.new("ShaderNodeTexWave"); q2.wave_type = "BANDS"; q2.bands_direction = "DIAGONAL"; q2.wave_profile = "TRI"
    q2.inputs["Scale"].default_value = 1.0; l.new(mp2.outputs["Vector"], q2.inputs["Vector"])
    quilt = n.new("ShaderNodeMath"); quilt.operation = "MINIMUM"
    l.new(q1.outputs["Fac"], quilt.inputs[0]); l.new(q2.outputs["Fac"], quilt.inputs[1])
    noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 8; noise.inputs["Detail"].default_value = 8
    l.new(uv, noise.inputs["Vector"]) if False else None
    col = n.new("ShaderNodeMix"); col.data_type = "RGBA"
    sock(col.inputs, "A").default_value = (0.004, 0.009, 0.005, 1); sock(col.inputs, "B").default_value = (0.010, 0.020, 0.011, 1)
    l.new(noise.outputs["Fac"], col.inputs["Factor"]); l.new(sock(col.outputs, "Result"), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.86
    b.inputs["Sheen Weight"].default_value = 0.22; b.inputs["Sheen Roughness"].default_value = 0.45
    b.inputs["Sheen Tint"].default_value = (0.12, 0.2, 0.13, 1)
    bq = n.new("ShaderNodeBump"); bq.inputs["Strength"].default_value = 0.5; bq.inputs["Distance"].default_value = 0.004
    l.new(quilt.outputs["Value"], bq.inputs["Height"])
    bw = n.new("ShaderNodeBump"); bw.inputs["Strength"].default_value = 0.3; bw.inputs["Distance"].default_value = 0.0005
    l.new(weave.outputs["Value"], bw.inputs["Height"]); l.new(bq.outputs["Normal"], bw.inputs["Normal"])
    l.new(bw.outputs["Normal"], b.inputs["Normal"])
    return m

def chainmail():
    m, n, l, b = principled("MAT_chainmail_dark_steel")
    uv = uvscaled(n, l, 520)
    def rings(vec):
        # distance to the cell centre -> ring profile
        sep = n.new("ShaderNodeVectorMath"); sep.operation = "FRACTION"; l.new(vec, sep.inputs[0])
        sub = n.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (0.5, 0.5, 0.0)
        l.new(sep.outputs["Vector"], sub.inputs[0])
        ln = n.new("ShaderNodeVectorMath"); ln.operation = "LENGTH"; l.new(sub.outputs["Vector"], ln.inputs[0])
        r = n.new("ShaderNodeMapRange"); r.data_type = "FLOAT"
        r.inputs["From Min"].default_value = 0.0; r.inputs["From Max"].default_value = 0.5
        l.new(ln.outputs["Value"], r.inputs["Value"])
        cr = n.new("ShaderNodeFloatCurve")
        c = cr.mapping.curves[0]
        c.points[0].location = (0, 0); c.points[1].location = (1, 0)
        for x, y in ((0.55, 0.0), (0.72, 1.0), (0.88, 0.0)):
            c.points.new(x, y)
        cr.mapping.update()
        l.new(r.outputs["Result"], cr.inputs["Value"])
        return cr.outputs["Value"]
    off = n.new("ShaderNodeVectorMath"); off.operation = "ADD"; off.inputs[1].default_value = (0.5, 0.5, 0)
    l.new(uv, off.inputs[0])
    r1, r2 = rings(uv), rings(off.outputs["Vector"])
    mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; l.new(r1, mx.inputs[0]); l.new(r2, mx.inputs[1])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 1.0; bump.inputs["Distance"].default_value = 0.0012
    l.new(mx.outputs["Value"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    cav = n.new("ShaderNodeMix"); cav.data_type = "RGBA"
    sock(cav.inputs, "A").default_value = (0.004, 0.005, 0.005, 1); sock(cav.inputs, "B").default_value = (0.09, 0.09, 0.085, 1)
    l.new(mx.outputs["Value"], cav.inputs["Factor"]); l.new(sock(cav.outputs, "Result"), b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = 0.9
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.75; rr.inputs["To Max"].default_value = 0.32
    l.new(mx.outputs["Value"], rr.inputs["Value"]); l.new(rr.outputs["Result"], b.inputs["Roughness"])
    return m

def leather(name, color, coords="UV"):
    m, n, l, b = principled(name)
    if coords == "UV":
        uv = uvscaled(n, l, 300)
    else:
        tc = n.new("ShaderNodeTexCoord"); mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (90, 90, 90)
        l.new(tc.outputs["Object"], mp.inputs["Vector"]); uv = mp.outputs["Vector"]
    vor = n.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 2.5
    l.new(uv, vor.inputs["Vector"])
    noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 0.08; noise.inputs["Detail"].default_value = 6
    l.new(uv, noise.inputs["Vector"])
    b.inputs["Base Color"].default_value = color
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.48; rr.inputs["To Max"].default_value = 0.72
    l.new(noise.outputs["Fac"], rr.inputs["Value"]); l.new(rr.outputs["Result"], b.inputs["Roughness"])
    b.inputs["Coat Weight"].default_value = 0.06; b.inputs["Coat Roughness"].default_value = 0.4
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.0004
    l.new(vor.outputs["Distance"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

def knit_black():
    m, n, l, b = principled("MAT_cowl_black_knit")
    uv = uvscaled(n, l, 700)
    w = n.new("ShaderNodeTexWave"); w.wave_type = "RINGS"; w.inputs["Scale"].default_value = 1.0
    w.inputs["Distortion"].default_value = 2.0; l.new(uv, w.inputs["Vector"])
    b.inputs["Base Color"].default_value = (0.006, 0.006, 0.007, 1)
    b.inputs["Roughness"].default_value = 0.95
    b.inputs["Sheen Weight"].default_value = 0.15; b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Sheen Tint"].default_value = (0.1, 0.1, 0.1, 1)
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.0005
    l.new(w.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m

MATS = {"fabric": fabric_padded(), "chain": chainmail(),
        "leather": leather("MAT_leather_black", (0.012, 0.010, 0.009, 1)),
        "leather_obj": leather("MAT_leather_black_boot", (0.012, 0.010, 0.009, 1), coords="OBJECT"),
        "knit": knit_black()}

# ------------------------------------------------------------- garments
def duplicate(name, keep, col):
    ob = body.copy(); ob.data = body.data.copy(); ob.name = name; ob.data.name = name
    col.objects.link(ob)
    ob.modifiers.remove(ob.modifiers["Subdivision"])
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.index, FC[f.index])], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    return ob, bm

def finish(ob, bm, push, thick, even=False):
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * push
    bm.to_mesh(ob.data); bm.free()
    ob.data.materials.clear()
    if thick:
        sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = thick; sol.offset = -1.0
        sol.use_even_offset = even; sol.use_quality_normals = True
    sub = ob.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 1, 2
    ob.parent = rig
    return ob

UNDER = L.collection("UNDERSUIT", bpy.data.collections["CHARACTER"])
# undersuit: tunic fabric + chainmail sleeves (straight cut at the shoulder joint)
suit, bm = duplicate("DOOM_undersuit", lambda i, c: in_suit(c), UNDER)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
finish(suit, bm, 0.004, 0.0025)
suit.data.materials.append(MATS["fabric"]); suit.data.materials.append(MATS["chain"])
for p in suit.data.polygons:
    p.material_index = 1 if is_arm(p.center) else 0
# gloves (cut 2.5 cm above the wrist joint, under the sleeve)
gloves, bm = duplicate("DOOM_gloves", lambda i, c: in_glove(c), UNDER)
bm.normal_update()
for v in bm.verts: v.co += v.normal * 0.0012
for _ in range(3):
    bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
# keep the smoothed glove >= 2.4 mm outside the hand skin (inner wall then sits >= 1.2 mm out)
from mathutils.bvhtree import BVHTree
hbm = bmesh.new(); hbm.from_mesh(me); hbm.faces.ensure_lookup_table()
bmesh.ops.delete(hbm, geom=[f for f in hbm.faces if not in_glove(FC[f.index])], context="FACES")
htree = BVHTree.FromBMesh(hbm); hbm.free()
gmoved = 0
for v in bm.verts:
    loc, nrm, idx, d = htree.find_nearest(v.co)
    if loc is not None and (v.co - loc).dot(nrm) < 0.0024:
        v.co = loc + nrm * 0.0024; gmoved += 1
print("GLOVE clearance moves", gmoved)
finish(gloves, bm, 0.0, 0.0012)
gloves.data.materials.append(MATS["leather"])
# cowl / balaclava with eye openings
eyes = [Vector(J["l-eye"]), Vector(J["r-eye"])]
def cowl_keep(i, c):
    if not in_cowl(c): return False
    return not any((c - e).length < 0.0125 and c.y < e.y + 0.004 for e in eyes)
cowl, bm = duplicate("DOOM_cowl", cowl_keep, UNDER)
finish(cowl, bm, 0.0025, 0.0015)
cowl.data.materials.append(MATS["knit"])

# boots: foot + lower shin, pushed out, voxel-remeshed so the toes fuse into one
# boot volume, smoothed, then skin weights copied from the nearest body vertex
def make_boot():
    from mathutils import kdtree
    from mathutils.bvhtree import BVHTree
    ob, bm = duplicate("DOOM_boots", lambda i, c: in_boot(c), UNDER)
    bm.to_mesh(ob.data); bm.free()
    ob.modifiers.clear()
    # closed volume: skin -> +8 mm, then voxel remesh fuses the toes into one boot
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = 0.008; sol.offset = 1.0; sol.use_even_offset = True
    rm = ob.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0035; rm.use_smooth_shade = True
    dg = bpy.context.evaluated_depsgraph_get()
    newme = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear(); ob.data = newme; newme.name = "DOOM_boots"
    # clearance: every vertex >= 4 mm outside the (rest) foot skin
    fbm = bmesh.new(); fbm.from_mesh(me)
    fbm.faces.ensure_lookup_table()
    bmesh.ops.delete(fbm, geom=[f for f in fbm.faces if FC[f.index].z > BOOT_Z + 0.05], context="FACES")
    tree = BVHTree.FromBMesh(fbm); fbm.free()
    bm = bmesh.new(); bm.from_mesh(newme)
    def signed(v):
        loc, nrm, idx, d = tree.find_nearest(v.co)
        return 1.0 if loc is None else (v.co - loc).dot(nrm), loc, nrm
    # drop the inner shell (the part of the voxel volume lying on the skin)
    inner = [v for v in bm.verts if signed(v)[0] < 0.004]
    bmesh.ops.delete(bm, geom=inner, context="VERTS")
    # keep only the largest connected piece (the outer boot shell per foot)
    bm.verts.ensure_lookup_table()
    seen, pieces = set(), []
    for v in bm.verts:
        if v in seen: continue
        stack, comp = [v], []
        seen.add(v)
        while stack:
            x = stack.pop(); comp.append(x)
            for e in x.link_edges:
                o = e.other_vert(x)
                if o not in seen: seen.add(o); stack.append(o)
        pieces.append(comp)
    pieces.sort(key=len, reverse=True)
    junk = [v for comp in pieces[2:] for v in comp]
    bmesh.ops.delete(bm, geom=junk, context="VERTS")
    moved = 0
    for it in range(2):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.4, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        for v in bm.verts:
            sd, loc, nrm = signed(v)
            if loc is not None and sd < 0.0045 and (v.co - loc).length < 0.02:
                v.co = loc + nrm * 0.0045; moved += 1
    bm.to_mesh(newme); bm.free()
    print("BOOT inner_removed=%d pieces=%d kept=%s clearance_moves=%d" % (len(inner), len(pieces), [len(c) for c in pieces[:2]], moved))
    # weights from nearest body vertex (rest pose)
    bco = [v.co for v in me.vertices]
    cand = [i for i, c in enumerate(bco) if c.z < BOOT_Z + 0.08]
    kd = kdtree.KDTree(len(cand))
    for k, i in enumerate(cand): kd.insert(bco[i], k)
    kd.balance()
    for vg in list(ob.vertex_groups): ob.vertex_groups.remove(vg)
    groups = {}
    for v in newme.vertices:
        _, k, _ = kd.find(v.co)
        for g in me.vertices[cand[k]].groups:
            nm = body.vertex_groups[g.group].name
            if nm not in groups: groups[nm] = ob.vertex_groups.new(name=nm)
            groups[nm].add([v.index], g.weight, "REPLACE")
    arm = ob.modifiers.new("Armature", "ARMATURE"); arm.object = rig; arm.use_deform_preserve_volume = True
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = 0.003; sol.offset = -1.0
    sub = ob.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 0, 1
    ob.parent = rig
    newme.materials.clear(); newme.materials.append(MATS["leather_obj"])
    for p in newme.polygons: p.material_index = 0; p.use_smooth = True
    return ob
boots = make_boot()
for ob in (suit, gloves, boots, cowl):
    print("GARMENT", json.dumps(L.mesh_report(ob)), "groups=%d" % len(ob.vertex_groups))
# ------------------------------------------------------------- inspection
for o in bpy.data.collections["REF"].objects: o.hide_render = True
paths, labels = [], []
for cam, lab in (("CAM_front", "front"), ("CAM_side", "side"), ("CAM_34", "3/4")):
    paths.append(L.render_view(cam, "s05_suit_%s.png" % cam[4:], res=(500, 760), samples=40)); labels.append(lab)
L.contact_sheet(paths, labels, "s05_suit_sheet.jpg")
# close-ups: chainmail forearm + fabric, mask/cowl eye holes
cam = bpy.data.objects["CAM_detail"]; tgt = bpy.data.objects["TGT_detail"]
elbow = Vector(J["l-elbow"]); tgt.location = elbow + Vector((0.02, -0.02, 0.05))
cam.location = elbow + Vector((0.35, -0.55, 0.12)); cam.data.lens = 60
d1 = L.render_view("CAM_detail", "s05_detail_chainmail.png", res=(560, 560), samples=48)
cm = bpy.data.objects["CAM_mask"]; th = bpy.data.objects["TGT_head"]
cm.location = th.location + Vector((0.0, -0.7, 0.02))
d2 = L.render_view("CAM_mask", "s05_detail_face.png", res=(560, 560), samples=48)
hand = Vector(J["l-hand"]); tgt.location = hand + Vector((0.02, -0.03, -0.04))
cam.location = hand + Vector((0.45, -0.45, 0.05)); cam.data.lens = 60
d3 = L.render_view("CAM_detail", "s05_detail_glove.png", res=(560, 560), samples=48)
foot = Vector(J["l-ankle"]); tgt.location = foot + Vector((0, -0.08, 0.04))
cam.location = foot + Vector((0.45, -0.6, 0.18))
d4 = L.render_view("CAM_detail", "s05_detail_boot.png", res=(560, 560), samples=48)
L.contact_sheet([d1, d2, d3, d4], ["chainmail sleeve + tunic", "cowl behind mask", "leather glove", "boot"], "s05_detail_sheet.jpg")
L.save_version(5, "Stage 5 undersuit: padded tunic fabric, chainmail sleeves, leather gloves/boots, knit cowl")
