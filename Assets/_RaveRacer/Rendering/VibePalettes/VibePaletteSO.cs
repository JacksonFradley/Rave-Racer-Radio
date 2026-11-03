using UnityEngine;

namespace RaveRacer.Rendering
{
    /// <summary>
    /// Defines a fluid "Vibe" color palette backed by a 256x16 2D Gradient LUT texture:
    /// - X-Axis (0..255): Surface Luminance & Material Zone ID ramp (Shadow, Midtone, Highlight, Rim, Emissive)
    /// - Y-Axis (0..15): Track Zone / Musical Energy state rows
    /// </summary>
    [CreateAssetMenu(fileName = "VibePalette_", menuName = "Rave Racer/Vibe Palette SO", order = 1)]
    public sealed class VibePaletteSO : ScriptableObject
    {
        [Header("Identity")]
        public string vibeName = "Pacific Sunset 1984";
        [TextArea(2, 3)]
        public string description = "Hiroshi Nagai coastal turquoise, coral pink, warm amber sun, and razor-sharp deep indigo shadows.";

        [Header("2D Gradient LUT (256x16)")]
        [Tooltip("Assign one of the generated VibeLUT_*.png textures from Assets/_RaveRacer/Rendering/VibePalettes/")]
        public Texture2D lutTexture;

        [Header("Environment & Shadow Overrides")]
        [Tooltip("Saturated cool shadow color override for Hiroshi Nagai two-tone cel shading.")]
        public Color nagaiShadowColor = new Color(0.17f, 0.12f, 0.35f, 1.0f);
        public Color horizonSkyTopColor = new Color(0.10f, 0.25f, 0.72f, 1.0f);
        public Color horizonSkyBottomColor = new Color(1.00f, 0.43f, 0.42f, 1.0f);

        private static readonly int GlobalTrackVibeLutId = Shader.PropertyToID("_GlobalTrackVibeLUT");
        private static readonly int VibeRowBlendId = Shader.PropertyToID("_VibeRowBlend");

        /// <summary>
        /// Broadcasts this Vibe LUT globally to all track and vehicle shaders.
        /// </summary>
        public void ApplyAsGlobalTrackVibe(float rowEnergyBlend = 0.0f)
        {
            if (lutTexture != null)
            {
                Shader.SetGlobalTexture(GlobalTrackVibeLutId, lutTexture);
            }
            Shader.SetGlobalFloat(VibeRowBlendId, Mathf.Clamp01(rowEnergyBlend));
        }
    }
}
