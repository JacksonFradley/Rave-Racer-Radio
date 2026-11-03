using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace RaveRacer.Editor
{
    /// <summary>
    /// Automatically processes any vehicle 3D model (.fbx / .obj) imported into
    /// `Assets/_RaveRacer/Vehicle/Models/`:
    /// 1. Computes position-welded, gap-free smoothed normals and stores them in UV1/UV2
    ///    so the Auto Modellista Inverted-Hull Outline pass in `VibeCar.shader` never splits
    ///    at hard-creased cel-shading edges.
    /// 2. Assigns default Vertex Color (R=Outline Weight, G=Height AO, B=Flutter) if missing.
    /// </summary>
    public sealed class RaveCarModelPostprocessor : AssetPostprocessor
    {
        private const string VehicleModelsPathPrefix = "Assets/_RaveRacer/Vehicle/Models/";

        private void OnPreprocessModel()
        {
            if (!assetPath.Replace('\\', '/').StartsWith(VehicleModelsPathPrefix))
                return;

            ModelImporter importer = (ModelImporter)assetImporter;
            importer.importNormals = ModelImporterNormals.Import;
            importer.importBlendShapes = false;
            importer.isReadable = true;
            importer.preserveHierarchy = true;
        }

        private void OnPostprocessModel(GameObject root)
        {
            if (!assetPath.Replace('\\', '/').StartsWith(VehicleModelsPathPrefix))
                return;

            MeshFilter[] meshFilters = root.GetComponentsInChildren<MeshFilter>(true);
            foreach (MeshFilter mf in meshFilters)
            {
                if (mf.sharedMesh != null)
                {
                    BakeSmoothedOutlineNormalsAndDefaultColors(mf.sharedMesh, mf.name);
                }
            }
        }

        private static void BakeSmoothedOutlineNormalsAndDefaultColors(Mesh mesh, string meshName)
        {
            Vector3[] verts = mesh.vertices;
            Vector3[] normals = mesh.normals;
            int count = verts.Length;
            if (count == 0 || normals.Length != count)
                return;

            // Group colocated vertices by quantized position (0.1mm tolerance)
            var weldedNormals = new Dictionary<Vector3Int, Vector3>(count);
            Vector3 minBounds = mesh.bounds.min;
            Vector3 sizeBounds = mesh.bounds.size;

            for (int i = 0; i < count; i++)
            {
                Vector3 v = verts[i];
                Vector3Int key = new Vector3Int(
                    Mathf.RoundToInt(v.x * 10000f),
                    Mathf.RoundToInt(v.y * 10000f),
                    Mathf.RoundToInt(v.z * 10000f)
                );

                if (weldedNormals.TryGetValue(key, out Vector3 accum))
                    weldedNormals[key] = accum + normals[i];
                else
                    weldedNormals[key] = normals[i];
            }

            var uv1 = new Vector2[count];
            var uv2 = new Vector2[count];
            Color[] colors = mesh.colors;
            bool hasColors = (colors != null && colors.Length == count);
            if (!hasColors)
                colors = new Color[count];

            bool isInterior = meshName.Contains("Interior");
            bool isFlutterPart = meshName.Contains("Exhaust") || meshName.Contains("Mudflap");

            for (int i = 0; i < count; i++)
            {
                Vector3 v = verts[i];
                Vector3Int key = new Vector3Int(
                    Mathf.RoundToInt(v.x * 10000f),
                    Mathf.RoundToInt(v.y * 10000f),
                    Mathf.RoundToInt(v.z * 10000f)
                );

                Vector3 smoothN = weldedNormals[key].normalized;
                uv1[i] = new Vector2(smoothN.x, smoothN.y);
                uv2[i] = new Vector2(smoothN.z, 1.0f);

                if (!hasColors)
                {
                    float normY = sizeBounds.y > 0.001f ? Mathf.Clamp01((v.y - minBounds.y) / sizeBounds.y) : 0.5f;
                    float outlineR = isInterior ? 0.0f : 0.9f;
                    float aoG = Mathf.Lerp(0.35f, 1.0f, normY);
                    float flutterB = isFlutterPart ? 1.0f : 0.0f;
                    colors[i] = new Color(outlineR, aoG, flutterB, 1.0f);
                }
            }

            mesh.SetUVs(1, uv1);
            mesh.SetUVs(2, uv2);
            if (!hasColors)
                mesh.colors = colors;
        }
    }
}
