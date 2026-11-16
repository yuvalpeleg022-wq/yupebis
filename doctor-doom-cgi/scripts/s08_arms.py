"""Stage 8 - shoulder and arm armour.

Reference (poster): layered pauldrons on both shoulders, long dark ribbed
vambraces from wrist to below the elbow, armoured gloves, cloth wraps on the
upper arms.
  * pauldrons: 4 shingled lames per side; each lame is a patch around the
    shoulder->elbow axis whose radius is ray-cast onto the suit + an offset
    that grows toward the top lame, smoothed, rolled bottom edge, rivets
  * vambraces: closed tube around the elbow->wrist axis, ray-cast radius,
    raised rims, 3 ribs on the outer side, flared wrist; weights blend along
    the forearm twist bones
  * gauntlet plates: back-of-hand plate + one plate per finger/thumb segment,
    cut from the glove surface on the back of the hand, bone-parented
  * arm wraps: 3 slightly tilted fabric bands on each upper arm
All built in the rest pose, rendered in the hero pose.
Output: work/doom_v008.blend + renders/s08_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.ndimage import gaussian_filter
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
import doomlib as L

L.open_version(7)
sc = bpy.context.scene
rig = bpy.data.objects["DOOM_rig"]
rig.data.pose_position = "REST"
bpy.context.view_layer.update()
J = json.load(open(os.path.join(L.WORK, "joints_v002.json")))
suit = bpy.data.objects["DOOM_undersuit"]
gloves = bpy.data.objects["DOOM_gloves"]
ARMOR = bpy.data.collections["ARMOR"]
STEEL = L.aged_steel()
LEATHER = bpy.data.materials["MAT_leather_black"]

dg = bpy.context.evaluated_depsgraph_get()
def bvh(objs):
    b = bmesh.new()
    for o in objs:
        e = o.evaluated_get(dg); m = e.to_mesh()
        t = bmesh.new(); t.from_mesh(m); t.transform(o.matrix_world)
        tm = bpy.data.meshes.new("_tmp"); t.to_mesh(tm); t.free()
        b.from_mesh(tm); bpy.data.meshes.remove(tm); e.to_mesh_clear()
    tree = BVHTree.FromBMesh(b); b.free(); return tree
TREE = bvh([suit, gloves])

def radius_from(origin, d, fallback=0.06):
    hit = TREE.ray_cast(origin, d, 0.4)
    return hit[3] if hit[0] is not None else fallback

def grid_object(name, P, closed_u=False, mat=STEEL, thick=0.003, bevel=True):
    nv, nu = P.shape[:2]
    bm = bmesh.new()
    vs = [[bm.verts.new(P[j, i].tolist()) for i in range(nu)] for j in range(nv)]
    rng = range(nu) if closed_u else range(nu - 1)
    for j in range(nv - 1):
        for i in rng:
            i2 = (i + 1) % nu
            bm.faces.new((vs[j][i], vs[j][i2], vs[j + 1][i2], vs[j + 1][i]))
    bm.normal_update()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); ARMOR.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    return ob

def orient_out(ob, axis_pts):
    """make normals point away from the given axis (outward)"""
    bm = bmesh.new(); bm.from_mesh(ob.data); bm.normal_update()
    A, B = axis_pts
    d = (B - A).normalized()
    score = 0
    for f in bm.faces:
        c = f.calc_center_median(); v = c - A; radial = v - d * v.dot(d)
        score += radial.dot(f.normal)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data); bm.free()

def hard_surface(ob, thick, bevel_w=0.0006):
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = thick; sol.offset = -1.0; sol.use_even_offset = True
    bv = ob.modifiers.new("Bevel", "BEVEL"); bv.width = bevel_w; bv.segments = 2; bv.limit_method = "ANGLE"; bv.angle_limit = math.radians(35)
    sub = ob.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 0, 1
    ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL").keep_sharp = True

def rivet_obj(name, pts):
    bm = bmesh.new()
    for p, nrm in pts:
        M = Matrix.Translation(p + nrm * 0.0006) @ nrm.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((1, 1, 0.55, 1))
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=6, radius=0.0032, matrix=M)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = bpy.data.objects.new(name, me); ARMOR.objects.link(ob); me.materials.append(STEEL)
    return ob

def bind_weights(ob, fn):
    """fn(world_co) -> {group: weight}"""
    groups = {}
    for v in ob.data.vertices:
        ws = fn(ob.matrix_world @ v.co)
        tot = sum(ws.values())
        for nm, w in ws.items():
            if nm not in groups: groups[nm] = ob.vertex_groups.new(name=nm)
            groups[nm].add([v.index], w / tot, "REPLACE")
    a = ob.modifiers.new("Armature", "ARMATURE"); a.object = rig
    ob.modifiers.move(ob.modifiers.find("Armature"), 0)
    ob.parent = rig

def bone_parent(ob, bone):
    wm = ob.matrix_world.copy()
    ob.parent = rig; ob.parent_type = "BONE"; ob.parent_bone = bone
    bpy.context.view_layer.update(); ob.matrix_world = wm

built = []
for s, S_ in (("l", "L"), ("r", "R")):
    sx = 1 if s == "l" else -1
    S, E, H = Vector(J[s + "-shoulder"]), Vector(J[s + "-elbow"]), Vector(J[s + "-hand"])
    a = (E - S).normalized()
    o = (Vector((0, 0, 1)) - a * a.z).normalized()          # top of the arm
    w = a.cross(o).normalized()

    # ------------------------------------------------ pauldron (4 shingled lames)
    lames = [(-0.065, -0.005, 0.034), (-0.018, 0.040, 0.029), (0.028, 0.085, 0.024), (0.072, 0.128, 0.019)]
    rivpts = []
    for k, (t0, t1, off) in enumerate(lames):
        NT, NP = 12, 34
        P = np.zeros((NT, NP, 3)); Rr = np.zeros((NT, NP))
        ts = np.linspace(t0, t1, NT); ps = np.radians(np.linspace(-112, 112, NP))
        dirs = {}
        for jj, t in enumerate(ts):
            for ii, ph in enumerate(ps):
                d = (o * math.cos(ph) + w * math.sin(ph)).normalized()
                Rr[jj, ii] = radius_from(S + a * t, d)
                dirs[jj, ii] = d
        Rr = gaussian_filter(Rr, 1.6) + off
        for jj, t in enumerate(ts):
            roll = 0.0035 * max(0.0, (jj - (NT - 3)) / 2.0)        # rolled bottom edge
            for ii in range(NP):
                P[jj, ii] = S + a * t + dirs[jj, ii] * (Rr[jj, ii] + roll)
        ob = grid_object("DOOM_pauldron_%s_%d" % (S_, k), P)
        orient_out(ob, (S, E)); hard_surface(ob, 0.0032)
        bind_weights(ob, (lambda c, k=k: {"DEF-shoulder." + S_: 0.55, "DEF-upper_arm." + S_: 0.45} if k == 0 else {"DEF-upper_arm." + S_: 1.0}))
        built.append(ob)
        for ii in (1, NP - 2):
            jj = NT // 2
            nrm = (Vector(P[jj, ii]) - (S + a * ts[jj]))
            nrm = (nrm - a * nrm.dot(a)).normalized()
            rivpts.append((Vector(P[jj, ii]), nrm))
    rv = rivet_obj("DOOM_pauldron_rivets_" + S_, rivpts); bone_parent(rv, "DEF-upper_arm." + S_); built.append(rv)

    # ------------------------------------------------ arm wraps (cloth bands)
    wrap_bm = bmesh.new()
    for k, t in enumerate((0.15, 0.185, 0.22)):
        tilt = (Matrix.Rotation(math.radians(8 * (1 if k % 2 else -1)), 3, w) @ a).normalized()
        u1 = (o - tilt * o.dot(tilt)).normalized(); u2 = tilt.cross(u1)
        ring = []
        for ii in range(48):
            ph = 2 * math.pi * ii / 48
            d = u1 * math.cos(ph) + u2 * math.sin(ph)
            c0 = S + a * t
            r = radius_from(c0, d) + 0.0045
            ring.append([wrap_bm.verts.new(c0 + d * r + tilt * hh) for hh in (-0.013, 0.013)])
        for ii in range(48):
            i2 = (ii + 1) % 48
            wrap_bm.faces.new((ring[ii][0], ring[i2][0], ring[i2][1], ring[ii][1]))
    wme = bpy.data.meshes.new("DOOM_armwrap_" + S_); wrap_bm.to_mesh(wme); wrap_bm.free()
    wob = bpy.data.objects.new("DOOM_armwrap_" + S_, wme); ARMOR.objects.link(wob)
    wraps_mat = bpy.data.materials.get("MAT_armwrap_cloth")
    if not wraps_mat:
        wraps_mat = bpy.data.materials["MAT_tunic_padded_fabric"].copy(); wraps_mat.name = "MAT_armwrap_cloth"
        bb = wraps_mat.node_tree.nodes["Principled BSDF"]
        mixn = bb.inputs["Base Color"].links[0].from_node
        L._sock(mixn.inputs, "A", "RGBA").default_value = (0.045, 0.040, 0.022, 1)
        L._sock(mixn.inputs, "B", "RGBA").default_value = (0.075, 0.065, 0.035, 1)
    wme.materials.append(wraps_mat)
    for p in wme.polygons: p.use_smooth = True
    orient_out(wob, (S, E))
    sl = wob.modifiers.new("Solidify", "SOLIDIFY"); sl.thickness = 0.003; sl.offset = -1
    sb = wob.modifiers.new("Subdivision", "SUBSURF"); sb.levels, sb.render_levels = 1, 1
    bind_weights(wob, lambda c: {"DEF-upper_arm." + S_: 0.6, "DEF-upper_arm." + S_ + ".001": 0.4})
    built.append(wob)

    # ------------------------------------------------ vambrace
    fa = (H - E); Lf = fa.length; fa.normalize()
    o2 = (Vector((sx * 1.0, 0, 0)) - fa * fa.x * sx).normalized()     # outer side of the forearm
    w2 = fa.cross(o2).normalized()
    NT, NP = 40, 64
    ts = np.linspace(0.10, 0.93, NT); ps = np.radians(np.linspace(0, 360, NP, endpoint=False))
    Rr = np.zeros((NT, NP)); dirs = {}
    for jj, t in enumerate(ts):
        for ii, ph in enumerate(ps):
            d = (o2 * math.cos(ph) + w2 * math.sin(ph)).normalized()
            Rr[jj, ii] = radius_from(E + fa * (t * Lf), d, 0.04); dirs[jj, ii] = d
    Rr = gaussian_filter(Rr, (1.5, 2.0), mode=("nearest", "wrap")) + 0.009
    P = np.zeros((NT, NP, 3))
    for jj, t in enumerate(ts):
        flare = 0.007 * min(1.0, max(0.0, (t - 0.78) / 0.15)) ** 2
        rim = 0.0022 if (t - ts[0] < 0.025 or ts[-1] - t < 0.025) else 0.0
        for ii, ph in enumerate(ps):
            phd = math.degrees(ph); phd = phd - 360 if phd > 180 else phd
            rib = sum(0.0026 * math.exp(-((phd - c) / 7.0) ** 2) for c in (-38, 0, 38)) if 0.16 < t < 0.88 else 0.0
            P[jj, ii] = E + fa * (t * Lf) + dirs[jj, ii] * (Rr[jj, ii] + flare + rim + rib)
    vb = grid_object("DOOM_vambrace_" + S_, P, closed_u=True)
    orient_out(vb, (E, H)); hard_surface(vb, 0.003)
    def vw(c, E=E, fa=fa, Lf=Lf, S_=S_):
        t = (c - E).dot(fa) / Lf
        k = min(1.0, max(0.0, (t - 0.3) / 0.45))
        return {"DEF-forearm." + S_: 1 - k + 1e-4, "DEF-forearm." + S_ + ".001": k + 1e-4}
    bind_weights(vb, vw); built.append(vb)

    # ------------------------------------------------ gauntlet plates
    gco = np.array([gloves.matrix_world @ v.co for v in gloves.data.vertices])
    side_pts = gco[(gco[:, 0] * sx) > 0.3]
    cen = side_pts.mean(0)
    U, Sv, Vt = np.linalg.svd(side_pts - cen, full_matrices=False)
    nd = Vector(Vt[2].tolist())
    if nd.x * sx < 0: nd = -nd                      # back of the hand faces away from the body
    gbm_src = bmesh.new(); gbm_src.from_mesh(gloves.data); gbm_src.transform(gloves.matrix_world)
    gbm_src.faces.ensure_lookup_table(); gbm_src.normal_update()
    def plate_from(bone_name, dot_min=0.3, inset=(0.12, 0.88), radius=0.02, push=0.0022, thick=0.0016):
        bb = rig.data.bones[bone_name]
        hh, tt = rig.matrix_world @ bb.head_local, rig.matrix_world @ bb.tail_local
        ax = tt - hh; ln = ax.length; ax.normalize()
        keep = []
        for f in gbm_src.faces:
            c = f.calc_center_median(); s_ = (c - hh).dot(ax) / ln
            if not (inset[0] < s_ < inset[1]): continue
            if (c - (hh + ax * s_ * ln)).length > radius: continue
            if f.normal.dot(nd) < dot_min: continue
            keep.append(f.index)
        if len(keep) < 2: return None
        # copy the glove itself (same skin weights + armature) so the plate deforms exactly with it
        ob2 = gloves.copy(); ob2.data = gloves.data.copy()
        ob2.name = "DOOM_gauntlet_" + bone_name.replace("DEF-", ""); ob2.data.name = ob2.name
        ARMOR.objects.link(ob2)
        for md in list(ob2.modifiers):
            if md.type != "ARMATURE": ob2.modifiers.remove(md)
        ks = set(keep)
        b2 = bmesh.new(); b2.from_mesh(ob2.data); b2.faces.ensure_lookup_table()
        bmesh.ops.delete(b2, geom=[f for f in b2.faces if f.index not in ks], context="FACES")
        bmesh.ops.delete(b2, geom=[v for v in b2.verts if not v.link_faces], context="VERTS")
        for _ in range(2):
            bnd = [v for v in b2.verts if v.is_boundary]
            bmesh.ops.smooth_vert(b2, verts=bnd, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        b2.normal_update()
        for v in b2.verts: v.co += v.normal * push
        b2.to_mesh(ob2.data); b2.free()
        ob2.data.materials.clear(); ob2.data.materials.append(STEEL)
        for p in ob2.data.polygons: p.use_smooth = True
        sol = ob2.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = thick; sol.offset = 1.0
        bv = ob2.modifiers.new("Bevel", "BEVEL"); bv.width = 0.0004; bv.segments = 2
        sub = ob2.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 0, 2
        return ob2
    n_plates = 0
    for f in ("f_index", "f_middle", "f_ring", "f_pinky", "thumb"):
        for i in ("01", "02", "03"):
            bn = "DEF-%s.%s.%s" % (f, i, S_)
            if bn in rig.data.bones:
                r = 0.016 if f != "thumb" else 0.019
                if plate_from(bn, radius=r): n_plates += 1
    hand_plate = plate_from("DEF-hand." + S_, dot_min=0.35, inset=(0.05, 1.0), radius=0.06, push=0.003, thick=0.0025)
    if hand_plate: n_plates += 1
    for pn in ("01", "02", "03", "04"):
        bn = "DEF-palm.%s.%s" % (pn, S_)
        if bn in rig.data.bones and plate_from(bn, dot_min=0.45, inset=(0.45, 1.0), radius=0.016, push=0.0035, thick=0.0025):
            n_plates += 1
    gbm_src.free()
    print("GAUNTLET %s plates=%d dorsal=%s" % (S_, n_plates, tuple(round(x, 2) for x in nd)))

for ob in built:
    if ob.type == "MESH" and ob.data.vertices:
        r = L.mesh_report(ob)
        print("PIECE %-28s verts=%6d dims=%s" % (ob.name, r["verts"], r["dims_m"]))

# ------------------------------------------------------------ renders (hero pose)
rig.data.pose_position = "POSE"
bpy.context.view_layer.update()
for o in bpy.data.collections["REF"].objects: o.hide_render = True
cd = bpy.data.objects["CAM_detail"]; td = bpy.data.objects["TGT_detail"]
dgp = bpy.context.evaluated_depsgraph_get()
def bone_world(n): return rig.matrix_world @ rig.pose.bones[n].head
shots = []
for name, tgt, off, lens in (
        ("shoulder", bone_world("DEF-upper_arm.L") + Vector((0.03, 0, -0.04)), (0.55, -0.55, 0.15), 50),
        ("vambrace", bone_world("DEF-forearm.L.001"), (0.45, -0.5, 0.05), 50),
        ("gauntlet", bone_world("DEF-hand.L") + Vector((0, -0.03, -0.04)), (0.32, -0.25, 0.02), 60)):
    td.location = tgt; cd.location = tgt + Vector(off); cd.data.lens = lens
    shots.append(L.render_view("CAM_detail", "s08_%s.png" % name, res=(560, 560), samples=64))
L.contact_sheet(shots, ["pauldron + wraps", "vambrace", "gauntlet"], "s08_arms_sheet.jpg")
paths = [L.render_view(c, "s08_full_%s.png" % c[4:], res=(460, 700), samples=40) for c in ("CAM_front", "CAM_34", "CAM_back")]
L.contact_sheet(paths, ["front", "3/4", "back"], "s08_full_sheet.jpg")
L.save_version(8, "Stage 8 arms: pauldrons (4 lames), arm wraps, ribbed vambraces, gauntlet plates")
