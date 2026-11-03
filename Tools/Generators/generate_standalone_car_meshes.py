"""
Rave Racer Remix — Standalone Pure-Python 3D Low-Poly Vehicle & Modular Kit FBX Generator
=========================================================================================
Generates ready-to-import multi-mesh Autodesk `.fbx` (FBX 7.4 ASCII) 3D low-poly vehicle
models and modular parts directly into `Assets/_RaveRacer/Vehicle/Models/` without requiring
Blender CLI!

Each generated `.fbx` includes:
  - Prefab Hierarchy (`CarRoot` -> `VisualChassis` -> `Chassis_Body`, `Wheel_FL/FR/RL/RR`, `Mod_*`)
  - Exact Local Pivots (`Lcl Translation`) so wheels rotate around their axle centers
  - Hard Planar Face Normals (`LayerElementNormal`) for razor-sharp 2-tone cel shading
  - Vertex Colors (`COLOR0` / `LayerElementColor`):
      R = Inverted-Hull Outline Thickness Weight
      G = Vertical / Cavity Ambient Occlusion Gradient (Nam_Mac style low-poly depth)
      B = Speed / RPM Vertex Flutter Weight (Mudflaps & Exhaust Tips)
      A = 1.0
  - 3 UV Channels:
      UV0 (`UVChannel_1`)   = Non-mirrored 4-quadrant texture atlas UVs
      UV1 (`UV_SmoothN_XY`) = Welded smooth normal (X, Y) for gap-free Inverted-Hull outlines
      UV2 (`UV_SmoothN_Z`)  = Welded smooth normal (Z, OutlineWeight)

Generated 3D Assets:
1. `Assets/_RaveRacer/Vehicle/Models/Car_01_PocketRocket_Yaris.fbx`
2. `Assets/_RaveRacer/Vehicle/Models/Car_02_GravelRavers_GC8.fbx`
3. `Assets/_RaveRacer/Vehicle/Models/Car_03_ShakotanCyber_S13.fbx`
4. `Assets/_RaveRacer/Vehicle/Models/Car_04_Harigaya_Chaser_JZX100.fbx`
5. `Assets/_RaveRacer/Vehicle/Models/Car_05_Savanna_FC3S_Tekkamen.fbx`
6. `Assets/_RaveRacer/Vehicle/Models/Car_06_Touge_Integra_DC2.fbx`
7. `Assets/_RaveRacer/Vehicle/Models/ModularParts/*.fbx` (16 standalone modular kitbash `.fbx` meshes)
"""

import os
import math


# ---------------------------------------------------------------------------
# 3D VECTOR & GEOMETRY PRIMITIVES (UNITY COORDINATES: +X Right, +Y Up, +Z Forward)
# ---------------------------------------------------------------------------

def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_cross(a, b):
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def v_norm(a):
    l = math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])
    if l < 1e-8:
        return (0.0, 1.0, 0.0)
    return (a[0] / l, a[1] / l, a[2] / l)


def face_normal(v0, v1, v2):
    return v_norm(v_cross(v_sub(v1, v0), v_sub(v2, v0)))


def rotate_z(pt, deg, center=(0.0, 0.0, 0.0)):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy, dz = pt[0] - center[0], pt[1] - center[1], pt[2] - center[2]
    return (center[0] + dx * c - dy * s, center[1] + dx * s + dy * c, center[2] + dz)


def rotate_x(pt, deg, center=(0.0, 0.0, 0.0)):
    rad = math.radians(deg)
    c, s = math.cos(rad), math.sin(rad)
    dx, dy, dz = pt[0] - center[0], pt[1] - center[1], pt[2] - center[2]
    return (center[0] + dx, center[1] + dy * c - dz * s, center[2] + dy * s + dz * c)


class SubMesh:
    def __init__(self, name, zone_id=0.0, pivot=(0.0, 0.0, 0.0)):
        self.name = name
        self.zone_id = zone_id
        self.pivot = pivot
        self.verts = []   # list of (x, y, z) in world/car space
        self.faces = []   # list of tuples of 0-based vert indices (quads or tris)

    def add_box(self, center, size):
        cx, cy, cz = center
        sx, sy, sz = size[0] * 0.5, size[1] * 0.5, size[2] * 0.5
        base = len(self.verts)
        pts = [
            (cx - sx, cy - sy, cz - sz),  # 0: L B R
            (cx + sx, cy - sy, cz - sz),  # 1: R B R
            (cx + sx, cy + sy, cz - sz),  # 2: R T R
            (cx - sx, cy + sy, cz - sz),  # 3: L T R
            (cx - sx, cy - sy, cz + sz),  # 4: L B F
            (cx + sx, cy - sy, cz + sz),  # 5: R B F
            (cx + sx, cy + sy, cz + sz),  # 6: R T F
            (cx - sx, cy + sy, cz + sz),  # 7: L T F
        ]
        self.verts.extend(pts)
        quads = [
            (4, 5, 6, 7),  # Front (+Z)
            (1, 0, 3, 2),  # Rear (-Z)
            (0, 4, 7, 3),  # Left (-X)
            (5, 1, 2, 6),  # Right (+X)
            (7, 6, 2, 3),  # Top (+Y)
            (0, 1, 5, 4),  # Bottom (-Y)
        ]
        for q in quads:
            self.faces.append(tuple(base + idx for idx in q))

    def transform_all(self, fn):
        self.verts = [fn(v) for v in self.verts]


# ---------------------------------------------------------------------------
# WHEEL, CHASSIS & AERO PROCEDURAL MESH BUILDERS
# ---------------------------------------------------------------------------

def create_wheel_submesh(name, center=(0.0, 0.0, 0.0), radius=0.34, width=0.26, style="TURBOFAN", camber_deg=0.0, is_left=True):
    """
    16-sided low-poly wheel & tire with chamfered sidewall shoulders and inset rim dish/aerodisc.
    Supports 6 styles: TURBOFAN, RALLY_6SPOKE, DEEPDISH_5SPOKE, CHROME_VSKF, WATANABE_8SPOKE, TOUGE_10SPOKE
    """
    sm = SubMesh(name, zone_id=0.40, pivot=center)
    cx, cy, cz = center
    segs = 16
    hw_outer = width * 0.50
    hw_Crown = width * 0.40
    r_crown = radius
    r_shoulder = radius * 0.93
    r_rim = radius * 0.66
    r_hub = radius * 0.22

    sign = -1.0 if is_left else 1.0
    if style == "TURBOFAN":
        dish_offset = 0.025 * sign   # Protruding conical turbofan disc
        hub_offset = -0.015 * sign
    elif style in ("DEEPDISH_5SPOKE", "CHROME_VSKF"):
        dish_offset = -0.062 * sign  # Ultra-deep step-lip concave dish (VS-KF / Meister)
        hub_offset = -0.045 * sign
    elif style == "WATANABE_8SPOKE":
        dish_offset = -0.048 * sign  # 80s deep machined lip with curved banana spoke hub
        hub_offset = -0.032 * sign
    else:
        dish_offset = -0.030 * sign  # Concave 6-spoke TE37 / 10-spoke CE28N face
        hub_offset = -0.040 * sign

    rings_spec = [
        (-hw_Crown * sign, r_rim * 0.85),           # 0: Inner rim lip
        (-hw_outer * sign, r_shoulder),             # 1: Inner tire sidewall
        (-hw_Crown * sign, r_crown),                # 2: Inner tire tread shoulder
        ( hw_Crown * sign, r_crown),                # 3: Outer tire tread shoulder
        ( hw_outer * sign, r_shoulder),             # 4: Outer tire sidewall
        ( hw_Crown * sign, r_rim),                  # 5: Outer rim lip
        ((hw_Crown + dish_offset) * sign, r_hub),   # 6: Inner dish / turbofan cone
    ]

    ring_indices = []
    for (x_off, rad) in rings_spec:
        ring = []
        for s in range(segs):
            ang = (2.0 * math.pi * s) / segs
            y = cy + math.cos(ang) * rad
            z = cz + math.sin(ang) * rad
            ring.append(len(sm.verts))
            sm.verts.append((cx + x_off, y, z))
        ring_indices.append(ring)

    for r_i in range(len(ring_indices) - 1):
        rA = ring_indices[r_i]
        rB = ring_indices[r_i + 1]
        for s in range(segs):
            s_next = (s + 1) % segs
            if is_left:
                sm.faces.append((rA[s], rB[s], rB[s_next], rA[s_next]))
            else:
                sm.faces.append((rA[s], rA[s_next], rB[s_next], rB[s]))

    center_idx = len(sm.verts)
    sm.verts.append((cx + (hw_Crown + hub_offset) * sign, cy, cz))
    last_ring = ring_indices[-1]
    for s in range(segs):
        s_next = (s + 1) % segs
        if is_left:
            sm.faces.append((last_ring[s], center_idx, last_ring[s_next]))
        else:
            sm.faces.append((last_ring[s], last_ring[s_next], center_idx))

    if abs(camber_deg) > 0.01:
        tilt = camber_deg if is_left else -camber_deg
        sm.transform_all(lambda pt: rotate_z(pt, tilt, center))

    return sm


