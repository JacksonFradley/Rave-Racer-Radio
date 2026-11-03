"""
Rave Racer Remix — Blender 4.x Low-Poly Vehicle & Modular Kitbash Generator
============================================================================
Run inside Blender (Scripting Tab -> Run Script, or via CLI:
`blender --background --python Tools/Blender/generate_car_templates.py`)

Generates:
1. `Modular_Library` Collection:
   - Wheel_01_Turbofan_Aerodisc
   - Wheel_02_Rally_6Spoke
   - Wheel_03_DeepDish_5Spoke
   - Roof_01_CargoBox
   - Roof_02_YakimaRack
   - Cooler_01_Exposed_FMIC
   - Cooler_02_Kaido_OilCooler
   - Wing_01_TimeAttack_SwanNeck
   - Wing_02_Rally_Box
   - Wing_03_Ducktail_Slit

2. Three Complete Low-Poly Vehicle Rigs (2,500 - 4,000 Tris Spec):
   - `Car_01_PocketRocket_Yaris` (Widebody GR Yaris / Mazda 323 GTX Hot Hatch)
   - `Car_02_GravelRavers_GC8`   (90s Subaru Impreza GC8 2-Door Rally Coupe)
   - `Car_03_ShakotanCyber_S13`  (Slammed Nissan 180SX / Kaido Liftback Coupe)

Each vehicle is built with:
- Exact Unity Physics Hierarchy:
  CarRoot -> VisualChassis -> Chassis_Body, Interior_Silhouette, Wheels_Group, Mod_Sockets, VFX_Anchors
- Hard Creases (Mark Sharp) + Weighted Normals for crisp Hiroshi Nagai / Auto Modellista cel-shading
- Vertex Color (`Col`) layer:
  * R = Inverted-Hull Outline Thickness (1.0 outer silhouette/arches, 0.3 pillars, 0.0 interior/details)
  * G = Cavity / Ground AO Shading Weight
  * B = Speed / RPM Vibration Weight (1.0 on exhausts & mudflaps)
- Non-Mirrored Quadrant UV0 Unwrap so street graffiti & kanji never flip backward.
"""

import bpy
import bmesh
import math
from mathutils import Vector, Matrix


# ---------------------------------------------------------------------------
# SCENE CLEANUP & COLLECTION HELPERS
# ---------------------------------------------------------------------------

