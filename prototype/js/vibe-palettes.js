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
    }
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
        this.lutCanvas = document.createElement('canvas');
        this.lutCanvas.width = 256;
        this.lutCanvas.height = 16;
        this.lutCtx = this.lutCanvas.getContext('2d');
        this.lutDirty = true;
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
        this.lutDirty = true;
        this.regenerateLUTCanvas();
    }

    setTrackZone(zoneIdx) {
        const clamped = ((zoneIdx % 4) + 4) % 4;
        if (clamped !== this.targetZoneIndex) {
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
        if (this.currentZoneIndex !== this.targetZoneIndex) {
            this.zoneBlend = Math.min(1.0, this.zoneBlend + dt * 1.4);
            if (this.zoneBlend >= 1.0) {
                this.currentZoneIndex = this.targetZoneIndex;
            }
        }

        const zA = palette.zones[this.currentZoneIndex];
        const zB = palette.zones[this.targetZoneIndex];
        const t = this.zoneBlend;

        const bassBoost = (audioState ? audioState.subBass : 0) * 0.18;
        const rageShift = (emotionState && emotionState.rage > 75)
            ? Math.min(1.0, (emotionState.rage - 75) / 25) * 0.35
            : 0;
        const cockyShift = (emotionState && emotionState.cockiness > 75)
            ? Math.min(1.0, (emotionState.cockiness - 75) / 25) * 0.30
            : 0;

        for (const key in zA) {
            let c = this.lerpRGB(zA[key], zB[key], t);

            // Audio reactivity on emissives, curbs, and horizon
            if (key === 'carEmissive' || key === 'curbA' || key === 'skyHorizon') {
                c[0] = Math.min(1.0, c[0] + bassBoost);
                c[1] = Math.min(1.0, c[1] + bassBoost * 0.7);
                c[2] = Math.min(1.0, c[2] + bassBoost * 0.9);
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
        const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255);
        const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255);
        const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255);
        return alpha < 1.0 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
    }
};
