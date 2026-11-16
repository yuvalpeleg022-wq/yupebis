"""Shared cloth helpers: parametric garment surfaces, collider pre-pass,
simulate-and-freeze, wool materials. Used by the final cloth stage."""
import math, time
import numpy as np
import bpy, bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
import doomlib as L


def wool(name="MAT_hood_heavy_wool", a=(0.0045, 0.0075, 0.0055), b=(0.009, 0.015, 0.010), sheen=0.45):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    n, l = m.node_tree.nodes, m.node_tree.links
    bs = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord"); mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (260, 260, 260)
    l.new(tc.outputs["UV"], mp.inputs["Vector"])
    w1 = n.new("ShaderNodeTexWave"); w1.bands_direction = "X"; w1.inputs["Scale"].default_value = 1.0
    w2 = n.new("ShaderNodeTexWave"); w2.bands_direction = "Y"; w2.inputs["Scale"].default_value = 1.0
    l.new(mp.outputs["Vector"], w1.inputs["Vector"]); l.new(mp.outputs["Vector"], w2.inputs["Vector"])
    mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    l.new(w1.outputs["Fac"], mx.inputs[0]); l.new(w2.outputs["Fac"], mx.inputs[1])
    noise = n.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 30; noise.inputs["Detail"].default_value = 10
    l.new(tc.outputs["UV"], noise.inputs["Vector"])
    mix = n.new("ShaderNodeMix"); mix.data_type = "RGBA"
    L._sock(mix.inputs, "A", "RGBA").default_value = a + (1,)
    L._sock(mix.inputs, "B", "RGBA").default_value = b + (1,)
    l.new(noise.outputs["Fac"], mix.inputs["Factor"])
    l.new(L._sock(mix.outputs, "Result", "RGBA"), bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = 0.92
    bs.inputs["Sheen Weight"].default_value = sheen; bs.inputs["Sheen Roughness"].default_value = 0.35
    bs.inputs["Sheen Tint"].default_value = (0.10, 0.17, 0.11, 1)
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.2; bump.inputs["Distance"].default_value = 0.0006
    l.new(mx.outputs["Value"], bump.inputs["Height"]); l.new(bump.outputs["Normal"], bs.inputs["Normal"])
    return m


def add_collider(o, thickness=0.005, friction=4.0):
    if not o.modifiers.get("Collision"):
        o.modifiers.new("Collision", "COLLISION")
        i = o.modifiers.find("Subdivision")
        if i >= 0:
            o.modifiers.move(o.modifiers.find("Collision"), i)
    o.collision.thickness_outer = thickness
    o.collision.cloth_friction = friction


def trees(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    out = []
    for o in objs:
        e = o.evaluated_get(dg); m = e.to_mesh()
        b = bmesh.new(); b.from_mesh(m); b.transform(o.matrix_world)
        out.append(BVHTree.FromBMesh(b)); b.free(); e.to_mesh_clear()
    return out


def build(name, pts, uv_scale, collection, cap_top_z=None):
    NV, NU = pts.shape[:2]
    faces = [(j * NU + i, j * NU + i + 1, (j + 1) * NU + i + 1, (j + 1) * NU + i)
             for j in range(NV - 1) for i in range(NU - 1)]
    me = bpy.data.meshes.new(name); me.from_pydata(pts.reshape(-1, 3).tolist(), [], faces); me.update()
    uvl = me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            uvl.data[li].uv = ((vi % NU) / (NU - 1) * uv_scale[0], 1 - (vi // NU) / (NV - 1) * uv_scale[1])
    ob = bpy.data.objects.new(name, me); collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    if cap_top_z is not None:
        top = [e for e in bm.edges if e.is_boundary and all(v.co.z > cap_top_z for v in e.verts)]
        if top:
            res = bmesh.ops.holes_fill(bm, edges=top, sides=200)
            if res["faces"]:
                bmesh.ops.poke(bm, faces=res["faces"])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return ob


def prepass(ob, collider_objs, clear=0.014, iters=3):
    ts = trees(collider_objs)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    pushed = 0
    for _ in range(iters):
        for v in bm.verts:
            for t in ts:
                loc, nrm, idx, d = t.find_nearest(v.co, 0.06)
                if loc is None or d < 1e-9: continue
                sd = (v.co - loc).dot(nrm)
                if sd < clear:
                    v.co = loc + nrm * clear; pushed += 1
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.25,
                              use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(ob.data); bm.free()
    return pushed


def simulate(ob, pin_fn, frames, mass, bend, tension=35, wind=0.0, friction_note=""):
    sc = bpy.context.scene
    pin = ob.vertex_groups.new(name="pin")
    for v in ob.data.vertices:
        pin.add([v.index], pin_fn(v), "REPLACE")
    cl = ob.modifiers.new("Cloth", "CLOTH")
    s = cl.settings
    s.quality = 8; s.mass = mass
    s.tension_stiffness = s.compression_stiffness = tension
    s.shear_stiffness = 12; s.bending_stiffness = bend; s.air_damping = 2.0
    s.vertex_group_mass = "pin"; s.pin_stiffness = 2.0
    s.effector_weights.wind = wind
    cs = cl.collision_settings
    cs.distance_min = 0.006; cs.collision_quality = 4
    cs.use_self_collision = True; cs.self_distance_min = 0.004
    cl.point_cache.frame_start, cl.point_cache.frame_end = 1, frames
    sc.frame_start, sc.frame_end = 1, frames
    t0 = time.time()
    for f in range(1, frames + 1):
        sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    settled = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    co = np.array([v.co[:] for v in settled.vertices])
    for v, p in zip(ob.data.vertices, settled.vertices):
        v.co = p.co
    bpy.data.meshes.remove(settled)
    sc.frame_set(1)
    cl.show_viewport = False; cl.show_render = False
    ob["cloth_baked_pose"] = "HERO"
    print("SIM %s %d frames %.1fs bbox %s %s nan=%s" % (ob.name, frames, time.time() - t0,
          co.min(0).round(3), co.max(0).round(3), bool(np.isnan(co).any())))


def finish(ob, thick, mat):
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = thick; sol.offset = -1.0
    sub = ob.modifiers.new("Subdivision", "SUBSURF"); sub.levels, sub.render_levels = 1, 2
    ob.data.materials.clear(); ob.data.materials.append(mat)
    add_collider(ob, 0.004, 3.0)


def cape_points(NU=66, NV=118, span=106.0, train=0.70):
    """Long, wide cloak (back-view poster): pinned across the upper back, falls
    to the floor and continues as a train fanning out behind and to the sides."""
    P = np.zeros((NV, NU, 3))
    drop_v = 0.70                       # fraction of the length spent falling to the floor
    for j in range(NV):
        v = j / (NV - 1)
        f = min(v / drop_v, 1.0)
        t = max(0.0, (v - drop_v) / (1 - drop_v))
        rx = 0.25 + 0.62 * f ** 0.85 + train * 0.55 * t
        ry = 0.17 + 0.42 * f ** 0.85 + train * t
        cy = 0.04
        for i in range(NU):
            phi = math.radians(-span + 2 * span * i / (NU - 1))
            z = 1.545 - 0.025 * abs(phi) / math.radians(span) - 1.50 * f
            z = max(z, 0.035) if t > 0 else z
            P[j, i] = (rx * math.sin(phi), cy + ry * math.cos(phi), z)
    return P


HOOD_PROFILE = np.array([
    [1.998, 0.030, 0.040, -0.072, 180],
    [1.982, 0.095, 0.125, -0.072, 180],
    [1.948, 0.133, 0.172, -0.062, 168],
    [1.890, 0.150, 0.190, -0.050, 152],
    [1.830, 0.156, 0.196, -0.040, 150],
    [1.770, 0.156, 0.190, -0.030, 148],
    [1.710, 0.150, 0.180, -0.020, 150],
    [1.650, 0.146, 0.166, -0.010, 156],
    [1.600, 0.170, 0.170, 0.000, 160],
    [1.560, 0.250, 0.205, 0.000, 158],
    [1.505, 0.345, 0.250, 0.008, 156],
    [1.430, 0.410, 0.280, 0.012, 154],
    [1.340, 0.445, 0.300, 0.012, 152],
    [1.240, 0.465, 0.315, 0.012, 151],
    [1.140, 0.475, 0.325, 0.012, 150],
])


def hood_points(NU=80, NV=58):
    from scipy.interpolate import CubicSpline
    P = HOOD_PROFILE
    spl = CubicSpline(np.arange(len(P)), P, axis=0, bc_type="natural")
    R = spl(np.linspace(0, len(P) - 1, NV)); R[:, 4] = np.clip(R[:, 4], 0, 180)
    out = np.zeros((NV, NU, 3))
    for j, (z, rx, ry, cy, tmax) in enumerate(R):
        for i in range(NU):
            t = math.radians(-tmax + 2 * tmax * i / (NU - 1))
            out[j, i] = (rx * math.sin(t), cy + ry * math.cos(t), z)
    return out


def hood_pin(v):
    z = v.co.z
    w = min(1.0, max(0.0, (z - 1.64) / (1.82 - 1.64)))
    if v.co.y > -0.03 and z > 1.70:
        w = 1.0
    return w