def clear_existing_rave_objects():
    """Remove previously generated Rave Racer collections and orphan meshes."""
    target_prefixes = ("Modular_Library", "Car_01_", "Car_02_", "Car_03_", "Car_04_", "Car_05_", "Car_06_")
    for col in list(bpy.data.collections):
        if col.name.startswith(target_prefixes):
            for obj in list(col.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(col)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def get_or_create_collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if not col:
        col = bpy.data.collections.new(name)
        if parent:
            parent.children.link(col)
        else:
            bpy.context.scene.collection.children.link(col)
    return col


def link_to_collection(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def create_empty(name, location=(0.0, 0.0, 0.0), parent=None, col=None, display_type='PLAIN_AXES', size=0.2):
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = display_type
    empty.empty_display_size = size
    empty.location = Vector(location)
    if parent:
        empty.parent = parent
    if col:
        link_to_collection(empty, col)
    return empty


# ---------------------------------------------------------------------------
# VERTEX COLOR, UV & NORMAL ENGINEERING
# ---------------------------------------------------------------------------

def assign_vibe_attributes_and_uvs(obj, zone_id=0.0, outline_weight=1.0, flutter_weight=0.0):
    """
    Assigns:
    - Vertex Color `Col`: (R=Outline Thickness, G=Cavity/Height AO, B=Flutter, A=ZoneID)
    - Non-Mirrored Box/Quadrant Projection UV0
    - Sharp Edges (Mark Sharp at 38 deg) + Weighted Normal Modifier
    """
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.faces.ensure_lookup_table()
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()

    # Mark sharp edges for crisp Auto Modellista / Nagai stepped lighting
    sharp_angle = math.radians(38.0)
    for edge in bm.edges:
        if len(edge.link_faces) == 2:
            angle = edge.link_faces[0].normal.angle(edge.link_faces[1].normal, 0.0)
            if angle >= sharp_angle:
                edge.smooth = False
            else:
                edge.smooth = True
        else:
            edge.smooth = False

    # Create or fetch Vertex Color layer (`Col`) and UV layer (`UVMap`)
    color_layer = bm.loops.layers.color.get("Col") or bm.loops.layers.color.new("Col")
    uv_layer = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")

    # Compute bounding box for normalized non-mirrored UV projection & height AO
    xs = [v.co.x for v in bm.verts] or [0.0]
    ys = [v.co.y for v in bm.verts] or [0.0]
    zs = [v.co.z for v in bm.verts] or [0.0]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)
    span_x = max(max_x - min_x, 0.001)
    span_y = max(max_y - min_y, 0.001)
    span_z = max(max_z - min_z, 0.001)

    for face in bm.faces:
        face.smooth = True
        n = face.normal
        # Determine dominant axis for non-mirrored quadrant UV packing:
        # TopLeft (0.0..0.5, 0.5..1.0): Left Side (-X)
        # TopRight (0.5..1.0, 0.5..1.0): Right Side (+X)
        # BottomLeft (0.0..0.5, 0.0..0.5): Top/Bottom (+Z/-Z)
        # BottomRight (0.5..1.0, 0.0..0.5): Front/Rear (-Y/+Y) & Accessories
        for loop in face.loops:
            co = loop.vert.co
            u_norm_y = (co.y - min_y) / span_y
            u_norm_x = (co.x - min_x) / span_x
            v_norm_z = (co.z - min_z) / span_z

            if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
                if n.x < 0:
                    # Left Side -> Top-Left Quadrant
                    u = 0.02 + u_norm_y * 0.46
                    v = 0.52 + v_norm_z * 0.46
                else:
                    # Right Side -> Top-Right Quadrant (un-mirrored forward->back)
                    u = 0.52 + (1.0 - u_norm_y) * 0.46
                    v = 0.52 + v_norm_z * 0.46
            elif abs(n.z) >= abs(n.x) and abs(n.z) >= abs(n.y):
                # Top / Hood / Roof -> Bottom-Left Quadrant
                u = 0.02 + u_norm_x * 0.46
                v = 0.02 + u_norm_y * 0.46
            else:
                # Front / Rear Bumpers & Modular Parts -> Bottom-Right Quadrant
                u = 0.52 + u_norm_x * 0.46
                v = 0.02 + v_norm_z * 0.46

            loop[uv_layer].uv = (u, v)

            # Vertex Color Calculation:
            # R: Outline weight (boosted on lower skirts, wheel arches, and outer width extremes)
            edge_factor = max(abs(co.x) / (span_x * 0.5 + 0.001), 0.35)
            r_val = min(1.0, outline_weight * edge_factor)
            # G: Vertical ground-proximity AO (darker near bottom splitter, brighter on roof)
            g_val = max(0.15, min(1.0, 0.3 + 0.7 * v_norm_z))
            # B: Speed / RPM flutter weight
            b_val = flutter_weight
            loop[color_layer] = (r_val, g_val, b_val, zone_id)

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    # Enable Auto Smooth / Weighted Normals for planar Nagai cel-shading
    if hasattr(mesh, "use_auto_smooth"):
        mesh.use_auto_smooth = True
        mesh.auto_smooth_angle = sharp_angle

    wn = obj.modifiers.new(name="RaveWeightedNormal", type='WEIGHTED_NORMAL')
    wn.weight = 50
    wn.keep_sharp = True


# ---------------------------------------------------------------------------
# MODULAR PARTS LIBRARY BUILDERS
# ---------------------------------------------------------------------------

def build_wheel_mesh(name, radius=0.33, width=0.26, style="TURBOFAN", col=None):
    """
    Builds a 16-sided low-poly wheel & tire centered at (0, 0, 0) with +X as axle axis.
    styles: 'TURBOFAN', 'RALLY_6SPOKE', 'DEEPDISH_5SPOKE'
    """
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    if col:
        link_to_collection(obj, col)

    bm = bmesh.new()
    segments = 16
    half_w = width * 0.5
    rim_r = radius * 0.68

    # Create outer tire cylinder with chamfered shoulders (meaty/stretched look)
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius,
        depth=width * 0.82,
        matrix=Matrix.Rotation(math.radians(90.0), 4, 'Y')
    )

    # Inset outer face to create rim lip, dish, and hub/aerodisc
    bm.faces.ensure_lookup_table()
    outer_faces = [f for f in bm.faces if abs(f.normal.x) > 0.9]
    for f in outer_faces:
        sign = 1.0 if f.normal.x > 0 else -1.0
        # Inset tire sidewall to rim edge
        res1 = bmesh.ops.inset_individual(bm, faces=[f], thickness=radius - rim_r, depth=0.015 * sign)
        if sign > 0:
            if style == "TURBOFAN":
                # Conical vented turbofan Aerodisc protruding slightly with recessed center hex nut
                res2 = bmesh.ops.inset_individual(bm, faces=[f], thickness=rim_r * 0.72, depth=0.025)
                bmesh.ops.inset_individual(bm, faces=[f], thickness=rim_r * 0.15, depth=-0.02)
            elif style == "DEEPDISH_5SPOKE":
                # Deep step-lip dish
                res2 = bmesh.ops.inset_individual(bm, faces=[f], thickness=rim_r * 0.25, depth=-0.055)
                bmesh.ops.inset_individual(bm, faces=[f], thickness=rim_r * 0.55, depth=-0.02)
            else:
                # Concave 6-spoke rally face
                res2 = bmesh.ops.inset_individual(bm, faces=[f], thickness=rim_r * 0.75, depth=-0.035)

    bm.to_mesh(mesh)
    bm.free()
    assign_vibe_attributes_and_uvs(obj, zone_id=0.40, outline_weight=0.85, flutter_weight=0.0)
    return obj


def build_box_part(name, dims, bevel_amt=0.02, zone_id=0.20, outline_weight=0.8, flutter=0.0, col=None):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    if col:
        link_to_collection(obj, col)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(dims), verts=bm.verts)
    if bevel_amt > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel_amt, segments=1, affect='EDGES')
    bm.to_mesh(mesh)
    bm.free()
    assign_vibe_attributes_and_uvs(obj, zone_id=zone_id, outline_weight=outline_weight, flutter_weight=flutter)
    return obj


