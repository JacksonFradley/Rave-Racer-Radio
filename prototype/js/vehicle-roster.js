/**
 * RAVE RACER REMIX — Expanded Low-Poly Vehicle Roster, Modular Kitbash System,
 * Individual Zone Color Customization & Procedural 3D Mesh Builder
 *
 * Implements 6 Hero JDM / Street-Rave Chassis Archetypes & 12 Reference Builds
 * (Concept Art Plates 02 & 09 + Reference Images/Cars 01 through 09):
 *   01 POCKET ROCKET   (Widebody GR Yaris / Mazda 323 GTX Hot Hatchback)
 *   02 GRAVEL RAVERS   (90s Subaru Impreza GC8 / Y2K STI Rally Coupe — Cars/03)
 *   03 SHAKOTAN CYBER  (Slammed S13 180SX / PS13 D1GP Drift Coupe — Cars/02, Cars/04)
 *   04 HARIGAYA TOURER (JZX100 Chaser / E36 4-Door VIP Drift Saloon — Cars/01, Cars/07)
 *   05 SAVANNA WEDGE   (RX-7 FC3S Savanna / R30 Tekkamen Turbo Coupe — Cars/05, Cars/08)
 *   06 SPIDER-EYE TYPE (DC2 Integra Touge Type-R / LBWK Widebody Exotic — Cars/06, Cars/09)
 */
window.RRR = window.RRR || {};

RRR.VEHICLE_ARCHETYPES = {
    pocket_rocket: {
        id: 'pocket_rocket',
        code: 'CAR-01',
        name: '01 POCKET ROCKET',
        chassisModel: 'GR-YARIS / 323 GTX WIDEBODY HATCH',
        tagline: 'Box-Flared AWD Time-Attack Hot Hatch // Asymmetric Turbofans',
        stats: { speed: 84, accel: 96, drift: 82, grip: 95 },
        physics: {
            maxBaseSpeed: 86.5,
            accelLow: 66.0,
            accelHigh: 43.0,
            maxSteerAngle: 0.40,
            driftSlipMax: 0.54
        },
        dimensions: { width: 2.18, height: 1.42, length: 4.18 },
        wheelPositions: [
            [-1.08, 0.38,  1.34],
            [ 1.08, 0.38,  1.34],
            [-1.12, 0.39, -1.32],
            [ 1.12, 0.39, -1.32]
        ],
        anchors: {
            wing: [0, 1.28, -1.86],
            roof: [0, 1.38, -0.22],
            front: [0, 0.34, 2.12],
            popups: [0, 0.66, 1.88],
            exhaust: [0, 0.24, -2.08]
        }
    },

    gravel_ravers: {
        id: 'gravel_ravers',
        code: 'CAR-02',
        name: '02 GRAVEL RAVERS',
        chassisModel: '90s IMPREZA GC8 / Y2K STI RALLY COUPE',
        tagline: 'Tarmac & Gravel Stage Legend // Hood Scoop & Quad Fog Pods',
        stats: { speed: 89, accel: 90, drift: 91, grip: 88 },
        physics: {
            maxBaseSpeed: 88.5,
            accelLow: 62.0,
            accelHigh: 44.0,
            maxSteerAngle: 0.37,
            driftSlipMax: 0.60
        },
        dimensions: { width: 2.10, height: 1.38, length: 4.46 },
        wheelPositions: [
            [-1.04, 0.39,  1.42],
            [ 1.04, 0.39,  1.42],
            [-1.06, 0.40, -1.40],
            [ 1.06, 0.40, -1.40]
        ],
        anchors: {
            wing: [0, 1.02, -2.02],
            roof: [0, 1.35, -0.15],
            front: [0, 0.38, 2.24],
            popups: [0, 0.64, 2.02],
            exhaust: [0, 0.25, -2.22]
        }
    },

    shakotan_cyber: {
        id: 'shakotan_cyber',
        code: 'CAR-03',
        name: '03 SHAKOTAN CYBER',
        chassisModel: 'S13 180SX / PS13 SUPER-D DRIFT COUPE',
        tagline: 'Slammed Oni-Kyan Fastback // Sleepy-Eye Pop-Ups & Neon Roll Cage',
        stats: { speed: 96, accel: 85, drift: 98, grip: 78 },
        physics: {
            maxBaseSpeed: 92.0,
            accelLow: 58.0,
            accelHigh: 46.5,
            maxSteerAngle: 0.35,
            driftSlipMax: 0.68
        },
        dimensions: { width: 2.22, height: 1.24, length: 4.64 },
        wheelPositions: [
            [-1.10, 0.36,  1.46],
            [ 1.10, 0.36,  1.46],
            [-1.14, 0.37, -1.46],
            [ 1.14, 0.37, -1.46]
        ],
        anchors: {
            wing: [0, 0.94, -2.14],
            roof: [0, 1.22, -0.18],
            front: [0, 0.28, 2.34],
            popups: [0, 0.56, 2.06],
            exhaust: [0, 0.20, -2.30]
        }
    },

    harigaya_chaser: {
        id: 'harigaya_chaser',
        code: 'CAR-04',
        name: '04 HARIGAYA TOURER',
        chassisModel: 'JZX100 CHASER / E36 4-DOOR DRIFT SALOON',
        tagline: 'Long-Wheelbase 1JZ/Euro 4-Door Drift Missile // Chrome VS-KF & Flame Wrap',
        stats: { speed: 95, accel: 88, drift: 99, grip: 81 },
        physics: {
            maxBaseSpeed: 91.5,
            accelLow: 60.0,
            accelHigh: 46.0,
            maxSteerAngle: 0.36,
            driftSlipMax: 0.70
        },
        dimensions: { width: 2.20, height: 1.32, length: 4.76 },
        wheelPositions: [
            [-1.08, 0.37,  1.52],
            [ 1.08, 0.37,  1.52],
            [-1.12, 0.38, -1.50],
            [ 1.12, 0.38, -1.50]
        ],
        anchors: {
            wing: [0, 0.98, -2.20],
            roof: [0, 1.30, -0.16],
            front: [0, 0.30, 2.38],
            popups: [0, 0.60, 2.12],
            exhaust: [0, 0.21, -2.36]
        }
    },

    savanna_fc3s: {
        id: 'savanna_fc3s',
        code: 'CAR-05',
        name: '05 SAVANNA TEKKAMEN',
        chassisModel: 'RX-7 FC3S SAVANNA / R30 RS-TURBO WEDGE',
        tagline: '80s Rotary & Iron-Mask Turbo Wedge // Winking Pop-Ups & Watanabe Rims',
        stats: { speed: 92, accel: 91, drift: 94, grip: 86 },
        physics: {
            maxBaseSpeed: 89.5,
            accelLow: 63.0,
            accelHigh: 45.0,
            maxSteerAngle: 0.38,
            driftSlipMax: 0.63
        },
        dimensions: { width: 2.14, height: 1.27, length: 4.48 },
        wheelPositions: [
            [-1.06, 0.37,  1.40],
            [ 1.06, 0.37,  1.40],
            [-1.08, 0.38, -1.38],
            [ 1.08, 0.38, -1.38]
        ],
        anchors: {
            wing: [0, 0.96, -2.06],
            roof: [0, 1.25, -0.18],
            front: [0, 0.30, 2.26],
            popups: [0, 0.58, 2.00],
            exhaust: [0, 0.22, -2.24]
        }
    },

    touge_integra: {
        id: 'touge_integra',
        code: 'CAR-06',
        name: '06 SPIDER-EYE TOUGE',
        chassisModel: 'DC2 INTEGRA TYPE-R / LBWK SILHOUETTE COUPE',
        tagline: '10,000 RPM Touge & Widebody Street Coupe // Amber Quad Lamps & GT Aero',
        stats: { speed: 93, accel: 94, drift: 86, grip: 97 },
        physics: {
            maxBaseSpeed: 90.5,
            accelLow: 65.0,
            accelHigh: 45.5,
            maxSteerAngle: 0.41,
            driftSlipMax: 0.56
        },
        dimensions: { width: 2.20, height: 1.29, length: 4.52 },
        wheelPositions: [
            [-1.09, 0.37,  1.42],
            [ 1.09, 0.37,  1.42],
            [-1.12, 0.38, -1.42],
            [ 1.12, 0.38, -1.42]
        ],
        anchors: {
            wing: [0, 1.00, -2.10],
            roof: [0, 1.27, -0.16],
            front: [0, 0.30, 2.30],
            popups: [0, 0.58, 2.04],
            exhaust: [0, 0.22, -2.28]
        }
    }
};

