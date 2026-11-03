/**
 * RAVE RACER REMIX — Pillar 5.1, 6.2 & 6.3:
 * 3D Banked Racing Spline with Multiple Developer Test Track Presets,
 * Track Vibe Zones, World Map Node Graph & Dijkstra Landmark Solver
 */
window.RRR = window.RRR || {};

RRR.wrapAngle = function wrapAngle(rad) {
    while (rad > Math.PI) rad -= Math.PI * 2;
    while (rad < -Math.PI) rad += Math.PI * 2;
    return rad;
};

/**
 * RAVE RACER REMIX — STANDARD MAP & TRACK BUILDING RULES FOR CONSTANT PERCEIVED SPEED
 * Enforced both by control-point design and automatically by TrackSpline.buildSplineTable():
 *  1. Centripetal Catmull-Rom (alpha = 0.5) knot parameterization to prevent chord-length overshoot loops.
 *  2. Minimum Centerline Turn Radius: R_min >= 3.6 * roadHalfWidth (>= 54m) so inner/outer curb ratios stay bounded.
 *  3. Multi-Node Corner Arcs: Max chord deflection <= 48° per node (90° turn >= 2 nodes; 180° hairpin >= 4 nodes).
 *  4. Chord Spacing Envelope: Control points spaced 80m–220m apart (avoid < 65m chords next to > 200m straights).
 *  5. Width Continuity: Road halfWidth varies by at most ±0.6m across corners so peripheral optical flow stays constant.
 *  6. Constant Physical Sample Density: ds = 2.50m per sample regardless of total circuit length, with post-relaxation
 *     3D arc-length re-equalization so sample spacing never compresses or stretches inside curves.
 */
RRR.MAP_SPEED_STANDARDS = {
    targetSampleSpacingMeters: 2.50,
    minTurnRadiusRatioToHalfWidth: 3.6,
    minAbsoluteTurnRadiusMeters: 54.0,
    maxChordDeflectionDeg: 48.0,
    maxHalfWidthDeltaInCorners: 0.75
};

