using System;
using UnityEngine;
using RaveRacer.Rendering;

namespace RaveRacer.Vehicle.Customization
{
    public enum CarChassisArchetype
    {
        PocketRocket_Yaris323 = 0,
        GravelRavers_ImprezaGC8_STI = 1,
        ShakotanCyber_SilviaS13_PS13 = 2,
        HarigayaChaser_JZX100_E36Sedan = 3,
        SavannaTekkamen_FC3S_R30 = 4,
        TougeSilhouette_IntegraDC2_LBWK = 5
    }

    public enum LiveryPatternStyle
    {
        None_CleanMonochrome = 0,
        WildHorses_StreetCatStickerBomb = 1,
        AcidCamo_BrushKanji = 2,
        Shakotan_CyberTribalDragon = 3,
        Harigaya_HotRodFlamesAndKanji = 4,
        Ultraviolet_AcidTribalLightning = 5,
        Y2K_DuotoneRallySwoosh = 6,
        PinkStyle_D1GPTeamSplash = 7,
        Tekkamen_80sPandaBeltline = 8,
        LBWK_StreetMarkerDoodleBomb = 9,
        Donut_InverseNoseFlameBlockSplit = 10,
        Savanna_TwinPinstripeCenterStripe39 = 11
    }

    public enum HeadlightStyle
    {
        FixedAeroProjectors = 0,
        PopUp_DualFullOpen = 1,
        PopUp_SleepyEye = 2,
        PopUp_WinkLeftOpen = 3,
        PopUp_WinkRightOpen = 4,
        SpiderEye_QuadRoundTouge = 5,
        Tekkamen_IronMaskSlit = 6,
        Miura_RecessedTiltedEyelids = 7
    }

    public enum WheelRimStyle
    {
        Turbofan_Aerodisc = 0,
        Rally_6Spoke_TE37 = 1,
        DeepDish_5Spoke_Meister = 2,
        Chrome_5Spoke_VSKF = 3,
        Retro_8Spoke_Watanabe = 4,
        Touge_10Spoke_CE28N = 5
    }

    public enum RearWingStyle
    {
        None_Wingless = 0,
        TimeAttack_SwanNeckGT = 1,
        WRC_RallyBoxWing = 2,
        Shakotan_DucktailSlit = 3,
        HighMount_AluStanchionGT = 4
    }

    public enum FrontAeroStyle
    {
        StockWidebodyBumper = 0,
        CutoutRallyFMIC = 1,
        KaidoExternalOilCooler = 2,
        LBWK_DivePlaneCanardsAndSplitter = 3,
        Tekkamen_TripleAirDucts = 4
    }

    public enum FluidColorShiftMode
    {
        DualStopMorph = 0,
        HarmonicHueOrbit = 1,
        VibeAtmosphereLocked = 2,
        BeatStrobeReactive = 3
    }

    /// <summary>
    /// Represents a single individually customizable color zone on the car that also
    /// shifts fluidly throughout a race in response to Track Vibe Zones, Audio Spectrum, Drift, and Emotion.
    /// </summary>
    [Serializable]
    public struct FluidColorSlot
    {
        [Tooltip("The player's chosen primary color for this car part/zone.")]
        public Color baseColor;

        [Tooltip("The target color this zone fluidly morphs toward during high-energy track zones, bass drops, and boosts.")]
        public Color fluidShiftColor;

        [Range(0f, 1f)]
        [Tooltip("How strongly this specific zone morphs toward FluidShiftColor during a race (0 = static base color, 1 = full fluid morph).")]
        public float fluidReactivity;

        public FluidColorSlot(Color baseCol, Color shiftCol, float reactivity = 0.75f)
        {
            baseColor = baseCol;
            fluidShiftColor = shiftCol;
            fluidReactivity = reactivity;
        }

        public Color Evaluate(float normalizedFluidPhase)
        {
            return Color.Lerp(baseColor, fluidShiftColor, Mathf.Clamp01(normalizedFluidPhase * fluidReactivity));
        }
    }

    /// <summary>
    /// Complete vehicle customization profile allowing players to pick the individual colors of all 12 car zones,
    /// mismatched front/rear drift wheels, multi-layer liveries, winking pop-up headlights, and aero parts,
    /// while controlling how those custom colors shift fluidly throughout a race.
    /// </summary>
    [CreateAssetMenu(fileName = "CarCustomPreset_", menuName = "Rave Racer/Car Customization Preset SO", order = 2)]
    public sealed class CarCustomizationPresetSO : ScriptableObject
    {
        [Header("1. Build Identity & Chassis Archetype")]
        public string buildTitle = "HARIGAYA FLAME JZX100";
        public string inspirationReference = "Cars/01_818529301077179236_Fire_stuff_pin_page.jpg";
        public CarChassisArchetype chassisArchetype = CarChassisArchetype.HarigayaChaser_JZX100_E36Sedan;