RRR.LIVERY_META = {
    0:  { id: 0,  key: 'clean_vibe',       name: '00 CLEAN VIBE // Pure Two-Tone Custom Paint' },
    1:  { id: 1,  key: 'wild_horses',      name: '01 WILD HORSES // Blue Cat & Vermilion Slash' },
    2:  { id: 2,  key: 'gravel_kanji',     name: '02 GRAVEL RAVERS // Acid Camo + #01 Kanji' },
    3:  { id: 3,  key: 'cyber_dragon',     name: '03 SHAKOTAN CYBER // Hot-Pink Tribal Spear' },
    4:  { id: 4,  key: 'harigaya_flame',   name: '04 HARIGAYA FLAME // Hot-Rod Flames & Kanji (Cars/01)' },
    5:  { id: 5,  key: 'ultraviolet_acid', name: '05 ULTRAVIOLET TRIBAL // Acid Lightning & Stars (Cars/02)' },
    6:  { id: 6,  key: 'y2k_duotone',      name: '06 Y2K DUOTONE // Posterized STI Rally Swoosh (Cars/03)' },
    7:  { id: 7,  key: 'pink_style_d1gp',  name: '07 PINK STYLE SUPER-D // D1GP Splash & Checkers (Cars/04)' },
    8:  { id: 8,  key: 'tekkamen_panda',   name: '08 TEKKAMEN PANDA // 80s Two-Tone & RS-TURBO (Cars/05)' },
    9:  { id: 9,  key: 'lbwk_doodle',      name: '09 LBWK KIDS DOODLE // Street-Marker Hearts & Tags (Cars/06)' },
    10: { id: 10, key: 'donut_nose_flame', name: '10 CARS ARE PAIN // Black Nose + Inverse Flames (Cars/07)' },
    11: { id: 11, key: 'savanna_stripe39', name: '11 SAVANNA #39 // Center Racing Stripe & Roundel (Cars/08)' }
};

