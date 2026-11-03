"""
Rave Racer Remix — Blender-to-Unity Smooth-Normal Outline Exporter
===================================================================
Bakes gap-free averaged vertex normals into `UV3` (`TEXCOORD2` / `UV2` in 0-based indexing)
on every mesh in a vehicle rig so the Auto Modellista Inverted-Hull Outline shader pass
extrudes smoothly across hard-creased edges without splitting seams.

Usage in Blender or CLI:
`blender --background --python Tools/Blender/generate_car_templates.py --python Tools/Blender/export_rave_car_fbx.py`
"""

import os
import bpy
import bmesh
from mathutils import Vector


def bake_smoothed_outline_normals_to_uv(obj):
    """
    Computes position-welded smooth vertex normals and writes their (X, Y) and (Z, OutlineWeight)
    into UV layers `UV_SmoothN_XY` (UV1) and `UV_SmoothN_Z` (UV2) for gap-free inverted-hull extrusion.
    """
    if obj.type != 'MESH':
        return

    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    # Group colocated vertices by quantized position (in case edges were split)
    pos_groups = {}
    for v in bm.verts:
        key = (round(v.co.x, 4), round(v.co.y, 4), round(v.co.z, 4))
        pos_groups.setdefault(key, []).append(v)

    smooth_normals = {}
    for key, verts in pos_groups.items():
        accum = Vector((0.0, 0.0, 0.0))
        for v in verts:
            for f in v.link_faces:
                accum += f.normal * f.calc_area()
        if accum.length > 1e-6:
            accum.normalize()
        else:
            accum = Vector((0.0, 0.0, 1.0))
        for v in verts:
            smooth_normals[v.index] = accum

    uv_xy = bm.loops.layers.uv.get("UV_SmoothN_XY") or bm.loops.layers.uv.new("UV_SmoothN_XY")
    uv_z = bm.loops.layers.uv.get("UV_SmoothN_Z") or bm.loops.layers.uv.new("UV_SmoothN_Z")
    col_layer = bm.loops.layers.color.get("COLOR0") or bm.loops.layers.color.new("COLOR0")

    zs = [v.co.z for v in bm.verts] or [0.0, 1.4]
    min_z, max_z = min(zs), max(zs)
    span_z = max(max_z - min_z, 0.001)

    is_interior = "Interior" in obj.name
    is_flutter = ("Exhaust" in obj.name) or ("Mudflap" in obj.name)
    outline_r = 0.0 if is_interior else (0.65 if obj.name.startswith("Mod_") else 0.95)
    flutter_b = 1.0 if is_flutter else 0.0

    for face in bm.faces:
        for loop in face.loops:
            sn = smooth_normals[loop.vert.index]
            loop[uv_xy].uv = (sn.x, sn.y)
            loop[uv_z].uv = (sn.z, outline_r)
            norm_h = max(0.0, min(1.0, (loop.vert.co.z - min_z) / span_z))
            ao_g = 0.35 + norm_h * 0.65
            loop[col_layer] = (outline_r, ao_g, flutter_b, 1.0)

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def export_all_vehicles(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    vehicle_cols = [
        "Car_01_PocketRocket_Yaris",
        "Car_02_GravelRavers_GC8",
        "Car_03_ShakotanCyber_S13",
        "Car_04_Harigaya_Chaser_JZX100",
        "Car_05_Savanna_FC3S_Tekkamen",
        "Car_06_Touge_Integra_DC2",
    ]

    for col_name in vehicle_cols:
        col = bpy.data.collections.get(col_name)
        if not col:
            continue

        bpy.ops.object.select_all(action='DESELECT')
        root_obj = None
        for obj in col.objects:
            bake_smoothed_outline_normals_to_uv(obj)
            obj.select_set(True)
            if obj.parent is None:
                root_obj = obj

        # Temporarily zero root position for clean origin export
        orig_loc = root_obj.location.copy() if root_obj else Vector((0, 0, 0))
        if root_obj:
            root_obj.location = Vector((0.0, 0.0, 0.0))

        fbx_path = os.path.join(output_dir, f"{col_name}.fbx")
        bpy.ops.export_scene.fbx(
            filepath=fbx_path,
            use_selection=True,
            global_scale=1.0,
            apply_unit_scale=True,
            apply_scale_options='FBX_SCALE_ALL',
            axis_forward='-Y',
            axis_up='Z',
            bake_space_transform=True,
            object_types={'EMPTY', 'MESH'},
            use_mesh_modifiers=True,
            mesh_smooth_type='FACE',
            colors_type='SRGB',
        )

        if root_obj:
            root_obj.location = orig_loc

        print(f"[Rave Racer Remix] Exported {fbx_path}")

    # Also export standalone modular kitbash parts if present in `ModularParts_Library`
    mod_col = bpy.data.collections.get("ModularParts_Library")
    if mod_col:
        mod_dir = os.path.join(output_dir, "ModularParts")
        os.makedirs(mod_dir, exist_ok=True)
        for obj in mod_col.objects:
            if obj.type != 'MESH':
                continue
            bpy.ops.object.select_all(action='DESELECT')
            bake_smoothed_outline_normals_to_uv(obj)
            obj.select_set(True)
            orig_loc = obj.location.copy()
            obj.location = Vector((0.0, 0.0, 0.0))
            mod_fbx_path = os.path.join(mod_dir, f"{obj.name}.fbx")
            bpy.ops.export_scene.fbx(
                filepath=mod_fbx_path,
                use_selection=True,
                global_scale=1.0,
                apply_unit_scale=True,
                apply_scale_options='FBX_SCALE_ALL',
                axis_forward='-Y',
                axis_up='Z',
                bake_space_transform=True,
                object_types={'MESH'},
                use_mesh_modifiers=True,
                mesh_smooth_type='FACE',
                colors_type='SRGB',
            )
            obj.location = orig_loc
            print(f"[Rave Racer Remix] Exported Modular Part {mod_fbx_path}")


if __name__ == "__main__":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_folder = os.path.join(project_root, "Assets", "_RaveRacer", "Vehicle", "Models")
    export_all_vehicles(out_folder)
