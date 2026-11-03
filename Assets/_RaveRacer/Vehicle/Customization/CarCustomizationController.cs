using UnityEngine;
using RaveRacer.Rendering;

namespace RaveRacer.Vehicle.Customization
{
    /// <summary>
    /// Runtime controller that binds a <see cref="CarCustomizationPresetSO"/> (or live garage color picker edits)
    /// to any Rave Racer vehicle prefab and drives fluid color shifting across Track Vibe Zones,
    /// Audio Spectrum peaks, Drift angles, and Rage/Cockiness emotion states.
    /// </summary>
    [DisallowMultipleComponent]
    [RequireComponent(typeof(VehicleVisualRigController))]
    public sealed class CarCustomizationController : MonoBehaviour
    {
        [Header("Active Customization Profile")]
        public CarCustomizationPresetSO activePreset;

        [Header("Runtime Fluid Race State (0..1)")]
        [Range(0f, 1f)] public float trackVibeRowBlend;
        [Range(0f, 1f)] public float driftChromaticIntensity;
        [Range(0f, 1f)] public float boilingRageIntensity;
        [Range(0f, 1f)] public float untouchableCockinessIntensity;

        [Header("Modular Sub-Mesh Toggle References (Auto-Discovered)")]
        public GameObject modWingObject;
        public GameObject modRoofObject;
        public GameObject modFrontCoolerObject;
        public GameObject modDiffuserObject;
        public GameObject[] modMudflapObjects;

        private VehicleVisualRigController _rigController;
        private Renderer[] _allRenderers;
        private Renderer[] _frontWheelRenderers;
        private Renderer[] _rearWheelRenderers;
        private MaterialPropertyBlock _sharedMpb;
        private MaterialPropertyBlock _frontWheelMpb;
        private MaterialPropertyBlock _rearWheelMpb;

        // Shader Property IDs
        private static readonly int UseCustomZoneColorsId = Shader.PropertyToID("_UseCustomZoneColors");
        private static readonly int UseColorableLiveryMaskId = Shader.PropertyToID("_UseColorableLiveryMask");
        private static readonly int LiveryDecalTexId = Shader.PropertyToID("_LiveryDecalTex");
        private static readonly int VibeLutId = Shader.PropertyToID("_VibeLUT");
        private static readonly int VibeRowBlendId = Shader.PropertyToID("_VibeRowBlend");

        private static readonly int BodyPrimaryColorId = Shader.PropertyToID("_BodyPrimaryColor");
        private static readonly int BodyPrimaryShiftColorId = Shader.PropertyToID("_BodyPrimaryShiftColor");
        private static readonly int BodySecondaryColorId = Shader.PropertyToID("_BodySecondaryColor");
        private static readonly int BodySecondaryShiftColorId = Shader.PropertyToID("_BodySecondaryShiftColor");

        private static readonly int LiveryPrimaryColorId = Shader.PropertyToID("_LiveryPrimaryColor");
        private static readonly int LiveryPrimaryShiftColorId = Shader.PropertyToID("_LiveryPrimaryShiftColor");
        private static readonly int LiverySecondaryColorId = Shader.PropertyToID("_LiverySecondaryColor");
        private static readonly int LiveryOutlineColorId = Shader.PropertyToID("_LiveryOutlineColor");

        private static readonly int WheelFrontColorId = Shader.PropertyToID("_WheelFrontColor");
        private static readonly int WheelRearColorId = Shader.PropertyToID("_WheelRearColor");
        private static readonly int WheelLipMetallicId = Shader.PropertyToID("_WheelLipMetallic");
        private static readonly int IsRearWheelId = Shader.PropertyToID("_IsRearWheel");

        private static readonly int InteriorCageColorId = Shader.PropertyToID("_InteriorCageColor");
        private static readonly int WindshieldBannerColorId = Shader.PropertyToID("_WindshieldBannerColor");
        private static readonly int HeadlightTintColorId = Shader.PropertyToID("_HeadlightTintColor");
        private static readonly int UnderglowColorId = Shader.PropertyToID("_UnderglowColor");

