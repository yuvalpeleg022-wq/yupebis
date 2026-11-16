"""Stage 3 - humanoid rig.

Rigify human metarig, every bone placed on the deformed body with MPFB2's
placement spec (joint-cube centroids / vertices / vertex means from
rig.human.json). Face bones removed (Doom is masked). Rigify generates the
control rig; skin weights come from MPFB2's hand-made weights (CC0) mapped
through the `mh_index` attribute, helper/face/toe groups folded into the
nearest generated DEF bone, then normalised. Four test poses are rendered.
Output: work/doom_v003.blend + renders/s03_*.png
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy, addon_utils
from mathutils import Vector, Matrix
import doomlib as L

L.open_version(2)
addon_utils.enable("rigify", default_set=True)
sc = bpy.context.scene
B = np.load(os.path.join(L.WORK, "basemesh_v002.npy"))
J = {"joint-" + k: np.array(v) for k, v in json.load(open(os.path.join(L.WORK, "joints_v002.json"))).items()}
spec = json.load(open(os.path.join(L.MPFB, "rigs", "rigify", "rig.human.json")))["bones"]

def locate(d):
    s = d["strategy"]
    if s == "CUBE":
        return Vector(J[d["cube_name"]].tolist())
    if s == "VERTEX":
        return Vector(B[d["vertex_index"]].tolist())
    if s == "MEAN":
        return Vector(B[d["vertex_indices"]].mean(axis=0).tolist())
    raise ValueError(s)

# ---------------------------------------------------------------- metarig
for o in bpy.context.selected_objects: o.select_set(False)
bpy.ops.object.armature_human_metarig_add()
meta = bpy.context.object
meta.name = "DOOM_metarig"
L.move_to(meta, bpy.data.collections["RIG"])
bpy.context.view_layer.objects.active = meta
bpy.ops.object.mode_set(mode="EDIT")
eb = meta.data.edit_bones
face_root = eb.get("face")
drop = set()
if face_root:
    drop = {face_root.name} | {c.name for c in face_root.children_recursive}
for n in list(drop):
    eb.remove(eb[n])
connected = {b.name for b in eb if b.use_connect}
placed, unplaced = 0, []
for b in eb:
    b.use_connect = False
for b in eb:
    d = spec.get(b.name)
    if not d or d["head"]["strategy"] == "XYZ" or d["tail"]["strategy"] == "XYZ":
        unplaced.append(b.name); continue
    b.head = locate(d["head"])
    b.tail = locate(d["tail"])
    b.roll = d.get("roll", 0.0)
    placed += 1
# heels: across the heel at ground level, behind the ankle
for side, sx in (("L", 1), ("R", -1)):
    ank = eb["foot." + side].head
    h = eb["heel.02." + side]
    h.head = Vector((ank.x - sx * 0.04, ank.y + 0.045, 0.0))
    h.tail = Vector((ank.x + sx * 0.04, ank.y + 0.045, 0.0))
    h.roll = 0.0
# snap chains: child head onto parent tail wherever the metarig connects them
snapped = 0
for b in sorted(eb, key=lambda x: len(x.parent_recursive)):
    if b.name in connected and b.parent:
        if (b.head - b.parent.tail).length > 1e-6:
            snapped += 1
        roll = b.roll
        b.head = b.parent.tail.copy()
        b.roll = roll
        b.use_connect = True
print("SNAPPED", snapped)
bpy.ops.object.mode_set(mode="OBJECT")
print("METARIG bones=%d placed=%d removed_face=%d unplaced=%s" %
      (len(meta.data.bones), placed, len(drop), unplaced))

# ---------------------------------------------------------------- generate
bpy.ops.pose.rigify_generate()
rig = meta.data.rigify_target_rig or bpy.data.objects.get("RIG-DOOM_metarig") or bpy.data.objects.get("rig")
rig.name = "DOOM_rig"
L.move_to(rig, bpy.data.collections["RIG"])
meta.hide_set(True); meta.hide_render = True
for c in bpy.data.collections:
    if c.name.startswith("WGTS"):
        c.hide_render = True; c.hide_viewport = True
deform = [b.name for b in rig.data.bones if b.use_deform]
print("RIG bones=%d deform=%d" % (len(rig.data.bones), len(deform)))

# ---------------------------------------------------------------- weights
W = json.load(open(os.path.join(L.MPFB, "rigs", "rigify", "weights.human_toes.json")))["weights"]
dset = set(deform)
def target_group(name):
    side = name[-2:] if name[-2:] in (".L", ".R") else ""
    if name.startswith("mhmask-"):
        return None
    special = {"DEF-elbow-helper": "DEF-forearm", "DEF-knee-helper": "DEF-shin",
               "DEF-pelvis-helper.front": "DEF-thigh", "DEF-pelvis-helper": "DEF-thigh",
               "DEF-shoulder-helper": "DEF-upper_arm"}
    base = name[:-2] if side else name
    if base in special:
        return special[base] + side
    if name.startswith("DEF-") and name in dset:
        return name
    if "DEF-" + name in dset:
        return "DEF-" + name
    if base.startswith("toe"):
        return "DEF-toe" + side
    return "DEF-spine.006"  # face / eyes / teeth / ears -> head

def bind(ob):
    idx = np.zeros(len(ob.data.vertices), dtype=np.int64)
    ob.data.attributes["mh_index"].data.foreach_get("value", idx)
    lookup = {int(m): i for i, m in enumerate(idx)}
    acc = {}
    for gname, pairs in W.items():
        tg = target_group(gname)
        if not tg: continue
        a = acc.setdefault(tg, {})
        for vi, w in pairs:
            li = lookup.get(vi)
            if li is not None:
                a[li] = a.get(li, 0.0) + w
    total = np.zeros(len(idx))
    for a in acc.values():
        for li, w in a.items(): total[li] += w
    for vg in list(ob.vertex_groups): ob.vertex_groups.remove(vg)
    for tg, a in acc.items():
        vg = ob.vertex_groups.new(name=tg)
        for li, w in a.items():
            if total[li] > 0: vg.add([li], w / total[li], "REPLACE")
    unweighted = int((total <= 0).sum())
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    mod.use_deform_preserve_volume = True
    while ob.modifiers.find("Armature") > 0:
        bpy.ops.object.modifier_move_up({"object": ob}, modifier="Armature") if False else None
        ob.modifiers.move(ob.modifiers.find("Armature"), 0)
    ob.parent = rig
    ob.matrix_parent_inverse = rig.matrix_world.inverted()
    return len(acc), unweighted

body = bpy.data.objects["DOOM_body"]
groups, unw = bind(body)
tights = bpy.data.objects["HLP_tights"]
tgroups, tunw = bind(tights)
eyes = bpy.data.objects["DOOM_eyes"]
eyes.vertex_groups.clear()
vg = eyes.vertex_groups.new(name="DEF-spine.006")
vg.add(list(range(len(eyes.data.vertices))), 1.0, "REPLACE")
m = eyes.modifiers.new("Armature", "ARMATURE"); m.object = rig
eyes.modifiers.move(eyes.modifiers.find("Armature"), 0)
eyes.parent = rig
print("WEIGHTS body groups=%d unweighted_verts=%d | tights groups=%d unweighted=%d" % (groups, unw, tgroups, tunw))

# ---------------------------------------------------------------- pose tools
pb = rig.pose.bones
for p in pb:
    if "IK_FK" in p.keys():
        p["IK_FK"] = 1.0  # FK for the tests
def upd(): bpy.context.view_layer.update()
def wmat(name): upd(); return rig.matrix_world @ pb[name].matrix
def rot_world(name, axis, deg):
    M = wmat(name)
    h = M.translation.copy()
    R = Matrix.Translation(h) @ Matrix.Rotation(math.radians(deg), 4, Vector(axis).normalized()) @ Matrix.Translation(-h)
    pb[name].matrix = rig.matrix_world.inverted() @ R @ M
    upd()
def bend_toward(name, direction, deg):
    M = wmat(name)
    ydir = (M.to_3x3() @ Vector((0, 1, 0))).normalized()
    axis = ydir.cross(Vector(direction)).normalized()
    rot_world(name, axis, deg)
def curl_fingers(side, deg):
    for f in ("f_index", "f_middle", "f_ring", "f_pinky"):
        for i in ("01", "02", "03"):
            n = "%s.%s.%s" % (f, i, side)
            if n in pb:
                p = pb[n]; p.rotation_mode = "XYZ"; p.rotation_euler.x = math.radians(deg)
    for i in ("02", "03"):
        n = "thumb.%s.%s" % (i, side)
        if n in pb:
            p = pb[n]; p.rotation_mode = "XYZ"; p.rotation_euler.x = math.radians(deg * 0.6)
    upd()
def reset():
    for p in pb:
        p.location = (0, 0, 0); p.rotation_quaternion = (1, 0, 0, 0)
        p.rotation_euler = (0, 0, 0); p.scale = (1, 1, 1)
    upd()

# ---------------------------------------------------------------- pose tests
for o in bpy.data.collections["REF"].objects: o.hide_render = True
shots = []
reset()
shots.append((L.render_view("CAM_34", "s03_pose_rest.png", res=(520, 780), samples=24), "rest (A)"))

reset()  # P1: arms spread, chest up (ref 2)
rot_world("upper_arm_fk.L", (0, 1, 0), -32); rot_world("upper_arm_fk.R", (0, 1, 0), 32)
bend_toward("forearm_fk.L", (0, -1, 0), 12); bend_toward("forearm_fk.R", (0, -1, 0), 12)
rot_world("head", (1, 0, 0), -8)
shots.append((L.render_view("CAM_34", "s03_pose_spread.png", res=(520, 780), samples=24), "arms spread"))

reset()  # P2: elbows + fists + knee
bend_toward("upper_arm_fk.L", (0, -1, 0), 35); bend_toward("forearm_fk.L", (0, -1, 0), 100)
bend_toward("upper_arm_fk.R", (0, -1, 0), 20); bend_toward("forearm_fk.R", (0, -1, 0), 70)
curl_fingers("L", 75); curl_fingers("R", 75)
bend_toward("thigh_fk.L", (0, -1, 0), 50); bend_toward("shin_fk.L", (0, 1, 0), 80)
shots.append((L.render_view("CAM_34", "s03_pose_action.png", res=(520, 780), samples=24), "elbows/fists/knee"))

# detail cameras on the bent joints while posed (elbow+fist, knee)
cd = bpy.data.cameras.new("CAM_detail"); cd.lens = 55
cam = bpy.data.objects.new("CAM_detail", cd); bpy.data.collections["CAMERAS"].objects.link(cam)
tgt = bpy.data.objects.new("TGT_detail", None); bpy.data.collections["CAMERAS"].objects.link(tgt)
L.track_to(cam, tgt)
elbow = wmat("forearm_fk.L").translation
hand = wmat("hand_fk.L").translation
tgt.location = (elbow + hand) / 2
cam.location = tgt.location + Vector((0.75, -0.55, -0.05))
shots.append((L.render_view("CAM_detail", "s03_detail_elbow.png", res=(520, 780), samples=32), "detail: elbow + fist"))
knee = wmat("shin_fk.L").translation
tgt.location = knee + Vector((0, 0, 0.05))
cam.location = knee + Vector((0.85, -0.7, 0.15))
shots.append((L.render_view("CAM_detail", "s03_detail_knee.png", res=(520, 780), samples=32), "detail: knee/hip"))

reset()  # P3: twist + step + reach
rot_world("chest", (0, 0, 1), 28); rot_world("head", (0, 0, 1), -25)
bend_toward("upper_arm_fk.R", (0, -1, 0.3), 70)
bend_toward("thigh_fk.R", (0, -1, 0), 28); bend_toward("thigh_fk.L", (0, 1, 0), 15)
bend_toward("shin_fk.L", (0, 1, 0), 25)
shots.append((L.render_view("CAM_34", "s03_pose_twist.png", res=(520, 780), samples=24), "twist/step/reach"))

L.contact_sheet([p for p, _ in shots], [l for _, l in shots], "s03_pose_sheet.jpg")
reset()
for p in pb:
    if "IK_FK" in p.keys(): p["IK_FK"] = 0.0  # back to rigify default
upd()
L.save_version(3, "Stage 3 rig: Rigify (no face) on MPFB joints, MPFB weights, 4 pose tests")
