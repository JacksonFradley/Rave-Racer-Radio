/**
 * RAVE RACER REMIX — Pillar 2.1: "Vibe" Fluid Color Palette System
 * Picking a color for your car is picking a Vibe. As the course & music change,
 * the car and world morph fluidly across a 2D LUT (Luminance/Zone ID x Track/Music State).
 */
window.RRR = window.RRR || {};

RRR.VIBE_PALETTES = {
    pacific_sunset: {
        id: 'pacific_sunset',
        name: 'PACIFIC SUNSET 1984',
        subtitle: 'Hiroshi Nagai Turquoise Sky × Magenta Chrome × Indigo Shadows',
        description: 'Crisp poolside cyan and warm California sunset coral that shifts into deep ultraviolet in tunnels.',
        // 4 Track Zone rows, each defining key palette stops
        zones: [
            { // Zone 0: Emerald Coast Palms (Day/Sunset Nagai)
                skyTop: [0.04, 0.38, 0.78],
                skyHorizon: [0.98, 0.56, 0.68],
                sunColor: [1.00, 0.92, 0.65],
                shadowCool: [0.14, 0.12, 0.42],
                roadLit: [0.24, 0.22, 0.38],
                roadShadow: [0.11, 0.09, 0.28],
                curbA: [0.98, 0.24, 0.52],
                curbB: [0.15, 0.92, 0.88],
                carPrimary: [0.12, 0.85, 0.92],
                carSecondary: [0.98, 0.25, 0.58],
                carTrim: [0.98, 0.95, 0.88],
                carEmissive: [1.00, 0.35, 0.65],
                foliageLit: [0.10, 0.78, 0.64],
                foliageShadow: [0.06, 0.22, 0.44]
            },
            { // Zone 1: Boiler Room Bass Tunnel (Deep Acid Violet & Cyan)
                skyTop: [0.05, 0.02, 0.16],
                skyHorizon: [0.38, 0.06, 0.52],
                sunColor: [0.20, 0.98, 1.00],
                shadowCool: [0.06, 0.02, 0.20],
                roadLit: [0.14, 0.08, 0.28],
                roadShadow: [0.05, 0.02, 0.14],
                curbA: [0.00, 0.98, 0.92],
                curbB: [0.98, 0.12, 0.75],
                carPrimary: [0.42, 0.18, 0.96],
                carSecondary: [0.05, 0.98, 0.92],
                carTrim: [1.00, 0.85, 0.98],
                carEmissive: [0.00, 1.00, 0.95],
                foliageLit: [0.22, 0.92, 0.88],
                foliageShadow: [0.10, 0.05, 0.32]
            },
            { // Zone 2: Bayshore Suspension Bridge (Golden Hour Coral & Cobalt)
                skyTop: [0.12, 0.18, 0.58],
                skyHorizon: [1.00, 0.42, 0.32],
                sunColor: [1.00, 0.78, 0.28],
                shadowCool: [0.18, 0.10, 0.45],
                roadLit: [0.30, 0.20, 0.38],
                roadShadow: [0.14, 0.08, 0.28],
                curbA: [1.00, 0.68, 0.18],
                curbB: [0.96, 0.20, 0.48],
                carPrimary: [1.00, 0.38, 0.46],
                carSecondary: [1.00, 0.82, 0.25],
                carTrim: [0.98, 0.96, 0.92],
                carEmissive: [1.00, 0.72, 0.18],
                foliageLit: [0.25, 0.72, 0.62],
                foliageShadow: [0.12, 0.15, 0.42]
            },
            { // Zone 3: Neon Shibuya Hairpins (Electric Pink & Midnight Blue)
                skyTop: [0.03, 0.06, 0.26],
                skyHorizon: [0.85, 0.16, 0.58],
                sunColor: [0.98, 0.28, 0.72],
                shadowCool: [0.08, 0.05, 0.28],
                roadLit: [0.18, 0.14, 0.32],
                roadShadow: [0.07, 0.05, 0.19],
                curbA: [1.00, 0.18, 0.62],
                curbB: [0.20, 0.85, 1.00],
                carPrimary: [0.18, 0.68, 1.00],
                carSecondary: [1.00, 0.18, 0.68],
                carTrim: [0.95, 0.98, 1.00],
                carEmissive: [1.00, 0.20, 0.78],
                foliageLit: [0.15, 0.82, 0.78],
                foliageShadow: [0.08, 0.12, 0.36]
            }
        ]
    },

    acid_warehouse: {
        id: 'acid_warehouse',
        name: 'ACID WAREHOUSE 303',
        subtitle: 'Toxic Volt Lime × Jet Indigo × Hazard Amber',
        description: '90s underground rave flyer energy. Radioactive lime body panels that burn bright yellow on bass drops.',
        zones: [
            {
                skyTop: [0.04, 0.16, 0.24],
                skyHorizon: [0.18, 0.78, 0.56],
                sunColor: [0.82, 1.00, 0.22],
                shadowCool: [0.06, 0.12, 0.26],
                roadLit: [0.16, 0.22, 0.26],
                roadShadow: [0.06, 0.09, 0.16],
                curbA: [0.78, 1.00, 0.12],
                curbB: [0.12, 0.16, 0.24],
                carPrimary: [0.75, 1.00, 0.14],
                carSecondary: [0.08, 0.12, 0.22],
                carTrim: [0.98, 1.00, 0.90],
                carEmissive: [0.85, 1.00, 0.00],
                foliageLit: [0.35, 0.92, 0.42],
                foliageShadow: [0.05, 0.20, 0.25]
            },
            {
                skyTop: [0.02, 0.05, 0.08],
                skyHorizon: [0.42, 0.85, 0.08],
                sunColor: [0.95, 1.00, 0.15],
                shadowCool: [0.03, 0.08, 0.14],
                roadLit: [0.10, 0.16, 0.14],
                roadShadow: [0.03, 0.06, 0.08],
                curbA: [0.88, 1.00, 0.00],
                curbB: [1.00, 0.45, 0.00],
                carPrimary: [0.12, 0.98, 0.52],
                carSecondary: [0.92, 1.00, 0.10],
                carTrim: [1.00, 1.00, 1.00],
                carEmissive: [1.00, 0.65, 0.00],
                foliageLit: [0.65, 1.00, 0.18],
                foliageShadow: [0.04, 0.15, 0.14]
            },
            {
                skyTop: [0.10, 0.24, 0.32],
                skyHorizon: [0.95, 0.78, 0.18],
                sunColor: [1.00, 0.96, 0.35],
                shadowCool: [0.08, 0.16, 0.28],
                roadLit: [0.22, 0.24, 0.26],
                roadShadow: [0.09, 0.11, 0.18],
                curbA: [1.00, 0.62, 0.08],
                curbB: [0.68, 0.98, 0.15],
                carPrimary: [0.98, 0.78, 0.10],
                carSecondary: [0.12, 0.85, 0.55],
                carTrim: [0.96, 0.98, 0.92],
                carEmissive: [0.82, 1.00, 0.15],
                foliageLit: [0.28, 0.84, 0.48],
                foliageShadow: [0.08, 0.22, 0.26]
            },
            {
                skyTop: [0.04, 0.04, 0.14],
                skyHorizon: [0.12, 0.88, 0.65],
                sunColor: [0.75, 1.00, 0.25],
                shadowCool: [0.05, 0.08, 0.22],
                roadLit: [0.14, 0.18, 0.24],
                roadShadow: [0.05, 0.07, 0.14],
                curbA: [0.15, 1.00, 0.68],
                curbB: [0.92, 1.00, 0.12],
                carPrimary: [0.62, 1.00, 0.18],
                carSecondary: [0.10, 0.88, 0.78],
                carTrim: [0.95, 1.00, 0.95],
                carEmissive: [0.95, 1.00, 0.12],
                foliageLit: [0.22, 0.92, 0.58],
                foliageShadow: [0.06, 0.14, 0.24]
            }
        ]
    },

    midnight_shibuya: {
        id: 'midnight_shibuya',
        name: 'MIDNIGHT SHIBUYA R4',
        subtitle: 'Ridge Racer Gold × Cobalt Asphalt × Crimson Tail-Trails',
        description: 'Homage to 1999 Ridge Racer Type 4 urban night courses—warm sodium streetlamps and deep sapphire shadows.',
        zones: [
            {
                skyTop: [0.04, 0.09, 0.28],
                skyHorizon: [0.96, 0.62, 0.22],
                sunColor: [1.00, 0.86, 0.42],
                shadowCool: [0.08, 0.11, 0.34],
                roadLit: [0.20, 0.22, 0.34],
                roadShadow: [0.08, 0.09, 0.22],
                curbA: [1.00, 0.72, 0.15],
                curbB: [0.92, 0.94, 0.98],
                carPrimary: [1.00, 0.74, 0.14],
                carSecondary: [0.12, 0.16, 0.35],
                carTrim: [0.98, 0.98, 1.00],
                carEmissive: [1.00, 0.26, 0.18],
                foliageLit: [0.16, 0.68, 0.58],
                foliageShadow: [0.06, 0.16, 0.32]
            },
            {
                skyTop: [0.02, 0.03, 0.12],
                skyHorizon: [0.88, 0.28, 0.14],
                sunColor: [1.00, 0.52, 0.12],
                shadowCool: [0.05, 0.05, 0.20],
                roadLit: [0.15, 0.14, 0.24],
                roadShadow: [0.05, 0.05, 0.13],
                curbA: [1.00, 0.32, 0.12],
                curbB: [1.00, 0.82, 0.20],
                carPrimary: [0.98, 0.42, 0.12],
                carSecondary: [1.00, 0.86, 0.24],
                carTrim: [1.00, 0.95, 0.88],
                carEmissive: [1.00, 0.85, 0.15],
                foliageLit: [0.28, 0.62, 0.52],
                foliageShadow: [0.06, 0.10, 0.24]
            },
            {
                skyTop: [0.06, 0.15, 0.42],
                skyHorizon: [0.98, 0.75, 0.36],
                sunColor: [1.00, 0.92, 0.62],
                shadowCool: [0.10, 0.15, 0.38],
                roadLit: [0.24, 0.25, 0.38],
                roadShadow: [0.10, 0.12, 0.26],
                curbA: [0.98, 0.80, 0.22],
                curbB: [0.22, 0.58, 0.96],
                carPrimary: [0.96, 0.96, 0.98],
                carSecondary: [1.00, 0.68, 0.12],
                carTrim: [0.18, 0.42, 0.92],
                carEmissive: [1.00, 0.32, 0.22],
                foliageLit: [0.18, 0.74, 0.62],
                foliageShadow: [0.08, 0.18, 0.36]
            },
            {
                skyTop: [0.02, 0.04, 0.18],
                skyHorizon: [0.22, 0.58, 0.98],
                sunColor: [1.00, 0.78, 0.22],
                shadowCool: [0.05, 0.08, 0.26],
                roadLit: [0.16, 0.19, 0.30],
                roadShadow: [0.06, 0.08, 0.18],
                curbA: [0.25, 0.72, 1.00],
                curbB: [1.00, 0.76, 0.16],
                carPrimary: [1.00, 0.78, 0.18],
                carSecondary: [0.16, 0.56, 1.00],
                carTrim: [1.00, 1.00, 1.00],
                carEmissive: [0.25, 0.85, 1.00],
                foliageLit: [0.14, 0.70, 0.68],
                foliageShadow: [0.05, 0.12, 0.28]
            }
        ]
    },

    cyber_flamingo: {
        id: 'cyber_flamingo',
        name: 'REDLINE SOLAR FLARE',
        subtitle: 'Anime Vermilion × Screaming Magenta × Chrome White',
        description: 'Pure Redline anime intensity. High-contrast vermilion and hot pink that smears into blazing plasma trails.',
        zones: [
            {
                skyTop: [0.16, 0.08, 0.46],
                skyHorizon: [1.00, 0.28, 0.42],
                sunColor: [1.00, 0.95, 0.75],
                shadowCool: [0.16, 0.06, 0.36],
                roadLit: [0.26, 0.18, 0.34],
                roadShadow: [0.12, 0.06, 0.24],
                curbA: [1.00, 0.18, 0.32],
                curbB: [0.98, 0.94, 0.88],
                carPrimary: [1.00, 0.16, 0.28],
                carSecondary: [0.98, 0.96, 0.92],
                carTrim: [1.00, 0.84, 0.22],
                carEmissive: [1.00, 0.45, 0.12],
                foliageLit: [0.18, 0.84, 0.68],
                foliageShadow: [0.12, 0.10, 0.36]
            },
            {
                skyTop: [0.08, 0.02, 0.18],
                skyHorizon: [0.98, 0.08, 0.48],
                sunColor: [1.00, 0.35, 0.68],
                shadowCool: [0.09, 0.02, 0.22],
                roadLit: [0.18, 0.08, 0.24],
                roadShadow: [0.07, 0.02, 0.14],
                curbA: [1.00, 0.10, 0.55],
                curbB: [0.15, 0.95, 1.00],
                carPrimary: [1.00, 0.10, 0.52],
                carSecondary: [0.15, 0.95, 1.00],
                carTrim: [1.00, 1.00, 1.00],
                carEmissive: [1.00, 0.22, 0.68],
                foliageLit: [0.15, 0.92, 0.82],
                foliageShadow: [0.10, 0.04, 0.26]
            },
            {
                skyTop: [0.24, 0.10, 0.42],
                skyHorizon: [1.00, 0.52, 0.20],
                sunColor: [1.00, 0.88, 0.35],
                shadowCool: [0.18, 0.08, 0.34],
                roadLit: [0.28, 0.18, 0.30],
                roadShadow: [0.14, 0.07, 0.22],
                curbA: [1.00, 0.48, 0.12],
                curbB: [1.00, 0.16, 0.38],
                carPrimary: [1.00, 0.36, 0.12],
                carSecondary: [1.00, 0.88, 0.24],
                carTrim: [1.00, 0.98, 0.94],
                carEmissive: [1.00, 0.75, 0.15],
                foliageLit: [0.26, 0.80, 0.60],
                foliageShadow: [0.14, 0.10, 0.32]
            },
            {
                skyTop: [0.05, 0.03, 0.20],
                skyHorizon: [0.95, 0.15, 0.38],
                sunColor: [1.00, 0.65, 0.20],
                shadowCool: [0.08, 0.04, 0.24],
                roadLit: [0.20, 0.12, 0.28],
                roadShadow: [0.08, 0.04, 0.16],
                curbA: [1.00, 0.22, 0.36],
                curbB: [1.00, 0.85, 0.20],
                carPrimary: [1.00, 0.18, 0.32],
                carSecondary: [1.00, 0.78, 0.18],
                carTrim: [1.00, 0.98, 0.98],
                carEmissive: [1.00, 0.30, 0.48],
                foliageLit: [0.16, 0.86, 0.72],
                foliageShadow: [0.08, 0.08, 0.28]
            }
        ]
    },

    wild_horses_cobalt: {
        id: 'wild_horses_cobalt',
        name: 'WILD HORSES COBALT',
        subtitle: 'Electric Cobalt Blue × Vermilion Red × Sticker-Bomb White',
        description: 'Inspired by the Wild Horses widebody GR Yaris concept art—saturated cobalt body panels with screaming vermilion aero trim and crisp white livery blocks.',
        zones: [
            {
                skyTop: [0.04, 0.28, 0.86],
                skyHorizon: [1.00, 0.36, 0.28],
                sunColor: [1.00, 0.94, 0.72],
                shadowCool: [0.06, 0.10, 0.38],
                roadLit: [0.20, 0.22, 0.38],
                roadShadow: [0.08, 0.09, 0.24],
                curbA: [1.00, 0.20, 0.16],
                curbB: [0.96, 0.98, 1.00],
                carPrimary: [0.08, 0.44, 0.98],
                carSecondary: [1.00, 0.20, 0.14],
                carTrim: [0.98, 0.99, 1.00],
                carEmissive: [0.00, 0.92, 1.00],
                foliageLit: [0.12, 0.82, 0.66],
                foliageShadow: [0.05, 0.18, 0.40]
            },
            {
                skyTop: [0.02, 0.04, 0.18],
                skyHorizon: [0.10, 0.48, 1.00],
                sunColor: [1.00, 0.24, 0.18],
                shadowCool: [0.04, 0.05, 0.22],
                roadLit: [0.14, 0.16, 0.30],
                roadShadow: [0.05, 0.06, 0.16],
                curbA: [0.12, 0.56, 1.00],
                curbB: [1.00, 0.22, 0.18],
                carPrimary: [0.10, 0.50, 1.00],
                carSecondary: [1.00, 0.24, 0.16],
                carTrim: [1.00, 1.00, 1.00],
                carEmissive: [1.00, 0.30, 0.15],
                foliageLit: [0.18, 0.88, 0.78],
                foliageShadow: [0.06, 0.12, 0.32]
            },
            {
                skyTop: [0.08, 0.22, 0.68],
                skyHorizon: [1.00, 0.48, 0.22],
                sunColor: [1.00, 0.86, 0.38],
                shadowCool: [0.10, 0.12, 0.42],
                roadLit: [0.24, 0.22, 0.38],
                roadShadow: [0.10, 0.09, 0.26],
                curbA: [1.00, 0.26, 0.16],
                curbB: [0.12, 0.52, 0.98],
                carPrimary: [0.12, 0.48, 0.98],
                carSecondary: [1.00, 0.28, 0.14],
                carTrim: [0.98, 0.98, 0.98],
                carEmissive: [1.00, 0.78, 0.20],
                foliageLit: [0.16, 0.78, 0.64],
                foliageShadow: [0.08, 0.14, 0.38]
            },
            {
                skyTop: [0.03, 0.06, 0.24],
                skyHorizon: [0.98, 0.18, 0.26],
                sunColor: [0.18, 0.72, 1.00],
                shadowCool: [0.05, 0.07, 0.26],
                roadLit: [0.16, 0.18, 0.32],
                roadShadow: [0.06, 0.07, 0.18],
                curbA: [1.00, 0.18, 0.22],
                curbB: [0.16, 0.62, 1.00],
                carPrimary: [0.08, 0.42, 0.96],
                carSecondary: [1.00, 0.18, 0.22],
                carTrim: [0.98, 0.99, 1.00],
                carEmissive: [0.20, 0.88, 1.00],
                foliageLit: [0.14, 0.84, 0.74],
                foliageShadow: [0.06, 0.10, 0.30]
            }
        ]
    },

    gravel_raver_camo: {
        id: 'gravel_raver_camo',
        name: 'GRAVEL RAVERS CAMO',
        subtitle: 'Tactical Moss Olive × Crimson Kanji × Rally Gold',
        description: 'Inspired by the GC8 Gravel Ravers rally build—acid woodland olive and khaki panels contrasted against crimson brush strokes and gold tarmac wheels.',
        zones: [
            {
                skyTop: [0.08, 0.26, 0.34],
                skyHorizon: [0.92, 0.68, 0.32],
                sunColor: [1.00, 0.92, 0.55],
                shadowCool: [0.08, 0.14, 0.24],
                roadLit: [0.22, 0.24, 0.26],
                roadShadow: [0.09, 0.11, 0.16],
                curbA: [0.96, 0.16, 0.20],
                curbB: [0.96, 0.82, 0.28],
                carPrimary: [0.38, 0.56, 0.24],
                carSecondary: [0.94, 0.14, 0.18],
                carTrim: [0.98, 0.84, 0.26],
                carEmissive: [1.00, 0.82, 0.18],
                foliageLit: [0.32, 0.78, 0.38],
                foliageShadow: [0.08, 0.20, 0.22]
            },
            {
                skyTop: [0.03, 0.06, 0.08],
                skyHorizon: [0.52, 0.76, 0.18],
                sunColor: [1.00, 0.22, 0.20],
                shadowCool: [0.04, 0.08, 0.12],
                roadLit: [0.14, 0.16, 0.15],
                roadShadow: [0.05, 0.07, 0.08],
                curbA: [0.96, 0.16, 0.20],
                curbB: [0.68, 0.92, 0.22],
                carPrimary: [0.44, 0.66, 0.26],
                carSecondary: [0.98, 0.16, 0.20],
                carTrim: [1.00, 0.88, 0.32],
                carEmissive: [1.00, 0.24, 0.18],
                foliageLit: [0.48, 0.88, 0.28],
                foliageShadow: [0.06, 0.16, 0.14]
            },
            {
                skyTop: [0.12, 0.24, 0.36],
                skyHorizon: [0.98, 0.58, 0.24],
                sunColor: [1.00, 0.88, 0.42],
                shadowCool: [0.10, 0.14, 0.26],
                roadLit: [0.24, 0.24, 0.28],
                roadShadow: [0.10, 0.11, 0.18],
                curbA: [0.98, 0.78, 0.22],
                curbB: [0.94, 0.16, 0.20],
                carPrimary: [0.42, 0.60, 0.26],
                carSecondary: [0.96, 0.18, 0.20],
                carTrim: [1.00, 0.86, 0.28],
                carEmissive: [1.00, 0.78, 0.16],
                foliageLit: [0.34, 0.78, 0.42],
                foliageShadow: [0.08, 0.18, 0.24]
            },
            {
                skyTop: [0.04, 0.06, 0.14],
                skyHorizon: [0.88, 0.18, 0.24],
                sunColor: [0.98, 0.84, 0.26],
                shadowCool: [0.05, 0.08, 0.18],
                roadLit: [0.16, 0.18, 0.22],
                roadShadow: [0.06, 0.07, 0.12],
                curbA: [0.96, 0.16, 0.22],
                curbB: [0.98, 0.84, 0.24],
                carPrimary: [0.36, 0.54, 0.22],
                carSecondary: [0.98, 0.16, 0.22],
                carTrim: [0.98, 0.86, 0.28],
                carEmissive: [1.00, 0.84, 0.20],
                foliageLit: [0.28, 0.82, 0.44],
                foliageShadow: [0.06, 0.14, 0.20]
            }
        ]
    },

    harigaya_flame_night: {
        id: 'harigaya_flame_night',
        name: 'HARIGAYA FLAME NIGHT',
        subtitle: 'Candy Royal Purple × Blazing Hot-Rod Orange × Cyber Kanji',
        description: 'Inspired by Reference Cars/01 (Harigaya Jidousha JZX100) & Cars/02 (Ultraviolet Acid Tribal)—deep candy violet midnight paint licked by blazing orange-to-yellow flames and neon green roll cages.',
        zones: [
            {
                skyTop: [0.07, 0.02, 0.22],
                skyHorizon: [0.98, 0.34, 0.12],
                sunColor: [1.00, 0.88, 0.22],
                shadowCool: [0.12, 0.04, 0.32],
                roadLit: [0.22, 0.14, 0.34],
                roadShadow: [0.09, 0.04, 0.20],
                curbA: [1.00, 0.42, 0.06],
                curbB: [1.00, 0.92, 0.18],
                carPrimary: [0.34, 0.08, 0.74],
                carSecondary: [1.00, 0.38, 0.04],
                carTrim: [1.00, 0.90, 0.18],
                carEmissive: [0.18, 1.00, 0.36],
                foliageLit: [0.18, 0.88, 0.52],
                foliageShadow: [0.07, 0.12, 0.28]
            },
            {
                skyTop: [0.04, 0.01, 0.14],
                skyHorizon: [0.68, 0.10, 0.88],
                sunColor: [0.32, 1.00, 0.24],
                shadowCool: [0.08, 0.03, 0.24],
                roadLit: [0.16, 0.12, 0.28],
                roadShadow: [0.06, 0.03, 0.16],
                curbA: [0.22, 1.00, 0.24],
                curbB: [0.58, 0.16, 0.96],
                carPrimary: [0.24, 0.06, 0.62],
                carSecondary: [0.24, 1.00, 0.22],
                carTrim: [0.96, 0.98, 1.00],
                carEmissive: [0.28, 1.00, 0.18],
                foliageLit: [0.24, 0.95, 0.42],
                foliageShadow: [0.05, 0.14, 0.22]
            },
            {
                skyTop: [0.10, 0.04, 0.30],
                skyHorizon: [1.00, 0.52, 0.14],
                sunColor: [1.00, 0.95, 0.55],
                shadowCool: [0.15, 0.06, 0.36],
                roadLit: [0.26, 0.18, 0.38],
                roadShadow: [0.11, 0.06, 0.24],
                curbA: [1.00, 0.55, 0.08],
                curbB: [0.20, 0.82, 1.00],
                carPrimary: [0.46, 0.10, 0.82],
                carSecondary: [1.00, 0.48, 0.06],
                carTrim: [0.22, 0.86, 1.00],
                carEmissive: [1.00, 0.78, 0.14],
                foliageLit: [0.20, 0.82, 0.64],
                foliageShadow: [0.09, 0.12, 0.32]
            },
            {
                skyTop: [0.05, 0.02, 0.18],
                skyHorizon: [1.00, 0.16, 0.48],
                sunColor: [1.00, 0.82, 0.16],
                shadowCool: [0.09, 0.03, 0.26],
                roadLit: [0.18, 0.12, 0.30],
                roadShadow: [0.07, 0.03, 0.18],
                curbA: [1.00, 0.18, 0.52],
                curbB: [1.00, 0.88, 0.14],
                carPrimary: [0.58, 0.08, 0.68],
                carSecondary: [1.00, 0.84, 0.12],
                carTrim: [0.98, 0.98, 1.00],
                carEmissive: [1.00, 0.32, 0.12],
                foliageLit: [0.22, 0.86, 0.58],
                foliageShadow: [0.06, 0.10, 0.26]
            }
        ]
    },

    pink_style_d1gp: {
        id: 'pink_style_d1gp',
        name: 'PINK STYLE SUPER-D',
        subtitle: 'Hot Magenta PS13 × Chartreuse Drift Rim × Electric Violet',
        description: 'Inspired by Reference Cars/04 (Naoki Nakamura Team Pink Style PS13) & Cars/06 (LBWK Kids Marker Coupe)—screaming hot magenta-to-violet gradient paint with chartreuse yellow front drift wheels.',
        zones: [
            {
                skyTop: [0.14, 0.04, 0.34],
                skyHorizon: [1.00, 0.14, 0.64],
                sunColor: [0.92, 1.00, 0.22],
                shadowCool: [0.16, 0.05, 0.36],
                roadLit: [0.25, 0.16, 0.34],
                roadShadow: [0.10, 0.05, 0.22],
                curbA: [1.00, 0.12, 0.62],
                curbB: [0.88, 1.00, 0.16],
                carPrimary: [0.98, 0.10, 0.58],
                carSecondary: [0.88, 1.00, 0.14],
                carTrim: [0.98, 0.98, 1.00],
                carEmissive: [0.12, 0.96, 1.00],
                foliageLit: [0.16, 0.90, 0.68],
                foliageShadow: [0.08, 0.12, 0.34]
            },
            {
                skyTop: [0.06, 0.02, 0.20],
                skyHorizon: [0.76, 0.10, 0.92],
                sunColor: [1.00, 0.24, 0.72],
                shadowCool: [0.09, 0.03, 0.26],
                roadLit: [0.18, 0.12, 0.28],
                roadShadow: [0.07, 0.03, 0.16],
                curbA: [0.88, 1.00, 0.16],
                curbB: [1.00, 0.14, 0.68],
                carPrimary: [0.68, 0.10, 0.88],
                carSecondary: [1.00, 0.16, 0.66],
                carTrim: [0.92, 1.00, 0.22],
                carEmissive: [0.90, 1.00, 0.18],
                foliageLit: [0.22, 0.88, 0.62],
                foliageShadow: [0.06, 0.10, 0.26]
            },
            {
                skyTop: [0.10, 0.18, 0.48],
                skyHorizon: [1.00, 0.36, 0.72],
                sunColor: [1.00, 0.96, 0.78],
                shadowCool: [0.14, 0.10, 0.38],
                roadLit: [0.28, 0.22, 0.38],
                roadShadow: [0.12, 0.08, 0.26],
                curbA: [1.00, 0.18, 0.64],
                curbB: [0.98, 0.98, 1.00],
                carPrimary: [0.98, 0.96, 0.98],
                carSecondary: [1.00, 0.16, 0.62],
                carTrim: [0.14, 0.92, 1.00],
                carEmissive: [1.00, 0.18, 0.66],
                foliageLit: [0.18, 0.86, 0.70],
                foliageShadow: [0.09, 0.16, 0.36]
            },
            {
                skyTop: [0.05, 0.02, 0.16],
                skyHorizon: [0.18, 0.92, 1.00],
                sunColor: [1.00, 0.16, 0.64],
                shadowCool: [0.08, 0.04, 0.24],
                roadLit: [0.16, 0.15, 0.28],
                roadShadow: [0.06, 0.05, 0.16],
                curbA: [0.16, 0.94, 1.00],
                curbB: [1.00, 0.14, 0.64],
                carPrimary: [0.94, 0.12, 0.62],
                carSecondary: [0.14, 0.94, 1.00],
                carTrim: [0.90, 1.00, 0.18],
                carEmissive: [0.92, 1.00, 0.16],
                foliageLit: [0.16, 0.88, 0.66],
                foliageShadow: [0.06, 0.12, 0.28]
            }
        ]
    }
};