        private static readonly int FluidColorShiftStrengthId = Shader.PropertyToID("_FluidColorShiftStrength");
        private static readonly int VibeAtmosphereCouplingId = Shader.PropertyToID("_VibeAtmosphereCoupling");
        private static readonly int AudioColorPulseWeightId = Shader.PropertyToID("_AudioColorPulseWeight");
        private static readonly int DriftHueShiftDegId = Shader.PropertyToID("_DriftHueShiftDeg");
        private static readonly int DriftColorShiftId = Shader.PropertyToID("_DriftColorShift");
        private static readonly int EmotionRageBlendId = Shader.PropertyToID("_EmotionRageBlend");
        private static readonly int EmotionCockinessBlendId = Shader.PropertyToID("_EmotionCockinessBlend");

        private void Awake()
        {
            InitializeCaches();
            ApplyCustomizationToVehicle();
        }

        private void OnValidate()
        {
            if (isActiveAndEnabled)
            {
                InitializeCaches();
                ApplyCustomizationToVehicle();
            }
        }

        private void InitializeCaches()
        {
            if (_rigController == null)
                _rigController = GetComponent<VehicleVisualRigController>();

            _sharedMpb ??= new MaterialPropertyBlock();
            _frontWheelMpb ??= new MaterialPropertyBlock();
            _rearWheelMpb ??= new MaterialPropertyBlock();

            _allRenderers = GetComponentsInChildren<Renderer>(true);

            if (_rigController != null)
            {
                _rigController.AutoBindHierarchy();
                _frontWheelRenderers = CollectWheelRenderers(_rigController.wheelFL, _rigController.wheelFR);
                _rearWheelRenderers = CollectWheelRenderers(_rigController.wheelRL, _rigController.wheelRR);
            }
        }

        private static Renderer[] CollectWheelRenderers(Transform wLeft, Transform wRight)
        {
            var list = new System.Collections.Generic.List<Renderer>(4);
            if (wLeft != null)
                list.AddRange(wLeft.GetComponentsInChildren<Renderer>(true));
            if (wRight != null)
                list.AddRange(wRight.GetComponentsInChildren<Renderer>(true));
            return list.ToArray();
        }

        /// <summary>
        /// Pushes all 12 individual color zones, fluid shift targets, asymmetric wheel colors,
        /// stance camber, and asymmetric pop-up headlight "wink" angles onto the vehicle.
        /// </summary>
        public void ApplyCustomizationToVehicle()
        {
            if (activePreset == null || _allRenderers == null)
                return;

            // 1. Apply Stance, Camber, and Asymmetric Pop-Up Headlight Wink Angles to Rig Controller
            if (_rigController != null)
            {
                _rigController.frontCamberDeg = activePreset.frontCamberDeg;
                _rigController.rearCamberDeg = activePreset.rearCamberDeg;
                _rigController.ApplyHeadlightStyle(
                    activePreset.headlightStyle,
                    activePreset.popUpLeftAngleDeg,
                    activePreset.popUpRightAngleDeg
                );
            }

            // 2. Toggle Modular Body Attachments if present
            if (modWingObject != null)
                modWingObject.SetActive(activePreset.rearWingStyle != RearWingStyle.None_Wingless);
            if (modRoofObject != null)
                modRoofObject.SetActive(activePreset.equipRoofAttachment);
            if (modFrontCoolerObject != null)
                modFrontCoolerObject.SetActive(activePreset.frontAeroStyle != FrontAeroStyle.StockWidebodyBumper);
            if (modDiffuserObject != null)
                modDiffuserObject.SetActive(activePreset.equipRearDiffuserStrakes);
            if (modMudflapObjects != null)
            {
                for (int i = 0; i < modMudflapObjects.Length; i++)
                {
                    if (modMudflapObjects[i] != null)
                        modMudflapObjects[i].SetActive(activePreset.equipRallyMudflaps);
                }
            }

            // 3. Push Individual Color Zones + Fluid Race Dynamics to Shader Property Blocks
            UpdateFluidRaceShaderState(
                trackVibeRowBlend,
                driftChromaticIntensity,
                boilingRageIntensity,
                untouchableCockinessIntensity
            );
        }