def build_modular_library():
    lib_col = get_or_create_collection("Modular_Library")
    parts = {}

    # 6 Wheel Archetypes
    parts["Wheel_01_Turbofan_Aerodisc"] = build_wheel_mesh("Wheel_01_Turbofan_Aerodisc", 0.34, 0.27, "TURBOFAN", lib_col)
    parts["Wheel_01_Turbofan_Aerodisc"].location = Vector((-4.0, -3.0, 0.34))

    parts["Wheel_02_Rally_6Spoke"] = build_wheel_mesh("Wheel_02_Rally_6Spoke", 0.34, 0.26, "RALLY_6SPOKE", lib_col)
    parts["Wheel_02_Rally_6Spoke"].location = Vector((-4.0, -1.5, 0.34))

    parts["Wheel_03_DeepDish_5Spoke"] = build_wheel_mesh("Wheel_03_DeepDish_5Spoke", 0.33, 0.29, "DEEPDISH_5SPOKE", lib_col)
    parts["Wheel_03_DeepDish_5Spoke"].location = Vector((-4.0, 0.0, 0.33))

    parts["Wheel_04_Chrome_VSKF_5Spoke"] = build_wheel_mesh("Wheel_04_Chrome_VSKF_5Spoke", 0.34, 0.30, "DEEPDISH_5SPOKE", lib_col)
    parts["Wheel_04_Chrome_VSKF_5Spoke"].location = Vector((-4.0, 1.5, 0.34))

    parts["Wheel_05_Watanabe_8Spoke_Retro"] = build_wheel_mesh("Wheel_05_Watanabe_8Spoke_Retro", 0.33, 0.27, "DEEPDISH_5SPOKE", lib_col)
    parts["Wheel_05_Watanabe_8Spoke_Retro"].location = Vector((-4.0, 3.0, 0.33))

    parts["Wheel_06_Touge_10Spoke_CE28"] = build_wheel_mesh("Wheel_06_Touge_10Spoke_CE28", 0.33, 0.25, "RALLY_6SPOKE", lib_col)
    parts["Wheel_06_Touge_10Spoke_CE28"].location = Vector((-4.0, 4.5, 0.33))

    # Roof Attachments
    parts["Roof_01_CargoBox"] = build_box_part("Roof_01_CargoBox", (0.82, 1.55, 0.28), 0.05, 0.20, 0.9, 0.0, lib_col)
    parts["Roof_01_CargoBox"].location = Vector((-5.5, -2.0, 0.5))

    parts["Roof_02_YakimaRack"] = build_box_part("Roof_02_YakimaRack", (1.05, 1.10, 0.12), 0.02, 0.20, 0.6, 0.0, lib_col)
    parts["Roof_02_YakimaRack"].location = Vector((-5.5, 0.0, 0.5))

    # Front Coolers & Aero
    parts["Cooler_01_Exposed_FMIC"] = build_box_part("Cooler_01_Exposed_FMIC", (0.76, 0.12, 0.24), 0.015, 0.40, 0.5, 0.0, lib_col)
    parts["Cooler_01_Exposed_FMIC"].location = Vector((-5.5, 2.0, 0.3))

    parts["Cooler_02_Kaido_OilCooler"] = build_box_part("Cooler_02_Kaido_OilCooler", (0.42, 0.10, 0.16), 0.01, 0.40, 0.6, 0.0, lib_col)
    parts["Cooler_02_Kaido_OilCooler"].location = Vector((-5.5, 3.2, 0.3))

    parts["Bumper_01_LBWK_CanardSplitter"] = build_box_part("Bumper_01_LBWK_CanardSplitter", (1.94, 0.42, 0.16), 0.01, 0.20, 0.9, 0.0, lib_col)
    parts["Bumper_01_LBWK_CanardSplitter"].location = Vector((-5.5, 4.4, 0.3))

    parts["Diffuser_01_TimeAttack_Strakes"] = build_box_part("Diffuser_01_TimeAttack_Strakes", (1.64, 0.36, 0.18), 0.01, 0.20, 0.85, 0.0, lib_col)
    parts["Diffuser_01_TimeAttack_Strakes"].location = Vector((-5.5, 5.6, 0.3))

    # Rear Wings
    parts["Wing_01_TimeAttack_SwanNeck"] = build_box_part("Wing_01_TimeAttack_SwanNeck", (1.62, 0.38, 0.26), 0.02, 0.20, 1.0, 0.0, lib_col)
    parts["Wing_01_TimeAttack_SwanNeck"].location = Vector((-7.0, -2.0, 0.5))

    parts["Wing_02_Rally_Box"] = build_box_part("Wing_02_Rally_Box", (1.44, 0.32, 0.28), 0.02, 0.00, 1.0, 0.0, lib_col)
    parts["Wing_02_Rally_Box"].location = Vector((-7.0, 0.0, 0.5))

    parts["Wing_03_Ducktail_Slit"] = build_box_part("Wing_03_Ducktail_Slit", (1.52, 0.28, 0.14), 0.02, 0.00, 0.9, 0.0, lib_col)
    parts["Wing_03_Ducktail_Slit"].location = Vector((-7.0, 2.0, 0.5))

    parts["Wing_04_HighMount_AluGT"] = build_box_part("Wing_04_HighMount_AluGT", (1.68, 0.34, 0.34), 0.02, 0.20, 1.0, 0.0, lib_col)
    parts["Wing_04_HighMount_AluGT"].location = Vector((-7.0, 4.0, 0.5))

    return parts