RRR.CONCEPT_PRESETS = {
    preset_harigaya_chaser: {
        name: 'REF 01: HARIGAYA JZX100 FLAME',
        archetypeId: 'harigaya_chaser',
        wheelStyle: 'chrome_vskf',
        wingType: 'swan_neck',
        roofMod: 'none',
        frontMod: 'fmic',
        exhaustType: 'dual_shotgun',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -6.0,
        rideHeight: -0.045,
        mudflaps: false,
        liveryId: 4,
        stickerDensity: 0.90,
        vibeKey: 'harigaya_flame_night',
        useCustomColors: true,
        fluidColorShift: 0.72,
        customPrimaryHex:   '#4d12b8', // Candy Royal Purple
        customShiftHex:     '#b814a8', // Fluid race shift -> Electric Magenta-Violet
        customSecondaryHex: '#220958', // Deep Indigo Aero Skirt
        customLivery1Hex:   '#ff5e00', // Blazing Hot-Rod Flame Orange
        customLivery2Hex:   '#ffe600', // Cyber Flame Yellow Tips & Kanji
        customFrontRimHex:  '#eef4ff', // Polished Chrome VS-KF Front
        customRearRimHex:   '#eef4ff', // Polished Chrome VS-KF Rear
        customCageHex:      '#00e5ff', // Cyan Drift Roll Cage
        customGlowHex:      '#ff8800'  // Warm Amber-Orange Underglow & Fog
    },

    preset_ultraviolet_tribal: {
        name: 'REF 02: ULTRAVIOLET ACID TRIBAL',
        archetypeId: 'shakotan_cyber',
        wheelStyle: 'deepdish_5spoke',
        wingType: 'swan_neck',
        roofMod: 'none',
        frontMod: 'fmic',
        exhaustType: 'quad_titanium',
        popupAngle: 20,
        popupMode: 'both',
        camberDeg: -5.5,
        rideHeight: -0.04,
        mudflaps: false,
        liveryId: 5,
        stickerDensity: 0.85,
        vibeKey: 'harigaya_flame_night',
        useCustomColors: true,
        fluidColorShift: 0.78,
        customPrimaryHex:   '#3b109c', // Deep Ultraviolet
        customShiftHex:     '#1a4bff', // Fluid race shift -> Electric Cobalt
        customSecondaryHex: '#190746', // Obsidian Violet Diffuser/Skirt
        customLivery1Hex:   '#39ff14', // Acid Neon Green Tribal Flames
        customLivery2Hex:   '#ffffff', // Crisp White Star Sparkles
        customFrontRimHex:  '#f5f7ff', // Pure White 5-Spoke Deep-Dish Front
        customRearRimHex:   '#f5f7ff', // Pure White 5-Spoke Deep-Dish Rear
        customCageHex:      '#39ff14', // Matching Neon Green Interior Roll Cage!
        customGlowHex:      '#39ff14'  // Neon Green Chassis Underglow!
    },

    preset_y2k_subaru: {
        name: 'REF 03: Y2K POSTERIZED STI',
        archetypeId: 'gravel_ravers',
        wheelStyle: 'rally_6spoke',
        wingType: 'rally_box',
        roofMod: 'none',
        frontMod: 'fog_pods',
        exhaustType: 'quad_titanium',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -2.5,
        rideHeight: 0.01,
        mudflaps: true,
        liveryId: 6,
        stickerDensity: 0.80,
        vibeKey: 'wild_horses_cobalt',
        useCustomColors: true,
        fluidColorShift: 0.65,
        customPrimaryHex:   '#0f46d8', // Y2K World Rally Cobalt Blue
        customShiftHex:     '#00b8ff', // Fluid race shift -> Electric Cyan
        customSecondaryHex: '#081e6b', // Deep Navy Rally Apron
        customLivery1Hex:   '#ffe600', // Posterized Cyber Yellow STI Swoosh
        customLivery2Hex:   '#ffffff', // Crisp White Rally Stars
        customFrontRimHex:  '#ffe600', // Cyber Yellow 6-Spoke Rally Front
        customRearRimHex:   '#ffe600', // Cyber Yellow 6-Spoke Rally Rear
        customCageHex:      '#ffe600', // Yellow WRC Roll Cage
        customGlowHex:      '#fff04d'  // Halogen Yellow Rally Fog Pods
    },

    preset_pink_style_ps13: {
        name: 'REF 04: PINK STYLE SUPER-D PS13',
        archetypeId: 'shakotan_cyber',
        wheelStyle: 'rally_6spoke',
        wingType: 'ducktail',
        roofMod: 'none',
        frontMod: 'fmic',
        exhaustType: 'dual_shotgun',
        popupAngle: 18,
        popupMode: 'both',
        camberDeg: -7.0,
        rideHeight: -0.05,
        mudflaps: false,
        liveryId: 7,
        stickerDensity: 1.00,
        vibeKey: 'pink_style_d1gp',
        useCustomColors: true,
        fluidColorShift: 0.82,
        customPrimaryHex:   '#ff1493', // Naoki Nakamura Hot Magenta
        customShiftHex:     '#8c14ff', // Fluid race shift -> Deep Purple Rear Fade
        customSecondaryHex: '#590878', // Violet Aero Skirt
        customLivery1Hex:   '#e6ff00', // Chartreuse Splash Flame Graphic
        customLivery2Hex:   '#00f5ff', // Cyan Checkers & Katakana Banner
        customFrontRimHex:  '#dfff00', // MISMATCHED: Chartreuse Yellow Front Drift Rim!
        customRearRimHex:   '#ff1e8a', // MISMATCHED: Hot Pink Rear Drift Rim!
        customCageHex:      '#00f5ff', // Electric Cyan Roll Cage
        customGlowHex:      '#ff2aa8'  // Hot Pink Neon Underglow
    },

    preset_tekkamen_r30: {
        name: 'REF 05: TEKKAMEN R30 RS-TURBO',
        archetypeId: 'savanna_fc3s',
        wheelStyle: 'watanabe_8spoke',
        wingType: 'none',
        roofMod: 'none',
        frontMod: 'tekkamen_ducts',
        exhaustType: 'dual_shotgun',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -3.0,
        rideHeight: -0.025,
        mudflaps: false,
        liveryId: 8,
        stickerDensity: 0.45,
        vibeKey: 'midnight_shibuya',
        useCustomColors: true,
        fluidColorShift: 0.55,
        customPrimaryHex:   '#f4f6fa', // Alpine Panda White Upper Body
        customShiftHex:     '#b8d4ff', // Fluid race shift -> Cool Silver-Blue Sheen
        customSecondaryHex: '#181a22', // Matte Charcoal Black Lower Two-Tone
        customLivery1Hex:   '#181a22', // Black Beltline Rub-Strip
        customLivery2Hex:   '#e6192e', // Crimson Red "RS-TURBO" Door Stencil
        customFrontRimHex:  '#3a3f4d', // Gunmetal 8-Spoke Watanabe Front
        customRearRimHex:   '#3a3f4d', // Gunmetal 8-Spoke Watanabe Rear
        customCageHex:      '#e6192e', // Classic Red Roll Bar
        customGlowHex:      '#ffaa22'  // Warm 80s Halogen Amber
    },

    preset_lbwk_doodle: {
        name: 'REF 06: LBWK KIDS MARKER COUPE',
        archetypeId: 'touge_integra',
        wheelStyle: 'touge_10spoke',
        wingType: 'swan_neck',
        roofMod: 'none',
        frontMod: 'lbwk_canards',
        exhaustType: 'quad_titanium',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -5.0,
        rideHeight: -0.045,
        mudflaps: false,
        liveryId: 9,
        stickerDensity: 0.95,
        vibeKey: 'pink_style_d1gp',
        useCustomColors: true,
        fluidColorShift: 0.68,
        customPrimaryHex:   '#f8f9fc', // Pure Ceramic White Widebody
        customShiftHex:     '#ffd1ea', // Fluid race shift -> Soft Neon Pink Blush
        customSecondaryHex: '#ff2a85', // Hot Pink Swan-Neck Wing & Canard Trim
        customLivery1Hex:   '#ff1e78', // Street-Marker Pink Hearts & Doodles
        customLivery2Hex:   '#14141c', // Ink Black Marker Tags ("LBWK KIDS")
        customFrontRimHex:  '#181820', // Gloss Black Forged Mesh Front
        customRearRimHex:   '#181820', // Gloss Black Forged Mesh Rear
        customCageHex:      '#e61238', // Crimson Red Racing Bucket Seats & Cage!
        customGlowHex:      '#ff2a85'  // Pink LED Accent Glow
    },

    preset_donut_e36: {
        name: 'REF 07: "CARS ARE PAIN" E36',
        archetypeId: 'harigaya_chaser',
        wheelStyle: 'chrome_vskf',
        wingType: 'ducktail',
        roofMod: 'none',
        frontMod: 'fmic',
        exhaustType: 'dual_shotgun',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -4.5,
        rideHeight: -0.035,
        mudflaps: false,
        liveryId: 10,
        stickerDensity: 0.85,
        vibeKey: 'midnight_shibuya',
        useCustomColors: true,
        fluidColorShift: 0.70,
        customPrimaryHex:   '#ffd800', // Cyber Yellow Cabin
        customShiftHex:     '#ff7b00', // Fluid race shift -> Solar Amber-Orange
        customSecondaryHex: '#141418', // Matte Pitch Black Front & Rear Clips
        customLivery1Hex:   '#141418', // Matte Black Nose & Quarter Wrap
        customLivery2Hex:   '#ffffff', // Bold White "CARS ARE PAIN" Slash Typography
        customFrontRimHex:  '#e8eef7', // Chrome Deep-Dish Front
        customRearRimHex:   '#e8eef7', // Chrome Deep-Dish Rear
        customCageHex:      '#ffd800', // Yellow Weld-In Drift Cage
        customGlowHex:      '#ffbb00'  // Warm Track Day Halogen
    },

    preset_savanna_fc3s: {
        name: 'REF 08: SAVANNA FC3S #39 WINK',
        archetypeId: 'savanna_fc3s',
        wheelStyle: 'watanabe_8spoke',
        wingType: 'ducktail',
        roofMod: 'none',
        frontMod: 'oil_cooler',
        exhaustType: 'dual_shotgun',
        popupAngle: 32,
        popupMode: 'wink_left', // Asymmetric Winking Pop-Up Headlight!
        camberDeg: -3.5,
        rideHeight: -0.03,
        mudflaps: false,
        liveryId: 11,
        stickerDensity: 0.75,
        vibeKey: 'acid_warehouse',
        useCustomColors: true,
        fluidColorShift: 0.66,
        customPrimaryHex:   '#ffcf00', // Sunburst Savanna Yellow
        customShiftHex:     '#ff8800', // Fluid race shift -> Warm Golden Tangerine
        customSecondaryHex: '#18181f', // Matte Black Rub-Strip & Lip
        customLivery1Hex:   '#008844', // Emerald Racing Green Center Stripe
        customLivery2Hex:   '#ffffff', // Crisp White Twin Pinstripes & #39 Roundel
        customFrontRimHex:  '#1c1c24', // Matte Black 8-Spoke Front
        customRearRimHex:   '#1c1c24', // Matte Black 8-Spoke Rear
        customCageHex:      '#00b85c', // Racing Green Roll Bar
        customGlowHex:      '#ffe066'  // Warm Winking Pop-Up Lamp
    },

    preset_touge_dc2: {
        name: 'REF 09: SPIDER-EYE DC2 TOUGE',
        archetypeId: 'touge_integra',
        wheelStyle: 'touge_10spoke',
        wingType: 'high_mount_gt',
        roofMod: 'none',
        frontMod: 'spider_quads',
        exhaustType: 'quad_titanium',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -3.0,
        rideHeight: -0.03,
        mudflaps: false,
        liveryId: 0,
        stickerDensity: 0.35,
        vibeKey: 'cyber_flamingo',
        useCustomColors: true,
        fluidColorShift: 0.64,
        customPrimaryHex:   '#5e0b1e', // Deep Wine Burgundy Pearl
        customShiftHex:     '#b80f3a', // Fluid race shift -> Blood Crimson Metallic
        customSecondaryHex: '#16141a', // Carbon Black Front Lip & Side Skirts
        customLivery1Hex:   '#d4af37', // Subtle Gold Type-R Lower Stripe
        customLivery2Hex:   '#ffdd33', // Amber Touge Accent
        customFrontRimHex:  '#d4af37', // Metallic Bronze-Gold 10-Spoke Front
        customRearRimHex:   '#d4af37', // Metallic Bronze-Gold 10-Spoke Rear
        customCageHex:      '#cc1b36', // Type-R Recaro Red Interior & Cage
        customGlowHex:      '#ffcc00'  // Iconic Amber-Yellow Quad Round Touge Headlights!
    },

    preset_wild_horses: {
        name: 'CONCEPT 01: WILD HORSES YARIS',
        archetypeId: 'pocket_rocket',
        wheelStyle: 'asymmetric',
        wingType: 'swan_neck',
        roofMod: 'cargo_box',
        frontMod: 'fmic',
        exhaustType: 'quad_titanium',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -3.5,
        rideHeight: -0.02,
        mudflaps: true,
        liveryId: 1,
        stickerDensity: 0.90,
        vibeKey: 'wild_horses_cobalt',
        useCustomColors: true,
        fluidColorShift: 0.70,
        customPrimaryHex:   '#0f38eb',
        customShiftHex:     '#00d9ff',
        customSecondaryHex: '#ff2b19',
        customLivery1Hex:   '#ff2b19',
        customLivery2Hex:   '#ffffff',
        customFrontRimHex:  '#ffffff',
        customRearRimHex:   '#ff2b19',
        customCageHex:      '#00f5d4',
        customGlowHex:      '#00f5d4'
    },

    preset_gravel_ravers: {
        name: 'CONCEPT 02: GRAVEL RAVERS GC8',
        archetypeId: 'gravel_ravers',
        wheelStyle: 'rally_6spoke',
        wingType: 'rally_box',
        roofMod: 'yakima_rack',
        frontMod: 'fog_pods',
        exhaustType: 'quad_titanium',
        popupAngle: 0,
        popupMode: 'both',
        camberDeg: -1.5,
        rideHeight: 0.03,
        mudflaps: true,
        liveryId: 2,
        stickerDensity: 0.85,
        vibeKey: 'gravel_raver_camo',
        useCustomColors: true,
        fluidColorShift: 0.65,
        customPrimaryHex:   '#597a38',
        customShiftHex:     '#96c93d',
        customSecondaryHex: '#fa1e38',
        customLivery1Hex:   '#fa1e38',
        customLivery2Hex:   '#f5f2eb',
        customFrontRimHex:  '#ffe600',
        customRearRimHex:   '#ffe600',
        customCageHex:      '#fa1e38',
        customGlowHex:      '#ffe600'
    },

    preset_shakotan_cyber: {
        name: 'CONCEPT 03: SHAKOTAN CYBER S13',
        archetypeId: 'shakotan_cyber',
        wheelStyle: 'deepdish_5spoke',
        wingType: 'ducktail',
        roofMod: 'none',
        frontMod: 'oil_cooler',
        exhaustType: 'dual_shotgun',
        popupAngle: 26,
        popupMode: 'both',
        camberDeg: -6.5,
        rideHeight: -0.05,
        mudflaps: false,
        liveryId: 3,
        stickerDensity: 0.80,
        vibeKey: 'cyber_flamingo',
        useCustomColors: true,
        fluidColorShift: 0.75,
        customPrimaryHex:   '#f5f2eb',
        customShiftHex:     '#ff80bf',
        customSecondaryHex: '#ff1a75',
        customLivery1Hex:   '#ff1a75',
        customLivery2Hex:   '#ffe600',
        customFrontRimHex:  '#ffe600',
        customRearRimHex:   '#ff1a75',
        customCageHex:      '#ff1a75',
        customGlowHex:      '#00f5d4'
    }
};

RRR.DEFAULT_PLAYER_BUILD = Object.assign({}, RRR.CONCEPT_PRESETS.preset_harigaya_chaser);

/**
 * Procedural Low-Poly 3D Mesh Generator for 6 Archetypes + Modular Kitbash Parts
 * Vertex format: [x, y, z, nx, ny, nz, r, g, b, a, u, v] (12 floats per vertex)
 *   colorId.r = Base Luminance (0..1)
 *   colorId.g = Material Zone ID / 10.0:
 *      0.4 = Emissive Lights / Neon Trim (subZone 0 = Taillights, subZone 1 = Headlight Tint & Underglow)
 *      0.5 = Car Primary Body Paint (Procedural Livery Canvas)
 *      0.6 = Car Secondary / Rims / Cage (subZone 0 = Secondary Body/Aero, 1 = Front Rim, 2 = Rear Rim, 3 = Interior Roll Cage & Seats)
 *      0.7 = Windshield Canopy (subZone 0 = Glass, subZone 1 = Windshield Top Sun-Strip Banner)
 *      0.8 = Tire Rubber / Dark Carbon
 *   colorId.b = Sub-Zone ID / 10.0 (0.0, 0.1, 0.2, 0.3)
 *   colorId.a = Emissive / Audio-Reactive Mask Weight (0..1)
 */