        /// <summary>
        /// Called every frame during a race (or from the Garage previewer) to fluidly morph the player's
        /// individual custom colors based on Track Vibe Zone, Drift Slip, and Emotion meters.
        /// </summary>
        public void UpdateFluidRaceShaderState(
            float vibeRowBlend,
            float normalizedDriftSlip,
            float normalizedRage = 0f,
            float normalizedCockiness = 0f)
        {
            trackVibeRowBlend = Mathf.Clamp01(vibeRowBlend);
            driftChromaticIntensity = Mathf.Clamp01(Mathf.Abs(normalizedDriftSlip));
            boilingRageIntensity = Mathf.Clamp01(normalizedRage);
            untouchableCockinessIntensity = Mathf.Clamp01(normalizedCockiness);

            if (activePreset == null || _allRenderers == null)
                return;

            Color rearWheelBase = activePreset.useMismatchedWheelColors
                ? activePreset.rearWheelRimColor.baseColor
                : activePreset.frontWheelRimColor.baseColor;

            Color rearWheelShift = activePreset.useMismatchedWheelColors
                ? activePreset.rearWheelRimColor.fluidShiftColor
                : activePreset.frontWheelRimColor.fluidShiftColor;

            float dynamicPhase = Mathf.Clamp01(trackVibeRowBlend * 0.65f + driftChromaticIntensity * 0.35f);
            Color currentFrontWheel = Color.Lerp(
                activePreset.frontWheelRimColor.baseColor,
                activePreset.frontWheelRimColor.fluidShiftColor,
                dynamicPhase * activePreset.frontWheelRimColor.fluidReactivity
            );
            Color currentRearWheel = Color.Lerp(
                rearWheelBase,
                rearWheelShift,
                dynamicPhase * activePreset.rearWheelRimColor.fluidReactivity
            );

            foreach (Renderer r in _allRenderers)
            {
                if (r == null)
                    continue;

                r.GetPropertyBlock(_sharedMpb);
                PopulateCommonProperties(_sharedMpb, currentFrontWheel, currentRearWheel, 0f);
                r.SetPropertyBlock(_sharedMpb);
            }

            // Explicitly tag Front vs. Rear wheel sub-meshes so pivot-centered wheels display asymmetric colors
            if (_frontWheelRenderers != null)
            {
                foreach (Renderer fw in _frontWheelRenderers)
                {
                    if (fw == null) continue;
                    fw.GetPropertyBlock(_frontWheelMpb);
                    PopulateCommonProperties(_frontWheelMpb, currentFrontWheel, currentRearWheel, -1f);
                    fw.SetPropertyBlock(_frontWheelMpb);
                }
            }

            if (_rearWheelRenderers != null)
            {
                foreach (Renderer rw in _rearWheelRenderers)
                {
                    if (rw == null) continue;
                    rw.GetPropertyBlock(_rearWheelMpb);
                    PopulateCommonProperties(_rearWheelMpb, currentFrontWheel, currentRearWheel, 1f);
                    rw.SetPropertyBlock(_rearWheelMpb);
                }
            }
        }