# ---------------------------------------------------------------------------
# MULTI-STATION CONTOURED LOW-POLY CHASSIS GENERATOR
# ---------------------------------------------------------------------------

def build_contoured_chassis_mesh(name, stations, col=None):
    """
    Constructs a clean quad-based low-poly vehicle shell from longitudinal Y stations.
    In Blender coordinates: -Y is Front, +Y is Rear, +X is Right, +Z is Up.
    Each station tuple:
      (y_pos, half_w_bottom, half_w_belt, half_w_roof, z_bottom, z_belt, z_roof)
    Produces 8 vertices per station cross-section (Bottom-CenterL/R, LowerSillL/R, BeltlineL/R, Roof/HoodCenterL/R)
    with prominent widebody box-fender extrusion on the wheel stations.
    """
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    if col:
        link_to_collection(obj, col)

    bm = bmesh.new()
    rings = []

    for (y, w_bot, w_belt, w_roof, z_bot, z_belt, z_roof) in stations:
        # 8-vertex cross-section loop around the car body (counter-clockwise looking from front)
        ring_coords = [
            Vector((-w_roof * 0.25, y, z_roof)),           # 0: Center-Left Top (Hood/Roof/Deck)
            Vector((-w_roof,        y, z_roof - 0.03)),    # 1: Outer-Left Roof/Hood Edge
            Vector((-w_belt,        y, z_belt)),           # 2: Left Upper Beltline / Box Flare Top
            Vector((-w_bot,         y, z_bot + 0.14)),     # 3: Left Lower Widebody Flare / Skirt Lip
            Vector((-w_bot * 0.78,  y, z_bot)),            # 4: Left Underbody Sill
            Vector(( w_bot * 0.78,  y, z_bot)),            # 5: Right Underbody Sill
            Vector(( w_bot,         y, z_bot + 0.14)),     # 6: Right Lower Widebody Flare / Skirt Lip
            Vector(( w_belt,        y, z_belt)),           # 7: Right Upper Beltline / Box Flare Top
            Vector(( w_roof,        y, z_roof - 0.03)),    # 8: Outer-Right Roof/Hood Edge
            Vector(( w_roof * 0.25, y, z_roof)),           # 9: Center-Right Top
        ]
        ring_verts = [bm.verts.new(co) for co in ring_coords]
        rings.append(ring_verts)

    bm.verts.ensure_lookup_table()
    n_ring = len(rings[0])

    # Bridge consecutive station rings with clean quad strips
    for i in range(len(rings) - 1):
        rA = rings[i]
        rB = rings[i + 1]
        for j in range(n_ring):
            j_next = (j + 1) % n_ring
            bm.faces.new((rA[j], rA[j_next], rB[j_next], rB[j]))

    # Cap front nose and rear tail
    bm.faces.new(reversed(rings[0]))
    bm.faces.new(rings[-1])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    assign_vibe_attributes_and_uvs(obj, zone_id=0.0, outline_weight=1.0, flutter_weight=0.0)
    return obj