def create_contoured_body_submesh(name, stations):
    """
    Builds the main widebody vehicle shell (`Chassis_Body`) from longitudinal Z stations.
    Each station tuple:
      (z_pos, half_w_bottom, half_w_flare, half_w_belt, half_w_roof, y_bottom, y_flare, y_belt, y_roof)
    """
    sm = SubMesh(name, zone_id=0.00, pivot=(0.0, 0.0, 0.0))
    rings = []

    for (z, wb, wf, wbelt, wr, yb, yf, ybelt, yr) in stations:
        ring_pts = [
            (-wr * 0.28, yr,          z),  # 0: Top Center-Left
            (-wr,        yr - 0.02,   z),  # 1: Top Outer-Left Edge
            (-wbelt,     ybelt,       z),  # 2: Left Beltline
            (-wf,        yf + 0.06,   z),  # 3: Left Widebody Box-Flare Upper Shelf
            (-wf,        yf - 0.12,   z),  # 4: Left Widebody Box-Flare Outer Lip
            (-wb,        yb,          z),  # 5: Left Lower Splitter / Sill
            ( wb,        yb,          z),  # 6: Right Lower Splitter / Sill
            ( wf,        yf - 0.12,   z),  # 7: Right Widebody Box-Flare Outer Lip
            ( wf,        yf + 0.06,   z),  # 8: Right Widebody Box-Flare Upper Shelf
            ( wbelt,     ybelt,       z),  # 9: Right Beltline
            ( wr,        yr - 0.02,   z),  # 10: Top Outer-Right Edge
            ( wr * 0.28, yr,          z),  # 11: Top Center-Right
        ]
        ring_ids = []
        for pt in ring_pts:
            ring_ids.append(len(sm.verts))
            sm.verts.append(pt)
        rings.append(ring_ids)

    n_ring = len(rings[0])
    for i in range(len(rings) - 1):
        rA = rings[i]
        rB = rings[i + 1]
        for j in range(n_ring):
            j_next = (j + 1) % n_ring
            sm.faces.append((rA[j], rA[j_next], rB[j_next], rB[j]))

    rear_r = rings[0]
    front_r = rings[-1]
    half_n = n_ring // 2
    for k in range(half_n - 1):
        sm.faces.append((rear_r[k], rear_r[n_ring - 1 - k], rear_r[n_ring - 2 - k], rear_r[k + 1]))
        sm.faces.append((front_r[k], front_r[k + 1], front_r[n_ring - 2 - k], front_r[n_ring - 1 - k]))

    return sm


# ---------------------------------------------------------------------------
# AUTODESK FBX 7.4 ASCII EXPORTER (WITH VERTEX COLORS, SMOOTH NORMALS & PIVOTS)
# ---------------------------------------------------------------------------

def compute_welded_smooth_normals(sm):
    """
    Computes position-welded, area-weighted smooth vertex normals across each SubMesh
    so the Inverted-Hull Outline pass extrudes without splitting gaps at hard creases.
    """
    pos_accum = {}
    for face in sm.faces:
        if len(face) < 3:
            continue
        p0, p1, p2 = sm.verts[face[0]], sm.verts[face[1]], sm.verts[face[2]]
        fn = face_normal(p0, p1, p2)
        for idx in face:
            v = sm.verts[idx]
            key = (round(v[0], 4), round(v[1], 4), round(v[2], 4))
            cur = pos_accum.get(key, (0.0, 0.0, 0.0))
            pos_accum[key] = (cur[0] + fn[0], cur[1] + fn[1], cur[2] + fn[2])

    smooth_by_idx = []
    for v in sm.verts:
        key = (round(v[0], 4), round(v[1], 4), round(v[2], 4))
        sn = v_norm(pos_accum.get(key, (0.0, 1.0, 0.0)))
        smooth_by_idx.append(sn)
    return smooth_by_idx