        [Header("2. Livery Pattern & Multi-Channel Decal Mask")]
        public LiveryPatternStyle liveryStyle = LiveryPatternStyle.Harigaya_HotRodFlamesAndKanji;
        public Texture2D customLiveryDecalMask;
        public bool useColorableLiveryMask = true;

        [Header("3. Individual Body & Livery Color Zones (With Fluid Race Shift Targets)")]
        public FluidColorSlot bodyPrimary = new FluidColorSlot(
            new Color(0.23f, 0.05f, 0.64f, 1f), // Candy Royal Purple
            new Color(0.58f, 0.06f, 0.94f, 1f), // Electric Ultraviolet
            0.80f
        );

        public FluidColorSlot bodySecondary = new FluidColorSlot(
            new Color(0.10f, 0.04f, 0.28f, 1f), // Deep Indigo Skirt/Trim
            new Color(0.32f, 0.06f, 0.55f, 1f),
            0.65f
        );

        public FluidColorSlot liveryLayer1Primary = new FluidColorSlot(
            new Color(1.00f, 0.42f, 0.00f, 1f), // Blazing Hot-Rod Flame Orange
            new Color(1.00f, 0.85f, 0.04f, 1f), // White-Hot Solar Yellow on Beat Drop
            0.90f
        );

        public FluidColorSlot liveryLayer2Secondary = new FluidColorSlot(
            new Color(0.15f, 0.42f, 1.00f, 1f), // Harigaya Electric Blue Kanji Fill
            new Color(0.00f, 0.92f, 1.00f, 1f), // Phosphor Cyan Shift
            0.75f
        );

        public FluidColorSlot liveryLayer3Outline = new FluidColorSlot(
            new Color(0.96f, 0.98f, 1.00f, 1f), // Crisp Chrome/White Keyline Outline
            new Color(1.00f, 0.95f, 0.70f, 1f),
            0.35f
        );

        [Header("4. Wheel Rim Customization (Supports Mismatched Front/Rear Drift Setups)")]
        public WheelRimStyle frontWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
        public WheelRimStyle rearWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
        public bool useMismatchedWheelColors = false;

        public FluidColorSlot frontWheelRimColor = new FluidColorSlot(
            new Color(0.88f, 0.92f, 0.96f, 1f), // Polished Chrome VS-KF
            new Color(0.70f, 0.88f, 1.00f, 1f),
            0.40f
        );

        public FluidColorSlot rearWheelRimColor = new FluidColorSlot(
            new Color(0.88f, 0.92f, 0.96f, 1f),
            new Color(0.70f, 0.88f, 1.00f, 1f),
            0.40f
        );

        [Range(0f, 1f)] public float wheelDishChromeMetallic = 0.85f;

        [Header("5. Interior Roll Cage, Aero, Banner, Headlights & Underglow Colors")]
        public FluidColorSlot interiorRollCageAndSeats = new FluidColorSlot(
            new Color(0.18f, 0.16f, 0.24f, 1f), // Bride Dark Bucket Seats / Roll Cage
            new Color(0.35f, 0.20f, 0.55f, 1f),
            0.50f
        );

        public FluidColorSlot windshieldSunStripBanner = new FluidColorSlot(
            new Color(1.00f, 0.25f, 0.68f, 1f), // Pink/White Windshield Kanji Banner
            new Color(1.00f, 0.65f, 0.10f, 1f),
            0.60f
        );

        public FluidColorSlot headlightLensTint = new FluidColorSlot(
            new Color(0.95f, 0.97f, 1.00f, 1f), // Crystal White / Touge Amber Yellow
            new Color(0.65f, 0.92f, 1.00f, 1f),
            0.50f
        );

        public FluidColorSlot underglowNeon = new FluidColorSlot(
            new Color(1.00f, 0.45f, 0.00f, 1f), // Flame Orange Underglow
            new Color(0.75f, 0.15f, 1.00f, 1f), // Ultraviolet Drop Pulse
            0.95f
        );

        [Header("6. Modular Body Kit, Headlight Wink & Stance Fitment")]
        public HeadlightStyle headlightStyle = HeadlightStyle.FixedAeroProjectors;
        [Range(0f, 45f)] public float popUpLeftAngleDeg = 0f;
        [Range(0f, 45f)] public float popUpRightAngleDeg = 0f;