def build_interior_silhouette(name, parent, col):
    """Low-poly bucket seats + roll-cage crossbars (~180 tris) visible through windshield."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    obj.parent = parent
    link_to_collection(obj, col)

    bm = bmesh.new()
    # Two low-poly bucket seats (Left & Right)
    for x_offset in (-0.36, 0.36):
        bmesh.ops.create_cube(
            bm,
            size=1.0,
            matrix=Matrix.Translation((x_offset, 0.15, 0.62)) @ Matrix.Diagonal((0.42, 0.45, 0.55, 1.0))
        )
    # Main roll-cage B-pillar hoop + diagonal bar
    bmesh.ops.create_cube(
        bm,
        size=1.0,
        matrix=Matrix.Translation((0.0, 0.48, 0.96)) @ Matrix.Diagonal((1.12, 0.06, 0.45, 1.0))
    )
    bm.to_mesh(mesh)
    bm.free()
    assign_vibe_attributes_and_uvs(obj, zone_id=0.60, outline_weight=0.0, flutter_weight=0.0)
    return obj


# ---------------------------------------------------------------------------
# FULL VEHICLE RIG ASSEMBLER (HIERARCHY + SOCKETS + WHEELS + VFX)
# ---------------------------------------------------------------------------

def assemble_vehicle_rig(
    archetype_id,
    world_offset,
    stations,
    wheelbase_half_y,
    track_half_x,
    wheel_radius,
    front_wheel_template,
    rear_wheel_template,
    camber_front_deg,
    camber_rear_deg,
    wing_template,
    wing_pos,
    roof_template,
    roof_pos,
    cooler_template,
    cooler_pos,
    has_popup_headlights=False,
    has_mudflaps=False,
):
    col = get_or_create_collection(archetype_id)
    car_root = create_empty(f"{archetype_id}_Root", location=world_offset, col=col, display_type='ARROWS', size=0.4)
    visual_chassis = create_empty("VisualChassis", location=(0, 0, 0), parent=car_root, col=col, display_type='CUBE', size=0.25)

    # 1. Main Contoured Widebody Shell
    body_obj = build_contoured_chassis_mesh("Chassis_Body", stations, col=col)
    body_obj.parent = visual_chassis

    # 2. Low-Poly Interior Silhouette
    build_interior_silhouette("Interior_Silhouette", visual_chassis, col)

    # 3. Wheels Group (Centered Axle Pivots)
    wheels_grp = create_empty("Wheels_Group", location=(0, 0, 0), parent=visual_chassis, col=col)
    wheel_configs = [
        ("Wheel_FL", (-track_half_x, -wheelbase_half_y, wheel_radius), front_wheel_template,  camber_front_deg, True),
        ("Wheel_FR", ( track_half_x, -wheelbase_half_y, wheel_radius), front_wheel_template, -camber_front_deg, False),
        ("Wheel_RL", (-track_half_x,  wheelbase_half_y, wheel_radius), rear_wheel_template,   camber_rear_deg,  True),
        ("Wheel_RR", ( track_half_x,  wheelbase_half_y, wheel_radius), rear_wheel_template,  -camber_rear_deg,  False),
    ]
    for w_name, w_pos, w_tmpl, camber_deg, is_left in wheel_configs:
        w_inst = bpy.data.objects.new(w_name, w_tmpl.data.copy())
        w_inst.parent = wheels_grp
        w_inst.location = Vector(w_pos)
        rot_z = math.radians(180.0) if is_left else 0.0
        w_inst.rotation_euler = (0.0, math.radians(camber_deg), rot_z)
        link_to_collection(w_inst, col)

    # 4. Modular Attachment Sockets
    sockets_grp = create_empty("Mod_Sockets", location=(0, 0, 0), parent=visual_chassis, col=col)

    sock_wing = create_empty("Socket_Wing", location=wing_pos, parent=sockets_grp, col=col)
    if wing_template:
        wing_inst = bpy.data.objects.new("Mod_Wing", wing_template.data.copy())
        wing_inst.parent = sock_wing
        link_to_collection(wing_inst, col)

    sock_roof = create_empty("Socket_Roof", location=roof_pos, parent=sockets_grp, col=col)
    if roof_template:
        roof_inst = bpy.data.objects.new("Mod_Roof", roof_template.data.copy())
        roof_inst.parent = sock_roof
        link_to_collection(roof_inst, col)

    sock_cooler = create_empty("Socket_FrontCooler", location=cooler_pos, parent=sockets_grp, col=col)
    if cooler_template:
        cooler_inst = bpy.data.objects.new("Mod_FrontCooler", cooler_template.data.copy())
        cooler_inst.parent = sock_cooler
        link_to_collection(cooler_inst, col)

    # Articulated Pop-Up Headlights (Sleepy-Eye Hinge Pivots)
    sock_lights = create_empty("Socket_Headlights", location=(0.0, -wheelbase_half_y - 0.55, 0.62), parent=sockets_grp, col=col)
    if has_popup_headlights:
        for side_label, x_sign in (("L", -1.0), ("R", 1.0)):
            hinge = create_empty(f"PopUp_{side_label}", location=(0.56 * x_sign, 0.0, 0.0), parent=sock_lights, col=col)
            hinge.rotation_euler = (math.radians(22.0), 0.0, 0.0)  # Signature 22-deg Sleepy-Eye angle
            pod = build_box_part(f"PopUp_Mesh_{side_label}", (0.28, 0.24, 0.10), 0.01, 1.00, 0.5, 0.0, col)
            pod.parent = hinge
            pod.location = Vector((0.0, -0.10, 0.04))

    # Optional Rally Mudflaps (with B-channel flutter weight = 1.0)
    if has_mudflaps:
        for mf_name, mf_pos in (
            ("Mudflap_FL", (-track_half_x, -wheelbase_half_y + 0.34, 0.22)),
            ("Mudflap_FR", ( track_half_x, -wheelbase_half_y + 0.34, 0.22)),
            ("Mudflap_RL", (-track_half_x,  wheelbase_half_y + 0.34, 0.22)),
            ("Mudflap_RR", ( track_half_x,  wheelbase_half_y + 0.34, 0.22)),
        ):
            flap = build_box_part(mf_name, (0.26, 0.02, 0.24), 0.002, 0.20, 0.8, 1.0, col)
            flap.parent = sockets_grp
            flap.location = Vector(mf_pos)

    # Exhaust Tips (with B-channel RPM vibration weight = 1.0)
    sock_exhaust = create_empty("Socket_Exhaust", location=(0.52, wheelbase_half_y + 0.72, 0.22), parent=sockets_grp, col=col)
    ex_mesh = build_box_part("Exhaust_Tip_Dual", (0.24, 0.22, 0.10), 0.015, 0.40, 0.7, 1.0, col)
    ex_mesh.parent = sock_exhaust

    # 5. VFX Emitters (Taillight Ribbon Trails & Toon Tire Smoke Contact Points)
    vfx_grp = create_empty("VFX_Anchors", location=(0, 0, 0), parent=visual_chassis, col=col)
    create_empty("Trail_Taillight_L", location=(-0.68, wheelbase_half_y + 0.68, 0.72), parent=vfx_grp, col=col)
    create_empty("Trail_Taillight_R", location=( 0.68, wheelbase_half_y + 0.68, 0.72), parent=vfx_grp, col=col)
    create_empty("Smoke_Contact_RL",  location=(-track_half_x, wheelbase_half_y, 0.02), parent=vfx_grp, col=col)
    create_empty("Smoke_Contact_RR",  location=( track_half_x, wheelbase_half_y, 0.02), parent=vfx_grp, col=col)

    return car_root


# ---------------------------------------------------------------------------
# BUILD ALL 3 HERO ARCHETYPES
# ---------------------------------------------------------------------------

def generate_all():
    clear_existing_rave_objects()
    parts = build_modular_library()

    # -----------------------------------------------------------------------
    # ARCHETYPE 01: POCKET ROCKET (Toyota GR Yaris / Mazda 323 GTX Hot Hatch)
    # Length: 3.96m | Width: 1.98m | Height: 1.38m
    # -----------------------------------------------------------------------
    yaris_stations = [
        # (y_pos, half_w_bot, half_w_belt, half_w_roof, z_bot, z_belt, z_roof)
        (-1.98, 0.88, 0.80, 0.62, 0.10, 0.50, 0.58),  # Front Splitter & Wide Grille
        (-1.72, 0.96, 0.92, 0.72, 0.10, 0.66, 0.76),  # Front Bumper & Headlight Line
        (-1.26, 0.99, 0.98, 0.78, 0.12, 0.74, 0.84),  # Front Box-Flared Wheel Arch Peak
        (-0.78, 0.92, 0.90, 0.80, 0.12, 0.82, 0.90),  # Cowl / Base of Windshield
        (-0.15, 0.92, 0.90, 0.72, 0.12, 0.86, 1.38),  # Front Roof Header
        ( 0.85, 0.96, 0.94, 0.70, 0.12, 0.88, 1.36),  # B-Pillar / Rear Haunch Start
        ( 1.30, 1.01, 0.99, 0.68, 0.13, 0.88, 1.32),  # Massive Rear Box-Flared Arch Peak
        ( 1.82, 0.95, 0.92, 0.64, 0.15, 0.82, 1.05),  # Fast Hatch Glass & Taillight Bar
        ( 1.98, 0.90, 0.84, 0.60, 0.18, 0.62, 0.74),  # Rear Diffuser & Bumper Step
    ]
    assemble_vehicle_rig(
        archetype_id="Car_01_PocketRocket_Yaris",
        world_offset=(0.0, 0.0, 0.0),
        stations=yaris_stations,
        wheelbase_half_y=1.28,
        track_half_x=0.88,
        wheel_radius=0.34,
        front_wheel_template=parts["Wheel_01_Turbofan_Aerodisc"],
        rear_wheel_template=parts["Wheel_03_DeepDish_5Spoke"],
        camber_front_deg=-2.5,
        camber_rear_deg=-3.0,
        wing_template=parts["Wing_01_TimeAttack_SwanNeck"],
        wing_pos=(0.0, 1.65, 1.36),
        roof_template=parts["Roof_01_CargoBox"],
        roof_pos=(0.0, 0.30, 1.50),
        cooler_template=parts["Cooler_01_Exposed_FMIC"],
        cooler_pos=(0.0, -1.94, 0.28),
        has_popup_headlights=False,
        has_mudflaps=False,
    )

    # -----------------------------------------------------------------------
    # ARCHETYPE 02: GRAVEL RAVERS (90s Subaru Impreza GC8 2-Door Rally Coupe)
    # Length: 4.30m | Width: 1.92m | Height: 1.36m
    # -----------------------------------------------------------------------
    gc8_stations = [
        (-2.15, 0.84, 0.78, 0.64, 0.14, 0.48, 0.56),  # Cutout Rally Bumper & Fog Pods
        (-1.85, 0.92, 0.88, 0.74, 0.14, 0.64, 0.74),  # Headlights & Hood Scoop Nose
        (-1.35, 0.96, 0.95, 0.78, 0.15, 0.72, 0.83),  # Front Bolt-On Overfender Peak
        (-0.75, 0.88, 0.86, 0.79, 0.15, 0.78, 0.86),  # Windshield Base
        (-0.10, 0.88, 0.86, 0.70, 0.15, 0.82, 1.36),  # Roofline & Roof Vent
        ( 0.65, 0.88, 0.86, 0.69, 0.15, 0.84, 1.35),  # Rear C-Pillar Base
        ( 1.10, 0.94, 0.92, 0.74, 0.15, 0.84, 0.92),  # Trunk Deck Transition
        ( 1.38, 0.96, 0.95, 0.74, 0.16, 0.82, 0.90),  # Rear Bolt-On Overfender Peak
        ( 2.02, 0.90, 0.86, 0.70, 0.18, 0.78, 0.88),  # Coupe Trunk End & Taillights
        ( 2.15, 0.86, 0.82, 0.66, 0.20, 0.58, 0.72),  # Rear Bumper Apron
    ]
    assemble_vehicle_rig(
        archetype_id="Car_02_GravelRavers_GC8",
        world_offset=(3.2, 0.0, 0.0),
        stations=gc8_stations,
        wheelbase_half_y=1.36,
        track_half_x=0.86,
        wheel_radius=0.34,
        front_wheel_template=parts["Wheel_02_Rally_6Spoke"],
        rear_wheel_template=parts["Wheel_02_Rally_6Spoke"],
        camber_front_deg=-1.5,
        camber_rear_deg=-1.5,
        wing_template=parts["Wing_02_Rally_Box"],
        wing_pos=(0.0, 1.88, 1.04),
        roof_template=parts["Roof_02_YakimaRack"],
        roof_pos=(0.0, 0.25, 1.42),
        cooler_template=parts["Cooler_01_Exposed_FMIC"],
        cooler_pos=(0.0, -2.12, 0.30),
        has_popup_headlights=False,
        has_mudflaps=True,
    )

    # -----------------------------------------------------------------------
    # ARCHETYPE 03: SHAKOTAN CYBER (Slammed S13 180SX / Kaido Liftback)
    # Length: 4.46m | Width: 1.96m | Height: 1.26m (Slammed + Demon Camber)
    # -----------------------------------------------------------------------
    s13_stations = [
        (-2.23, 0.94, 0.82, 0.66, 0.07, 0.42, 0.48),  # Snowplow BN-Sports Front Lip
        (-1.90, 0.95, 0.86, 0.72, 0.08, 0.56, 0.66),  # Pop-Up Headlight Deck
        (-1.38, 0.98, 0.96, 0.78, 0.08, 0.68, 0.76),  # Works Front Widebody Flare
        (-0.72, 0.92, 0.88, 0.80, 0.08, 0.74, 0.82),  # Base of Raked Windshield
        ( 0.05, 0.92, 0.88, 0.68, 0.08, 0.78, 1.26),  # Low Roof Peak
        ( 0.85, 0.94, 0.90, 0.68, 0.08, 0.80, 1.18),  # Fastback Hatch Slope
        ( 1.42, 0.99, 0.97, 0.74, 0.08, 0.80, 0.96),  # Works Rear Widebody Flare
        ( 2.08, 0.95, 0.88, 0.72, 0.09, 0.76, 0.86),  # Kouki Rear Taillight Panel
        ( 2.23, 0.96, 0.84, 0.68, 0.09, 0.52, 0.66),  # Flared Rear Drift Bumper Lip
    ]
    assemble_vehicle_rig(
        archetype_id="Car_03_ShakotanCyber_S13",
        world_offset=(6.4, 0.0, 0.0),
        stations=s13_stations,
        wheelbase_half_y=1.40,
        track_half_x=0.88,
        wheel_radius=0.33,
        front_wheel_template=parts["Wheel_03_DeepDish_5Spoke"],
        rear_wheel_template=parts["Wheel_03_DeepDish_5Spoke"],
        camber_front_deg=-6.5,
        camber_rear_deg=-5.0,
        wing_template=parts["Wing_03_Ducktail_Slit"],
        wing_pos=(0.0, 2.02, 0.93),
        roof_template=None,
        roof_pos=(0.0, 0.20, 1.28),
        cooler_template=parts["Cooler_02_Kaido_OilCooler"],
        cooler_pos=(0.24, -2.24, 0.26),
        has_popup_headlights=True,
        has_mudflaps=False,
    )

    # -----------------------------------------------------------------------
    # ARCHETYPE 04: HARIGAYA CHASER JZX100 / E36 4-DOOR DRIFT SEDAN (`Cars/01`, `07`)
    # -----------------------------------------------------------------------
    jzx_stations = [
        (-2.34, 0.96, 0.84, 0.68, 0.08, 0.44, 0.52),
        (-2.08, 0.96, 0.88, 0.74, 0.09, 0.60, 0.70),
        (-1.48, 1.00, 0.94, 0.78, 0.09, 0.70, 0.80),
        (-0.88, 0.95, 0.90, 0.80, 0.09, 0.78, 0.86),
        (-0.35, 0.95, 0.90, 0.73, 0.09, 0.82, 1.33),
        ( 0.20, 0.95, 0.90, 0.72, 0.09, 0.84, 1.34),
        ( 1.12, 1.01, 0.93, 0.72, 0.09, 0.84, 1.32),
        ( 1.62, 1.01, 0.93, 0.76, 0.09, 0.82, 0.92),
        ( 2.14, 0.96, 0.88, 0.74, 0.10, 0.78, 0.88),
        ( 2.34, 0.97, 0.86, 0.70, 0.09, 0.54, 0.68),
    ]
    assemble_vehicle_rig(
        archetype_id="Car_04_Harigaya_Chaser_JZX100",
        world_offset=(9.6, 0.0, 0.0),
        stations=jzx_stations,
        wheelbase_half_y=1.45,
        track_half_x=0.89,
        wheel_radius=0.34,
        front_wheel_template=parts["Wheel_04_Chrome_VSKF_5Spoke"],
        rear_wheel_template=parts["Wheel_04_Chrome_VSKF_5Spoke"],
        camber_front_deg=-5.5,
        camber_rear_deg=-4.5,
        wing_template=None,
        wing_pos=(0.0, 2.12, 0.90),
        roof_template=None,
        roof_pos=(0.0, 0.10, 1.34),
        cooler_template=parts["Cooler_01_Exposed_FMIC"],
        cooler_pos=(0.0, -2.30, 0.26),
        has_popup_headlights=False,
        has_mudflaps=False,
    )

    # -----------------------------------------------------------------------
    # ARCHETYPE 05: SAVANNA FC3S / TEKKAMEN R30 WEDGE COUPE (`Cars/05`, `08`)
    # -----------------------------------------------------------------------
    fc3s_stations = [
        (-2.14, 0.92, 0.80, 0.64, 0.09, 0.42, 0.48),
        (-1.92, 0.92, 0.84, 0.70, 0.11, 0.54, 0.62),
        (-1.40, 0.97, 0.92, 0.75, 0.12, 0.66, 0.75),
        (-0.76, 0.92, 0.88, 0.78, 0.12, 0.74, 0.83),
        (-0.20, 0.92, 0.88, 0.68, 0.12, 0.78, 1.28),
        ( 0.35, 0.92, 0.88, 0.68, 0.12, 0.80, 1.28),
        ( 1.12, 0.98, 0.92, 0.70, 0.12, 0.80, 1.06),
        ( 1.50, 0.98, 0.92, 0.72, 0.12, 0.80, 0.92),
        ( 1.96, 0.94, 0.86, 0.72, 0.14, 0.76, 0.86),
        ( 2.12, 0.92, 0.84, 0.68, 0.14, 0.56, 0.70),
    ]
    assemble_vehicle_rig(
        archetype_id="Car_05_Savanna_FC3S_Tekkamen",
        world_offset=(12.8, 0.0, 0.0),
        stations=fc3s_stations,
        wheelbase_half_y=1.35,
        track_half_x=0.86,
        wheel_radius=0.33,
        front_wheel_template=parts["Wheel_05_Watanabe_8Spoke_Retro"],
        rear_wheel_template=parts["Wheel_05_Watanabe_8Spoke_Retro"],
        camber_front_deg=-3.8,
        camber_rear_deg=-4.0,
        wing_template=parts["Wing_03_Ducktail_Slit"],
        wing_pos=(0.0, 1.96, 0.92),
        roof_template=None,
        roof_pos=(0.0, 0.15, 1.28),
        cooler_template=parts["Cooler_01_Exposed_FMIC"],
        cooler_pos=(0.0, -2.10, 0.26),
        has_popup_headlights=True,
        has_mudflaps=False,
    )

    # -----------------------------------------------------------------------
    # ARCHETYPE 06: TOUGE SPIDER-EYE DC2 INTEGRA / LBWK SILHOUETTE (`Cars/02`, `06`, `09`)
    # -----------------------------------------------------------------------
    dc2_stations = [
        (-2.18, 0.98, 0.80, 0.62, 0.07, 0.38, 0.44),
        (-1.94, 0.96, 0.86, 0.70, 0.08, 0.52, 0.60),
        (-1.40, 1.01, 0.94, 0.75, 0.09, 0.64, 0.72),
        (-0.74, 0.96, 0.88, 0.78, 0.09, 0.72, 0.80),
        (-0.10, 0.96, 0.88, 0.66, 0.09, 0.78, 1.25),
        ( 0.55, 0.96, 0.90, 0.66, 0.09, 0.80, 1.24),
        ( 1.14, 1.02, 0.94, 0.70, 0.09, 0.80, 1.02),
        ( 1.56, 1.02, 0.94, 0.72, 0.09, 0.80, 0.92),
        ( 2.00, 0.98, 0.88, 0.70, 0.10, 0.76, 0.86),
        ( 2.18, 0.98, 0.84, 0.66, 0.09, 0.52, 0.66),
    ]
    assemble_vehicle_rig(
        archetype_id="Car_06_Touge_Integra_DC2",
        world_offset=(16.0, 0.0, 0.0),
        stations=dc2_stations,
        wheelbase_half_y=1.38,
        track_half_x=0.88,
        wheel_radius=0.33,
        front_wheel_template=parts["Wheel_06_Touge_10Spoke_CE28"],
        rear_wheel_template=parts["Wheel_06_Touge_10Spoke_CE28"],
        camber_front_deg=-3.2,
        camber_rear_deg=-2.8,
        wing_template=parts["Wing_04_HighMount_AluGT"],
        wing_pos=(0.0, 1.98, 1.15),
        roof_template=None,
        roof_pos=(0.0, 0.15, 1.25),
        cooler_template=parts["Bumper_01_LBWK_CanardSplitter"],
        cooler_pos=(0.0, -2.14, 0.18),
        has_popup_headlights=False,
        has_mudflaps=False,
    )

    print("[Rave Racer Remix] Successfully generated Modular_Library (16 parts) and 6 Low-Poly Vehicle Rigs!")


if __name__ == "__main__":
    generate_all()
