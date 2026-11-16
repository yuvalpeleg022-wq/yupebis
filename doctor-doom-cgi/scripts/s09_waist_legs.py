"""Stage 9 - belt and leg armour.

Reference (poster / museum figure): layered leather waist wrap under the chest
plate with a large rectangular buckle; tall greaves over the shins with knee
cops; plated boots.
  * belt: 3 overlapping, slightly tilted leather bands (ray-cast rings around
    the waist) + steel buckle with raised frame and centre bar
  * greaves: front half-tube along knee->ankle, ray-cast radius, shin crest
    ridge, rims; weights blend along the shin twist bones
  * knee cops: dome over the knee + side wings, weighted half thigh / half shin
  * sabatons: 4 shingled lames over the boot from ankle to toes
Built in the rest pose, rendered in the hero pose.
Output: work/doom_v009.blend + renders/s09_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.ndimage import gaussian_filter
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import doomlib as L

L.open_version(8)
rig = bpy.data.objects["DOOM_rig"]
rig.data.pose_position = "REST"
bpy.context.view_layer.update()
J = json.load(open(os.path.join(L.WORK, "joints_v002.json")))
suit = bpy.data.objects["DOOM_undersuit"]; boots = bpy.data.objects["DOOM_boots"]
ARMOR = bpy.data.collections["ARMOR"]
STEEL = L.aged_steel(); LEATHER = bpy.data.materials["MAT_leather_black"]
dg = bpy.context.evaluated_depsgraph_get()
def bvh(objs):
    b = bmesh.new()
    for o in objs:
        e = o.evaluated_get(dg); m = e.to_mesh()
        t = bmesh.new(); t.from_mesh(m); t.transform(o.matrix_world)
        tm = bpy.data.meshes.new("_tmp"); t.to_mesh(tm); t.free(); b.from_mesh(tm); bpy.data.meshes.remove(tm); e.to_mesh_clear()
    tr = BVHTree.FromBMesh(b); b.free(); return tr
# ---- boot toe box: remove the individual toe shapes (smooth, then clearance over the foot skin)
body = bpy.data.objects["DOOM_body"]
fb = bmesh.new(); fb.from_mesh(body.data); fb.faces.ensure_lookup_table()
bmesh.ops.delete(fb, geom=[f for f in fb.faces if f.calc_center_median().z > 0.16], context="FACES")
foot_tree = BVHTree.FromBMesh(fb); fb.free()
bb = bmesh.new(); bb.from_mesh(boots.data)
for s_, sx in (("l", 1), ("r", -1)):
    ball = Vector(J[s_ + "-foot-1"])
    toe = [v for v in bb.verts if v.co.x * sx > 0 and v.co.y < ball.y + 0.03 and v.co.z < 0.075]
    for _ in range(30):
        bmesh.ops.smooth_vert(bb, verts=toe, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for v in toe:
        loc, nrm, idx, d = foot_tree.find_nearest(v.co, 0.05)
        if loc is not None and (v.co - loc).dot(nrm) < 0.006:
            v.co = loc + nrm * 0.006
    for _ in range(3):
        bmesh.ops.smooth_vert(bb, verts=toe, factor=0.3, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bb.to_mesh(boots.data); bb.free(); boots.data.update()
print("BOOT toe boxes smoothed")
dg = bpy.context.evaluated_depsgraph_get()
TREE = bvh([suit, boots])
def rad(origin, d, fb=0.07):
    h = TREE.ray_cast(origin, d, 0.5)
    return h[3] if h[0] is not None else fb

def grid_object(name, P, closed_u=False, mat=STEEL):
    nv, nu = P.shape[:2]
    bm = bmesh.new()
    vs = [[bm.verts.new(P[j, i].tolist()) for i in range(nu)] for j in range(nv)]
    for j in range(nv - 1):
        for i in (range(nu) if closed_u else range(nu - 1)):
            i2 = (i + 1) % nu
            bm.faces.new((vs[j][i], vs[j][i2], vs[j + 1][i2], vs[j + 1][i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); ARMOR.objects.link(ob); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = True
    return ob
def orient_out(ob, A, B):
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.normal_update()
    d = (B - A).normalized(); sc_ = 0
    for f in bm.faces:
        v = f.calc_center_median() - A; sc_ += (v - d * v.dot(d)).dot(f.normal)
    if sc_ < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data); bm.free()
def hard_surface(ob, thick, bw=0.0006, subd=1):
    s = ob.modifiers.new("Solidify", "SOLIDIFY"); s.thickness = thick; s.offset = -1.0; s.use_even_offset = True
    b = ob.modifiers.new("Bevel", "BEVEL"); b.width = bw; b.segments = 2; b.limit_method = "ANGLE"; b.angle_limit = math.radians(35)
    u = ob.modifiers.new("Subdivision", "SUBSURF"); u.levels, u.render_levels = 0, subd
    ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
def bind(ob, fn):
    groups = {}
    for v in ob.data.vertices:
        ws = fn(ob.matrix_world @ v.co); tot = sum(ws.values())
        for nm, w in ws.items():
            if nm not in groups: groups[nm] = ob.vertex_groups.new(name=nm)
            groups[nm].add([v.index], w / tot, "REPLACE")
    a = ob.modifiers.new("Armature", "ARMATURE"); a.object = rig
    ob.modifiers.move(ob.modifiers.find("Armature"), 0); ob.parent = rig
def bone_parent(ob, bone):
    wm = ob.matrix_world.copy(); ob.parent = rig; ob.parent_type = "BONE"; ob.parent_bone = bone
    bpy.context.view_layer.update(); ob.matrix_world = wm
built = []

# ------------------------------------------------------------ belt
pelvis_w = lambda c: {"DEF-spine": 0.7, "DEF-spine.001": 0.3}
for k, (zc, tilt, off) in enumerate(((1.072, 3.0, 0.010), (1.040, -4.0, 0.0135), (1.008, 5.0, 0.017))):
    NP, NT = 120, 6
    P = np.zeros((NT, NP, 3))
    R = np.zeros((NT, NP)); D = {}
    for jj, hh in enumerate(np.linspace(-0.019, 0.019, NT)):
        for ii in range(NP):
            ph = 2 * math.pi * ii / NP
            d = Vector((math.sin(ph), -math.cos(ph), 0))
            z = zc + hh + math.radians(tilt) * 0.17 * math.sin(ph)
            c0 = Vector((0, 0.01, z))
            R[jj, ii] = rad(c0, d, 0.16); D[jj, ii] = (c0, d)
    R = gaussian_filter(R, (0.8, 2.0), mode=("nearest", "wrap")) + off
    for jj in range(NT):
        for ii in range(NP):
            c0, d = D[jj, ii]; P[jj, ii] = c0 + d * R[jj, ii]
    ob = grid_object("DOOM_belt_%d" % k, P, closed_u=True, mat=LEATHER)
    orient_out(ob, Vector((0, 0.01, 0.9)), Vector((0, 0.01, 1.2)))
    hard_surface(ob, 0.004, 0.0008, subd=1)
    bind(ob, pelvis_w); built.append(ob)
# buckle
front_r = rad(Vector((0, 0.01, 1.040)), Vector((0, -1, 0)), 0.16) + 0.019
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0.01 - front_r - 0.003, 1.040)) @ Matrix.Diagonal((0.080, 0.008, 0.058, 1)))
bm.normal_update()
front = max(bm.faces, key=lambda f: -f.calc_center_median().y)
bmesh.ops.inset_individual(bm, faces=[front], thickness=0.008, depth=-0.0025)
bmesh.ops.inset_individual(bm, faces=[front], thickness=0.004, depth=0.0018)
bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0, 0.01 - front_r - 0.0085, 1.040)) @ Matrix.Diagonal((0.008, 0.004, 0.050, 1)))
me = bpy.data.meshes.new("DOOM_buckle"); bm.to_mesh(me); bm.free()
buckle = bpy.data.objects.new("DOOM_buckle", me); ARMOR.objects.link(buckle); me.materials.append(STEEL)
bv = buckle.modifiers.new("Bevel", "BEVEL"); bv.width = 0.0008; bv.segments = 3
buckle.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True
bone_parent(buckle, "DEF-spine"); built.append(buckle)

# ------------------------------------------------------------ legs
for s, S_ in (("l", "L"), ("r", "R")):
    sx = 1 if s == "l" else -1
    K, A, B1, T2 = (Vector(J[s + n]) for n in ("-knee", "-ankle", "-foot-1", "-foot-2"))
    sh = A - K; Ls = sh.length; sh.normalize()
    f = (Vector((0, -1, 0)) - sh * sh.dot(Vector((0, -1, 0)))).normalized()
    w = sh.cross(f).normalized()
    # greave
    NT, NP = 44, 40
    ts = np.linspace(0.07, 0.86, NT); ps = np.radians(np.linspace(-112, 112, NP))
    R = np.zeros((NT, NP)); D = {}
    for jj, t in enumerate(ts):
        for ii, ph in enumerate(ps):
            d = (f * math.cos(ph) + w * math.sin(ph)).normalized()
            c0 = K + sh * (t * Ls); R[jj, ii] = rad(c0, d, 0.06); D[jj, ii] = (c0, d)
    R = gaussian_filter(R, 1.6) + 0.011
    P = np.zeros((NT, NP, 3))
    for jj, t in enumerate(ts):
        rim = 0.0022 if (t - ts[0] < 0.02 or ts[-1] - t < 0.02) else 0.0
        flare = 0.006 * max(0.0, (t - 0.72) / 0.14) ** 2
        for ii, ph in enumerate(ps):
            crest = 0.0045 * math.exp(-(math.degrees(ph) / 9.0) ** 2)
            c0, d = D[jj, ii]; P[jj, ii] = c0 + d * (R[jj, ii] + rim + crest + flare)
    g = grid_object("DOOM_greave_" + S_, P); orient_out(g, K, A); hard_surface(g, 0.0032)
    def gw(c, K=K, sh=sh, Ls=Ls, S_=S_):
        t = (c - K).dot(sh) / Ls; k = min(1.0, max(0.0, (t - 0.3) / 0.45))
        return {"DEF-shin." + S_: 1 - k + 1e-4, "DEF-shin." + S_ + ".001": k + 1e-4}
    bind(g, gw); built.append(g)
    # knee cop (dome + wings)
    th = (K - Vector(J[s + "-upper-leg"])).normalized()
    NT, NP = 18, 30
    ts = np.linspace(-0.075, 0.07, NT); ps = np.radians(np.linspace(-95, 95, NP))
    R = np.zeros((NT, NP)); D = {}
    for jj, t in enumerate(ts):
        axis = th if t < 0 else sh
        ff = (Vector((0, -1, 0)) - axis * axis.dot(Vector((0, -1, 0)))).normalized(); ww = axis.cross(ff).normalized()
        for ii, ph in enumerate(ps):
            d = (ff * math.cos(ph) + ww * math.sin(ph)).normalized()
            c0 = K + axis * abs(t) * (1 if t > 0 else 1)
            c0 = K + (th * t if t < 0 else sh * t)
            R[jj, ii] = rad(c0, d, 0.06); D[jj, ii] = (c0, d)
    R = gaussian_filter(R, 1.5) + 0.020
    P = np.zeros((NT, NP, 3))
    for jj, t in enumerate(ts):
        dome = 0.010 * math.cos(min(1.0, abs(t) / 0.075) * math.pi / 2)
        for ii, ph in enumerate(ps):
            c0, d = D[jj, ii]
            P[jj, ii] = c0 + d * (R[jj, ii] + dome * math.cos(ph * 0.9))
    kc = grid_object("DOOM_kneecop_" + S_, P); orient_out(kc, K + th * -0.1, K + sh * 0.1); hard_surface(kc, 0.003)
    bind(kc, lambda c, S_=S_: {"DEF-thigh." + S_ + ".001": 0.45, "DEF-shin." + S_: 0.55}); built.append(kc)
    # sabatons: 4 lames from ankle to toes over the boot
    ft = (T2 - A); ft.z = 0; Lf = ft.length; ft.normalize()
    up = Vector((0, 0, 1)); side = ft.cross(up).normalized()
    for k, (t0, t1, off) in enumerate(((0.18, 0.40, 0.016), (0.34, 0.56, 0.013), (0.50, 0.72, 0.010), (0.66, 0.90, 0.007))):
        NT, NP = 10, 24
        ts = np.linspace(t0, t1, NT); ps = np.radians(np.linspace(-78, 78, NP))
        R = np.full((NT, NP), np.nan); D = {}
        for jj, t in enumerate(ts):
            c0 = Vector((A.x, A.y, 0.028)) + ft * (t * Lf)
            for ii, ph in enumerate(ps):
                d = (up * math.cos(ph) + side * math.sin(ph)).normalized()
                h = TREE.ray_cast(c0, d, 0.12)
                if h[0] is not None: R[jj, ii] = h[3]
                D[jj, ii] = (c0, d)
            row = R[jj]
            if np.isnan(row).all(): R[jj] = np.nanmean(R[:jj]) if jj else 0.03
            else: R[jj, np.isnan(row)] = np.nanmin(row)
        R = gaussian_filter(R, 1.2) + off
        P = np.zeros((NT, NP, 3))
        for jj in range(NT):
            roll = 0.0025 * max(0.0, (jj - (NT - 3)) / 2.0)
            for ii in range(NP):
                c0, d = D[jj, ii]; P[jj, ii] = c0 + d * (R[jj, ii] + roll)
        sb = grid_object("DOOM_sabaton_%s_%d" % (S_, k), P)
        orient_out(sb, Vector((A.x, A.y, 0.035)), Vector((A.x, A.y, 0.035)) + ft)
        hard_surface(sb, 0.0028)
        bone_parent(sb, ("DEF-foot." if k < 3 else "DEF-toe.") + S_); built.append(sb)

# toe caps (front dome over the boot toe box)
for s, S_ in (("l", "L"), ("r", "R")):
    A, T2 = Vector(J[s + "-ankle"]), Vector(J[s + "-foot-2"])
    ft = (T2 - A); ft.z = 0; ft.normalize()
    c0 = Vector((T2.x, T2.y + 0.035, 0.028))
    NT, NP = 12, 26
    R = np.full((NT, NP), np.nan); D = {}
    for jj, el in enumerate(np.radians(np.linspace(0, 80, NT))):
        for ii, az in enumerate(np.radians(np.linspace(-80, 80, NP))):
            side = ft.cross(Vector((0, 0, 1))).normalized()
            d = (ft * math.cos(el) * math.cos(az) + side * math.cos(el) * math.sin(az) + Vector((0, 0, 1)) * math.sin(el)).normalized()
            h = TREE.ray_cast(c0, d, 0.12)
            if h[0] is not None: R[jj, ii] = h[3]
            D[jj, ii] = d
    R[np.isnan(R)] = np.nanmin(R)
    R = gaussian_filter(R, 1.0) + 0.006
    P = np.zeros((NT, NP, 3))
    for jj in range(NT):
        for ii in range(NP):
            P[jj, ii] = c0 + D[jj, ii] * R[jj, ii]
    tc = grid_object("DOOM_toecap_" + S_, P); orient_out(tc, c0 - ft * 0.1, c0)
    bm_ = bmesh.new(); bm_.from_mesh(tc.data); bm_.normal_update()
    ctr = c0 - ft * 0.02
    if sum((f.calc_center_median() - ctr).dot(f.normal) for f in bm_.faces) < 0:
        bmesh.ops.reverse_faces(bm_, faces=bm_.faces[:])
    bm_.to_mesh(tc.data); bm_.free()
    hard_surface(tc, 0.0028); bone_parent(tc, "DEF-toe." + S_); built.append(tc)

for ob in built:
    r = L.mesh_report(ob); print("PIECE %-26s verts=%6d dims=%s" % (ob.name, r["verts"], r["dims_m"]))

# ------------------------------------------------------------ renders (hero pose)
rig.data.pose_position = "POSE"; bpy.context.view_layer.update()
for o in bpy.data.collections["REF"].objects: o.hide_render = True
cd = bpy.data.objects["CAM_detail"]; td = bpy.data.objects["TGT_detail"]
shots = []
for name, tgt, off, lens in (("belt", Vector((0, -0.12, 1.05)), (0.35, -0.75, 0.08), 50),
                             ("leg", Vector((0.17, -0.05, 0.35)), (0.55, -1.0, 0.15), 45),
                             ("foot", Vector((0.2, -0.12, 0.06)), (0.45, -0.55, 0.2), 50)):
    td.location = tgt; cd.location = tgt + Vector(off); cd.data.lens = lens
    shots.append(L.render_view("CAM_detail", "s09_%s.png" % name, res=(560, 560), samples=64))
L.contact_sheet(shots, ["belt + buckle", "greave + knee", "sabatons"], "s09_waist_legs_sheet.jpg")
paths = [L.render_view(c, "s09_full_%s.png" % c[4:], res=(460, 700), samples=40) for c in ("CAM_front", "CAM_34", "CAM_side")]
L.contact_sheet(paths, ["front", "3/4", "side"], "s09_full_sheet.jpg")
L.save_version(9, "Stage 9 waist + legs: layered belt + buckle, greaves, knee cops, sabatons")