        public RearWingStyle rearWingStyle = RearWingStyle.Shakotan_DucktailSlit;
        public FrontAeroStyle frontAeroStyle = FrontAeroStyle.StockWidebodyBumper;
        public bool equipRoofAttachment = false;
        public bool equipRearDiffuserStrakes = false;
        public bool equipRallyMudflaps = false;

        [Range(-10f, 0f)] public float frontCamberDeg = -4.5f;
        [Range(-10f, 0f)] public float rearCamberDeg = -3.5f;
        [Range(-0.08f, 0.08f)] public float rideHeightOffsetMeters = -0.02f;

        [Header("7. Fluid Race Color Engine Tuning")]
        public FluidColorShiftMode fluidShiftMode = FluidColorShiftMode.DualStopMorph;
        public VibePaletteSO companionVibePalette;
        [Range(0f, 1f)] public float fluidMorphStrength = 0.78f;
        [Range(0f, 1f)] public float trackVibeAtmosphereCoupling = 0.28f;
        [Range(0f, 1f)] public float audioBassColorPulse = 0.50f;
        [Range(-90f, 90f)] public float driftSlipHueShiftDeg = 28f;

        // ===================================================================
        // FACTORY PRESETS FOR ALL 9 NEW REFERENCE CAR IMAGES (`Cars/01` - `09`)
        // ===================================================================