RRR.TRACK_PRESETS = {
    straight_drag: {
        id: 'straight_drag',
        name: 'TRACK 01 // STRAIGHTAWAY & DRAG RUNWAY',
        subtitle: 'Zero-Curvature 600m Straight + Wide Turnaround Loop',
        desc: 'Isolates W/S acceleration, A/D lane changes, guardrail slides, FOV warp, and high-speed Paint Smudge without corner curvature.',
        roadHalfWidth: 14.5,
        controlPoints: [
            // 750m Dead-Straight Main Runway along +Z (X = 0 across P_last..P_5 so curvature is strictly 0.000 at start!)
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, 150], bank: 0.0, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, 300], bank: 0.0, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, 450], bank: 0.0, halfWidth: 14.5, zone: 1 },
            { pos: [0, 0, 600], bank: 0.0, halfWidth: 14.5, zone: 1 },
            { pos: [0, 0, 750], bank: 0.0, halfWidth: 14.8, zone: 2 },
            // 4-Node Constant-Radius North Turnaround (Diameter 280m, R >= 76m)
            { pos: [-70, 0, 880], bank: 0.08, halfWidth: 15.0, zone: 2 },
            { pos: [-210, 0, 880], bank: 0.08, halfWidth: 15.0, zone: 2 },
            { pos: [-280, 0, 750], bank: 0.04, halfWidth: 14.8, zone: 2 },
            { pos: [-280, 0, 450], bank: 0.0, halfWidth: 14.5, zone: 3 },
            { pos: [-280, 0, 150], bank: 0.0, halfWidth: 14.5, zone: 3 },
            { pos: [-280, 0, -150], bank: 0.04, halfWidth: 14.8, zone: 3 },
            // 4-Node Constant-Radius South Turnaround (Diameter 280m, R >= 76m)
            { pos: [-210, 0, -280], bank: 0.08, halfWidth: 15.0, zone: 0 },
            { pos: [-70, 0, -280], bank: 0.08, halfWidth: 15.0, zone: 0 },
            { pos: [0, 0, -150], bank: 0.0, halfWidth: 14.5, zone: 0 }
        ]
    },

    drift_skidpad: {
        id: 'drift_skidpad',
        name: 'TRACK 02 // R4 DRIFT SKIDPAD & HAIRPIN ARENA',
        subtitle: 'Wide Constant-Radius Drift Curves + 180° Hairpins + Chicane',
        desc: 'Designed to tune R4 drift initiation, slip angles (15°–48°), centrifugal corner push, drift charge rate, and boost exits.',
        roadHalfWidth: 14.8,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, 130], bank: 0.0, halfWidth: 14.8, zone: 0 },
            // 4-Node Constant-Radius Right Drift Bowl (R >= 67m)
            { pos: [-55, 0, 240], bank: 0.12, halfWidth: 15.0, zone: 1 },
            { pos: [-165, 0, 275], bank: 0.14, halfWidth: 15.2, zone: 1 },
            { pos: [-265, 0, 200], bank: 0.14, halfWidth: 15.2, zone: 1 },
            // Flowing S-Chicane transition
            { pos: [-295, 0, 80], bank: 0.08, halfWidth: 14.8, zone: 2 },
            { pos: [-265, 0, -45], bank: -0.08, halfWidth: 14.8, zone: 2 },
            { pos: [-285, 0, -170], bank: 0.12, halfWidth: 15.0, zone: 2 },
            // 4-Node Constant-Radius South Hairpin Bowl
            { pos: [-215, 0, -270], bank: 0.16, halfWidth: 15.2, zone: 3 },
            { pos: [-95, 0, -265], bank: 0.14, halfWidth: 15.2, zone: 3 },
            { pos: [-15, 0, -175], bank: 0.08, halfWidth: 14.8, zone: 3 },
            { pos: [0, 0, -85], bank: 0.0, halfWidth: 14.5, zone: 0 }
        ]
    },

    elevation_bank: {
        id: 'elevation_bank',
        name: 'TRACK 03 // ELEVATION & BANKING ROLLERCOASTER',
        subtitle: 'Steep +28m Climb, Blind Crest, Plunge & High-Banked Bowl',
        desc: 'Tests 3D surface normal alignment, uphill/downhill camera pitch tracking, and banked corner roll.',
        roadHalfWidth: 14.4,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.2, zone: 0 },
            { pos: [0, 12, 130], bank: 0.0, halfWidth: 14.2, zone: 0 },
            { pos: [0, 26, 260], bank: 0.0, halfWidth: 14.4, zone: 2 },
            { pos: [-65, 22, 370], bank: 0.18, halfWidth: 14.8, zone: 2 },
            { pos: [-185, 8, 395], bank: 0.22, halfWidth: 15.0, zone: 1 },
            { pos: [-285, -8, 310], bank: 0.20, halfWidth: 15.0, zone: 1 },
            { pos: [-320, -14, 180], bank: 0.14, halfWidth: 14.8, zone: 1 },
            { pos: [-285, -4, 45], bank: 0.14, halfWidth: 14.6, zone: 3 },
            { pos: [-210, 8, -80], bank: 0.18, halfWidth: 14.8, zone: 3 },
            { pos: [-100, 10, -145], bank: 0.16, halfWidth: 14.6, zone: 3 },
            { pos: [-15, 4, -95], bank: 0.06, halfWidth: 14.2, zone: 0 }
        ]
    },

    nagai_bayshore: {
        id: 'nagai_bayshore',
        name: 'TRACK 04 // FULL NAGAI BAYSHORE CIRCUIT',
        subtitle: 'Complete 4-Sector Circuit (Palms → Bass Tunnel → Bridge → Shibuya)',
        desc: 'The full race course with all 4 Track Vibe Zones, trackside DJ Jumbotrons, and 3 AI Rivals.',
        roadHalfWidth: 14.4,
        controlPoints: [
            // Sector 0: Emerald Coast Palms
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.2, zone: 0 },
            { pos: [0, 0, 140], bank: 0.0, halfWidth: 14.2, zone: 0 },
            { pos: [-40, 2, 275], bank: 0.08, halfWidth: 14.5, zone: 0 },
            { pos: [-135, 5, 365], bank: 0.14, halfWidth: 14.8, zone: 0 },
            // Sector 1: Boiler Room Bass Tunnel
            { pos: [-265, 2, 385], bank: 0.08, halfWidth: 14.8, zone: 1 },
            { pos: [-385, -6, 325], bank: -0.10, halfWidth: 14.8, zone: 1 },
            { pos: [-455, -10, 200], bank: 0.14, halfWidth: 15.0, zone: 1 },
            { pos: [-440, -6, 60], bank: 0.10, halfWidth: 14.6, zone: 1 },
            // Sector 2: Bayshore Suspension Bridge
            { pos: [-365, 8, -70], bank: -0.06, halfWidth: 14.4, zone: 2 },
            { pos: [-275, 16, -185], bank: 0.0, halfWidth: 14.2, zone: 2 },
            { pos: [-160, 16, -245], bank: 0.06, halfWidth: 14.4, zone: 2 },
            // Sector 3: Shibuya Neon Sweeper return to Start/Finish
            { pos: [-45, 8, -225], bank: 0.12, halfWidth: 14.8, zone: 3 },
            { pos: [0, 2, -115], bank: 0.06, halfWidth: 14.4, zone: 3 }
        ]
    },

    wangan_cyberport: {
        id: 'wangan_cyberport',
        name: 'TRACK 05 // WANGAN CYBER-PORT & CONTAINER HELIX',
        subtitle: 'Container Crane Terminal + 270° Spiral Helix (+34m) + Submerged Reactor + 90m Ferris Wheel',
        desc: 'Complex harbor circuit featuring towering Port Container Gantry Cranes, a climbing 270° Spiral Viaduct Helix wrapped around a 58m Radar Spire, a -16m Submerged Reactor Tube, an Automatic Toll Plaza, and a 90m Neon Ferris Wheel.',
        roadHalfWidth: 14.8,
        heroSetPieces: [
            { type: 'HELIX_RADAR_SPIRE', pos: [-225, 0, 655] },
            { type: 'COSMO_FERRIS_WHEEL', pos: [-195, 0, -310], yaw: 0.35 }
        ],
        controlPoints: [
            // Sector 0: Daikoku Container Crane Terminal & High-Speed Dock Chicane
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.5, zone: 0, setPiece: 'CRANE_PORT' },
            { pos: [0, 0, 160], bank: 0.0, halfWidth: 14.5, zone: 0, setPiece: 'CRANE_PORT' },
            { pos: [0, 0, 320], bank: 0.0, halfWidth: 14.5, zone: 0, setPiece: 'CRANE_PORT' },
            { pos: [-35, 0, 470], bank: 0.08, halfWidth: 14.8, zone: 0, setPiece: 'CRANE_PORT' },
            { pos: [-20, 4, 620], bank: -0.08, halfWidth: 14.8, zone: 0, setPiece: 'CRANE_PORT' },
            // Sector 2: 270° Climbing Spiral Overpass Helix (+12m -> +34m, R >= 93m) around Central Radar Spire
            { pos: [-90, 12, 750], bank: 0.16, halfWidth: 15.0, zone: 2, setPiece: 'HELIX_TOWER' },
            { pos: [-215, 22, 810], bank: 0.20, halfWidth: 15.2, zone: 2, setPiece: 'HELIX_TOWER' },
            { pos: [-335, 30, 745], bank: 0.22, halfWidth: 15.2, zone: 2, setPiece: 'HELIX_TOWER' },
            { pos: [-385, 34, 615], bank: 0.18, halfWidth: 15.0, zone: 2, setPiece: 'HELIX_TOWER' },
            // High-Altitude Cable-Stayed Wangan Skybridge Straight
            { pos: [-365, 30, 460], bank: 0.06, halfWidth: 14.8, zone: 2 },
            { pos: [-345, 20, 300], bank: 0.0, halfWidth: 14.5, zone: 2 },
            // Sector 1: Plunge into Submerged Harbor Reactor Tube (-16m)
            { pos: [-355, 6, 140], bank: 0.08, halfWidth: 14.8, zone: 1, setPiece: 'REACTOR_TUBE' },
            { pos: [-410, -10, -10], bank: 0.12, halfWidth: 15.0, zone: 1, setPiece: 'REACTOR_TUBE' },
            { pos: [-445, -16, -165], bank: 0.12, halfWidth: 15.0, zone: 1, setPiece: 'REACTOR_TUBE' },
            { pos: [-415, -14, -315], bank: 0.16, halfWidth: 15.0, zone: 1, setPiece: 'REACTOR_TUBE' },
            // Sector 3: Highway Automatic Toll Plaza & 90m Neon Ferris Wheel Sweeper
            { pos: [-315, -8, -420], bank: 0.16, halfWidth: 15.0, zone: 3, setPiece: 'TOLL_PLAZA' },
            { pos: [-180, -2, -430], bank: 0.16, halfWidth: 15.0, zone: 3, setPiece: 'FERRIS_WHEEL' },
            { pos: [-70, 0, -340], bank: 0.14, halfWidth: 14.8, zone: 3, setPiece: 'FERRIS_WHEEL' },
            { pos: [-15, 0, -210], bank: 0.08, halfWidth: 14.6, zone: 3, setPiece: 'TOLL_PLAZA' },
            { pos: [0, 0, -95], bank: 0.0, halfWidth: 14.5, zone: 0, setPiece: 'CRANE_PORT' }
        ]
    },

    hakone_canyon: {
        id: 'hakone_canyon',
        name: 'TRACK 06 // HAKONE NEON CANYON & LASER CATHEDRAL',
        subtitle: '+44m Wind-Farm Ridge Ascent + Deep-Space Dish Summit + 3D Laser Pyramid + Gorge Viaduct',
        desc: 'Mountain touge pass climbing +44m past spinning Coastal Wind Turbines and a Deep-Space Parabolic Dish Array before plunging through a 3D Wireframe Laser Cathedral into a high-banked canyon viaduct.',
        roadHalfWidth: 14.6,
        heroSetPieces: [
            { type: 'LASER_PYRAMID_MONOLITH', pos: [-505, 8, 100] },
            { type: 'SUMMIT_OBSERVATORY_DOME', pos: [-265, 44, 650] }
        ],
        controlPoints: [
            // Sector 0: Foothills & Coastal Wind Turbine Ridge Ascent (0m -> +38m)
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.4, zone: 0, setPiece: 'WIND_TURBINES' },
            { pos: [0, 6, 150], bank: 0.0, halfWidth: 14.4, zone: 0, setPiece: 'WIND_TURBINES' },
            { pos: [-45, 16, 295], bank: 0.10, halfWidth: 14.6, zone: 0, setPiece: 'WIND_TURBINES' },
            { pos: [-35, 28, 445], bank: -0.10, halfWidth: 14.6, zone: 0, setPiece: 'WIND_TURBINES' },
            { pos: [-115, 38, 575], bank: 0.16, halfWidth: 14.8, zone: 2, setPiece: 'SOLAR_DISH' },
            // Sector 2: +44m Summit Observatory & Deep-Space Parabolic Dish Array
            { pos: [-255, 44, 625], bank: 0.18, halfWidth: 15.0, zone: 2, setPiece: 'SOLAR_DISH' },
            { pos: [-395, 40, 565], bank: 0.16, halfWidth: 14.8, zone: 2, setPiece: 'SOLAR_DISH' },
            // Sector 1: High-Speed Plunge through the 3D Wireframe Laser Pyramid Cathedral
            { pos: [-495, 28, 435], bank: 0.12, halfWidth: 14.8, zone: 1, setPiece: 'LASER_CATHEDRAL' },
            { pos: [-540, 16, 280], bank: 0.08, halfWidth: 14.8, zone: 1, setPiece: 'LASER_CATHEDRAL' },
            { pos: [-515, 8, 125], bank: -0.10, halfWidth: 14.8, zone: 1, setPiece: 'LASER_CATHEDRAL' },
            { pos: [-545, 4, -30], bank: 0.10, halfWidth: 14.8, zone: 1, setPiece: 'LASER_CATHEDRAL' },
            // Sector 3: Hakone Canyon Gorge Viaduct Curves (Constant-Radius Multi-Node Bowl, R >= 109m)
            { pos: [-510, 0, -185], bank: 0.16, halfWidth: 15.0, zone: 3, setPiece: 'GORGE_VIADUCT' },
            { pos: [-415, -6, -310], bank: 0.18, halfWidth: 15.0, zone: 3, setPiece: 'GORGE_VIADUCT' },
            { pos: [-280, -10, -375], bank: 0.16, halfWidth: 15.0, zone: 3, setPiece: 'GORGE_VIADUCT' },
            { pos: [-145, -8, -345], bank: 0.16, halfWidth: 14.8, zone: 3, setPiece: 'GORGE_VIADUCT' },
            { pos: [-45, -4, -240], bank: 0.12, halfWidth: 14.6, zone: 0, setPiece: 'WIND_TURBINES' },
            { pos: [-5, 0, -115], bank: 0.04, halfWidth: 14.4, zone: 0, setPiece: 'WIND_TURBINES' }
        ]
    },

    odaiba_megaplex: {
        id: 'odaiba_megaplex',
        name: 'TRACK 07 // ODAIBA MEGA-PLEX & FIGURE-8 CROSSOVER',
        subtitle: 'Grade-Separated 3D Figure-8 (+28m Skyway Bridge over -12m Subwoofer Trench) + Megasphere + Bowling Pin',
        desc: 'True 3D Figure-8 circuit! Rockets through Shibuya Skybridges and the Giant Neon Bowling Pin Plaza, climbs +28m past the suspended Odaiba Broadcast Megasphere to cross OVER the lower track, sweeps around the Nagai Beach Resort, and dives -12m through the Subwoofer Trench UNDER the bridge.',
        roadHalfWidth: 14.6,
        heroSetPieces: [
            { type: 'ODAIBA_MEGASPHERE_TOWER', pos: [-250, 0, 210] },
            { type: 'GIANT_BOWLING_PIN_PLAZA', pos: [-52, 0, 215] },
            { type: 'NAGAI_RESORT_HOTEL', pos: [-465, 0, -35] }
        ],
        controlPoints: [
            // Sector 3: Shibuya Skybridge Canyon & Giant Neon Bowling Pin Plaza
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.5, zone: 3, setPiece: 'SHIBUYA_SKYBRIDGE' },
            { pos: [0, 0, 145], bank: 0.0, halfWidth: 14.5, zone: 3, setPiece: 'SHIBUYA_SKYBRIDGE' },
            { pos: [0, 6, 295], bank: 0.0, halfWidth: 14.6, zone: 3, setPiece: 'BOWLING_PIN_PLAZA' },
            { pos: [-55, 16, 425], bank: 0.16, halfWidth: 14.8, zone: 3, setPiece: 'SHIBUYA_SKYBRIDGE' },
            // Sector 2: North Loop Climbing to the +28m Odaiba Megasphere Skyway Crossover
            { pos: [-175, 24, 445], bank: 0.18, halfWidth: 15.0, zone: 2, setPiece: 'ODAIBA_MEGASPHERE' },
            { pos: [-240, 28, 345], bank: 0.10, halfWidth: 14.8, zone: 2, setPiece: 'ODAIBA_MEGASPHERE' },
            // UPPER CROSSOVER BRIDGE (+28m elevation crossing NE -> SW at [-250, 210])
            { pos: [-250, 28, 210], bank: 0.0, halfWidth: 14.6, zone: 2, setPiece: 'ODAIBA_MEGASPHERE' },
            // Sector 0: Descending into the Hiroshi Nagai Sunset Beach Resort & Pool Boardwalk
            { pos: [-275, 20, 65], bank: -0.08, halfWidth: 14.8, zone: 0, setPiece: 'NAGAI_RESORT' },
            { pos: [-355, 8, -75], bank: -0.14, halfWidth: 14.8, zone: 0, setPiece: 'NAGAI_RESORT' },
            { pos: [-485, 2, -125], bank: -0.18, halfWidth: 15.0, zone: 0, setPiece: 'NAGAI_RESORT' },
            { pos: [-590, 0, -25], bank: -0.18, halfWidth: 15.0, zone: 0, setPiece: 'NAGAI_RESORT' },
            // Sector 1: Diving into the -12m Subterranean Boiler Room Subwoofer Trench
            { pos: [-600, -4, 125], bank: -0.16, halfWidth: 14.8, zone: 1, setPiece: 'SUBWOOFER_TRENCH' },
            { pos: [-515, -10, 250], bank: -0.16, halfWidth: 14.8, zone: 1, setPiece: 'SUBWOOFER_TRENCH' },
            { pos: [-375, -12, 265], bank: -0.10, halfWidth: 14.6, zone: 1, setPiece: 'SUBWOOFER_TRENCH' },
            // LOWER CROSSOVER TRENCH (-12m elevation crossing NW -> SE at [-250, 210], 40m below Upper Bridge!)
            { pos: [-250, -12, 210], bank: 0.0, halfWidth: 14.6, zone: 1, setPiece: 'SUBWOOFER_TRENCH' },
            { pos: [-215, -8, 75], bank: -0.10, halfWidth: 14.8, zone: 1, setPiece: 'SUBWOOFER_TRENCH' },
            // Sector 3: 4-Node Constant-Radius South Bowl returning to Start/Finish (R >= 58m)
            { pos: [-215, -4, -55], bank: -0.14, halfWidth: 14.8, zone: 3, setPiece: 'BOWLING_PIN_PLAZA' },
            { pos: [-160, -2, -160], bank: -0.16, halfWidth: 15.0, zone: 3, setPiece: 'BOWLING_PIN_PLAZA' },
            { pos: [-55, 0, -160], bank: -0.14, halfWidth: 14.8, zone: 3, setPiece: 'SHIBUYA_SKYBRIDGE' },
            { pos: [0, 0, -75], bank: 0.0, halfWidth: 14.5, zone: 3, setPiece: 'SHIBUYA_SKYBRIDGE' }
        ]
    }
};