def export_multi_submesh_fbx(filepath, mtl_name, submeshes, is_vehicle=True):
    """
    Writes a Unity-ready Autodesk FBX 7.4 ASCII (`.fbx`) file containing:
      - Root hierarchy (`CarRoot` -> `VisualChassis` -> SubMeshes) with local pivots
      - Hard planar polygon normals (`LayerElementNormal`)
      - Vertex Colors (`LayerElementColor` / `COLOR0`): R=OutlineWeight, G=HeightAO, B=Flutter, A=1.0
      - UV0 (`UVChannel_1`): Non-mirrored 4-quadrant UVs
      - UV1 (`UV_SmoothN_XY`): Welded Smooth Normal (X, Y)
      - UV2 (`UV_SmoothN_Z`): Welded Smooth Normal (Z, OutlineWeight)
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    all_pts = [pt for sm in submeshes for pt in sm.verts]
    xs = [p[0] for p in all_pts] or [-1.0, 1.0]
    ys = [p[1] for p in all_pts] or [0.0, 1.4]
    zs = [p[2] for p in all_pts] or [-2.2, 2.2]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)
    span_x = max(max_x - min_x, 0.001)
    span_y = max(max_y - min_y, 0.001)
    span_z = max(max_z - min_z, 0.001)

    total_verts = sum(len(sm.verts) for sm in submeshes)
    total_tris = sum(sum(len(face) - 2 for face in sm.faces) for sm in submeshes)

    root_name = os.path.splitext(os.path.basename(filepath))[0]
    root_model_id = 100000
    chassis_model_id = 100001
    mat_id = 200000

    num_models = len(submeshes) + (2 if is_vehicle else 0)
    num_geoms = len(submeshes)

    lines = [
        "; FBX 7.4.0 project file",
        "; Generated by Rave Racer Remix Standalone FBX Pipeline (JSR x Nam_Mac x Pixel_Tempys)",
        "FBXHeaderExtension:  {",
        "\tFBXHeaderVersion: 1003",
        "\tFBXVersion: 7400",
        "\tCreator: \"Rave Racer Remix FBX Generator\"",
        "}",
        "GlobalSettings:  {",
        "\tVersion: 1000",
        "\tProperties70:  {",
        "\t\tP: \"UpAxis\", \"int\", \"Integer\", \"\",1",
        "\t\tP: \"UpAxisSign\", \"int\", \"Integer\", \"\",1",
        "\t\tP: \"FrontAxis\", \"int\", \"Integer\", \"\",2",
        "\t\tP: \"FrontAxisSign\", \"int\", \"Integer\", \"\",1",
        "\t\tP: \"CoordAxis\", \"int\", \"Integer\", \"\",0",
        "\t\tP: \"CoordAxisSign\", \"int\", \"Integer\", \"\",1",
        "\t\tP: \"UnitScaleFactor\", \"double\", \"Number\", \"\",100",
        "\t\tP: \"OriginalUnitScaleFactor\", \"double\", \"Number\", \"\",100",
        "\t}",
        "}",
        "Definitions:  {",
        "\tVersion: 100",
        f"\tCount: {1 + num_models + num_geoms + 1}",
        "\tObjectType: \"GlobalSettings\" {",
        "\t\tCount: 1",
        "\t}",
        "\tObjectType: \"Model\" {",
        f"\t\tCount: {num_models}",
        "\t}",
        "\tObjectType: \"Geometry\" {",
        f"\t\tCount: {num_geoms}",
        "\t}",
        "\tObjectType: \"Material\" {",
        "\t\tCount: 1",
        "\t}",
        "}",
        "Objects:  {",
    ]

    if is_vehicle:
        lines.extend([
            f"\tModel: {root_model_id}, \"Model::{root_name}\", \"Null\" {{",
            "\t\tVersion: 232",
            "\t\tProperties70:  {",
            "\t\t\tP: \"Lcl Translation\", \"Lcl Translation\", \"\", \"A\",0,0,0",
            "\t\t}",
            "\t\tShading: Y",
            "\t\tCulling: \"CullingOff\"",
            "\t}",
            f"\tModel: {chassis_model_id}, \"Model::VisualChassis\", \"Null\" {{",
            "\t\tVersion: 232",
            "\t\tProperties70:  {",
            "\t\t\tP: \"Lcl Translation\", \"Lcl Translation\", \"\", \"A\",0,0,0",
            "\t\t}",
            "\t\tShading: Y",
            "\t\tCulling: \"CullingOff\"",
            "\t}",
        ])

    lines.extend([
        f"\tMaterial: {mat_id}, \"Material::{mtl_name}\", \"\" {{",
        "\t\tVersion: 102",
        "\t\tShadingModel: \"lambert\"",
        "\t\tMultiLayer: 0",
        "\t\tProperties70:  {",
        "\t\t\tP: \"DiffuseColor\", \"Color\", \"\", \"A\",1,1,1",
        "\t\t}",
        "\t}",
    ])

    connections = []
    if is_vehicle:
        connections.append((chassis_model_id, 0, root_model_id))

    for sm_idx, sm in enumerate(submeshes):
        geom_id = 300000 + sm_idx * 10
        model_id = 400000 + sm_idx * 10
        px, py, pz = sm.pivot
        smooth_normals = compute_welded_smooth_normals(sm)

        is_interior = "Interior" in sm.name
        is_flutter = ("Exhaust" in sm.name) or ("Mudflap" in sm.name)
        outline_r = 0.0 if is_interior else (0.65 if sm.name.startswith("Mod_") else 0.95)
        flutter_b = 1.0 if is_flutter else 0.0

        # Localize vertices relative to SubMesh pivot so rotations happen cleanly around pivot
        flat_verts = []
        for vx, vy, vz in sm.verts:
            flat_verts.extend([round(vx - px, 5), round(vy - py, 5), round(vz - pz, 5)])

        poly_indices = []
        flat_normals = []
        flat_colors = []
        flat_uv0 = []
        flat_uv1 = []
        flat_uv2 = []

        for face in sm.faces:
            p0, p1, p2 = sm.verts[face[0]], sm.verts[face[1]], sm.verts[face[2]]
            fn = face_normal(p0, p1, p2)
            n_f = len(face)
            for k, v_i in enumerate(face):
                poly_indices.append(v_i if k < n_f - 1 else (-v_i - 1))
                flat_normals.extend([round(fn[0], 5), round(fn[1], 5), round(fn[2], 5)])

                pt = sm.verts[v_i]
                nx = (pt[0] - min_x) / span_x
                ny = (pt[1] - min_y) / span_y
                nz = (pt[2] - min_z) / span_z

                # Vertex Color (COLOR0): R=OutlineWeight, G=HeightAO, B=Flutter, A=1.0
                ao_g = max(0.32, min(1.0, 0.35 + ny * 0.65))
                flat_colors.extend([round(outline_r, 4), round(ao_g, 4), round(flutter_b, 4), 1.0])

                # UV0: Non-mirrored 4-quadrant texture atlas layout
                if sm.name.startswith("Wheel_") or sm.name.startswith("Mod_") or sm.name.startswith("Exhaust_"):
                    u0 = 0.52 + nx * 0.46
                    v0 = 0.02 + ny * 0.46
                elif abs(fn[0]) >= abs(fn[1]) and abs(fn[0]) >= abs(fn[2]):
                    if fn[0] < 0:
                        u0 = 0.02 + nz * 0.46
                        v0 = 0.52 + ny * 0.46
                    else:
                        u0 = 0.52 + (1.0 - nz) * 0.46
                        v0 = 0.52 + ny * 0.46
                elif abs(fn[1]) >= abs(fn[0]) and abs(fn[1]) >= abs(fn[2]):
                    u0 = 0.02 + nx * 0.46
                    v0 = 0.02 + nz * 0.46
                else:
                    u0 = 0.52 + nx * 0.46
                    v0 = 0.02 + ny * 0.46
                flat_uv0.extend([round(u0, 5), round(v0, 5)])

                # UV1 & UV2: Welded smooth normal for gap-free Inverted-Hull Ink Outlines
                sn = smooth_normals[v_i]
                flat_uv1.extend([round(sn[0], 5), round(sn[1], 5)])
                flat_uv2.extend([round(sn[2], 5), round(outline_r, 4)])

        n_poly_verts = len(poly_indices)
        uv_idx_str = ",".join(str(i) for i in range(n_poly_verts))
        color_idx_str = uv_idx_str

        lines.extend([
            f"\tGeometry: {geom_id}, \"Geometry::{sm.name}\", \"Mesh\" {{",
            f"\t\tVertices: *{len(flat_verts)} {{",
            "\t\t\ta: " + ",".join(str(x) for x in flat_verts),
            "\t\t}",
            f"\t\tPolygonVertexIndex: *{len(poly_indices)} {{",
            "\t\t\ta: " + ",".join(str(x) for x in poly_indices),
            "\t\t}",
            "\t\tGeometryVersion: 124",
            "\t\tLayerElementNormal: 0 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"\"",
            "\t\t\tMappingInformationType: \"ByPolygonVertex\"",
            "\t\t\tReferenceInformationType: \"Direct\"",
            f"\t\t\tNormals: *{len(flat_normals)} {{",
            "\t\t\t\ta: " + ",".join(str(x) for x in flat_normals),
            "\t\t\t}",
            "\t\t}",
            "\t\tLayerElementColor: 0 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"COLOR0\"",
            "\t\t\tMappingInformationType: \"ByPolygonVertex\"",
            "\t\t\tReferenceInformationType: \"IndexToDirect\"",
            f"\t\t\tColors: *{len(flat_colors)} {{",
            "\t\t\t\ta: " + ",".join(str(x) for x in flat_colors),
            "\t\t\t}",
            f"\t\t\tColorIndex: *{n_poly_verts} {{",
            "\t\t\t\ta: " + color_idx_str,
            "\t\t\t}",
            "\t\t}",
            "\t\tLayerElementUV: 0 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"UVChannel_1\"",
            "\t\t\tMappingInformationType: \"ByPolygonVertex\"",
            "\t\t\tReferenceInformationType: \"IndexToDirect\"",
            f"\t\t\tUV: *{len(flat_uv0)} {{",
            "\t\t\t\ta: " + ",".join(str(x) for x in flat_uv0),
            "\t\t\t}",
            f"\t\t\tUVIndex: *{n_poly_verts} {{",
            "\t\t\t\ta: " + uv_idx_str,
            "\t\t\t}",
            "\t\t}",
            "\t\tLayerElementUV: 1 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"UV_SmoothN_XY\"",
            "\t\t\tMappingInformationType: \"ByPolygonVertex\"",
            "\t\t\tReferenceInformationType: \"IndexToDirect\"",
            f"\t\t\tUV: *{len(flat_uv1)} {{",
            "\t\t\t\ta: " + ",".join(str(x) for x in flat_uv1),
            "\t\t\t}",
            f"\t\t\tUVIndex: *{n_poly_verts} {{",
            "\t\t\t\ta: " + uv_idx_str,
            "\t\t\t}",
            "\t\t}",
            "\t\tLayerElementUV: 2 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"UV_SmoothN_Z\"",
            "\t\t\tMappingInformationType: \"ByPolygonVertex\"",
            "\t\t\tReferenceInformationType: \"IndexToDirect\"",
            f"\t\t\tUV: *{len(flat_uv2)} {{",
            "\t\t\t\ta: " + ",".join(str(x) for x in flat_uv2),
            "\t\t\t}",
            f"\t\t\tUVIndex: *{n_poly_verts} {{",
            "\t\t\t\ta: " + uv_idx_str,
            "\t\t\t}",
            "\t\t}",
            "\t\tLayerElementMaterial: 0 {",
            "\t\t\tVersion: 101",
            "\t\t\tName: \"\"",
            "\t\t\tMappingInformationType: \"AllSame\"",
            "\t\t\tReferenceInformationType: \"IndexToDirect\"",
            "\t\t\tMaterials: *1 {",
            "\t\t\t\ta: 0",
            "\t\t\t}",
            "\t\t}",
            "\t\tLayer: 0 {",
            "\t\t\tVersion: 100",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementNormal\"",
            "\t\t\t\tTypedIndex: 0",
            "\t\t\t}",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementMaterial\"",
            "\t\t\t\tTypedIndex: 0",
            "\t\t\t}",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementColor\"",
            "\t\t\t\tTypedIndex: 0",
            "\t\t\t}",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementUV\"",
            "\t\t\t\tTypedIndex: 0",
            "\t\t\t}",
            "\t\t}",
            "\t\tLayer: 1 {",
            "\t\t\tVersion: 100",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementUV\"",
            "\t\t\t\tTypedIndex: 1",
            "\t\t\t}",
            "\t\t}",
            "\t\tLayer: 2 {",
            "\t\t\tVersion: 100",
            "\t\t\tLayerElement:  {",
            "\t\t\t\tType: \"LayerElementUV\"",
            "\t\t\t\tTypedIndex: 2",
            "\t\t\t}",
            "\t\t}",
            "\t}",
            f"\tModel: {model_id}, \"Model::{sm.name}\", \"Mesh\" {{",
            "\t\tVersion: 232",
            "\t\tProperties70:  {",
            f"\t\t\tP: \"Lcl Translation\", \"Lcl Translation\", \"\", \"A\",{px:.5f},{py:.5f},{pz:.5f}",
            "\t\t}",
            "\t\tShading: Y",
            "\t\tCulling: \"CullingOff\"",
            "\t}",
        ])

        parent_id = chassis_model_id if is_vehicle else 0
        connections.append((model_id, geom_id, parent_id))

    lines.append("}")
    lines.append("Connections:  {")
    if is_vehicle:
        lines.append(f"\tC: \"OO\",{root_model_id},0")
        lines.append(f"\tC: \"OO\",{chassis_model_id},{root_model_id}")

    for model_id, geom_id, parent_id in connections:
        if geom_id == 0:
            continue
        lines.append(f"\tC: \"OO\",{model_id},{parent_id}")
        lines.append(f"\tC: \"OO\",{geom_id},{model_id}")
        lines.append(f"\tC: \"OO\",{mat_id},{model_id}")

    lines.append("}")

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return total_verts, total_tris


# ---------------------------------------------------------------------------
# BUILD ALL 6 VEHICLES & 16 MODULAR PARTS (.FBX)
# ---------------------------------------------------------------------------

def build_all_standalone_models(project_root):
    models_dir = os.path.join(project_root, "Assets", "_RaveRacer", "Vehicle", "Models")
    modular_dir = os.path.join(models_dir, "ModularParts")
    os.makedirs(modular_dir, exist_ok=True)

    # 1. Export Standalone Modular Parts Library (16 Parts as .fbx)
    modular_parts = [
        ("Wheel_01_Turbofan_Aerodisc", [create_wheel_submesh("Wheel_01_Turbofan_Aerodisc", (0, 0, 0), 0.34, 0.27, "TURBOFAN")]),
        ("Wheel_02_Rally_6Spoke",      [create_wheel_submesh("Wheel_02_Rally_6Spoke",      (0, 0, 0), 0.34, 0.26, "RALLY_6SPOKE")]),
        ("Wheel_03_DeepDish_5Spoke",   [create_wheel_submesh("Wheel_03_DeepDish_5Spoke",   (0, 0, 0), 0.33, 0.29, "DEEPDISH_5SPOKE")]),
        ("Wheel_04_Chrome_VSKF_5Spoke",[create_wheel_submesh("Wheel_04_Chrome_VSKF_5Spoke",(0, 0, 0), 0.34, 0.30, "CHROME_VSKF")]),
        ("Wheel_05_Watanabe_8Spoke_Retro", [create_wheel_submesh("Wheel_05_Watanabe_8Spoke_Retro", (0, 0, 0), 0.33, 0.27, "WATANABE_8SPOKE")]),
        ("Wheel_06_Touge_10Spoke_CE28",[create_wheel_submesh("Wheel_06_Touge_10Spoke_CE28",(0, 0, 0), 0.33, 0.25, "TOUGE_10SPOKE")]),
    ]
    box_mods = [
        ("Roof_01_CargoBox",              (0.82, 0.28, 1.55)),
        ("Roof_02_YakimaRack",            (1.05, 0.12, 1.10)),
        ("Cooler_01_Exposed_FMIC",        (0.76, 0.24, 0.12)),
        ("Cooler_02_Kaido_OilCooler",     (0.42, 0.16, 0.10)),
        ("Wing_01_TimeAttack_SwanNeck",   (1.62, 0.26, 0.38)),
        ("Wing_02_Rally_Box",             (1.44, 0.28, 0.32)),
        ("Wing_03_Ducktail_Slit",         (1.52, 0.14, 0.28)),
        ("Wing_04_HighMount_AluGT",       (1.68, 0.34, 0.34)),
        ("Bumper_01_LBWK_CanardSplitter", (1.94, 0.16, 0.42)),
        ("Diffuser_01_TimeAttack_Strakes",(1.64, 0.18, 0.36)),
    ]
    for m_name, m_dims in box_mods:
        sm = SubMesh(m_name, zone_id=0.20)
        sm.add_box((0.0, 0.0, 0.0), m_dims)
        modular_parts.append((m_name, [sm]))

    for part_name, sms in modular_parts:
        out_p = os.path.join(modular_dir, f"{part_name}.fbx")
        export_multi_submesh_fbx(out_p, f"M_{part_name}", sms, is_vehicle=False)

    # -----------------------------------------------------------------------
    # CAR 01: POCKET ROCKET (Widebody GR Yaris / Mazda 323 GTX Hot Hatch)
    # -----------------------------------------------------------------------
    yaris_stations = [
        (-1.98, 0.88, 0.92, 0.84, 0.60, 0.18, 0.42, 0.62, 0.74),
        (-1.82, 0.90, 0.96, 0.90, 0.64, 0.15, 0.46, 0.82, 1.06),
        (-1.45, 0.92, 1.02, 0.94, 0.68, 0.13, 0.56, 0.88, 1.32),
        (-1.10, 0.92, 1.02, 0.94, 0.70, 0.13, 0.56, 0.88, 1.36),
        (-0.75, 0.90, 0.94, 0.90, 0.70, 0.12, 0.46, 0.88, 1.37),
        ( 0.15, 0.90, 0.93, 0.89, 0.72, 0.12, 0.46, 0.86, 1.38),
        ( 0.78, 0.90, 0.94, 0.89, 0.80, 0.12, 0.48, 0.82, 0.90),
        ( 1.12, 0.92, 1.00, 0.94, 0.78, 0.12, 0.54, 0.76, 0.85),
        ( 1.44, 0.92, 1.00, 0.94, 0.76, 0.12, 0.54, 0.72, 0.82),
        ( 1.76, 0.90, 0.96, 0.90, 0.70, 0.10, 0.44, 0.64, 0.74),
        ( 1.98, 0.92, 0.94, 0.82, 0.62, 0.09, 0.34, 0.48, 0.56),
    ]
    car01_sms = [
        create_contoured_body_submesh("Chassis_Body", yaris_stations),
        create_wheel_submesh("Wheel_FL", (-0.88, 0.34,  1.28), 0.34, 0.27, "TURBOFAN",       -2.5, True),
        create_wheel_submesh("Wheel_FR", ( 0.88, 0.34,  1.28), 0.34, 0.27, "TURBOFAN",       -2.5, False),
        create_wheel_submesh("Wheel_RL", (-0.90, 0.34, -1.28), 0.34, 0.29, "DEEPDISH_5SPOKE",-3.0, True),
        create_wheel_submesh("Wheel_RR", ( 0.90, 0.34, -1.28), 0.34, 0.29, "DEEPDISH_5SPOKE",-3.0, False),
    ]
    int01 = SubMesh("Interior_Silhouette", 0.60)
    int01.add_box((-0.36, 0.62, -0.15), (0.42, 0.55, 0.45))
    int01.add_box(( 0.36, 0.62, -0.15), (0.42, 0.55, 0.45))
    int01.add_box(( 0.00, 0.98, -0.50), (1.10, 0.42, 0.06))
    car01_sms.append(int01)

    roof01 = SubMesh("Mod_Roof_CargoBox", 0.20)
    roof01.add_box((0.0, 1.50, -0.25), (0.82, 0.26, 1.50))
    roof01.add_box((0.0, 1.39,  0.20), (1.18, 0.04, 0.08))
    roof01.add_box((0.0, 1.39, -0.65), (1.18, 0.04, 0.08))
    car01_sms.append(roof01)

    wing01 = SubMesh("Mod_Wing_TimeAttack", 0.20)
    wing01.add_box(( 0.00, 1.44, -1.72), (1.62, 0.05, 0.36))
    wing01.add_box(( 0.00, 1.32, -1.68), (1.54, 0.04, 0.28))
    wing01.add_box((-0.81, 1.38, -1.70), (0.03, 0.28, 0.42))
    wing01.add_box(( 0.81, 1.38, -1.70), (0.03, 0.28, 0.42))
    car01_sms.append(wing01)

    fmic01 = SubMesh("Mod_FrontCooler_FMIC", 0.40)
    fmic01.add_box((0.0, 0.28, 1.96), (0.76, 0.24, 0.10))
    car01_sms.append(fmic01)

    ex01 = SubMesh("Exhaust_Tip_Quad", 0.40)
    ex01.add_box((-0.52, 0.20, -1.98), (0.22, 0.09, 0.18))
    ex01.add_box(( 0.52, 0.20, -1.98), (0.22, 0.09, 0.18))
    car01_sms.append(ex01)

    v1, t1 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_01_PocketRocket_Yaris.fbx"), "M_VibeCar_PocketRocket", car01_sms)

    # -----------------------------------------------------------------------
    # CAR 02: GRAVEL RAVERS (90s Subaru Impreza GC8 / Blobeye STI Rally Coupe)
    # -----------------------------------------------------------------------
    gc8_stations = [
        (-2.15, 0.84, 0.88, 0.82, 0.66, 0.20, 0.42, 0.58, 0.72),
        (-2.00, 0.86, 0.90, 0.86, 0.70, 0.18, 0.46, 0.78, 0.88),
        (-1.54, 0.88, 0.97, 0.92, 0.74, 0.16, 0.54, 0.82, 0.90),
        (-1.18, 0.88, 0.97, 0.92, 0.74, 0.15, 0.54, 0.84, 0.92),
        (-0.65, 0.86, 0.90, 0.86, 0.69, 0.15, 0.46, 0.84, 1.35),
        ( 0.15, 0.86, 0.90, 0.86, 0.70, 0.15, 0.46, 0.82, 1.36),
        ( 0.75, 0.86, 0.90, 0.86, 0.79, 0.15, 0.48, 0.78, 0.86),
        ( 1.18, 0.88, 0.97, 0.92, 0.78, 0.15, 0.54, 0.74, 0.84),
        ( 1.54, 0.88, 0.97, 0.92, 0.76, 0.15, 0.54, 0.70, 0.81),
        ( 1.90, 0.86, 0.92, 0.86, 0.72, 0.14, 0.44, 0.64, 0.74),
        ( 2.15, 0.84, 0.88, 0.78, 0.64, 0.14, 0.34, 0.48, 0.56),
    ]
    car02_sms = [
        create_contoured_body_submesh("Chassis_Body", gc8_stations),
        create_wheel_submesh("Wheel_FL", (-0.86, 0.34,  1.36), 0.34, 0.26, "RALLY_6SPOKE", -1.5, True),
        create_wheel_submesh("Wheel_FR", ( 0.86, 0.34,  1.36), 0.34, 0.26, "RALLY_6SPOKE", -1.5, False),
        create_wheel_submesh("Wheel_RL", (-0.86, 0.34, -1.36), 0.34, 0.26, "RALLY_6SPOKE", -1.5, True),
        create_wheel_submesh("Wheel_RR", ( 0.86, 0.34, -1.36), 0.34, 0.26, "RALLY_6SPOKE", -1.5, False),
    ]
    int02 = SubMesh("Interior_Silhouette", 0.60)
    int02.add_box((-0.35, 0.62, -0.10), (0.42, 0.55, 0.45))
    int02.add_box(( 0.35, 0.62, -0.10), (0.42, 0.55, 0.45))
    int02.add_box(( 0.00, 0.96, -0.45), (1.08, 0.42, 0.06))
    car02_sms.append(int02)

    scoop02 = SubMesh("Mod_HoodScoop_And_FogPods", 0.20)
    scoop02.add_box(( 0.00, 0.86, 1.35), (0.48, 0.09, 0.36))
    scoop02.add_box((-0.56, 0.36, 2.14), (0.22, 0.22, 0.08))
    scoop02.add_box(( 0.56, 0.36, 2.14), (0.22, 0.22, 0.08))
    car02_sms.append(scoop02)

    rack02 = SubMesh("Mod_Roof_YakimaRack", 0.20)
    rack02.add_box((0.0, 1.40,  0.22), (1.14, 0.05, 0.08))
    rack02.add_box((0.0, 1.40, -0.42), (1.14, 0.05, 0.08))
    rack02.add_box((0.0, 1.42,  0.34), (1.06, 0.10, 0.04))
    car02_sms.append(rack02)

    wing02 = SubMesh("Mod_Wing_RallyBox", 0.00)
    wing02.add_box(( 0.00, 1.16, -1.92), (1.44, 0.05, 0.30))
    wing02.add_box((-0.68, 1.03, -1.92), (0.06, 0.26, 0.32))
    wing02.add_box(( 0.68, 1.03, -1.92), (0.06, 0.26, 0.32))
    car02_sms.append(wing02)

    fmic02 = SubMesh("Mod_FrontCooler_FMIC", 0.40)
    fmic02.add_box((0.0, 0.30, 2.13), (0.78, 0.24, 0.10))
    car02_sms.append(fmic02)

    flaps02 = SubMesh("Mod_Rally_Mudflaps", 0.20)
    for mx, mz in ((-0.86, 1.04), (0.86, 1.04), (-0.86, -1.68), (0.86, -1.68)):
        flaps02.add_box((mx, 0.22, mz), (0.26, 0.24, 0.02))
    car02_sms.append(flaps02)

    ex02 = SubMesh("Exhaust_Tip_Dual", 0.40)
    ex02.add_box((0.52, 0.22, -2.15), (0.20, 0.10, 0.20))
    car02_sms.append(ex02)

    v2, t2 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_02_GravelRavers_GC8.fbx"), "M_VibeCar_GravelRavers", car02_sms)

    # -----------------------------------------------------------------------
    # CAR 03: SHAKOTAN CYBER (Slammed Nissan S13 180SX / Pink Style PS13)
    # -----------------------------------------------------------------------
    s13_stations = [
        (-2.23, 0.96, 0.98, 0.84, 0.68, 0.08, 0.34, 0.52, 0.66),
        (-2.06, 0.94, 0.96, 0.88, 0.72, 0.09, 0.42, 0.76, 0.86),
        (-1.60, 0.94, 1.01, 0.94, 0.74, 0.08, 0.50, 0.80, 0.94),
        (-1.20, 0.94, 1.01, 0.94, 0.72, 0.08, 0.50, 0.80, 1.04),
        (-0.75, 0.92, 0.95, 0.90, 0.68, 0.08, 0.42, 0.80, 1.18),
        ( 0.05, 0.92, 0.94, 0.88, 0.68, 0.08, 0.42, 0.78, 1.26),
        ( 0.72, 0.92, 0.94, 0.88, 0.80, 0.08, 0.44, 0.74, 0.82),
        ( 1.20, 0.94, 1.00, 0.94, 0.78, 0.08, 0.48, 0.68, 0.77),
        ( 1.58, 0.94, 1.00, 0.94, 0.76, 0.08, 0.48, 0.64, 0.74),
        ( 1.94, 0.94, 0.96, 0.86, 0.72, 0.08, 0.38, 0.56, 0.65),
        ( 2.23, 0.96, 0.98, 0.82, 0.66, 0.07, 0.28, 0.42, 0.48),
    ]
    car03_sms = [
        create_contoured_body_submesh("Chassis_Body", s13_stations),
        create_wheel_submesh("Wheel_FL", (-0.88, 0.33,  1.40), 0.33, 0.29, "DEEPDISH_5SPOKE", -6.5, True),
        create_wheel_submesh("Wheel_FR", ( 0.88, 0.33,  1.40), 0.33, 0.29, "DEEPDISH_5SPOKE", -6.5, False),
        create_wheel_submesh("Wheel_RL", (-0.90, 0.33, -1.40), 0.33, 0.30, "DEEPDISH_5SPOKE", -5.0, True),
        create_wheel_submesh("Wheel_RR", ( 0.90, 0.33, -1.40), 0.33, 0.30, "DEEPDISH_5SPOKE", -5.0, False),
    ]
    int03 = SubMesh("Interior_Silhouette", 0.60)
    int03.add_box((-0.36, 0.56, -0.15), (0.42, 0.52, 0.45))
    int03.add_box(( 0.36, 0.56, -0.15), (0.42, 0.52, 0.45))
    int03.add_box(( 0.00, 0.90, -0.50), (1.08, 0.38, 0.06))
    car03_sms.append(int03)

    for side_lbl, x_pos in (("L", -0.54), ("R", 0.54)):
        hinge = (x_pos, 0.60, 1.88)
        pop = SubMesh(f"PopUp_{side_lbl}", 1.00, pivot=hinge)
        pop.add_box((x_pos, 0.64, 1.98), (0.28, 0.09, 0.22))
        pop.transform_all(lambda pt, c=hinge: rotate_x(pt, -22.0, c))
        car03_sms.append(pop)

    wing03 = SubMesh("Mod_Wing_Ducktail", 0.00)
    wing03.add_box((0.0, 0.93, -2.06), (1.52, 0.14, 0.26))
    car03_sms.append(wing03)

    cooler03 = SubMesh("Mod_FrontCooler_KaidoOil", 0.40)
    cooler03.add_box((0.28, 0.24, 2.24), (0.44, 0.16, 0.10))
    car03_sms.append(cooler03)

    ex03 = SubMesh("Exhaust_Tip_DualShotgun", 0.40)
    ex03.add_box((-0.56, 0.16, -2.26), (0.22, 0.10, 0.28))
    car03_sms.append(ex03)

    v3, t3 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_03_ShakotanCyber_S13.fbx"), "M_VibeCar_ShakotanCyber", car03_sms)

    # -----------------------------------------------------------------------
    # CAR 04 (NEW): HARIGAYA JZX100 CHASER / E36 4-DOOR DRIFT SEDAN (`Cars/01`, `07`)
    # Long 4-door VIP/Drift sedan wheelbase, flared BN-Sports skirts, Chrome VS-KF wheels
    # -----------------------------------------------------------------------
    jzx_stations = [
        (-2.34, 0.95, 0.97, 0.86, 0.70, 0.09, 0.34, 0.54, 0.68),  # Flared Rear Sedan Bumper Lip
        (-2.14, 0.94, 0.96, 0.88, 0.74, 0.10, 0.44, 0.78, 0.88),  # Wide Rear Taillight Bar
        (-1.62, 0.94, 1.01, 0.93, 0.76, 0.09, 0.52, 0.82, 0.92),  # Rear Door & Wide Quarter Arch
        (-1.12, 0.94, 1.01, 0.93, 0.72, 0.09, 0.52, 0.84, 1.32),  # C-Pillar 4-Door Greenhouse
        (-0.20, 0.92, 0.95, 0.90, 0.72, 0.09, 0.44, 0.84, 1.34),  # B-Pillar Sedan Roofline
        ( 0.35, 0.92, 0.95, 0.90, 0.73, 0.09, 0.44, 0.82, 1.33),  # Front Roof Header
        ( 0.88, 0.92, 0.95, 0.90, 0.80, 0.09, 0.46, 0.78, 0.86),  # Base of Windshield
        ( 1.28, 0.94, 1.00, 0.94, 0.78, 0.09, 0.50, 0.72, 0.81),  # Front Vented Drift Fender Rear
        ( 1.66, 0.94, 1.00, 0.94, 0.76, 0.09, 0.50, 0.68, 0.77),  # Front Vented Drift Fender Peak
        ( 2.08, 0.94, 0.96, 0.88, 0.74, 0.09, 0.40, 0.60, 0.70),  # Wide Aero Headlights & Grille
        ( 2.34, 0.96, 0.98, 0.84, 0.68, 0.08, 0.30, 0.44, 0.52),  # Deep Drift Front Bumper Lip
    ]
    car04_sms = [
        create_contoured_body_submesh("Chassis_Body", jzx_stations),
        create_wheel_submesh("Wheel_FL", (-0.89, 0.34,  1.46), 0.34, 0.29, "CHROME_VSKF", -5.5, True),
        create_wheel_submesh("Wheel_FR", ( 0.89, 0.34,  1.46), 0.34, 0.29, "CHROME_VSKF", -5.5, False),
        create_wheel_submesh("Wheel_RL", (-0.91, 0.34, -1.44), 0.34, 0.31, "CHROME_VSKF", -4.5, True),
        create_wheel_submesh("Wheel_RR", ( 0.91, 0.34, -1.44), 0.34, 0.31, "CHROME_VSKF", -4.5, False),
    ]
    int04 = SubMesh("Interior_Silhouette", 0.60)
    int04.add_box((-0.38, 0.58,  0.05), (0.42, 0.52, 0.45))
    int04.add_box(( 0.38, 0.58,  0.05), (0.42, 0.52, 0.45))
    int04.add_box(( 0.00, 0.94, -0.35), (1.12, 0.40, 0.06))
    car04_sms.append(int04)

    fmic04 = SubMesh("Mod_FrontCooler_FMIC", 0.40)
    fmic04.add_box((0.0, 0.26, 2.32), (0.82, 0.24, 0.10))
    car04_sms.append(fmic04)

    diff04 = SubMesh("Mod_RearDiffuser_Strakes", 0.20)
    diff04.add_box((0.0, 0.16, -2.33), (1.56, 0.14, 0.26))
    car04_sms.append(diff04)

    ex04 = SubMesh("Exhaust_Tip_DualShotgun", 0.40)
    ex04.add_box((-0.58, 0.18, -2.36), (0.22, 0.10, 0.26))
    car04_sms.append(ex04)

    v4, t4 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_04_Harigaya_Chaser_JZX100.fbx"), "M_VibeCar_HarigayaChaser", car04_sms)

    # -----------------------------------------------------------------------
    # CAR 05 (NEW): SAVANNA FC3S / TEKKAMEN R30 WEDGE COUPE (`Cars/05`, `08`)
    # Crisp 80s wedge nose, offset rotary hood scoop, Winking Pop-Up Headlights, Watanabe 8-spoke rims
    # -----------------------------------------------------------------------
    fc3s_stations = [
        (-2.12, 0.88, 0.92, 0.84, 0.68, 0.14, 0.38, 0.56, 0.70),  # 80s Boxy Rear Bumper
        (-1.96, 0.88, 0.94, 0.86, 0.72, 0.14, 0.46, 0.76, 0.86),  # Tailgate & Ducktail Deck
        (-1.50, 0.90, 0.98, 0.92, 0.72, 0.12, 0.52, 0.80, 0.92),  # Bolt-On Rear Overfender
        (-1.12, 0.90, 0.98, 0.92, 0.70, 0.12, 0.52, 0.80, 1.06),  # B-Pillar / Glass Hatch
        (-0.35, 0.88, 0.92, 0.88, 0.68, 0.12, 0.44, 0.80, 1.28),  # Cabin Roof Peak
        ( 0.20, 0.88, 0.92, 0.88, 0.68, 0.12, 0.44, 0.78, 1.28),  # Windshield Header
        ( 0.76, 0.88, 0.92, 0.88, 0.78, 0.12, 0.46, 0.74, 0.83),  # Cowl Base
        ( 1.18, 0.90, 0.97, 0.92, 0.76, 0.12, 0.50, 0.68, 0.77),  # Front Box-Blister Fender Rear
        ( 1.56, 0.90, 0.97, 0.92, 0.74, 0.12, 0.50, 0.64, 0.72),  # Front Box-Blister Fender Peak
        ( 1.92, 0.88, 0.92, 0.84, 0.70, 0.11, 0.38, 0.54, 0.62),  # Tekkamen Slit / Pop-Up Nose
        ( 2.14, 0.90, 0.92, 0.80, 0.64, 0.09, 0.28, 0.42, 0.48),  # Front Lip & Triple Air Ducts
    ]
    car05_sms = [
        create_contoured_body_submesh("Chassis_Body", fc3s_stations),
        create_wheel_submesh("Wheel_FL", (-0.86, 0.33,  1.36), 0.33, 0.27, "WATANABE_8SPOKE", -3.8, True),
        create_wheel_submesh("Wheel_FR", ( 0.86, 0.33,  1.36), 0.33, 0.27, "WATANABE_8SPOKE", -3.8, False),
        create_wheel_submesh("Wheel_RL", (-0.88, 0.33, -1.34), 0.33, 0.29, "WATANABE_8SPOKE", -4.0, True),
        create_wheel_submesh("Wheel_RR", ( 0.88, 0.33, -1.34), 0.33, 0.29, "WATANABE_8SPOKE", -4.0, False),
    ]
    int05 = SubMesh("Interior_Silhouette", 0.60)
    int05.add_box((-0.35, 0.56, -0.10), (0.42, 0.52, 0.45))
    int05.add_box(( 0.35, 0.56, -0.10), (0.42, 0.52, 0.45))
    int05.add_box(( 0.00, 0.90, -0.45), (1.06, 0.38, 0.06))
    car05_sms.append(int05)

    # Signature FC3S Asymmetric "Wink" Pop-Up Headlights (`PopUp_L` open 40 deg, `PopUp_R` closed 0 deg!)
    for side_lbl, x_pos, open_deg in (("L", -0.52, -40.0), ("R", 0.52, 0.0)):
        hinge = (x_pos, 0.58, 1.84)
        pop = SubMesh(f"PopUp_{side_lbl}", 1.00, pivot=hinge)
        pop.add_box((x_pos, 0.62, 1.94), (0.26, 0.10, 0.22))
        if abs(open_deg) > 0.1:
            pop.transform_all(lambda pt, c=hinge, d=open_deg: rotate_x(pt, d, c))
        car05_sms.append(pop)

    scoop05 = SubMesh("Mod_OffsetRotaryHoodScoop", 0.20)
    scoop05.add_box((-0.16, 0.80, 1.32), (0.38, 0.07, 0.34))  # FC3S Turbo II Offset Hood Scoop
    car05_sms.append(scoop05)

    wing05 = SubMesh("Mod_Wing_Ducktail", 0.20)
    wing05.add_box((0.0, 0.92, -1.96), (1.48, 0.14, 0.24))
    car05_sms.append(wing05)

    fmic05 = SubMesh("Mod_FrontCooler_FMIC", 0.40)
    fmic05.add_box((0.0, 0.26, 2.12), (0.72, 0.22, 0.10))
    car05_sms.append(fmic05)

    ex05 = SubMesh("Exhaust_Tip_Dual", 0.40)
    ex05.add_box((-0.52, 0.18, -2.14), (0.20, 0.10, 0.22))
    car05_sms.append(ex05)

    v5, t5 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_05_Savanna_FC3S_Tekkamen.fbx"), "M_VibeCar_SavannaTekkamen", car05_sms)

    # -----------------------------------------------------------------------
    # CAR 06 (NEW): TOUGE SPIDER-EYE DC2 INTEGRA / LBWK SILHOUETTE COUPE (`Cars/02`, `06`, `09`)
    # Sleek low-slung fastback coupe with Quad Round Spider-Eye Headlight Pods,
    # LBWK Dive-Plane Canards, and High-Mount Aluminum-Stanchion GT Wing
    # -----------------------------------------------------------------------
    dc2_stations = [
        (-2.18, 0.94, 0.98, 0.84, 0.66, 0.09, 0.34, 0.52, 0.66),
        (-2.00, 0.94, 0.98, 0.88, 0.70, 0.10, 0.44, 0.76, 0.86),
        (-1.56, 0.96, 1.02, 0.94, 0.72, 0.09, 0.50, 0.80, 0.92),
        (-1.14, 0.96, 1.02, 0.94, 0.70, 0.09, 0.50, 0.80, 1.02),
        (-0.55, 0.92, 0.96, 0.90, 0.66, 0.09, 0.42, 0.80, 1.24),
        ( 0.10, 0.92, 0.96, 0.88, 0.66, 0.09, 0.42, 0.78, 1.25),
        ( 0.74, 0.92, 0.96, 0.88, 0.78, 0.09, 0.44, 0.72, 0.80),
        ( 1.20, 0.94, 1.01, 0.94, 0.76, 0.09, 0.48, 0.66, 0.74),
        ( 1.58, 0.94, 1.01, 0.94, 0.74, 0.09, 0.48, 0.62, 0.70),
        ( 1.94, 0.92, 0.96, 0.86, 0.70, 0.08, 0.36, 0.52, 0.60),
        ( 2.18, 0.96, 0.98, 0.80, 0.62, 0.07, 0.26, 0.38, 0.44),
    ]
    car06_sms = [
        create_contoured_body_submesh("Chassis_Body", dc2_stations),
        create_wheel_submesh("Wheel_FL", (-0.88, 0.33,  1.38), 0.33, 0.26, "TOUGE_10SPOKE", -3.2, True),
        create_wheel_submesh("Wheel_FR", ( 0.88, 0.33,  1.38), 0.33, 0.26, "TOUGE_10SPOKE", -3.2, False),
        create_wheel_submesh("Wheel_RL", (-0.90, 0.33, -1.38), 0.33, 0.28, "TOUGE_10SPOKE", -2.8, True),
        create_wheel_submesh("Wheel_RR", ( 0.90, 0.33, -1.38), 0.33, 0.28, "TOUGE_10SPOKE", -2.8, False),
    ]
    int06 = SubMesh("Interior_Silhouette", 0.60)
    int06.add_box((-0.36, 0.56, -0.12), (0.42, 0.52, 0.45))
    int06.add_box(( 0.36, 0.56, -0.12), (0.42, 0.52, 0.45))
    int06.add_box(( 0.00, 0.90, -0.48), (1.08, 0.38, 0.06))
    car06_sms.append(int06)

    # Quad Round Spider-Eye Headlight Pods (Cars/09 Honda Integra DC2 Amber Touge Fogs!)
    quad_lights = SubMesh("Mod_SpiderEye_QuadHeadlights", 1.00)
    for lx in (-0.64, -0.44, 0.44, 0.64):
        quad_lights.add_box((lx, 0.48, 2.12), (0.13, 0.13, 0.08))
    car06_sms.append(quad_lights)

    # High-Mount Aluminum-Stanchion Time-Attack GT Wing (Cars/04, 06, 09)
    wing06 = SubMesh("Mod_Wing_HighMountAluGT", 0.20)
    wing06.add_box(( 0.00, 1.28, -1.98), (1.68, 0.04, 0.32))
    wing06.add_box((-0.44, 1.06, -1.94), (0.03, 0.42, 0.18))
    wing06.add_box(( 0.44, 1.06, -1.94), (0.03, 0.42, 0.18))
    wing06.add_box((-0.84, 1.26, -1.98), (0.03, 0.24, 0.38))
    wing06.add_box(( 0.84, 1.26, -1.98), (0.03, 0.24, 0.38))
    car06_sms.append(wing06)

    # LBWK Front Dive-Plane Canards & Splitter (Cars/06)
    canards06 = SubMesh("Mod_FrontAero_CanardSplitter", 0.20)
    canards06.add_box(( 0.00, 0.08, 2.22), (1.94, 0.04, 0.24))
    canards06.add_box((-0.94, 0.24, 2.08), (0.08, 0.18, 0.28))
    canards06.add_box(( 0.94, 0.24, 2.08), (0.08, 0.18, 0.28))
    car06_sms.append(canards06)

    ex06 = SubMesh("Exhaust_Tip_Dual", 0.40)
    ex06.add_box((0.54, 0.18, -2.18), (0.20, 0.10, 0.22))
    car06_sms.append(ex06)

    v6, t6 = export_multi_submesh_fbx(os.path.join(models_dir, "Car_06_Touge_Integra_DC2.fbx"), "M_VibeCar_TougeSilhouette", car06_sms)

    print(f"[Rave Racer Remix] Generated 6 Low-Poly Vehicle FBX Models & 16 Modular FBX Parts in {models_dir}:")
    print(f"  - Car_01_PocketRocket_Yaris.fbx    : {v1} verts | {t1} tris")
    print(f"  - Car_02_GravelRavers_GC8.fbx      : {v2} verts | {t2} tris")
    print(f"  - Car_03_ShakotanCyber_S13.fbx     : {v3} verts | {t3} tris")
    print(f"  - Car_04_Harigaya_Chaser_JZX100.fbx: {v4} verts | {t4} tris")
    print(f"  - Car_05_Savanna_FC3S_Tekkamen.fbx : {v5} verts | {t5} tris")
    print(f"  - Car_06_Touge_Integra_DC2.fbx     : {v6} verts | {t6} tris")


if __name__ == "__main__":
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    build_all_standalone_models(root)