RRR.LowPolyCarBuilder = class LowPolyCarBuilder {
    static pushTri(arr, p0, p1, p2, n, colorId, uv0, uv1, uv2) {
        const pts = [p0, p1, p2];
        const uvs = [
            uv0 || [p0[0], p0[2]],
            uv1 || [p1[0], p1[2]],
            uv2 || [p2[0], p2[2]]
        ];
        for (let i = 0; i < 3; i++) {
            const p = pts[i];
            const uv = uvs[i];
            arr.push(
                p[0], p[1], p[2],
                n[0], n[1], n[2],
                colorId[0], colorId[1], colorId[2], colorId[3],
                uv[0], uv[1]
            );
        }
    }

    static computeFaceNormal(p0, p1, p2) {
        const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
        const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.hypot(nx, ny, nz) || 1.0;
        return [nx / len, ny / len, nz / len];
    }

    static pushQuadAutoNormal(arr, p0, p1, p2, p3, colorId) {
        const n = this.computeFaceNormal(p0, p1, p2);
        this.pushTri(arr, p0, p1, p2, n, colorId);
        this.pushTri(arr, p0, p2, p3, n, colorId);
    }

    static pushBox(arr, center, size, colorId, rotX = 0, rotY = 0, rotZ = 0) {
        const hx = size[0] * 0.5;
        const hy = size[1] * 0.5;
        const hz = size[2] * 0.5;
        const cx = Math.cos(rotX), sx = Math.sin(rotX);
        const cy = Math.cos(rotY), sy = Math.sin(rotY);
        const cz = Math.cos(rotZ), sz = Math.sin(rotZ);

        const xform = (lx, ly, lz) => {
            let x1 = lx * cz - ly * sz;
            let y1 = lx * sz + ly * cz;
            let z1 = lz;
            let x2 = x1;
            let y2 = y1 * cx - z1 * sx;
            let z2 = y1 * sx + z1 * cx;
            let x3 = x2 * cy + z2 * sy;
            let y3 = y2;
            let z3 = -x2 * sy + z2 * cy;
            return [center[0] + x3, center[1] + y3, center[2] + z3];
        };

        const c000 = xform(-hx, -hy, -hz);
        const c100 = xform( hx, -hy, -hz);
        const c110 = xform( hx,  hy, -hz);
        const c010 = xform(-hx,  hy, -hz);
        const c001 = xform(-hx, -hy,  hz);
        const c101 = xform( hx, -hy,  hz);
        const c111 = xform( hx,  hy,  hz);
        const c011 = xform(-hx,  hy,  hz);

        this.pushQuadAutoNormal(arr, c011, c111, c110, c010, colorId);
        this.pushQuadAutoNormal(arr, c000, c100, c101, c001, colorId);
        this.pushQuadAutoNormal(arr, c001, c101, c111, c011, colorId);
        this.pushQuadAutoNormal(arr, c100, c000, c010, c110, colorId);
        this.pushQuadAutoNormal(arr, c101, c100, c110, c111, colorId);
        this.pushQuadAutoNormal(arr, c000, c001, c011, c010, colorId);
    }

    static makeRing(z, yBot, wBot, yBelt, wBelt, yTop, wTop, yOff = 0) {
        const yb = yBot + yOff;
        const ym = yBelt + yOff;
        const yt = yTop + yOff;
        return [
            [ wBot * 0.55, yb, z],
            [ wBot,        yb + 0.06, z],
            [ wBelt,       ym, z],
            [ wTop,        yt, z],
            [-wTop,        yt, z],
            [-wBelt,       ym, z],
            [-wBot,        yb + 0.06, z],
            [-wBot * 0.55, yb, z]
        ];
    }

    static loftRings(arr, rA, rB, topColor, sideColor, skirtColor) {
        this.pushQuadAutoNormal(arr, rA[1], rB[1], rB[2], rA[2], sideColor);
        this.pushQuadAutoNormal(arr, rA[2], rB[2], rB[3], rA[3], topColor);
        this.pushQuadAutoNormal(arr, rA[3], rB[3], rB[4], rA[4], topColor);
        this.pushQuadAutoNormal(arr, rA[4], rB[4], rB[5], rA[5], topColor);
        this.pushQuadAutoNormal(arr, rA[5], rB[5], rB[6], rA[6], sideColor);
        this.pushQuadAutoNormal(arr, rA[0], rB[0], rB[1], rA[1], skirtColor);
        this.pushQuadAutoNormal(arr, rA[6], rB[6], rB[7], rA[7], skirtColor);
    }

    static capRing(arr, r, isFront, colorId) {
        if (isFront) {
            this.pushQuadAutoNormal(arr, r[1], r[6], r[5], r[2], colorId);
            this.pushQuadAutoNormal(arr, r[2], r[5], r[4], r[3], colorId);
        } else {
            this.pushQuadAutoNormal(arr, r[6], r[1], r[2], r[5], colorId);
            this.pushQuadAutoNormal(arr, r[5], r[2], r[3], r[4], colorId);
        }
    }

    /**
     * Builds the full customized Low-Poly Vehicle Mesh (Chassis + Interior Cage + Wheels + Modular Kitbash Parts)
     */
    static buildCustomVehicleMesh(config) {
        const cfg = Object.assign({}, RRR.DEFAULT_PLAYER_BUILD, config || {});
        const arch = RRR.VEHICLE_ARCHETYPES[cfg.archetypeId] || RRR.VEHICLE_ARCHETYPES.pocket_rocket;
        const v = [];
        const yOff = Number(cfg.rideHeight || 0.0);

        // Sub-zone color tags: [luminance, zoneId/10, subZone/10, emissiveMask]
        const cPrimary   = [0.95, 0.5, 0.0, 0.0];  // Zone 5: Primary Body Paint + Livery Canvas
        const cSecondary = [0.88, 0.6, 0.0, 0.06]; // Zone 6.0: Secondary Trim / Two-Tone / Aero
        const cFrontRim  = [0.94, 0.6, 0.1, 0.08]; // Zone 6.1: Front Wheel Rim (Independent color!)
        const cRearRim   = [0.94, 0.6, 0.2, 0.08]; // Zone 6.2: Rear Wheel Rim (Independent color!)
        const cCage      = [0.98, 0.6, 0.3, 0.28]; // Zone 6.3: Interior 6-Point Roll Cage & Bucket Seats
        const cGlass     = [1.00, 0.7, 0.0, 0.0];  // Zone 7.0: Windshield & Canopy Glass
        const cSunStrip  = [1.00, 0.7, 0.1, 0.12]; // Zone 7.1: Windshield Top Sun-Strip Banner
        const cDark      = [0.28, 0.8, 0.0, 0.0];  // Zone 8.0: Dark Chassis / Carbon / Tire Rubber
        const cEmissive  = [1.00, 0.4, 0.0, 1.0];  // Zone 4.0: Rear Taillights / Exhaust Glow
        const cGlowTint  = [1.00, 0.4, 0.1, 1.0];  // Zone 4.1: Headlight Tint / Fog Pods / Underglow Neon

        // =====================================================================
        // 1. MULTI-STATION CHASSIS BODY & WIDEBODY FENDERS BY ARCHETYPE (6 ARCHETYPES)
        // =====================================================================
        if (arch.id === 'pocket_rocket') {
            // 01 POCKET ROCKET: Widebody GR Yaris / 323 GTX Hot Hatchback
            const s0 = this.makeRing( 2.10, 0.18, 0.96, 0.50, 1.00, 0.58, 0.82, yOff);
            const s1 = this.makeRing( 1.65, 0.20, 1.08, 0.68, 1.12, 0.76, 0.90, yOff);
            const s2 = this.makeRing( 0.88, 0.20, 1.08, 0.76, 1.12, 0.84, 0.92, yOff);
            const s3 = this.makeRing( 0.18, 0.20, 1.02, 0.80, 1.05, 1.36, 0.78, yOff);
            const s4 = this.makeRing(-0.98, 0.20, 1.12, 0.84, 1.16, 1.38, 0.76, yOff);
            const s5 = this.makeRing(-1.68, 0.22, 1.12, 0.86, 1.16, 1.24, 0.74, yOff);
            const s6 = this.makeRing(-2.06, 0.26, 0.98, 0.76, 1.02, 0.88, 0.84, yOff);

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s5, s4, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s6, s5, cGlass,   cPrimary, cSecondary);
            this.capRing(v, s6, false, cDark);

            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.06, 0.52 + yOff,  1.34], [0.22, 0.42, 0.96], cPrimary);
                this.pushBox(v, [side * 1.14, 0.24 + yOff,  1.34], [0.16, 0.14, 1.02], cSecondary);
                this.pushBox(v, [side * 1.10, 0.56 + yOff, -1.32], [0.26, 0.48, 1.06], cPrimary);
                this.pushBox(v, [side * 1.18, 0.24 + yOff, -1.32], [0.16, 0.14, 1.10], cSecondary);
                this.pushBox(v, [side * 1.06, 0.20 + yOff,  0.0],  [0.18, 0.10, 1.95], cSecondary);
                this.pushBox(v, [side * 0.98, 0.88 + yOff,  0.58], [0.22, 0.10, 0.18], cSecondary);
            }
            this.pushBox(v, [0, 0.34 + yOff, 2.11], [1.28, 0.26, 0.08], cDark);
            this.pushBox(v, [-0.72, 0.62 + yOff, 2.02], [0.44, 0.10, 0.16], cGlowTint, 0, -0.15, -0.08);
            this.pushBox(v, [ 0.72, 0.62 + yOff, 2.02], [0.44, 0.10, 0.16], cGlowTint, 0,  0.15,  0.08);
            this.pushBox(v, [0, 0.82 + yOff, -2.05], [1.82, 0.16, 0.10], cEmissive);
            for (const fx of [-0.55, -0.18, 0.18, 0.55]) {
                this.pushBox(v, [fx, 0.20 + yOff, -2.08], [0.06, 0.16, 0.24], cSecondary);
            }

        } else if (arch.id === 'gravel_ravers') {
            // 02 GRAVEL RAVERS: 90s Subaru Impreza GC8 / Y2K STI 2-Door Rally Coupe (Cars/03)
            const s0 = this.makeRing( 2.24, 0.22, 0.92, 0.54, 0.96, 0.62, 0.84, yOff);
            const s1 = this.makeRing( 1.72, 0.22, 1.02, 0.70, 1.06, 0.78, 0.88, yOff);
            const s2 = this.makeRing( 0.92, 0.22, 1.02, 0.78, 1.05, 0.84, 0.90, yOff);
            const s3 = this.makeRing( 0.22, 0.22, 0.98, 0.82, 1.02, 1.35, 0.78, yOff);
            const s4 = this.makeRing(-0.72, 0.22, 0.98, 0.84, 1.02, 1.34, 0.78, yOff);
            const s5 = this.makeRing(-1.32, 0.22, 1.04, 0.84, 1.08, 0.88, 0.88, yOff);
            const s6 = this.makeRing(-2.22, 0.26, 0.94, 0.78, 0.98, 0.86, 0.84, yOff);

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s5, s4, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s6, s5, cPrimary, cPrimary, cSecondary);
            this.capRing(v, s6, false, cDark);

            this.pushBox(v, [0, 0.86 + yOff, 1.32], [0.54, 0.12, 0.52], cSecondary, 0.08, 0, 0);
            this.pushBox(v, [0, 0.86 + yOff, 1.56], [0.46, 0.08, 0.06], cDark);
            this.pushBox(v, [0, 1.37 + yOff, 0.05], [0.34, 0.07, 0.32], cSecondary);

            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.02, 0.54 + yOff,  1.42], [0.18, 0.38, 0.92], cPrimary);
                this.pushBox(v, [side * 1.04, 0.56 + yOff, -1.40], [0.20, 0.40, 0.96], cPrimary);
                this.pushBox(v, [side * 1.00, 0.22 + yOff,  0.0],  [0.14, 0.10, 2.00], cSecondary);
                this.pushBox(v, [side * 0.94, 0.86 + yOff,  0.65], [0.20, 0.10, 0.16], cSecondary);
            }
            this.pushBox(v, [0, 0.60 + yOff, 2.24], [0.82, 0.16, 0.08], cDark);
            this.pushBox(v, [-0.66, 0.60 + yOff, 2.22], [0.42, 0.14, 0.10], cGlowTint);
            this.pushBox(v, [ 0.66, 0.60 + yOff, 2.22], [0.42, 0.14, 0.10], cGlowTint);
            this.pushBox(v, [-0.64, 0.72 + yOff, -2.22], [0.52, 0.20, 0.10], cEmissive);
            this.pushBox(v, [ 0.64, 0.72 + yOff, -2.22], [0.52, 0.20, 0.10], cEmissive);

        } else if (arch.id === 'harigaya_chaser') {
            // 04 HARIGAYA TOURER: JZX100 Chaser / BMW E36 4-Door VIP Drift Saloon (Cars/01 & Cars/07)
            const s0 = this.makeRing( 2.38, 0.15, 0.98, 0.50, 1.02, 0.58, 0.88, yOff); // Aggressive VIP front bumper
            const s1 = this.makeRing( 1.74, 0.16, 1.08, 0.66, 1.12, 0.74, 0.92, yOff); // Flared front arch
            const s2 = this.makeRing( 0.94, 0.16, 1.06, 0.74, 1.10, 0.80, 0.94, yOff); // Base of windshield
            const s3 = this.makeRing( 0.28, 0.16, 1.04, 0.78, 1.08, 1.30, 0.80, yOff); // Front roof header
            const s4 = this.makeRing(-0.88, 0.16, 1.06, 0.80, 1.10, 1.29, 0.80, yOff); // Long 4-door saloon roof C-pillar
            const s5 = this.makeRing(-1.52, 0.17, 1.10, 0.82, 1.14, 0.86, 0.90, yOff); // Base of rear glass / trunk deck
            const s6 = this.makeRing(-2.36, 0.20, 1.02, 0.76, 1.06, 0.84, 0.88, yOff); // Long VIP rear trunk overhang

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary); // Windshield
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary); // 4-door cabin greenhouse
            this.loftRings(v, s5, s4, cGlass,   cPrimary, cSecondary); // Rear window
            this.loftRings(v, s6, s5, cPrimary, cPrimary, cSecondary); // Long VIP trunk deck
            this.capRing(v, s6, false, cDark);

            // 4-Door Saloon B-Pillar Divider & Flared BN-Sports VIP Skirts
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 0.96, 1.02 + yOff, -0.26], [0.06, 0.46, 0.12], cDark); // B-pillar
                this.pushBox(v, [side * 1.12, 0.16 + yOff,  0.0],  [0.22, 0.10, 2.40], cSecondary, 0, 0, side * 0.10);
                this.pushBox(v, [side * 1.08, 0.48 + yOff,  1.52], [0.20, 0.36, 0.96], cPrimary);
                this.pushBox(v, [side * 1.12, 0.50 + yOff, -1.50], [0.24, 0.40, 1.04], cPrimary);
                this.pushBox(v, [side * 0.98, 0.82 + yOff,  0.66], [0.22, 0.09, 0.18], cSecondary);
            }
            // JZX100 Tourer V / E36 Wide Rectangular Crystal Headlights & Grille
            this.pushBox(v, [0, 0.54 + yOff, 2.38], [0.84, 0.14, 0.08], cDark);
            this.pushBox(v, [-0.68, 0.54 + yOff, 2.36], [0.46, 0.14, 0.10], cGlowTint);
            this.pushBox(v, [ 0.68, 0.54 + yOff, 2.36], [0.46, 0.14, 0.10], cGlowTint);
            // Wide VIP Saloon Taillight Bar
            this.pushBox(v, [0, 0.72 + yOff, -2.36], [1.96, 0.18, 0.10], cEmissive);

        } else if (arch.id === 'savanna_fc3s') {
            // 05 SAVANNA TEKKAMEN: 80s RX-7 FC3S Savanna / R30 Skyline RS-Turbo Wedge Coupe (Cars/05 & Cars/08)
            const s0 = this.makeRing( 2.26, 0.16, 0.94, 0.46, 0.98, 0.52, 0.86, yOff); // Sharp 80s wedge nose
            const s1 = this.makeRing( 1.66, 0.17, 1.04, 0.62, 1.08, 0.70, 0.90, yOff);
            const s2 = this.makeRing( 0.86, 0.17, 1.04, 0.70, 1.08, 0.76, 0.92, yOff);
            const s3 = this.makeRing( 0.12, 0.17, 1.00, 0.74, 1.04, 1.25, 0.78, yOff);
            const s4 = this.makeRing(-0.58, 0.17, 1.04, 0.76, 1.08, 1.23, 0.78, yOff);
            const s5 = this.makeRing(-1.68, 0.18, 1.06, 0.78, 1.10, 0.84, 0.86, yOff);
            const s6 = this.makeRing(-2.24, 0.21, 0.98, 0.72, 1.02, 0.80, 0.86, yOff);

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s5, s4, cGlass,   cPrimary, cSecondary); // Wrap-around FC3S glass hatch
            this.loftRings(v, s6, s5, cPrimary, cPrimary, cSecondary);
            this.capRing(v, s6, false, cDark);

            // Offset FC3S Turbo II Hood Scoop + 80s Wrap-Around Beltline Rub-Strip Moldings
            this.pushBox(v, [-0.14, 0.75 + yOff, 1.38], [0.42, 0.07, 0.44], cPrimary, 0.06, 0, 0);
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.06, 0.48 + yOff,  0.0],  [0.08, 0.07, 4.30], cSecondary); // 80s beltline rub-strip
                this.pushBox(v, [side * 1.05, 0.48 + yOff,  1.40], [0.18, 0.34, 0.90], cPrimary);
                this.pushBox(v, [side * 1.07, 0.50 + yOff, -1.38], [0.20, 0.36, 0.94], cPrimary);
                this.pushBox(v, [side * 0.96, 0.80 + yOff,  0.58], [0.20, 0.09, 0.16], cSecondary);
            }
            // Smoked 80s Horizontal Grid Taillights
            this.pushBox(v, [0, 0.66 + yOff, -2.25], [1.86, 0.18, 0.10], cEmissive);

        } else if (arch.id === 'touge_integra') {
            // 06 SPIDER-EYE TOUGE: DC2 Integra Type-R / LBWK Silhouette Coupe (Cars/06 & Cars/09)
            const s0 = this.makeRing( 2.30, 0.15, 0.98, 0.46, 1.02, 0.54, 0.88, yOff);
            const s1 = this.makeRing( 1.68, 0.16, 1.08, 0.62, 1.12, 0.70, 0.92, yOff);
            const s2 = this.makeRing( 0.86, 0.16, 1.06, 0.72, 1.10, 0.78, 0.94, yOff);
            const s3 = this.makeRing( 0.10, 0.16, 1.02, 0.76, 1.06, 1.28, 0.78, yOff);
            const s4 = this.makeRing(-0.66, 0.16, 1.06, 0.78, 1.10, 1.26, 0.78, yOff);
            const s5 = this.makeRing(-1.62, 0.17, 1.10, 0.80, 1.14, 0.86, 0.88, yOff);
            const s6 = this.makeRing(-2.28, 0.20, 1.02, 0.74, 1.06, 0.82, 0.88, yOff);

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s5, s4, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s6, s5, cPrimary, cPrimary, cSecondary);
            this.capRing(v, s6, false, cDark);

            // Widebody Silhouette Fender Flares & Deep Side Skirts
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.08, 0.48 + yOff,  1.42], [0.22, 0.36, 0.94], cPrimary);
                this.pushBox(v, [side * 1.12, 0.50 + yOff, -1.42], [0.24, 0.38, 1.00], cPrimary);
                this.pushBox(v, [side * 1.10, 0.16 + yOff,  0.0],  [0.20, 0.09, 2.20], cSecondary);
                this.pushBox(v, [side * 0.98, 0.80 + yOff,  0.58], [0.22, 0.09, 0.18], cSecondary);
            }
            // Iconic DC2 Recessed Quad Round "Spider-Eye" Headlights (Tinted by cGlowTint / Amber Yellow!)
            for (const lx of [-0.74, -0.48, 0.48, 0.74]) {
                this.pushBox(v, [lx, 0.50 + yOff, 2.29], [0.18, 0.16, 0.10], cDark);
                this.pushBox(v, [lx, 0.50 + yOff, 2.32], [0.14, 0.14, 0.08], cGlowTint);
            }
            this.pushBox(v, [-0.64, 0.68 + yOff, -2.28], [0.54, 0.16, 0.10], cEmissive);
            this.pushBox(v, [ 0.64, 0.68 + yOff, -2.28], [0.54, 0.16, 0.10], cEmissive);

        } else {
            // 03 SHAKOTAN CYBER: Slammed Nissan S13 180SX / PS13 Drift Liftback (Cars/02 & Cars/04)
            const s0 = this.makeRing( 2.34, 0.14, 0.98, 0.42, 1.02, 0.48, 0.88, yOff);
            const s1 = this.makeRing( 1.68, 0.15, 1.08, 0.58, 1.12, 0.66, 0.92, yOff);
            const s2 = this.makeRing( 0.84, 0.16, 1.06, 0.68, 1.10, 0.74, 0.94, yOff);
            const s3 = this.makeRing( 0.06, 0.16, 1.04, 0.72, 1.08, 1.21, 0.78, yOff);
            const s4 = this.makeRing(-0.68, 0.16, 1.08, 0.74, 1.14, 1.19, 0.78, yOff);
            const s5 = this.makeRing(-1.75, 0.17, 1.12, 0.76, 1.16, 0.84, 0.88, yOff);
            const s6 = this.makeRing(-2.30, 0.20, 1.04, 0.70, 1.08, 0.78, 0.90, yOff);

            this.capRing(v, s0, true, cSecondary);
            this.loftRings(v, s1, s0, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s2, s1, cPrimary, cPrimary, cSecondary);
            this.loftRings(v, s3, s2, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s4, s3, cPrimary, cGlass,   cSecondary);
            this.loftRings(v, s5, s4, cGlass,   cPrimary, cSecondary);
            this.loftRings(v, s6, s5, cPrimary, cPrimary, cSecondary);
            this.capRing(v, s6, false, cDark);

            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.12, 0.16 + yOff, 0.0], [0.22, 0.09, 2.25], cSecondary, 0, 0, side * 0.12);
                this.pushBox(v, [side * 1.08, 0.46 + yOff,  1.46], [0.20, 0.34, 0.94], cPrimary);
                this.pushBox(v, [side * 1.12, 0.48 + yOff, -1.46], [0.24, 0.38, 1.02], cPrimary);
                this.pushBox(v, [side * 0.98, 0.78 + yOff, 0.55], [0.22, 0.08, 0.18], cSecondary);
            }
            this.pushBox(v, [0, 0.14 + yOff, 2.38], [2.06, 0.08, 0.22], cSecondary);
            this.pushBox(v, [0, 0.69 + yOff, 1.38], [0.76, 0.04, 0.56], cDark, 0.06, 0, 0);
            this.pushBox(v, [0, 0.64 + yOff, -2.31], [1.92, 0.20, 0.10], cEmissive);
            this.pushBox(v, [-0.58, 0.64 + yOff, -2.33], [0.34, 0.12, 0.08], cEmissive);
            this.pushBox(v, [ 0.58, 0.64 + yOff, -2.33], [0.34, 0.12, 0.08], cEmissive);
        }

        // =====================================================================
        // 1B. VISIBLE INTERIOR 6-POINT ROLL CAGE, BUCKET SEATS, SUN-STRIP & UNDERGLOW RAILS
        //     (Inspired by Cars/02 Neon Green Roll Cage & Underglow + Cars/06 Red Bucket Seats!)
        // =====================================================================
        const roofY = arch.anchors.roof[1] + yOff;
        // Twin Racing Bucket Seat Headrests & Bolsters visible inside the cabin
        for (const sx of [-0.38, 0.38]) {
            this.pushBox(v, [sx, roofY - 0.32, -0.18], [0.32, 0.44, 0.12], cCage, -0.18, 0, 0);
            this.pushBox(v, [sx, roofY - 0.12, -0.22], [0.22, 0.18, 0.10], cCage);
        }
        // 6-Point Tubular Roll Cage Main Hoop, Diagonal Cross-Brace & Side Door Bars
        this.pushBox(v, [0, roofY - 0.05, -0.42], [1.36, 0.07, 0.07], cCage); // Upper main hoop crossbar
        this.pushBox(v, [0, roofY - 0.28, -0.78], [0.07, 0.07, 0.92], cCage, 0.45, 0, 0.72); // X-brace bar 1
        this.pushBox(v, [0, roofY - 0.28, -0.78], [0.07, 0.07, 0.92], cCage, 0.45, 0, -0.72); // X-brace bar 2
        for (const side of [-1, 1]) {
            this.pushBox(v, [side * 0.72, roofY - 0.16, -0.05], [0.07, 0.07, 1.10], cCage); // Roof side halo bar
            this.pushBox(v, [side * 0.78, roofY - 0.38,  0.10], [0.06, 0.06, 0.96], cCage, 0.32, 0, 0); // Gusseted door bar
        }
        // Top Windshield Sun-Strip Banner (Cars/01 Harigaya / Cars/04 Pink Style Katakana Banner)
        this.pushBox(v, [0, roofY - 0.05, 0.34], [1.54, 0.11, 0.22], cSunStrip, -0.52, 0, 0);
        // Chassis Side-Skirt Neon Underglow Bars (Cars/02 Acid Green Underglow!)
        for (const side of [-1, 1]) {
            this.pushBox(v, [side * 0.96, 0.11 + yOff, 0.0], [0.08, 0.05, 2.10], cGlowTint);
        }

        // =====================================================================
        // 2. ARTICULATED SLEEPY-EYE & ASYMMETRIC "WINK" POP-UP HEADLIGHTS (Cars/08 FC3S!)
        // =====================================================================
        const popDeg = Number(cfg.popupAngle || 0);
        const popMode = cfg.popupMode || 'both'; // 'both' | 'wink_left' | 'wink_right'
        if (popDeg > 1 || popMode !== 'both' || arch.id === 'shakotan_cyber' || arch.id === 'savanna_fc3s') {
            const baseDeg = (popMode !== 'both' && popDeg < 10) ? 30 : popDeg;
            const pz = arch.anchors.popups[2];
            const py = arch.anchors.popups[1] + yOff;
            for (const side of [-1, 1]) {
                // side = -1 (Left), +1 (Right)
                let sideDeg = baseDeg;
                if (popMode === 'wink_left') {
                    sideDeg = (side < 0) ? Math.max(24, baseDeg) : 0;
                } else if (popMode === 'wink_right') {
                    sideDeg = (side > 0) ? Math.max(24, baseDeg) : 0;
                }
                const pitchRad = -((Math.max(0, sideDeg) * Math.PI) / 180.0);
                const px = side * 0.64;
                // Pop-up lid cover (Primary body color)
                this.pushBox(v, [px, py + Math.sin(-pitchRad) * 0.08, pz], [0.42, 0.06, 0.34], cPrimary, pitchRad, 0, 0);
                if (sideDeg > 3) {
                    // Glowing Sleepy-Eye / Wink Projector Lens inside housing!
                    this.pushBox(v, [px, py + 0.04, pz + 0.12], [0.38, 0.12, 0.10], cGlowTint);
                    this.pushBox(v, [px, py + 0.04, pz + 0.02], [0.40, 0.14, 0.18], cDark);
                }
            }
        }

        // =====================================================================
        // 3. MODULAR REAR WING / SPOILER ATTACHMENT
        // =====================================================================
        const wAnchor = arch.anchors.wing;
        const wy = wAnchor[1] + yOff;
        const wz = wAnchor[2];
        if (cfg.wingType === 'swan_neck') {
            for (const sx of [-0.52, 0.52]) {
                this.pushBox(v, [sx, wy + 0.18, wz], [0.06, 0.38, 0.22], cDark, -0.18, 0, 0);
                this.pushBox(v, [sx, wy + 0.38, wz + 0.06], [0.08, 0.08, 0.26], cSecondary);
            }
            this.pushBox(v, [0, wy + 0.36, wz - 0.04], [2.16, 0.07, 0.42], cSecondary, 0.14, 0, 0);
            this.pushBox(v, [0, wy + 0.42, wz - 0.16], [2.12, 0.05, 0.18], cPrimary,   0.28, 0, 0);
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.09, wy + 0.34, wz - 0.04], [0.05, 0.34, 0.56], cPrimary);
                this.pushBox(v, [side * 1.11, wy + 0.34, wz - 0.04], [0.02, 0.22, 0.42], cSecondary);
            }
        } else if (cfg.wingType === 'high_mount_gt') {
            // Reference Cars/09: Touge High-Mount Aluminum Twin-Post GT Wing
            for (const sx of [-0.62, 0.62]) {
                this.pushBox(v, [sx, wy + 0.24, wz], [0.05, 0.48, 0.18], cSecondary, -0.10, 0, 0);
            }
            this.pushBox(v, [0, wy + 0.46, wz - 0.04], [2.04, 0.06, 0.36], cDark, 0.16, 0, 0);
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.03, wy + 0.44, wz - 0.04], [0.04, 0.28, 0.48], cSecondary);
            }
        } else if (cfg.wingType === 'rally_box') {
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 0.74, wy + 0.16, wz], [0.10, 0.34, 0.40], cPrimary);
            }
            this.pushBox(v, [0, wy + 0.04, wz], [1.58, 0.06, 0.36], cPrimary);
            this.pushBox(v, [0, wy + 0.32, wz - 0.04], [1.66, 0.08, 0.42], cSecondary, 0.10, 0, 0);
        } else if (cfg.wingType === 'ducktail') {
            this.pushBox(v, [0, wy + 0.08, wz - 0.06], [1.88, 0.22, 0.28], cPrimary, -0.52, 0, 0);
            this.pushBox(v, [0, wy + 0.16, wz - 0.14], [1.84, 0.06, 0.12], cSecondary, -0.52, 0, 0);
        }

        // =====================================================================
        // 4. MODULAR ROOF ATTACHMENT (THULE CARGO BOX / YAKIMA RACK)
        // =====================================================================
        const rAnchor = arch.anchors.roof;
        const ry = rAnchor[1] + yOff;
        const rz = rAnchor[2];
        if (cfg.roofMod === 'cargo_box') {
            this.pushBox(v, [0, ry + 0.04, rz + 0.36], [1.38, 0.05, 0.07], cSecondary);
            this.pushBox(v, [0, ry + 0.04, rz - 0.36], [1.38, 0.05, 0.07], cSecondary);
            this.pushBox(v, [0, ry + 0.16, rz], [0.86, 0.20, 1.38], cPrimary);
            this.pushBox(v, [0, ry + 0.14, rz + 0.68], [0.72, 0.14, 0.26], cSecondary, 0.25, 0, 0);
            this.pushBox(v, [0, ry + 0.15, rz], [0.90, 0.04, 1.42], cSecondary);
        } else if (cfg.roofMod === 'yakima_rack') {
            this.pushBox(v, [0, ry + 0.04, rz + 0.42], [1.42, 0.05, 0.06], cDark);
            this.pushBox(v, [0, ry + 0.04, rz - 0.42], [1.42, 0.05, 0.06], cDark);
            this.pushBox(v, [0, ry + 0.09, rz + 0.58], [1.26, 0.14, 0.06], cSecondary, 0.58, 0, 0);
            for (const sx of [-0.58, 0.58]) {
                this.pushBox(v, [sx, ry + 0.10, rz], [0.05, 0.08, 1.08], cSecondary);
            }
        }

        // =====================================================================
        // 5. MODULAR FRONT COOLER / QUAD TOUGE LAMPS / TEKKAMEN DUCTS / LBWK CANARDS
        // =====================================================================
        const fAnchor = arch.anchors.front;
        const fy = fAnchor[1] + yOff;
        const fz = fAnchor[2];
        if (cfg.frontMod === 'fmic') {
            this.pushBox(v, [0, fy, fz + 0.04], [1.06, 0.28, 0.10], cSecondary);
            this.pushBox(v, [0, fy, fz + 0.06], [0.92, 0.22, 0.08], cPrimary);
            this.pushBox(v, [-0.62, fy, fz + 0.02], [0.22, 0.14, 0.14], cSecondary);
            this.pushBox(v, [ 0.62, fy, fz + 0.02], [0.22, 0.14, 0.14], cSecondary);
        } else if (cfg.frontMod === 'oil_cooler') {
            this.pushBox(v, [0.18, fy + 0.04, fz + 0.08], [0.68, 0.22, 0.12], cSecondary, -0.12, 0, 0);
            this.pushBox(v, [0.18, fy + 0.04, fz + 0.10], [0.58, 0.16, 0.10], cGlowTint,  -0.12, 0, 0);
            this.pushBox(v, [-0.22, fy + 0.08, fz + 0.06], [0.16, 0.06, 0.16], cSecondary, 0, 0, 0.45);
            this.pushBox(v, [-0.30, fy + 0.02, fz + 0.06], [0.16, 0.06, 0.16], cPrimary,   0, 0, 0.45);
        } else if (cfg.frontMod === 'fog_pods') {
            for (const fx of [-0.56, -0.20, 0.20, 0.56]) {
                this.pushBox(v, [fx, fy + 0.14, fz + 0.06], [0.24, 0.24, 0.16], cSecondary);
                this.pushBox(v, [fx, fy + 0.14, fz + 0.12], [0.18, 0.18, 0.06], cGlowTint);
            }
        } else if (cfg.frontMod === 'spider_quads') {
            // Reference Cars/09: DC2 Touge Quad Round Amber Headlights + Carbon Lip
            this.pushBox(v, [0, fy - 0.10, fz + 0.08], [2.04, 0.08, 0.24], cDark);
            for (const fx of [-0.74, -0.46, 0.46, 0.74]) {
                this.pushBox(v, [fx, fy + 0.18, fz + 0.05], [0.20, 0.20, 0.12], cDark);
                this.pushBox(v, [fx, fy + 0.18, fz + 0.10], [0.16, 0.16, 0.08], cGlowTint);
            }
        } else if (cfg.frontMod === 'tekkamen_ducts') {
            // Reference Cars/05: Skyline R30 "Tekkamen" Iron-Mask Triple Slotted Air Dam
            this.pushBox(v, [0, fy - 0.02, fz + 0.06], [1.96, 0.28, 0.16], cSecondary);
            for (const fx of [-0.46, 0.0, 0.46]) {
                this.pushBox(v, [fx, fy + 0.02, fz + 0.12], [0.32, 0.12, 0.08], cDark);
            }
        } else if (cfg.frontMod === 'lbwk_canards') {
            // Reference Cars/06: Liberty Walk Deep Carbon Splitter + Twin Dive-Plane Canards
            this.pushBox(v, [0, fy - 0.12, fz + 0.12], [2.16, 0.07, 0.30], cSecondary);
            for (const side of [-1, 1]) {
                this.pushBox(v, [side * 1.04, fy + 0.04, fz - 0.08], [0.18, 0.05, 0.34], cSecondary, -0.26, 0, side * 0.25);
                this.pushBox(v, [side * 1.06, fy + 0.14, fz - 0.14], [0.16, 0.05, 0.28], cSecondary, -0.28, 0, side * 0.25);
            }
        }

        // =====================================================================
        // 6. RALLY MUDFLAPS & EXHAUST TIPS
        // =====================================================================
        if (cfg.mudflaps) {
            for (const wp of arch.wheelPositions) {
                const side = Math.sign(wp[0]);
                const mx = wp[0] + side * 0.04;
                const my = 0.24 + yOff;
                const mz = wp[2] - 0.42;
                this.pushBox(v, [mx, my, mz], [0.36, 0.34, 0.04], cSecondary);
            }
        }

        const exAnchor = arch.anchors.exhaust;
        const ey = exAnchor[1] + yOff;
        const ez = exAnchor[2];
        const exhaustNozzles = [];
        if (cfg.exhaustType === 'dual_shotgun') {
            this.pushBox(v, [-0.54, ey + 0.14, ez - 0.18], [0.11, 0.11, 0.48], cSecondary, 0.38, 0, 0);
            this.pushBox(v, [-0.40, ey + 0.14, ez - 0.18], [0.11, 0.11, 0.48], cSecondary, 0.38, 0, 0);
            this.pushBox(v, [-0.47, ey + 0.24, ez - 0.40], [0.26, 0.08, 0.08], cEmissive);
            exhaustNozzles.push([-0.54, ey + 0.24, ez - 0.42], [-0.40, ey + 0.24, ez - 0.42]);
        } else {
            for (const ex of [-0.66, -0.52, 0.52, 0.66]) {
                this.pushBox(v, [ex, ey, ez - 0.06], [0.10, 0.10, 0.24], cSecondary);
            }
            exhaustNozzles.push([-0.59, ey, ez - 0.20], [0.59, ey, ez - 0.20]);
        }

        const chassisVertices = new Float32Array(v);

        // =====================================================================
        // 7. 4 MODULAR LOW-POLY WHEELS (INDEPENDENT FRONT/REAR RIM COLORS + 7 RIM STYLES)
        // =====================================================================
        const camberRad = ((Number(cfg.camberDeg || 0)) * Math.PI) / 180.0;
        const wheels = [];
        let wheelFloatsCount = 0;
        arch.wheelPositions.forEach((wp, idx) => {
            const isFront = idx < 2;
            const side = Math.sign(wp[0]); // -1 Left, +1 Right
            let style = cfg.wheelStyle || 'asymmetric';
            if (style === 'asymmetric') {
                style = isFront ? 'turbofan' : 'deepdish_5spoke';
            }
            // Tag Front Wheel Rims with cFrontRim (Zone 6.1) and Rear Wheel Rims with cRearRim (Zone 6.2)!
            const rimZoneColor = isFront ? cFrontRim : cRearRim;
            const wheelTiltZ = -side * camberRad;

            const wVerts = [];
            this.buildWheel(wVerts, [0, 0, 0], side, style, 0.0, rimZoneColor, cPrimary, cGlowTint, cDark);
            wheelFloatsCount += wVerts.length;
            wheels.push({
                vertices: new Float32Array(wVerts),
                pos: [wp[0], wp[1], wp[2]],
                isFront: isFront,
                side: side,
                camberTiltZ: wheelTiltZ
            });
        });

        const tailYMap = {
            pocket_rocket:   0.68,
            gravel_ravers:   0.70,
            harigaya_chaser: 0.70,
            savanna_fc3s:    0.65,
            touge_integra:   0.66,
            shakotan_cyber:  0.64
        };
        const tailXMap = {
            pocket_rocket:   0.68,
            gravel_ravers:   0.64,
            harigaya_chaser: 0.70,
            savanna_fc3s:    0.68,
            touge_integra:   0.64,
            shakotan_cyber:  0.66
        };
        const tailY = (tailYMap[arch.id] || 0.66) + yOff;
        const tailX = tailXMap[arch.id] || 0.68;
        const tailZ = ez + 0.02;
        const totalFloats = chassisVertices.length + wheelFloatsCount;

        return {
            chassisVertices: chassisVertices,
            wheels: wheels,
            exhaustNozzles: exhaustNozzles,
            taillightAnchors: {
                left:  [-tailX, tailY, tailZ],
                right: [ tailX, tailY, tailZ]
            },
            vertexCount: totalFloats / 12,
            triangleCount: totalFloats / 36
        };
    }

    static buildWheel(v, center, side, style, tiltZ, cRim, cAccent, cEmissive, cTire) {
        const segs = 12;
        const radius = 0.38;
        const halfW = 0.19;
        const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);

        const toWorld = (lx, ly, lz) => {
            const rx = lx * cz - ly * sz;
            const ry = lx * sz + ly * cz;
            return [center[0] + rx, center[1] + ry, center[2] + lz];
        };

        for (let i = 0; i < segs; i++) {
            const a0 = (i / segs) * Math.PI * 2;
            const a1 = ((i + 1) / segs) * Math.PI * 2;
            const y0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
            const y1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;

            const pOut0 = toWorld(side * halfW,  y0, z0);
            const pOut1 = toWorld(side * halfW,  y1, z1);
            const pIn0  = toWorld(-side * halfW, y0, z0);
            const pIn1  = toWorld(-side * halfW, y1, z1);

            if (side > 0) {
                this.pushQuadAutoNormal(v, pOut0, pOut1, pIn1, pIn0, cTire);
            } else {
                this.pushQuadAutoNormal(v, pOut1, pOut0, pIn0, pIn1, cTire);
            }

            const ry0 = Math.cos(a0) * (radius * 0.72), rz0 = Math.sin(a0) * (radius * 0.72);
            const ry1 = Math.cos(a1) * (radius * 0.72), rz1 = Math.sin(a1) * (radius * 0.72);
            const pRim0 = toWorld(side * (halfW + 0.01), ry0, rz0);
            const pRim1 = toWorld(side * (halfW + 0.01), ry1, rz1);

            if (side > 0) {
                this.pushQuadAutoNormal(v, pRim0, pRim1, pOut1, pOut0, cTire);
            } else {
                this.pushQuadAutoNormal(v, pRim1, pRim0, pOut0, pOut1, cTire);
            }
        }

        const hubOutX = side * (halfW + 0.02);
        if (style === 'turbofan') {
            const coneTip = toWorld(side * (halfW + 0.07), 0, 0);
            const rFan = radius * 0.72;
            for (let i = 0; i < segs; i++) {
                const a0 = (i / segs) * Math.PI * 2;
                const a1 = ((i + 1) / segs) * Math.PI * 2;
                const p0 = toWorld(hubOutX, Math.cos(a0) * rFan, Math.sin(a0) * rFan);
                const p1 = toWorld(hubOutX, Math.cos(a1) * rFan, Math.sin(a1) * rFan);
                const finCol = (i % 2 === 0) ? cRim : cAccent;
                const triPts = side > 0 ? [coneTip, p0, p1] : [coneTip, p1, p0];
                const n = this.computeFaceNormal(triPts[0], triPts[1], triPts[2]);
                this.pushTri(v, triPts[0], triPts[1], triPts[2], n, finCol);
            }
            this.pushBox(v, toWorld(side * (halfW + 0.07), 0, 0), [0.06, 0.12, 0.12], cEmissive, 0, 0, tiltZ);
        } else if (style === 'rally_6spoke') {
            this.pushBox(v, toWorld(side * (halfW - 0.02), 0, 0), [0.04, 0.16, 0.16], cRim, 0, 0, tiltZ);
            for (let s = 0; s < 3; s++) {
                const ang = (s / 3) * Math.PI;
                this.pushBox(v, toWorld(side * (halfW + 0.01), 0, 0), [0.04, radius * 1.42, 0.08], cRim, ang, 0, tiltZ);
            }
        } else if (style === 'watanabe_8spoke') {
            // Reference Cars/05 & Cars/08: 80s RS-Watanabe 8-Spoke Minilite + Polished Step Lip
            this.pushBox(v, toWorld(side * (halfW - 0.03), 0, 0), [0.04, 0.15, 0.15], cRim, 0, 0, tiltZ);
            for (let s = 0; s < 4; s++) {
                const ang = (s / 4) * Math.PI;
                this.pushBox(v, toWorld(side * (halfW - 0.01), 0, 0), [0.04, radius * 1.38, 0.065], cRim, ang, 0, tiltZ);
            }
        } else if (style === 'touge_10spoke') {
            // Reference Cars/06 & Cars/09: 10-Spoke Type-R / Forged Mesh Wheel
            this.pushBox(v, toWorld(side * (halfW - 0.01), 0, 0), [0.04, 0.14, 0.14], cRim, 0, 0, tiltZ);
            for (let s = 0; s < 5; s++) {
                const ang = (s / 5) * Math.PI;
                this.pushBox(v, toWorld(side * (halfW + 0.01), 0, 0), [0.035, radius * 1.44, 0.048], cRim, ang, 0, tiltZ);
            }
        } else {
            // 'deepdish_5spoke' or 'chrome_vskf' (Cars/01 & Cars/02): Deep-Dish 5-Spoke Step-Lip Wheel
            const dishInX = side * (halfW - 0.06);
            this.pushBox(v, toWorld(side * (halfW + 0.01), 0, 0), [0.03, radius * 1.38, radius * 1.38], cRim, Math.PI * 0.25, 0, tiltZ);
            for (let s = 0; s < 5; s++) {
                const ang = (s / 5) * Math.PI * 2;
                const sy = Math.cos(ang) * radius * 0.34;
                const szPos = Math.sin(ang) * radius * 0.34;
                const spokeW = (style === 'chrome_vskf') ? 0.11 : 0.09;
                this.pushBox(v, toWorld(dishInX, sy, szPos), [0.05, radius * 0.68, spokeW], cRim, ang, 0, tiltZ);
            }
        }
    }
};