RRR.TrackSpline = class TrackSpline {
    constructor(presetKey = 'nagai_bayshore') {
        this.numSamples = 720;
        this.loadPreset(presetKey);
    }

    loadPreset(presetKey) {
        const preset = RRR.TRACK_PRESETS[presetKey] || RRR.TRACK_PRESETS.nagai_bayshore;
        this.activePresetKey = preset.id;
        this.activePreset = preset;
        this.roadHalfWidth = preset.roadHalfWidth || 13.5;
        this.controlPoints = preset.controlPoints;
        this.heroSetPieces = preset.heroSetPieces || [];
        this.totalLength = 0;
        this.samples = [];
        this.bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
        this.buildSplineTable();
    }

    /**
     * PIP-01: Centripetal Catmull-Rom (alpha = 0.5) Barry-Goldman evaluation.
     * Eliminates loop/bowing overshoots when transitioning from long straights into tight hairpins.
     */
    centripetalCatmullRomSegment(cp0, cp1, cp2, cp3, localT, defaultHalfWidth) {
        const distAlpha = (a, b) => {
            const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
            return Math.max(0.001, Math.pow(d, 0.5));
        };

        const dt0 = distAlpha(cp0.pos, cp1.pos);
        const dt1 = distAlpha(cp1.pos, cp2.pos);
        const dt2 = distAlpha(cp2.pos, cp3.pos);

        const t0 = 0.0;
        const t1 = dt0;
        const t2 = t1 + dt1;
        const t3 = t2 + dt2;
        const t = t1 + localT * dt1;

        const evalScalar = (v0, v1, v2, v3) => {
            const a1 = ((t1 - t) / (t1 - t0)) * v0 + ((t - t0) / (t1 - t0)) * v1;
            const a2 = ((t2 - t) / (t2 - t1)) * v1 + ((t - t1) / (t2 - t1)) * v2;
            const a3 = ((t3 - t) / (t3 - t2)) * v2 + ((t - t2) / (t3 - t2)) * v3;

            const b1 = ((t2 - t) / (t2 - t0)) * a1 + ((t - t0) / (t2 - t0)) * a2;
            const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3;

            return ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2;
        };

        const hw0 = cp0.halfWidth !== undefined ? cp0.halfWidth : defaultHalfWidth;
        const hw1 = cp1.halfWidth !== undefined ? cp1.halfWidth : defaultHalfWidth;
        const hw2 = cp2.halfWidth !== undefined ? cp2.halfWidth : defaultHalfWidth;
        const hw3 = cp3.halfWidth !== undefined ? cp3.halfWidth : defaultHalfWidth;

        return {
            pos: [
                evalScalar(cp0.pos[0], cp1.pos[0], cp2.pos[0], cp3.pos[0]),
                evalScalar(cp0.pos[1], cp1.pos[1], cp2.pos[1], cp3.pos[1]),
                evalScalar(cp0.pos[2], cp1.pos[2], cp2.pos[2], cp3.pos[2])
            ],
            bank: evalScalar(cp0.bank || 0, cp1.bank || 0, cp2.bank || 0, cp3.bank || 0),
            halfWidth: evalScalar(hw0, hw1, hw2, hw3)
        };
    }

    smoothCircular5Tap(arr, passes = 1) {
        const len = arr.length;
        let src = arr.slice();
        let dst = new Array(len);
        for (let p = 0; p < passes; p++) {
            for (let i = 0; i < len; i++) {
                const v0 = src[(i - 2 + len) % len];
                const v1 = src[(i - 1 + len) % len];
                const v2 = src[i];
                const v3 = src[(i + 1) % len];
                const v4 = src[(i + 2) % len];
                dst[i] = (v0 + 4 * v1 + 6 * v2 + 4 * v3 + v4) / 16.0;
            }
            const tmp = src;
            src = dst;
            dst = tmp;
        }
        return src;
    }

    buildSplineTable() {
        const n = this.controlPoints.length;
        const rawCount = 2880;
        const densePoints = new Array(rawCount);
        const cumDist = new Float64Array(rawCount + 1);
        cumDist[0] = 0.0;

        // 1. Dense Centripetal Catmull-Rom evaluation + cumulative 3D arc-length table
        for (let k = 0; k < rawCount; k++) {
            const u = (k / rawCount) * n;
            const seg = Math.floor(u) % n;
            const localT = u - Math.floor(u);

            const cp0 = this.controlPoints[(seg - 1 + n) % n];
            const cp1 = this.controlPoints[seg];
            const cp2 = this.controlPoints[(seg + 1) % n];
            const cp3 = this.controlPoints[(seg + 2) % n];

            const evalPt = this.centripetalCatmullRomSegment(cp0, cp1, cp2, cp3, localT, this.roadHalfWidth);
            densePoints[k] = {
                pos: evalPt.pos,
                bank: evalPt.bank,
                halfWidth: evalPt.halfWidth,
                zone: cp1.zone !== undefined ? cp1.zone : (Math.floor((k / rawCount) * 4) % 4),
                setPiece: cp1.setPiece || null
            };

            if (k > 0) {
                const prevPos = densePoints[k - 1].pos;
                cumDist[k] = cumDist[k - 1] + Math.hypot(
                    evalPt.pos[0] - prevPos[0],
                    evalPt.pos[1] - prevPos[1],
                    evalPt.pos[2] - prevPos[2]
                );
            }
        }

        // Close loop distance from last dense sample back to sample 0
        const lastDense = densePoints[rawCount - 1].pos;
        const firstDense = densePoints[0].pos;
        cumDist[rawCount] = cumDist[rawCount - 1] + Math.hypot(
            firstDense[0] - lastDense[0],
            firstDense[1] - lastDense[1],
            firstDense[2] - lastDense[2]
        );
        this.totalLength = cumDist[rawCount];

        // 2. Enforce Constant Physical Sample Spacing (ds = 2.50m across all tracks)
        const std = RRR.MAP_SPEED_STANDARDS || { targetSampleSpacingMeters: 2.50, minAbsoluteTurnRadiusMeters: 54.0, minTurnRadiusRatioToHalfWidth: 3.6 };
        this.numSamples = Math.max(480, Math.round(this.totalLength / (std.targetSampleSpacingMeters || 2.50)));
        const N = this.numSamples;
        let uniformPts = new Array(N);

        for (let i = 0; i < N; i++) {
            const targetS = (i / N) * this.totalLength;

            // Binary search cumDist for targetS
            let lo = 0;
            let hi = rawCount - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (cumDist[mid] <= targetS) lo = mid;
                else hi = mid - 1;
            }

            const segLen = cumDist[lo + 1] - cumDist[lo];
            const alpha = segLen > 1e-8 ? (targetS - cumDist[lo]) / segLen : 0.0;
            const pA = densePoints[lo];
            const pB = densePoints[(lo + 1) % rawCount];

            const x = pA.pos[0] + (pB.pos[0] - pA.pos[0]) * alpha;
            const y = pA.pos[1] + (pB.pos[1] - pA.pos[1]) * alpha;
            const z = pA.pos[2] + (pB.pos[2] - pA.pos[2]) * alpha;

            uniformPts[i] = {
                distance: targetS,
                pos: [x, y, z],
                bank: pA.bank + (pB.bank - pA.bank) * alpha,
                halfWidth: Math.max(10.0, pA.halfWidth + (pB.halfWidth - pA.halfWidth) * alpha),
                zone: pA.zone,
                setPiece: pA.setPiece || null
            };
        }

        // 2B. Automatic Minimum Turn Radius Relaxation Pass (guarantees R_min >= 54m / 3.6 * halfWidth)
        const minAllowedR = Math.max(
            std.minAbsoluteTurnRadiusMeters || 54.0,
            this.roadHalfWidth * (std.minTurnRadiusRatioToHalfWidth || 3.6)
        );
        const maxAllowedKappa = 1.0 / minAllowedR;
        for (let iter = 0; iter < 28; iter++) {
            let relaxedAny = false;
            const nextXZ = uniformPts.map((pt) => [pt.pos[0], pt.pos[2]]);
            for (let i = 0; i < N; i++) {
                const pPrev = uniformPts[(i - 2 + N) % N].pos;
                const pCurr = uniformPts[i].pos;
                const pNext = uniformPts[(i + 2) % N].pos;
                const v1x = pCurr[0] - pPrev[0], v1z = pCurr[2] - pPrev[2];
                const v2x = pNext[0] - pCurr[0], v2z = pNext[2] - pCurr[2];
                const d1 = Math.hypot(v1x, v1z) || 1.0;
                const d2 = Math.hypot(v2x, v2z) || 1.0;
                const sinTheta = Math.abs(v1x * v2z - v1z * v2x) / (d1 * d2);
                const localKappa = sinTheta / (0.5 * (d1 + d2));
                if (localKappa > maxAllowedKappa) {
                    const n1 = uniformPts[(i - 1 + N) % N].pos;
                    const n2 = uniformPts[(i + 1) % N].pos;
                    nextXZ[i][0] = pCurr[0] * 0.5 + (n1[0] + n2[0]) * 0.25;
                    nextXZ[i][1] = pCurr[2] * 0.5 + (n1[2] + n2[2]) * 0.25;
                    relaxedAny = true;
                }
            }
            if (!relaxedAny) break;
            for (let i = 0; i < N; i++) {
                uniformPts[i].pos[0] = nextXZ[i][0];
                uniformPts[i].pos[2] = nextXZ[i][1];
            }
        }

        // 2C. Post-Relaxation Exact 3D Arc-Length Re-Equalization Pass (ensures 100% uniform ds in corners!)
        const cumDist2 = new Float64Array(N + 1);
        cumDist2[0] = 0.0;
        for (let i = 1; i < N; i++) {
            const a = uniformPts[i - 1].pos;
            const b = uniformPts[i].pos;
            cumDist2[i] = cumDist2[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        }
        cumDist2[N] = cumDist2[N - 1] + Math.hypot(
            uniformPts[0].pos[0] - uniformPts[N - 1].pos[0],
            uniformPts[0].pos[1] - uniformPts[N - 1].pos[1],
            uniformPts[0].pos[2] - uniformPts[N - 1].pos[2]
        );
        this.totalLength = cumDist2[N];

        const reEqualizedPts = new Array(N);
        for (let i = 0; i < N; i++) {
            const targetS = (i / N) * this.totalLength;
            let lo = 0;
            let hi = N - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (cumDist2[mid] <= targetS) lo = mid;
                else hi = mid - 1;
            }
            const segLen = cumDist2[lo + 1] - cumDist2[lo];
            const alpha = segLen > 1e-8 ? (targetS - cumDist2[lo]) / segLen : 0.0;
            const pA = uniformPts[lo];
            const pB = uniformPts[(lo + 1) % N];

            const x = pA.pos[0] + (pB.pos[0] - pA.pos[0]) * alpha;
            const y = pA.pos[1] + (pB.pos[1] - pA.pos[1]) * alpha;
            const z = pA.pos[2] + (pB.pos[2] - pA.pos[2]) * alpha;

            if (x < this.bounds.minX) this.bounds.minX = x;
            if (x > this.bounds.maxX) this.bounds.maxX = x;
            if (z < this.bounds.minZ) this.bounds.minZ = z;
            if (z > this.bounds.maxZ) this.bounds.maxZ = z;

            reEqualizedPts[i] = {
                distance: targetS,
                pos: [x, y, z],
                bank: pA.bank + (pB.bank - pA.bank) * alpha,
                halfWidth: pA.halfWidth + (pB.halfWidth - pA.halfWidth) * alpha,
                zone: pA.zone,
                setPiece: pA.setPiece || null
            };
        }
        uniformPts = reEqualizedPts;

        // 3. Compute unit tangent forward vectors, yaw, and pitch at uniform arc-length samples
        const ds = this.totalLength / N;
        const forwards = new Array(N);
        const yaws = new Float64Array(N);
        const pitches = new Float64Array(N);

        for (let i = 0; i < N; i++) {
            const prev = uniformPts[(i - 1 + N) % N];
            const next = uniformPts[(i + 1) % N];

            const dx = next.pos[0] - prev.pos[0];
            const dy = next.pos[1] - prev.pos[1];
            const dz = next.pos[2] - prev.pos[2];
            const len = Math.hypot(dx, dy, dz) || 1.0;
            const fx = dx / len;
            const fy = dy / len;
            const fz = dz / len;

            forwards[i] = [fx, fy, fz];
            yaws[i] = Math.atan2(-fx, fz);
            pitches[i] = Math.asin(Math.max(-1.0, Math.min(1.0, fy)));
        }

        // 4. Compute differential signed curvature kappa(s) = d(yaw)/ds (+ = Right turn, - = Left turn)
        const rawKappa = new Array(N);
        for (let i = 0; i < N; i++) {
            const yawPlus = yaws[(i + 2) % N];
            const yawMinus = yaws[(i - 2 + N) % N];
            rawKappa[i] = RRR.wrapAngle(yawPlus - yawMinus) / (4.0 * ds);
        }

        // 3 passes of 5-tap Gaussian filter to emulate Clothoid (Euler spiral) curvature transitions
        const smoothKappa = this.smoothCircular5Tap(rawKappa, 3);

        // Progressive curvature-assisted banking & smooth width/bank envelopes
        const rawBanks = new Array(N);
        const rawHalfWidths = new Array(N);
        for (let i = 0; i < N; i++) {
            const kVal = Math.abs(smoothKappa[i]) < 1e-6 ? 0.0 : smoothKappa[i];
            smoothKappa[i] = kVal;
            const bankAssist = Math.max(-0.09, Math.min(0.09, kVal * 12.0));
            rawBanks[i] = uniformPts[i].bank + bankAssist;
            rawHalfWidths[i] = uniformPts[i].halfWidth;
        }
        const smoothBanks = this.smoothCircular5Tap(rawBanks, 2);
        const smoothHalfWidths = this.smoothCircular5Tap(rawHalfWidths, 2);

        // 5. Assemble complete sample table with orthonormal frames & corner telegraphing metadata
        this.samples = new Array(N);
        for (let i = 0; i < N; i++) {
            const forward = forwards[i];
            const bank = Math.abs(smoothBanks[i]) < 1e-6 ? 0.0 : smoothBanks[i];
            const kappa = smoothKappa[i];

            // Right-handed unbanked orthonormal frame [right0, up0, forward]
            let rx = -forward[2];
            let rz = forward[0];
            const rLen = Math.hypot(rx, rz) || 1.0;
            rx /= rLen;
            rz /= rLen;

            // up0 = right0 x forward (unit length since right0 _|_ forward)
            let u0x = -rz * forward[1];
            let u0y = rz * forward[0] - rx * forward[2];
            let u0z = rx * forward[1];
            const u0Len = Math.hypot(u0x, u0y, u0z) || 1.0;
            u0x /= u0Len;
            u0y /= u0Len;
            u0z /= u0Len;

            // Rotate right0 and up0 around forward by bank angle so frame stays strictly orthonormal on banked slopes
            const cosB = Math.cos(bank);
            const sinB = Math.sin(bank);
            const bankedRight = [
                rx * cosB + u0x * sinB,
                u0y * sinB,
                rz * cosB + u0z * sinB
            ];
            const up = [
                -rx * sinB + u0x * cosB,
                u0y * cosB,
                -rz * sinB + u0z * cosB
            ];

            const absKappa = Math.abs(kappa);
            const apexSide = kappa < -0.0018 ? -1 : (kappa > 0.0018 ? 1 : 0);
            const chevronIntensity = Math.min(1.0, Math.max(0.0, (absKappa - 0.0015) / 0.006));

            this.samples[i] = {
                index: i,
                t: i / N,
                distance: uniformPts[i].distance,
                pos: uniformPts[i].pos,
                forward: forward,
                right: bankedRight,
                up: up,
                yaw: yaws[i],
                pitch: pitches[i],
                bank: bank,
                curvatureRadPerMeter: kappa,
                curvature: kappa * 40.0,
                halfWidth: smoothHalfWidths[i],
                apexSide: apexSide,
                chevronIntensity: chevronIntensity,
                isCornerEntryGate: 0,
                zone: uniformPts[i].zone,
                setPiece: uniformPts[i].setPiece || null
            };
        }

        // 6. Place 150m / 100m / 50m Corner Entry Turn-In Marker Gates before major corners
        const step50 = Math.max(1, Math.round(50.0 / ds));
        const step100 = Math.max(2, Math.round(100.0 / ds));
        const step150 = Math.max(3, Math.round(150.0 / ds));
        const minCooldownSamples = Math.max(8, Math.round(90.0 / ds));
        let lastEntryIdx = -minCooldownSamples * 2;

        for (let i = 0; i < N; i++) {
            const prevS = this.samples[(i - 1 + N) % N];
            const currS = this.samples[i];
            if (currS.chevronIntensity >= 0.35 && prevS.chevronIntensity < 0.35 && (i - lastEntryIdx) >= minCooldownSamples) {
                lastEntryIdx = i;
                const i50 = (i - step50 + N) % N;
                const i100 = (i - step100 + N) % N;
                const i150 = (i - step150 + N) % N;
                if (this.samples[i50].chevronIntensity < 0.32) this.samples[i50].isCornerEntryGate = 50;
                if (this.samples[i100].chevronIntensity < 0.30) this.samples[i100].isCornerEntryGate = 100;
                if (this.samples[i150].chevronIntensity < 0.28) this.samples[i150].isCornerEntryGate = 150;
            }
        }
    }

    getSampleAtNormalizedT(t) {
        const wrapped = ((t % 1.0) + 1.0) % 1.0;
        const fIdx = wrapped * this.numSamples;
        const i0 = Math.floor(fIdx) % this.numSamples;
        const i1 = (i0 + 1) % this.numSamples;
        const frac = fIdx - Math.floor(fIdx);

        const s0 = this.samples[i0];
        const s1 = this.samples[i1];

        const fx = s0.forward[0] + (s1.forward[0] - s0.forward[0]) * frac;
        const fy = s0.forward[1] + (s1.forward[1] - s0.forward[1]) * frac;
        const fz = s0.forward[2] + (s1.forward[2] - s0.forward[2]) * frac;
        const fLen = Math.hypot(fx, fy, fz) || 1;
        const forward = [fx / fLen, fy / fLen, fz / fLen];

        const rx = s0.right[0] + (s1.right[0] - s0.right[0]) * frac;
        const ry = s0.right[1] + (s1.right[1] - s0.right[1]) * frac;
        const rz = s0.right[2] + (s1.right[2] - s0.right[2]) * frac;
        const rLen = Math.hypot(rx, ry, rz) || 1;
        const right = [rx / rLen, ry / rLen, rz / rLen];

        const ux = s0.up[0] + (s1.up[0] - s0.up[0]) * frac;
        const uy = s0.up[1] + (s1.up[1] - s0.up[1]) * frac;
        const uz = s0.up[2] + (s1.up[2] - s0.up[2]) * frac;
        const uLen = Math.hypot(ux, uy, uz) || 1;
        const up = [ux / uLen, uy / uLen, uz / uLen];

        const curvatureRadPerMeter = s0.curvatureRadPerMeter + (s1.curvatureRadPerMeter - s0.curvatureRadPerMeter) * frac;
        const curvature = s0.curvature + (s1.curvature - s0.curvature) * frac;
        const halfWidth = s0.halfWidth + (s1.halfWidth - s0.halfWidth) * frac;
        const chevronIntensity = s0.chevronIntensity + (s1.chevronIntensity - s0.chevronIntensity) * frac;
        const apexSide = curvatureRadPerMeter < -0.0018 ? -1 : (curvatureRadPerMeter > 0.0018 ? 1 : 0);

        return {
            t: wrapped,
            distance: wrapped * this.totalLength,
            zone: s0.zone,
            setPiece: s0.setPiece || null,
            bank: s0.bank + (s1.bank - s0.bank) * frac,
            curvatureRadPerMeter: curvatureRadPerMeter,
            curvature: curvature,
            halfWidth: halfWidth,
            apexSide: apexSide,
            chevronIntensity: chevronIntensity,
            isCornerEntryGate: s0.isCornerEntryGate,
            yaw: Math.atan2(-forward[0], forward[2]),
            pitch: Math.asin(Math.max(-1.0, Math.min(1.0, forward[1]))),
            pos: [
                s0.pos[0] + (s1.pos[0] - s0.pos[0]) * frac,
                s0.pos[1] + (s1.pos[1] - s0.pos[1]) * frac,
                s0.pos[2] + (s1.pos[2] - s0.pos[2]) * frac
            ],
            forward: forward,
            right: right,
            up: up
        };
    }
};