        private void PopulateCommonProperties(
            MaterialPropertyBlock mpb,
            Color evaluatedFrontWheel,
            Color evaluatedRearWheel,
            float isRearWheelOverride)
        {
            mpb.SetFloat(UseCustomZoneColorsId, 1f);
            mpb.SetFloat(UseColorableLiveryMaskId, activePreset.useColorableLiveryMask ? 1f : 0f);
            mpb.SetFloat(VibeRowBlendId, trackVibeRowBlend);

            if (activePreset.customLiveryDecalMask != null)
                mpb.SetTexture(LiveryDecalTexId, activePreset.customLiveryDecalMask);

            if (activePreset.companionVibePalette != null && activePreset.companionVibePalette.lutTexture != null)
                mpb.SetTexture(VibeLutId, activePreset.companionVibePalette.lutTexture);

            mpb.SetColor(BodyPrimaryColorId, activePreset.bodyPrimary.baseColor);
            mpb.SetColor(BodyPrimaryShiftColorId, activePreset.bodyPrimary.fluidShiftColor);
            mpb.SetColor(BodySecondaryColorId, activePreset.bodySecondary.baseColor);
            mpb.SetColor(BodySecondaryShiftColorId, activePreset.bodySecondary.fluidShiftColor);

            mpb.SetColor(LiveryPrimaryColorId, activePreset.liveryLayer1Primary.baseColor);
            mpb.SetColor(LiveryPrimaryShiftColorId, activePreset.liveryLayer1Primary.fluidShiftColor);
            mpb.SetColor(LiverySecondaryColorId, activePreset.liveryLayer2Secondary.Evaluate(trackVibeRowBlend));
            mpb.SetColor(LiveryOutlineColorId, activePreset.liveryLayer3Outline.Evaluate(trackVibeRowBlend));

            mpb.SetColor(WheelFrontColorId, evaluatedFrontWheel);
            mpb.SetColor(WheelRearColorId, evaluatedRearWheel);
            mpb.SetFloat(WheelLipMetallicId, activePreset.wheelDishChromeMetallic);
            mpb.SetFloat(IsRearWheelId, isRearWheelOverride);

            mpb.SetColor(InteriorCageColorId, activePreset.interiorRollCageAndSeats.Evaluate(trackVibeRowBlend));
            mpb.SetColor(WindshieldBannerColorId, activePreset.windshieldSunStripBanner.Evaluate(trackVibeRowBlend));
            mpb.SetColor(HeadlightTintColorId, activePreset.headlightLensTint.Evaluate(trackVibeRowBlend));
            mpb.SetColor(UnderglowColorId, activePreset.underglowNeon.Evaluate(trackVibeRowBlend));

            mpb.SetFloat(FluidColorShiftStrengthId, activePreset.fluidMorphStrength);
            mpb.SetFloat(VibeAtmosphereCouplingId, activePreset.trackVibeAtmosphereCoupling);
            mpb.SetFloat(AudioColorPulseWeightId, activePreset.audioBassColorPulse);
            mpb.SetFloat(DriftHueShiftDegId, activePreset.driftSlipHueShiftDeg);
            mpb.SetFloat(DriftColorShiftId, driftChromaticIntensity);
            mpb.SetFloat(EmotionRageBlendId, boilingRageIntensity);
            mpb.SetFloat(EmotionCockinessBlendId, untouchableCockinessIntensity);
        }

        // ===================================================================
        // EDITOR QUICK-APPLY CONTEXT MENUS FOR ALL 9 NEW REFERENCE CAR BUILDS
        // ===================================================================

        private void EnsurePresetInstance()
        {
            if (activePreset == null)
                activePreset = ScriptableObject.CreateInstance<CarCustomizationPresetSO>();
        }

        [ContextMenu("Preset 01: Harigaya Flame JZX100 Chaser (Purple + Orange Flames)")]
        public void ApplyPreset01_HarigayaFlameChaser()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs01_HarigayaFlameChaser();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 02: Ultraviolet Acid Tribal Coupe (Green Roll Cage & Underglow)")]
        public void ApplyPreset02_UltravioletAcidTribal()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs02_UltravioletAcidTribalCoupe();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 03: Y2K Duotone Subaru WRX STI (Cobalt Blue + Cyber Yellow)")]
        public void ApplyPreset03_Y2KSubaruSTI()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs03_Y2KPosterizedSubaruSTI();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 04: Nakamura Pink Style PS13 (Mismatched Yellow/Pink Wheels)")]
        public void ApplyPreset04_PinkStylePS13()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs04_NakamuraPinkStylePS13();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 05: 80s Tekkamen Panda Skyline R30 RS-Turbo (White/Black + Watanabes)")]
        public void ApplyPreset05_TekkamenPandaR30()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs05_TekkamenPandaSkylineR30();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 06: LBWK Kids Doodle Silhouette (White + Pink Graffiti + Red Seats)")]
        public void ApplyPreset06_LBWKKidsDoodle()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs06_LBWKKidsDoodleMiura();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 07: Donut Nose-Flame E36 Drift Sedan (Yellow/Black Split + Chrome Rims)")]
        public void ApplyPreset07_DonutNoseFlameE36()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs07_DonutNoseFlameE36Sedan();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 08: Savanna #39 Winking FC3S RX-7 (Yellow + Emerald Stripe + Wink Light)")]
        public void ApplyPreset08_SavannaWinkFC3S()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs08_SavannaStripeFC3SWink();
            ApplyCustomizationToVehicle();
        }

        [ContextMenu("Preset 09: Touge Spider-Eye Honda Integra DC2 (Burgundy + Amber Quad Fogs + Gold Rims)")]
        public void ApplyPreset09_TougeIntegraDC2()
        {
            EnsurePresetInstance();
            activePreset.ConfigureAs09_TougeSpiderEyeIntegraDC2();
            ApplyCustomizationToVehicle();
        }
    }
}