// ============================================================================
// INDIVIDUAL CAR ZONE COLOR CONVERSION & FLUID RACE COLOR SHIFT ENGINE
// ============================================================================
RRR.hexToRGB = function hexToRGB(hex, fallback = [1, 1, 1]) {
    if (!hex || typeof hex !== 'string') return fallback.slice();
    const clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
        return [
            parseInt(clean[0] + clean[0], 16) / 255,
            parseInt(clean[1] + clean[1], 16) / 255,
            parseInt(clean[2] + clean[2], 16) / 255
        ];
    }
    if (clean.length !== 6) return fallback.slice();
    const num = parseInt(clean, 16);
    if (Number.isNaN(num)) return fallback.slice();
    return [
        ((num >> 16) & 255) / 255,
        ((num >> 8) & 255) / 255,
        (num & 255) / 255
    ];
};

RRR.rgbToHex = function rgbToHex(rgb) {
    if (!rgb || rgb.length < 3) return '#ffffff';
    const to2 = (v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0');
    return `#${to2(rgb[0])}${to2(rgb[1])}${to2(rgb[2])}`;
};

RRR.lerpColor3 = function lerpColor3(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    return [
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k,
        a[2] + (b[2] - a[2]) * k
    ];
};

RRR.shiftHueRGB = function shiftHueRGB(rgb, hueShiftTurns = 0.0, satBoost = 0.0, valBoost = 0.0) {
    const r = Math.max(0, Math.min(1, rgb[0]));
    const g = Math.max(0, Math.min(1, rgb[1]));
    const b = Math.max(0, Math.min(1, rgb[2]));
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    h = ((h + hueShiftTurns) % 1.0 + 1.0) % 1.0;
    const ns = Math.max(0, Math.min(1, s + satBoost));
    const nv = Math.max(0, Math.min(1, v + valBoost));

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = nv * (1 - ns);
    const q = nv * (1 - f * ns);
    const t = nv * (1 - (1 - f) * ns);
    switch (i % 6) {
        case 0: return [nv, t, p];
        case 1: return [q, nv, p];
        case 2: return [p, nv, t];
        case 3: return [p, q, nv];
        case 4: return [t, p, nv];
        default: return [nv, p, q];
    }
};

/**
 * Computes the live per-frame RGB colors for all 8 customizable vehicle zones.
 * Preserves the player's individual custom colors while fluidly shifting them
 * across Track Vibe Sectors, 138 BPM Audio Spectrum Beats, Drift Slip Angles,
 * and Boiling Rage / Untouchable Cockiness emotion states.
 */
RRR.computeFluidCarColors = function computeFluidCarColors(buildCfg, vState, cZone, car, audioState, timeSec = 0) {
    const cfg = buildCfg || {};
    const useCustom = cfg.useCustomColors !== false;
    const fluidAmt = Math.max(0.0, Math.min(1.0, Number(cfg.fluidColorShift ?? 0.68)));

    // Base colors: either player's custom individual hex picks or active Vibe palette
    const basePrimary   = useCustom && cfg.customPrimaryHex   ? RRR.hexToRGB(cfg.customPrimaryHex,   vState.carPrimary)   : vState.carPrimary.slice();
    const shiftTarget   = useCustom && cfg.customShiftHex     ? RRR.hexToRGB(cfg.customShiftHex,     cZone.carSecondary)  : cZone.carSecondary.slice();
    const baseSecondary = useCustom && cfg.customSecondaryHex ? RRR.hexToRGB(cfg.customSecondaryHex, vState.carSecondary) : vState.carSecondary.slice();
    const baseLivery1   = useCustom && cfg.customLivery1Hex   ? RRR.hexToRGB(cfg.customLivery1Hex,   vState.carSecondary) : vState.carSecondary.slice();
    const baseLivery2   = useCustom && cfg.customLivery2Hex   ? RRR.hexToRGB(cfg.customLivery2Hex,   vState.carTrim)      : vState.carTrim.slice();
    const baseFrontRim  = useCustom && cfg.customFrontRimHex  ? RRR.hexToRGB(cfg.customFrontRimHex,  vState.carTrim)      : vState.carTrim.slice();
    const baseRearRim   = useCustom && cfg.customRearRimHex   ? RRR.hexToRGB(cfg.customRearRimHex,   baseFrontRim)        : baseFrontRim.slice();
    const baseCage      = useCustom && cfg.customCageHex      ? RRR.hexToRGB(cfg.customCageHex,      vState.carEmissive)  : vState.carEmissive.slice();
    const baseGlow      = useCustom && cfg.customGlowHex      ? RRR.hexToRGB(cfg.customGlowHex,      vState.carEmissive)  : vState.carEmissive.slice();

    // Audio & Driving Telemetry drivers
    const subBass = audioState ? (audioState.subBass || 0) : 0;
    const highMid = audioState ? (audioState.highMid || 0) : 0;
    const beatPulse = audioState ? (audioState.beatPulse || 0) : 0;
    const dropIntensity = audioState ? (audioState.dropIntensity ?? 0.45) : 0.45;
    const driftAmt = car ? Math.min(1.0, Math.abs(car.visualSlipAngle || 0) * 1.6 + (car.driftCharge || 0) * 0.5) : 0;
    const boostAmt = car ? (car.boostIntensity || 0) : 0;

    // Smooth harmonic sector + time wave so colors breathe on the Garage Turntable and morph across race sectors
    const sectorWave = (0.5 + 0.5 * Math.sin(timeSec * 1.35 + (subBass * 1.4))) * fluidAmt;
    const beatMorph  = Math.min(1.0, (beatPulse * 0.55 + subBass * 0.35) * dropIntensity) * fluidAmt;
    const vibeHarmonicWeight = 0.22 * fluidAmt;

    // 1. Body Primary: fluidly morphs toward player's Shift Target + active Track Sector Vibe + Drift Hue Shift
    let primary = RRR.lerpColor3(basePrimary, shiftTarget, Math.min(1.0, sectorWave * 0.62 + beatMorph * 0.48 + driftAmt * 0.35 * fluidAmt));
    primary = RRR.lerpColor3(primary, vState.carPrimary, vibeHarmonicWeight);
    if (driftAmt > 0.05 && fluidAmt > 0.05) {
        primary = RRR.shiftHueRGB(primary, driftAmt * 0.08 * fluidAmt, beatMorph * 0.15, boostAmt * 0.12);
    }

    // 2. Body Secondary / Aero / Two-Tone Skirt
    let secondary = RRR.lerpColor3(baseSecondary, vState.carSecondary, vibeHarmonicWeight * 0.85);
    secondary = RRR.shiftHueRGB(secondary, (beatMorph * 0.05 - driftAmt * 0.04) * fluidAmt, beatMorph * 0.12, beatMorph * 0.08);

    // 3. Livery Graphic Layer 1 (Flames / Stripe / Swoosh / Tribal) & Layer 2 (Kanji / Pinstripe / Hearts / Checkers)
    let livery1 = RRR.lerpColor3(baseLivery1, shiftTarget, beatMorph * 0.35);
    livery1 = RRR.shiftHueRGB(livery1, Math.sin(timeSec * 2.1) * 0.04 * fluidAmt, beatMorph * 0.20, beatMorph * 0.16);

    let livery2 = RRR.lerpColor3(baseLivery2, vState.carEmissive, beatMorph * 0.28);
    livery2 = RRR.shiftHueRGB(livery2, -Math.sin(timeSec * 1.8) * 0.04 * fluidAmt, highMid * 0.18 * fluidAmt, beatMorph * 0.14);

    // 4. Front & Rear Wheel Rims (supports asymmetric drift wheels like Cars/04 Chartreuse Front + Pink Rear!)
    let frontRim = RRR.shiftHueRGB(baseFrontRim, driftAmt * 0.06 * fluidAmt, beatMorph * 0.12, beatMorph * 0.10);
    let rearRim  = RRR.shiftHueRGB(baseRearRim, -driftAmt * 0.06 * fluidAmt, beatMorph * 0.12, (beatMorph + driftAmt * 0.2) * 0.12);

    // 5. Interior 6-Point Roll Cage & Bucket Seats + Headlight Tint / Underglow Neon
    let cage = RRR.shiftHueRGB(baseCage, sectorWave * 0.05, beatMorph * 0.22, beatMorph * 0.18);
    let glow = RRR.lerpColor3(baseGlow, vState.carEmissive, vibeHarmonicWeight * 0.9);
    glow = RRR.shiftHueRGB(glow, beatMorph * 0.06, 0.15 * fluidAmt, beatMorph * 0.25 + boostAmt * 0.20);

    // 6. Emotion State Overdrive (Boiling Rage vs Untouchable Cockiness)
    if (car && car.isBoiling) {
        const rageCol = [1.0, 0.06, 0.18];
        primary = RRR.lerpColor3(primary, rageCol, 0.28 * Math.max(0.35, fluidAmt));
        livery1 = RRR.lerpColor3(livery1, [1.0, 0.45, 0.05], 0.35 * Math.max(0.35, fluidAmt));
        glow    = rageCol;
    } else if (car && car.isUntouchable) {
        const goldCol = [1.0, 0.88, 0.20];
        livery2  = RRR.lerpColor3(livery2, goldCol, 0.40 * Math.max(0.35, fluidAmt));
        frontRim = RRR.lerpColor3(frontRim, goldCol, 0.32 * Math.max(0.35, fluidAmt));
        glow     = goldCol;
    }

    return {
        primary,
        secondary,
        trim: livery2,
        emissive: glow,
        livery1,
        livery2,
        frontRim,
        rearRim,
        cage,
        glow,
        basePrimary,
        shiftTarget
    };
};

RRR.TRACK_ZONE_META = [
    { id: 0, name: 'SECTOR 01 // EMERALD COAST PALMS', djCue: 'SUNSET GROOVE' },
    { id: 1, name: 'SECTOR 02 // BOILER ROOM BASS TUNNEL', djCue: 'SUB-BASS PRESSURE' },
    { id: 2, name: 'SECTOR 03 // BAYSHORE SUSPENSION BRIDGE', djCue: 'OCEAN HORIZON DROP' },
    { id: 3, name: 'SECTOR 04 // SHIBUYA NEON HAIRPINS', djCue: 'ACID 303 OVERDRIVE' }
];

RRR.VibeController = class VibeController {
    constructor() {
        this.currentVibeKey = 'pacific_sunset';
        this.currentZoneIndex = 0;
        this.targetZoneIndex = 0;
        this.zoneBlend = 0.0; // 0.0 -> 1.0 interpolation between currentZoneIndex and targetZoneIndex
        this.activeState = this.cloneZone(RRR.VIBE_PALETTES.pacific_sunset.zones[0]);
        this.transitionFromZone = null;
        this.lutCanvas = document.createElement('canvas');
        this.lutCanvas.width = 256;
        this.lutCanvas.height = 16;
        this.lutCtx = this.lutCanvas.getContext('2d');
        this.regenerateLUTCanvas();
    }

    cloneZone(z) {
        const out = {};
        for (const k in z) {
            out[k] = [z[k][0], z[k][1], z[k][2]];
        }
        return out;
    }

    setVibe(vibeKey) {
        if (!RRR.VIBE_PALETTES[vibeKey]) return;
        this.currentVibeKey = vibeKey;
        this.transitionFromZone = null;
        this.regenerateLUTCanvas();
    }

    setTrackZone(zoneIdx) {
        const clamped = ((zoneIdx % 4) + 4) % 4;
        if (clamped !== this.targetZoneIndex) {
            const palette = RRR.VIBE_PALETTES[this.currentVibeKey];
            if (palette && this.zoneBlend > 0.0 && this.zoneBlend < 1.0) {
                const zA = this.transitionFromZone || palette.zones[this.currentZoneIndex];
                const zB = palette.zones[this.targetZoneIndex];
                const snap = {};
                for (const k in zA) {
                    snap[k] = this.lerpRGB(zA[k], zB[k], this.zoneBlend);
                }
                this.transitionFromZone = snap;
            } else {
                this.transitionFromZone = null;
            }
            this.currentZoneIndex = this.targetZoneIndex;
            this.targetZoneIndex = clamped;
            this.zoneBlend = 0.0;
        }
    }

    lerpRGB(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    update(dt, audioState, emotionState) {
        const palette = RRR.VIBE_PALETTES[this.currentVibeKey];
        if (this.currentZoneIndex !== this.targetZoneIndex || this.transitionFromZone) {
            this.zoneBlend = Math.min(1.0, this.zoneBlend + dt * 1.4);
            if (this.zoneBlend >= 1.0) {
                this.currentZoneIndex = this.targetZoneIndex;
                this.transitionFromZone = null;
            }
        }

        const zA = this.transitionFromZone || palette.zones[this.currentZoneIndex];
        const zB = palette.zones[this.targetZoneIndex];
        const nextHarmonicIdx = (this.targetZoneIndex + 1) % palette.zones.length;
        const zNext = palette.zones[nextHarmonicIdx];
        const t = this.zoneBlend;

        const subBass = audioState ? (audioState.subBass || 0) : 0;
        const lowMid = audioState ? (audioState.lowMid || 0) : 0;
        const highMid = audioState ? (audioState.highMid || 0) : 0;
        const treble = audioState ? (audioState.treble || 0) : 0;
        const beatPulse = audioState ? (audioState.beatPulse || 0) : 0;
        const kickPulse = audioState ? (audioState.kickPulse || beatPulse) : beatPulse;
        const snarePulse = audioState ? (audioState.snarePulse || 0) : 0;
        const dropIntensity = audioState ? (audioState.dropIntensity ?? 0.35) : 0.35;
        const barPhase = audioState ? (audioState.barPhase || 0) : 0;

        // Scale all palette reactivity by where we are in the song (calm in Intro/Breakdown -> moderate in Groove -> peak in Drop!)
        const songScale = Math.pow(Math.max(0.0, Math.min(1.0, dropIntensity)), 1.45);
        const dropGate = Math.max(0.0, (dropIntensity - 0.52) / 0.48); // Cross-zone harmonic morphing unlocks in late Pre-Drop & Drop

        // Musical cross-zone harmonic color morphing on heavy beats & drops
        const harmonicPulse = Math.min(0.55, (beatPulse * 0.34 + subBass * 0.22 + snarePulse * 0.18) * dropGate);
        const bassBoost = (subBass * 0.32 + kickPulse * 0.24) * songScale;
        const synthGlow = (highMid * 0.26 + treble * 0.22 + snarePulse * 0.20) * songScale;
        const scaledBeat = beatPulse * songScale;

        const rageShift = (emotionState && emotionState.rage > 75)
            ? Math.min(1.0, (emotionState.rage - 75) / 25) * 0.35
            : 0;
        const cockyShift = (emotionState && emotionState.cockiness > 75)
            ? Math.min(1.0, (emotionState.cockiness - 75) / 25) * 0.30
            : 0;

        for (const key in zA) {
            let c = this.lerpRGB(zA[key], zB[key], t);

            // 1. Rhythmic cross-zone LUT harmonic morphing synced to the music (active during Builds & Drops)
            if (harmonicPulse > 0.02) {
                c = this.lerpRGB(c, zNext[key], harmonicPulse);
            }

            // 2. Song-position-scaled audio-to-color synesthesia across world & car zones
            if (key === 'skyHorizon' || key === 'sunColor') {
                c[0] = Math.min(1.0, c[0] + bassBoost * 0.50 + synthGlow * 0.22);
                c[1] = Math.min(1.0, c[1] + synthGlow * 0.38 + scaledBeat * 0.16);
                c[2] = Math.min(1.0, c[2] + bassBoost * 0.44 + treble * songScale * 0.30);
            } else if (key === 'skyTop' || key === 'shadowCool') {
                const wave = 0.5 + 0.5 * Math.sin(barPhase * Math.PI * 2.0);
                c[0] = Math.min(1.0, c[0] + lowMid * songScale * 0.16 * wave + scaledBeat * 0.08);
                c[1] = Math.min(1.0, c[1] + highMid * songScale * 0.14 * (1.0 - wave));
                c[2] = Math.min(1.0, c[2] + subBass * songScale * 0.24 + scaledBeat * 0.15);
            } else if (key === 'carEmissive' || key === 'curbA' || key === 'curbB') {
                c[0] = Math.min(1.0, c[0] + bassBoost * 0.58 + snarePulse * songScale * 0.26);
                c[1] = Math.min(1.0, c[1] + synthGlow * 0.52 + scaledBeat * 0.22);
                c[2] = Math.min(1.0, c[2] + bassBoost * 0.52 + treble * songScale * 0.38);
            } else if (key === 'roadLit' || key === 'foliageLit') {
                c[0] = Math.min(1.0, c[0] + bassBoost * 0.22);
                c[1] = Math.min(1.0, c[1] + synthGlow * 0.24 + lowMid * songScale * 0.12);
                c[2] = Math.min(1.0, c[2] + bassBoost * 0.26 + highMid * songScale * 0.15);
            } else if (key === 'carPrimary' || key === 'carSecondary') {
                c[0] = Math.min(1.0, c[0] + scaledBeat * 0.18 + subBass * songScale * 0.12);
                c[1] = Math.min(1.0, c[1] + synthGlow * 0.20);
                c[2] = Math.min(1.0, c[2] + scaledBeat * 0.18 + treble * songScale * 0.15);
            }

            // High Rage ("BOILING") shifts car & curbs toward aggressive crimson
            if (rageShift > 0 && (key === 'carPrimary' || key === 'carEmissive' || key === 'curbA')) {
                c = this.lerpRGB(c, [1.0, 0.08, 0.18], rageShift);
            }

            // High Cockiness ("UNTOUCHABLE") shifts car trim & emissive toward iridescent gold
            if (cockyShift > 0 && (key === 'carSecondary' || key === 'carTrim' || key === 'carEmissive')) {
                c = this.lerpRGB(c, [1.0, 0.88, 0.22], cockyShift);
            }

            this.activeState[key] = c;
        }
    }

    /**
     * Generates the 256x16 2D Gradient LUT texture in a canvas (matches Unity VibePaletteSO spec)
     */
    regenerateLUTCanvas() {
        const palette = RRR.VIBE_PALETTES[this.currentVibeKey];
        const ctx = this.lutCtx;
        for (let row = 0; row < 16; row++) {
            const zIdx = Math.floor(row / 4);
            const zNext = (zIdx + 1) % 4;
            const frac = (row % 4) / 4.0;
            const zA = palette.zones[zIdx];
            const zB = palette.zones[zNext];

            const shadow = this.lerpRGB(zA.shadowCool, zB.shadowCool, frac);
            const primary = this.lerpRGB(zA.carPrimary, zB.carPrimary, frac);
            const secondary = this.lerpRGB(zA.carSecondary, zB.carSecondary, frac);
            const trim = this.lerpRGB(zA.carTrim, zB.carTrim, frac);
            const emissive = this.lerpRGB(zA.carEmissive, zB.carEmissive, frac);

            const grad = ctx.createLinearGradient(0, row, 256, row);
            grad.addColorStop(0.00, this.toCSS(shadow));
            grad.addColorStop(0.30, this.toCSS(primary));
            grad.addColorStop(0.60, this.toCSS(secondary));
            grad.addColorStop(0.82, this.toCSS(trim));
            grad.addColorStop(1.00, this.toCSS(emissive));

            ctx.fillStyle = grad;
            ctx.fillRect(0, row, 256, 1);
        }
    }

    toCSS(rgb, alpha = 1.0) {
        if (!rgb || rgb.length < 3) return alpha < 1.0 ? `rgba(15,20,30,${alpha})` : `rgb(15,20,30)`;
        const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
        const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
        const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
        return alpha < 1.0 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
    }
};