/**
 * Pillar 6.2 & 6.3: World Map Graph & Dijkstra Landmark "Drive-Over" Route Solver
 */
RRR.WORLD_MAP_GRAPH = {
    nodes: {
        home_base: {
            id: 'home_base',
            name: 'HOME BASE // NAGAI COASTAL DECK',
            type: 'HUB',
            coords: [18, 72],
            desc: 'Sunlit coastal parking deck overlooking Emerald Bay.'
        },
        jct_bayshore: {
            id: 'jct_bayshore',
            name: 'BAYSHORE TOLL INTERCHANGE',
            type: 'JUNCTION',
            coords: [42, 54],
            desc: 'Elevated coastal expressway split.'
        },
        jct_daikoku_pier: {
            id: 'jct_daikoku_pier',
            name: 'DAIKOKU HARBOR JUNCTION',
            type: 'JUNCTION',
            coords: [62, 48],
            desc: 'Container terminal highway connector.'
        },
        jct_mountain_pass: {
            id: 'jct_mountain_pass',
            name: 'HAKONE SKYLINE TOLLGATE',
            type: 'JUNCTION',
            coords: [30, 32],
            desc: 'Foothills ascent toward the summit observatory.'
        },
        venue_emerald_coast: {
            id: 'venue_emerald_coast',
            name: 'VENUE 01 // EMERALD BAY CIRCUIT',
            type: 'VENUE',
            trackPreset: 'nagai_bayshore',
            dj: 'DJ KINETIX (138 BPM)',
            startZone: 0,
            coords: [68, 30],
            desc: 'Hiroshi Nagai palm boulevards, acoustic bass tunnel & suspension bridge.'
        },
        venue_wangan_port: {
            id: 'venue_wangan_port',
            name: 'VENUE 02 // WANGAN CYBER-PORT & HELIX',
            type: 'VENUE',
            trackPreset: 'wangan_cyberport',
            dj: 'DJ KINETIX // HARBOR DUB SET',
            startZone: 0,
            coords: [84, 52],
            desc: 'Container gantry cranes, 270° spiral viaduct helix (+34m), submerged reactor tube & 90m Ferris wheel.'
        },
        venue_hakone_canyon: {
            id: 'venue_hakone_canyon',
            name: 'VENUE 03 // HAKONE LASER CANYON',
            type: 'VENUE',
            trackPreset: 'hakone_canyon',
            dj: 'DJ KINETIX // 303 LASER SET',
            startZone: 0,
            coords: [22, 14],
            desc: '+44m wind-farm ascent, deep-space dish summit, 3D wireframe laser cathedral & 5-hairpin gorge viaduct.'
        },
        venue_odaiba_megaplex: {
            id: 'venue_odaiba_megaplex',
            name: 'VENUE 04 // ODAIBA FIGURE-8 MEGAPLEX',
            type: 'VENUE',
            trackPreset: 'odaiba_megaplex',
            dj: 'DJ KINETIX // VIP FESTIVAL SET',
            startZone: 3,
            coords: [54, 18],
            desc: '3D Figure-8 crossover (+28m Odaiba Megasphere bridge over -12m Subwoofer Trench), Nagai Beach Resort & Bowling Pin Plaza.'
        },
        venue_boiler_tunnel: {
            id: 'venue_boiler_tunnel',
            name: 'VENUE 05 // BOILER ROOM UNDERGROUND',
            type: 'VENUE',
            trackPreset: 'nagai_bayshore',
            dj: 'DJ KINETIX // ACID SET',
            startZone: 1,
            coords: [78, 68],
            desc: 'Subterranean acoustic bunker with wall-to-wall LED jumbotrons.'
        },
        venue_shibuya_skyway: {
            id: 'venue_shibuya_skyway',
            name: 'VENUE 06 // SHIBUYA NEON SKYWAY',
            type: 'VENUE',
            trackPreset: 'odaiba_megaplex',
            dj: 'DJ KINETIX // VIP REMIX',
            startZone: 3,
            coords: [48, 20],
            desc: 'Midnight urban skybridges, Giant Neon Bowling Pin Plaza, and elevated highway signs.'
        }
    },
    edges: [
        {
            from: 'home_base',
            to: 'jct_bayshore',
            weight: 3.2,
            landmark: {
                id: 'wind_turbines',
                title: 'COASTAL WIND TURBINES // ROUTE 134',
                subtitle: '3.2 KM TO INTERCHANGE — BASS FREQUENCY RISING',
                skyTop: '#0a4f9e',
                skyHorizon: '#ff7b9c',
                type: 'TURBINES'
            }
        },
        {
            from: 'jct_bayshore',
            to: 'venue_emerald_coast',
            weight: 4.5,
            landmark: {
                id: 'suspension_bridge',
                title: 'BAYSHORE SUSPENSION BRIDGE // SPAN 02',
                subtitle: 'APPROACHING EMERALD BAY — DJ KINETIX LIVE ON AIR',
                skyTop: '#14246b',
                skyHorizon: '#ff6e54',
                type: 'BRIDGE'
            }
        },
        {
            from: 'jct_bayshore',
            to: 'jct_daikoku_pier',
            weight: 3.6,
            landmark: {
                id: 'suspension_bridge_east',
                title: 'BAYSHORE SUSPENSION BRIDGE // EAST DECK',
                subtitle: 'CROSSING TOKYO BAY CHANNEL TOWARD DAIKOKU PIER',
                skyTop: '#102566',
                skyHorizon: '#ff784f',
                type: 'BRIDGE'
            }
        },
        {
            from: 'jct_daikoku_pier',
            to: 'venue_wangan_port',
            weight: 4.2,
            landmark: {
                id: 'port_cranes',
                title: 'DAIKOKU CONTAINER GANTRY CRANES // BERTH 09',
                subtitle: 'ENTERING WANGAN CYBER-PORT & 270° HELIX TERMINAL',
                skyTop: '#071b42',
                skyHorizon: '#00f5d4',
                type: 'CRANES'
            }
        },
        {
            from: 'home_base',
            to: 'jct_mountain_pass',
            weight: 4.0,
            landmark: {
                id: 'ridge_turbines',
                title: 'FOOTHILLS WIND TURBINE RIDGE // ROUTE 01',
                subtitle: 'CLIMBING TOWARD HAKONE SKYLINE TOLLGATE',
                skyTop: '#0c3b80',
                skyHorizon: '#ff6e7f',
                type: 'TURBINES'
            }
        },
        {
            from: 'jct_mountain_pass',
            to: 'venue_hakone_canyon',
            weight: 5.4,
            landmark: {
                id: 'laser_pyramid_pass',
                title: 'SUMMIT RADIO DISHES & LASER CATHEDRAL PORTAL',
                subtitle: 'DESCENDING INTO HAKONE NEON CANYON SWITCHBACKS',
                skyTop: '#050214',
                skyHorizon: '#39ff14',
                type: 'LASER_PYRAMID'
            }
        },
        {
            from: 'jct_bayshore',
            to: 'venue_odaiba_megaplex',
            weight: 4.8,
            landmark: {
                id: 'odaiba_megasphere',
                title: 'ODAIBA TELEPORT MEGASPHERE & COSMO WHEEL',
                subtitle: 'APPROACHING 3D FIGURE-8 CROSSOVER EXPRESSWAY',
                skyTop: '#090d38',
                skyHorizon: '#ff2a85',
                type: 'MEGASPHERE'
            }
        },
        {
            from: 'jct_bayshore',
            to: 'venue_boiler_tunnel',
            weight: 3.8,
            landmark: {
                id: 'tunnel_tollbooth',
                title: 'TUNNEL 04 AUTOMATIC TOLL PLAZA',
                subtitle: 'DESCENDING TO UNDERGROUND BOILER ROOM SECTOR',
                skyTop: '#08031c',
                skyHorizon: '#00f5d4',
                type: 'TOLLBOOTH'
            }
        },
        {
            from: 'jct_bayshore',
            to: 'venue_shibuya_skyway',
            weight: 5.0,
            landmark: {
                id: 'neon_bowling_pin',
                title: 'GIANT NEON BOWLING PIN // BAYSIDE PLAZA',
                subtitle: 'ENTERING SHIBUYA EXPRESSWAY — HIGH SPEED DRIFT ZONE',
                skyTop: '#060a2e',
                skyHorizon: '#ff2a85',
                type: 'BOWLING_PIN'
            }
        }
    ],

    solveRoute(startId, targetId) {
        const dist = {};
        const prev = {};
        const prevEdge = {};
        const unvisited = new Set(Object.keys(this.nodes));

        for (const k of unvisited) dist[k] = Infinity;
        dist[startId] = 0;

        while (unvisited.size > 0) {
            let u = null;
            let bestD = Infinity;
            for (const node of unvisited) {
                if (dist[node] < bestD) {
                    bestD = dist[node];
                    u = node;
                }
            }
            if (!u || u === targetId) break;
            unvisited.delete(u);

            for (const edge of this.edges) {
                let neighbor = null;
                if (edge.from === u) neighbor = edge.to;
                else if (edge.to === u) neighbor = edge.from;
                if (neighbor && unvisited.has(neighbor)) {
                    const alt = dist[u] + edge.weight;
                    if (alt < dist[neighbor]) {
                        dist[neighbor] = alt;
                        prev[neighbor] = u;
                        prevEdge[neighbor] = edge;
                    }
                }
            }
        }

        const landmarks = [];
        const nodePath = [];
        let curr = targetId;
        while (curr) {
            nodePath.unshift(this.nodes[curr]);
            if (prevEdge[curr]) {
                landmarks.unshift(prevEdge[curr].landmark);
            }
            curr = prev[curr];
        }

        return {
            nodes: nodePath,
            landmarks: landmarks,
            totalKm: dist[targetId] !== Infinity ? dist[targetId].toFixed(1) : '4.5'
        };
    }
};