        /// <summary>
        /// Reference 01: `01_818529301077179236_Fire_stuff_pin_page.jpg`
        /// Candy Royal Purple Toyota Chaser JZX100 with Blazing Orange-to-Yellow Hot-Rod Flames,
        /// Electric Blue/White Kanji (`Harigaya Jidousha`), and Deep-Dish Chrome VS-KF 5-Spoke Rims.
        /// </summary>
        public void ConfigureAs01_HarigayaFlameChaser()
        {
            buildTitle = "01 // HARIGAYA FLAME JZX100";
            inspirationReference = "01_818529301077179236_Fire_stuff_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.HarigayaChaser_JZX100_E36Sedan;
            liveryStyle = LiveryPatternStyle.Harigaya_HotRodFlamesAndKanji;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.23f, 0.05f, 0.64f), new Color(0.52f, 0.06f, 0.90f), 0.80f);
            bodySecondary = new FluidColorSlot(new Color(0.14f, 0.03f, 0.42f), new Color(0.35f, 0.05f, 0.68f), 0.70f);
            liveryLayer1Primary = new FluidColorSlot(new Color(1.00f, 0.40f, 0.00f), new Color(1.00f, 0.86f, 0.05f), 0.95f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.12f, 0.38f, 1.00f), new Color(0.00f, 0.88f, 1.00f), 0.75f);
            liveryLayer3Outline = new FluidColorSlot(Color.white, new Color(1.0f, 0.95f, 0.75f), 0.30f);

            frontWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
            rearWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.90f, 0.93f, 0.98f), new Color(0.75f, 0.88f, 1.0f), 0.35f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.92f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.00f, 0.90f, 1.00f), new Color(0.25f, 0.15f, 0.40f), 0.4f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(1.00f, 0.32f, 0.68f), new Color(1.00f, 0.75f, 0.20f), 0.65f);
            headlightLensTint = new FluidColorSlot(new Color(0.96f, 0.96f, 1.00f), new Color(1.00f, 0.75f, 0.35f), 0.45f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.48f, 0.00f), new Color(0.68f, 0.12f, 1.00f), 0.90f);

            headlightStyle = HeadlightStyle.FixedAeroProjectors;
            popUpLeftAngleDeg = 0f;
            popUpRightAngleDeg = 0f;
            rearWingStyle = RearWingStyle.TimeAttack_SwanNeckGT;
            frontAeroStyle = FrontAeroStyle.CutoutRallyFMIC;
            frontCamberDeg = -6.0f;
            rearCamberDeg = -4.0f;
            rideHeightOffsetMeters = -0.045f;
        }

        /// <summary>
        /// Reference 02: `02_818529301077179234_two_pictures_of_a_purple_car_with_flames_on_it_pin_page.jpg`
        /// Metallic Ultraviolet Drift Coupe with Acid-Green Tribal Lightning Flames,
        /// Matching Neon Green Roll Cage, Neon Green Underglow, Sleepy-Eye Pop-Ups & White Deep-Dish 5-Spoke Rims.
        /// </summary>
        public void ConfigureAs02_UltravioletAcidTribalCoupe()
        {
            buildTitle = "02 // ULTRAVIOLET ACID TRIBAL";
            inspirationReference = "02_818529301077179234_two_pictures_of_a_purple_car_with_flames_on_it_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.ShakotanCyber_S13_PS13Coupe;
            liveryStyle = LiveryPatternStyle.Ultraviolet_AcidTribalLightning;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.28f, 0.06f, 0.78f), new Color(0.18f, 0.22f, 0.95f), 0.85f);
            bodySecondary = new FluidColorSlot(new Color(0.15f, 0.04f, 0.45f), new Color(0.22f, 1.00f, 0.12f), 0.75f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.22f, 1.00f, 0.08f), new Color(0.75f, 1.00f, 0.00f), 0.95f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.12f, 0.05f, 0.22f), new Color(0.35f, 0.10f, 0.65f), 0.60f);
            liveryLayer3Outline = new FluidColorSlot(new Color(0.95f, 1.00f, 0.95f), new Color(0.65f, 1.00f, 0.40f), 0.50f);

            frontWheelStyle = WheelRimStyle.DeepDish_5Spoke_Meister;
            rearWheelStyle = WheelRimStyle.DeepDish_5Spoke_Meister;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.96f, 0.97f, 1.00f), new Color(0.80f, 1.00f, 0.82f), 0.45f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.80f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.22f, 1.00f, 0.08f), new Color(0.72f, 1.00f, 0.00f), 0.90f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.22f, 1.00f, 0.08f), Color.white, 0.75f);
            headlightLensTint = new FluidColorSlot(new Color(1.00f, 0.82f, 0.92f), new Color(0.22f, 1.00f, 0.08f), 0.60f);
            underglowNeon = new FluidColorSlot(new Color(0.22f, 1.00f, 0.08f), new Color(0.72f, 1.00f, 0.00f), 1.00f);

            headlightStyle = HeadlightStyle.PopUp_SleepyEye;
            popUpLeftAngleDeg = 20f;
            popUpRightAngleDeg = 20f;
            rearWingStyle = RearWingStyle.TimeAttack_SwanNeckGT;
            frontAeroStyle = FrontAeroStyle.CutoutRallyFMIC;
            equipRearDiffuserStrakes = true;
            frontCamberDeg = -6.0f;
            rearCamberDeg = -4.5f;
            rideHeightOffsetMeters = -0.04f;
        }

        /// <summary>
        /// Reference 03: `03_818529301077179232_Subaru_redesign_Poster_design_style_Y2K_pin_page.jpg`
        /// Y2K Posterized Cobalt Blue & Cyber Yellow Subaru WRX STI with Sweeping STI Star Livery,
        /// Cyber Yellow 6-Spoke Rally Rims, and WRC Box Wing.
        /// </summary>
        public void ConfigureAs03_Y2KPosterizedSubaruSTI()
        {
            buildTitle = "03 // Y2K DUOTONE WRX STI";
            inspirationReference = "03_818529301077179232_Subaru_redesign_Poster_design_style_Y2K_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.GravelRavers_ImprezaGC8_STI;
            liveryStyle = LiveryPatternStyle.Y2K_DuotoneRallySwoosh;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.04f, 0.18f, 0.68f), new Color(0.08f, 0.38f, 0.96f), 0.85f);
            bodySecondary = new FluidColorSlot(new Color(0.02f, 0.06f, 0.24f), new Color(0.05f, 0.18f, 0.55f), 0.70f);
            liveryLayer1Primary = new FluidColorSlot(new Color(1.00f, 0.92f, 0.04f), new Color(0.82f, 1.00f, 0.00f), 0.90f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.12f, 0.45f, 1.00f), new Color(0.00f, 0.88f, 1.00f), 0.75f);
            liveryLayer3Outline = new FluidColorSlot(new Color(1.00f, 0.96f, 0.25f), Color.white, 0.50f);

            frontWheelStyle = WheelRimStyle.Rally_6Spoke_TE37;
            rearWheelStyle = WheelRimStyle.Rally_6Spoke_TE37;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(1.00f, 0.90f, 0.05f), new Color(1.00f, 0.72f, 0.00f), 0.70f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.25f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.06f, 0.22f, 0.78f), new Color(1.00f, 0.90f, 0.05f), 0.65f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.02f, 0.05f, 0.18f), new Color(1.00f, 0.90f, 0.05f), 0.80f);
            headlightLensTint = new FluidColorSlot(new Color(1.00f, 0.92f, 0.12f), Color.white, 0.75f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.92f, 0.04f), new Color(0.08f, 0.45f, 1.00f), 0.85f);

            headlightStyle = HeadlightStyle.FixedAeroProjectors;
            rearWingStyle = RearWingStyle.WRC_RallyBoxWing;
            frontAeroStyle = FrontAeroStyle.CutoutRallyFMIC;
            equipRallyMudflaps = true;
            frontCamberDeg = -2.0f;
            rearCamberDeg = -1.5f;
            rideHeightOffsetMeters = 0.01f;
        }

        /// <summary>
        /// Reference 04: `04_818529301077179231_the_pink_car_is_painted_with_neon_colors_pin_page.jpg`
        /// Naoki Nakamura / Team Pink Style Silvia PS13 (`SUPER D SPEC`) with Hot Magenta-to-Violet Paint,
        /// Multi-Layer D1GP Splash Livery, and Asymmetric Colored Rims (Chartreuse Yellow Front + Hot Pink Rear!).
        /// </summary>
        public void ConfigureAs04_NakamuraPinkStylePS13()
        {
            buildTitle = "04 // PINK STYLE SUPER-D PS13";
            inspirationReference = "04_818529301077179231_the_pink_car_is_painted_with_neon_colors_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.ShakotanCyber_SilviaS13_PS13;
            liveryStyle = LiveryPatternStyle.PinkStyle_D1GPTeamSplash;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.96f, 0.06f, 0.58f), new Color(0.55f, 0.08f, 0.92f), 0.90f);
            bodySecondary = new FluidColorSlot(new Color(0.42f, 0.04f, 0.68f), new Color(0.98f, 0.12f, 0.72f), 0.85f);
            liveryLayer1Primary = new FluidColorSlot(new Color(1.00f, 0.82f, 0.04f), new Color(1.00f, 0.35f, 0.00f), 0.90f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.00f, 0.85f, 1.00f), new Color(0.85f, 1.00f, 0.05f), 0.85f);
            liveryLayer3Outline = new FluidColorSlot(Color.white, new Color(1.00f, 0.85f, 0.95f), 0.40f);

            frontWheelStyle = WheelRimStyle.Rally_6Spoke_TE37;
            rearWheelStyle = WheelRimStyle.Rally_6Spoke_TE37;
            useMismatchedWheelColors = true;
            // Iconic mismatched drift wheel setup: Fluorescent Acid Chartreuse Front + Hot Pink Rear!
            frontWheelRimColor = new FluidColorSlot(new Color(0.82f, 1.00f, 0.04f), new Color(0.35f, 1.00f, 0.15f), 0.75f);
            rearWheelRimColor = new FluidColorSlot(new Color(1.00f, 0.12f, 0.62f), new Color(1.00f, 0.35f, 0.85f), 0.75f);
            wheelDishChromeMetallic = 0.20f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.95f, 0.12f, 0.65f), new Color(0.82f, 1.00f, 0.04f), 0.70f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.96f, 0.06f, 0.58f), new Color(0.00f, 0.90f, 1.00f), 0.80f);
            headlightLensTint = new FluidColorSlot(new Color(0.85f, 0.95f, 1.00f), new Color(1.00f, 0.30f, 0.80f), 0.65f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.08f, 0.65f), new Color(0.00f, 0.92f, 1.00f), 0.95f);

            headlightStyle = HeadlightStyle.FixedAeroProjectors;
            rearWingStyle = RearWingStyle.HighMount_AluStanchionGT;
            frontAeroStyle = FrontAeroStyle.CutoutRallyFMIC;
            frontCamberDeg = -6.5f;
            rearCamberDeg = -4.5f;
            rideHeightOffsetMeters = -0.04f;
        }

        /// <summary>
        /// Reference 05: `05_818529301077179230_AUTOart_pin_page.jpg`
        /// Classic 80s Nissan Skyline RS-Turbo (R30 "Tekkamen" / Iron Mask) in Crisp Panda White/Black Two-Tone,
        /// `RS-TURBO` Side Sill Stencil, Triple Bumper Ducts, and Gunmetal Watanabe 8-Spoke Rims with Polished Lips.
        /// </summary>
        public void ConfigureAs05_TekkamenPandaSkylineR30()
        {
            buildTitle = "05 // TEKKAMEN PANDA RS-TURBO";
            inspirationReference = "05_818529301077179230_AUTOart_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.SavannaTekkamen_FC3S_R30;
            liveryStyle = LiveryPatternStyle.Tekkamen_80sPandaBeltline;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.95f, 0.95f, 0.93f), new Color(0.82f, 0.92f, 1.00f), 0.55f);
            bodySecondary = new FluidColorSlot(new Color(0.07f, 0.07f, 0.09f), new Color(0.14f, 0.14f, 0.22f), 0.50f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.06f, 0.06f, 0.08f), new Color(0.12f, 0.12f, 0.18f), 0.40f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.88f, 0.12f, 0.12f), new Color(1.00f, 0.35f, 0.10f), 0.70f);
            liveryLayer3Outline = new FluidColorSlot(new Color(0.92f, 0.92f, 0.92f), Color.white, 0.30f);

            frontWheelStyle = WheelRimStyle.Retro_8Spoke_Watanabe;
            rearWheelStyle = WheelRimStyle.Retro_8Spoke_Watanabe;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.22f, 0.24f, 0.27f), new Color(0.32f, 0.36f, 0.42f), 0.45f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.90f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.72f, 0.12f, 0.12f), new Color(0.90f, 0.22f, 0.18f), 0.50f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.08f, 0.08f, 0.10f), new Color(0.85f, 0.12f, 0.15f), 0.40f);
            headlightLensTint = new FluidColorSlot(new Color(0.96f, 0.95f, 0.90f), new Color(1.00f, 0.85f, 0.45f), 0.45f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.38f, 0.08f), new Color(0.00f, 0.88f, 1.00f), 0.65f);

            headlightStyle = HeadlightStyle.Tekkamen_IronMaskSlit;
            rearWingStyle = RearWingStyle.Shakotan_DucktailSlit;
            frontAeroStyle = FrontAeroStyle.Tekkamen_TripleAirDucts;
            frontCamberDeg = -3.5f;
            rearCamberDeg = -4.0f;
            rideHeightOffsetMeters = -0.02f;
        }

        /// <summary>
        /// Reference 06: `06_818529301077179229_a_white_sports_car_with_pink_lettering_on_its_side_parked_in_a_g.jpg`
        /// Liberty Walk "LBWK KIDS" Widebody Silhouette Exotic in Pure Alpine White covered in Hand-Drawn
        /// Hot-Pink Street-Marker Doodles & Hearts, Crimson Red Interior Bucket Seats, and Gloss Black Deep-Dish Rims.
        /// </summary>
        public void ConfigureAs06_LBWKKidsDoodleMiura()
        {
            buildTitle = "06 // LBWK KIDS DOODLE SILHOUETTE";
            inspirationReference = "06_818529301077179229_a_white_sports_car_with_pink_lettering_on_its_side_parked_in_a_g.jpg";
            chassisArchetype = CarChassisArchetype.TougeSilhouette_IntegraDC2_LBWK;
            liveryStyle = LiveryPatternStyle.LBWK_StreetMarkerDoodleBomb;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.97f, 0.97f, 0.99f), new Color(1.00f, 0.88f, 0.96f), 0.65f);
            bodySecondary = new FluidColorSlot(new Color(0.06f, 0.06f, 0.08f), new Color(0.95f, 0.18f, 0.62f), 0.70f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.96f, 0.18f, 0.62f), new Color(1.00f, 0.05f, 0.48f), 0.90f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(1.00f, 0.48f, 0.78f), new Color(0.68f, 0.22f, 1.00f), 0.85f);
            liveryLayer3Outline = new FluidColorSlot(new Color(0.12f, 0.08f, 0.16f), new Color(0.96f, 0.18f, 0.62f), 0.50f);

            frontWheelStyle = WheelRimStyle.DeepDish_5Spoke_Meister;
            rearWheelStyle = WheelRimStyle.DeepDish_5Spoke_Meister;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.06f, 0.06f, 0.08f), new Color(0.22f, 0.08f, 0.18f), 0.50f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.30f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.86f, 0.08f, 0.14f), new Color(1.00f, 0.18f, 0.55f), 0.75f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.96f, 0.18f, 0.62f), Color.white, 0.80f);
            headlightLensTint = new FluidColorSlot(new Color(0.92f, 0.95f, 1.00f), new Color(1.00f, 0.55f, 0.85f), 0.60f);
            underglowNeon = new FluidColorSlot(new Color(0.96f, 0.18f, 0.62f), new Color(1.00f, 0.55f, 0.88f), 0.90f);

            headlightStyle = HeadlightStyle.Miura_RecessedTiltedEyelids;
            rearWingStyle = RearWingStyle.TimeAttack_SwanNeckGT;
            frontAeroStyle = FrontAeroStyle.LBWK_DivePlaneCanardsAndSplitter;
            frontCamberDeg = -4.5f;
            rearCamberDeg = -5.0f;
            rideHeightOffsetMeters = -0.04f;
        }

        /// <summary>
        /// Reference 07: `07_818529301077179226_two_men_standing_next_to_a_yellow_car_on_a_race_track_with_other.jpg`
        /// BMW E36 4-Door Drift Sedan ("CARS ARE PAIN" / Donut) with Matte Black Nose + Inverse Yellow Hood Flames,
        /// Cyber Yellow Cabin, Black Rear Quarter with Giant Diagonal Typography, and Chrome Deep-Dish Rims.
        /// </summary>
        public void ConfigureAs07_DonutNoseFlameE36Sedan()
        {
            buildTitle = "07 // CARS ARE PAIN E36 DRIFT TAXI";
            inspirationReference = "07_818529301077179226_two_men_standing_next_to_a_yellow_car_on_a_race_track_with_other.jpg";
            chassisArchetype = CarChassisArchetype.HarigayaChaser_JZX100_E36Sedan;
            liveryStyle = LiveryPatternStyle.Donut_InverseNoseFlameBlockSplit;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.98f, 0.76f, 0.08f), new Color(1.00f, 0.52f, 0.00f), 0.80f);
            bodySecondary = new FluidColorSlot(new Color(0.08f, 0.08f, 0.10f), new Color(0.20f, 0.14f, 0.06f), 0.60f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.07f, 0.07f, 0.09f), new Color(0.18f, 0.10f, 0.08f), 0.65f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.98f, 0.76f, 0.08f), new Color(1.00f, 0.92f, 0.22f), 0.85f);
            liveryLayer3Outline = new FluidColorSlot(Color.white, new Color(1.00f, 0.85f, 0.15f), 0.45f);

            frontWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
            rearWheelStyle = WheelRimStyle.Chrome_5Spoke_VSKF;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.92f, 0.94f, 0.96f), new Color(1.00f, 0.92f, 0.65f), 0.45f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.90f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.12f, 0.12f, 0.14f), new Color(0.98f, 0.76f, 0.08f), 0.55f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.98f, 0.76f, 0.08f), new Color(1.00f, 0.55f, 0.00f), 0.75f);
            headlightLensTint = new FluidColorSlot(new Color(0.90f, 0.92f, 0.95f), new Color(1.00f, 0.80f, 0.15f), 0.55f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.75f, 0.05f), new Color(1.00f, 0.35f, 0.00f), 0.85f);

            headlightStyle = HeadlightStyle.FixedAeroProjectors;
            rearWingStyle = RearWingStyle.Shakotan_DucktailSlit;
            frontAeroStyle = FrontAeroStyle.StockWidebodyBumper;
            equipRearDiffuserStrakes = true;
            frontCamberDeg = -5.5f;
            rearCamberDeg = -3.5f;
            rideHeightOffsetMeters = -0.03f;
        }

        /// <summary>
        /// Reference 08: `08_818529301077179225_two_cars_parked_next_to_each_other_in_a_parking_lot_pin_page.jpg`
        /// Mazda RX-7 FC3S Savanna in Sunburst Yellow with Emerald Green Center Racing Stripe + White Pinstripes,
        /// `#39` Door Roundel, Asymmetric "Wink" Pop-Up Headlight, and Matte Black Deep-Dish Rims.
        /// </summary>
        public void ConfigureAs08_SavannaStripeFC3SWink()
        {
            buildTitle = "08 // SAVANNA #39 WINKING FC3S";
            inspirationReference = "08_818529301077179225_two_cars_parked_next_to_each_other_in_a_parking_lot_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.SavannaTekkamen_FC3S_R30;
            liveryStyle = LiveryPatternStyle.Savanna_TwinPinstripeCenterStripe39;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.98f, 0.78f, 0.12f), new Color(1.00f, 0.58f, 0.04f), 0.75f);
            bodySecondary = new FluidColorSlot(new Color(0.08f, 0.09f, 0.10f), new Color(0.04f, 0.32f, 0.18f), 0.65f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.04f, 0.52f, 0.28f), new Color(0.08f, 0.82f, 0.42f), 0.85f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.08f, 0.08f, 0.10f), new Color(0.18f, 0.18f, 0.22f), 0.50f);
            liveryLayer3Outline = new FluidColorSlot(new Color(0.96f, 0.98f, 0.96f), Color.white, 0.35f);

            frontWheelStyle = WheelRimStyle.Retro_8Spoke_Watanabe;
            rearWheelStyle = WheelRimStyle.Retro_8Spoke_Watanabe;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.08f, 0.09f, 0.11f), new Color(0.16f, 0.22f, 0.18f), 0.45f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.25f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.06f, 0.42f, 0.24f), new Color(0.98f, 0.78f, 0.12f), 0.60f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.04f, 0.52f, 0.28f), new Color(0.98f, 0.78f, 0.12f), 0.70f);
            headlightLensTint = new FluidColorSlot(new Color(0.96f, 0.96f, 0.92f), new Color(1.00f, 0.88f, 0.35f), 0.50f);
            underglowNeon = new FluidColorSlot(new Color(0.08f, 0.88f, 0.42f), new Color(1.00f, 0.82f, 0.10f), 0.80f);

            // Signature asymmetric "wink" pop-up headlight from Cars/08!
            headlightStyle = HeadlightStyle.PopUp_WinkLeftOpen;
            popUpLeftAngleDeg = 42f;
            popUpRightAngleDeg = 0f;
            rearWingStyle = RearWingStyle.WRC_RallyBoxWing;
            frontAeroStyle = FrontAeroStyle.CutoutRallyFMIC;
            frontCamberDeg = -4.0f;
            rearCamberDeg = -3.5f;
            rideHeightOffsetMeters = -0.025f;
        }

        /// <summary>
        /// Reference 09: `09_818529301077179223_Honda_Integra_pin_page.jpg`
        /// Honda Integra Type R (DC2 "Spider-Eye" Touge Build) in Deep Wine Burgundy Pearl,
        /// Amber/Yellow Tinted Quad Round Headlights, Metallic Gold 10-Spoke Racing Rims, and High-Mount Aluminum GT Wing.
        /// </summary>
        public void ConfigureAs09_TougeSpiderEyeIntegraDC2()
        {
            buildTitle = "09 // TOUGE SPIDER-EYE DC2 INTEGRA";
            inspirationReference = "09_818529301077179223_Honda_Integra_pin_page.jpg";
            chassisArchetype = CarChassisArchetype.TougeSilhouette_IntegraDC2_LBWK;
            liveryStyle = LiveryPatternStyle.None_CleanMonochrome;
            useColorableLiveryMask = true;

            bodyPrimary = new FluidColorSlot(new Color(0.48f, 0.06f, 0.12f), new Color(0.78f, 0.08f, 0.22f), 0.75f);
            bodySecondary = new FluidColorSlot(new Color(0.32f, 0.04f, 0.08f), new Color(0.55f, 0.06f, 0.15f), 0.65f);
            liveryLayer1Primary = new FluidColorSlot(new Color(0.92f, 0.92f, 0.94f), new Color(1.00f, 0.85f, 0.35f), 0.50f);
            liveryLayer2Secondary = new FluidColorSlot(new Color(0.85f, 0.68f, 0.18f), new Color(1.00f, 0.88f, 0.25f), 0.60f);
            liveryLayer3Outline = new FluidColorSlot(Color.white, Color.white, 0.25f);

            frontWheelStyle = WheelRimStyle.Touge_10Spoke_CE28N;
            rearWheelStyle = WheelRimStyle.Touge_10Spoke_CE28N;
            useMismatchedWheelColors = false;
            frontWheelRimColor = new FluidColorSlot(new Color(0.86f, 0.68f, 0.20f), new Color(1.00f, 0.84f, 0.32f), 0.65f);
            rearWheelRimColor = frontWheelRimColor;
            wheelDishChromeMetallic = 0.60f;

            interiorRollCageAndSeats = new FluidColorSlot(new Color(0.10f, 0.10f, 0.12f), new Color(0.65f, 0.08f, 0.14f), 0.50f);
            windshieldSunStripBanner = new FluidColorSlot(new Color(0.12f, 0.06f, 0.08f), new Color(0.86f, 0.68f, 0.20f), 0.50f);
            // Signature 90s JDM Touge Yellow/Amber Quad Headlight Tint!
            headlightLensTint = new FluidColorSlot(new Color(1.00f, 0.85f, 0.08f), new Color(1.00f, 0.65f, 0.00f), 0.85f);
            underglowNeon = new FluidColorSlot(new Color(1.00f, 0.72f, 0.12f), new Color(0.88f, 0.08f, 0.22f), 0.70f);

            headlightStyle = HeadlightStyle.SpiderEye_QuadRoundTouge;
            rearWingStyle = RearWingStyle.HighMount_AluStanchionGT;
            frontAeroStyle = FrontAeroStyle.StockWidebodyBumper;
            frontCamberDeg = -3.0f;
            rearCamberDeg = -2.5f;
            rideHeightOffsetMeters = -0.02f;
        }
    }
}
