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

RRR.TRACK_PRESETS = {
    straight_drag: {
        id: 'straight_drag',
        name: 'TRACK 01 // STRAIGHTAWAY & DRAG RUNWAY',
        subtitle: 'Zero-Curvature 600m Straight + Wide Turnaround Loop',
        desc: 'Isolates W/S acceleration, A/D lane changes, guardrail slides, FOV warp, and high-speed Paint Smudge without corner curvature.',
        roadHalfWidth: 16.0,
        controlPoints: [
            // 750m Dead-Straight Main Runway along +Z (X = 0 across P_last..P_4 so curvature is strictly 0.000 at start!)
            { pos: [0, 0, 0], bank: 0.0, zone: 0 },
            { pos: [0, 0, 150], bank: 0.0, zone: 0 },
            { pos: [0, 0, 300], bank: 0.0, zone: 0 },
            { pos: [0, 0, 450], bank: 0.0, zone: 1 },
            { pos: [0, 0, 600], bank: 0.0, zone: 1 },
            { pos: [0, 0, 750], bank: 0.0, zone: 2 },
            // Wide gentle turnaround loop back to start
            { pos: [-120, 0, 880], bank: 0.05, zone: 2 },
            { pos: [-260, 0, 750], bank: 0.0, zone: 2 },
            { pos: [-260, 0, 350], bank: 0.0, zone: 3 },
            { pos: [-260, 0, -150], bank: 0.0, zone: 3 },
            { pos: [-120, 0, -280], bank: 0.05, zone: 0 },
            { pos: [0, 0, -150], bank: 0.0, zone: 0 }
        ]
    },

    drift_skidpad: {
        id: 'drift_skidpad',
        name: 'TRACK 02 // R4 DRIFT SKIDPAD & HAIRPIN ARENA',
        subtitle: 'Wide Constant-Radius Drift Curves + 180° Hairpins + Chicane',
        desc: 'Designed to tune R4 drift initiation, slip angles (15°–48°), centrifugal corner push, drift charge rate, and boost exits.',
        roadHalfWidth: 15.0,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, zone: 0 },
            { pos: [0, 0, 120], bank: 0.0, zone: 0 },
            // Long sweeping Right drift arc
            { pos: [-70, 0, 230], bank: 0.12, zone: 1 },
            { pos: [-190, 0, 230], bank: 0.14, zone: 1 },
            { pos: [-260, 0, 120], bank: 0.12, zone: 1 },
            // S-Chicane transition
            { pos: [-210, 0, 10], bank: -0.10, zone: 2 },
            { pos: [-270, 0, -100], bank: 0.12, zone: 2 },
            // Tight 180° Hairpin Left
            { pos: [-160, 0, -210], bank: -0.16, zone: 3 },
            { pos: [-30, 0, -160], bank: 0.10, zone: 3 },
            { pos: [0, 0, -80], bank: 0.0, zone: 0 }
        ]
    },

    elevation_bank: {
        id: 'elevation_bank',
        name: 'TRACK 03 // ELEVATION & BANKING ROLLERCOASTER',
        subtitle: 'Steep +28m Climb, Blind Crest, Plunge & High-Banked Bowl',
        desc: 'Tests 3D surface normal alignment, uphill/downhill camera pitch tracking, and banked corner roll.',
        roadHalfWidth: 13.5,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, zone: 0 },
            { pos: [0, 14, 130], bank: 0.0, zone: 0 },
            { pos: [0, 28, 250], bank: 0.0, zone: 2 },
            { pos: [-90, 18, 360], bank: 0.24, zone: 2 },
            { pos: [-220, -8, 310], bank: 0.28, zone: 1 },
            { pos: [-280, -14, 160], bank: -0.22, zone: 1 },
            { pos: [-220, 6, 20], bank: 0.18, zone: 3 },
            { pos: [-100, 12, -100], bank: 0.22, zone: 3 },
            { pos: [-15, 2, -90], bank: 0.08, zone: 0 }
        ]
    },

    nagai_bayshore: {
        id: 'nagai_bayshore',
        name: 'TRACK 04 // FULL NAGAI BAYSHORE CIRCUIT',
        subtitle: 'Complete 4-Sector Circuit (Palms → Bass Tunnel → Bridge → Shibuya)',
        desc: 'The full race course with all 4 Track Vibe Zones, trackside DJ Jumbotrons, and 3 AI Rivals.',
        roadHalfWidth: 12.5,
        controlPoints: [
            // Sector 0: Emerald Coast Palms
            { pos: [0, 0, 0], bank: 0.0, zone: 0 },
            { pos: [0, 0, 140], bank: 0.0, zone: 0 },
            { pos: [-35, 2, 270], bank: 0.08, zone: 0 },
            { pos: [-130, 5, 360], bank: 0.14, zone: 0 },
            // Sector 1: Boiler Room Bass Tunnel
            { pos: [-260, 2, 380], bank: 0.08, zone: 1 },
            { pos: [-380, -6, 320], bank: -0.12, zone: 1 },
            { pos: [-450, -10, 200], bank: 0.14, zone: 1 },
            { pos: [-440, -6, 60], bank: 0.10, zone: 1 },
            // Sector 2: Bayshore Suspension Bridge
            { pos: [-360, 8, -70], bank: -0.06, zone: 2 },
            { pos: [-240, 16, -160], bank: 0.0, zone: 2 },
            { pos: [-90, 16, -210], bank: 0.0, zone: 2 },
            { pos: [60, 10, -210], bank: 0.08, zone: 2 },
            // Sector 3: Shibuya Neon Hairpins
            { pos: [175, 4, -140], bank: 0.18, zone: 3 },
            { pos: [200, 0, -10], bank: 0.18, zone: 3 },
            { pos: [110, 0, 65], bank: -0.12, zone: 3 },
            { pos: [20, 0, -90], bank: 0.08, zone: 3 }
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
        this.roadHalfWidth = preset.roadHalfWidth || 12.5;
        this.controlPoints = preset.controlPoints;
        this.totalLength = 0;
        this.samples = [];
        this.bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
        this.buildSplineTable();
    }

    catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return 0.5 * (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    }

    buildSplineTable() {
        const n = this.controlPoints.length;
        const rawPoints = [];

        for (let i = 0; i < this.numSamples; i++) {
            const u = (i / this.numSamples) * n;
            const seg = Math.floor(u) % n;
            const localT = u - Math.floor(u);

            const cp0 = this.controlPoints[(seg - 1 + n) % n];
            const cp1 = this.controlPoints[seg];
            const cp2 = this.controlPoints[(seg + 1) % n];
            const cp3 = this.controlPoints[(seg + 2) % n];

            const x = this.catmullRom(cp0.pos[0], cp1.pos[0], cp2.pos[0], cp3.pos[0], localT);
            const y = this.catmullRom(cp0.pos[1], cp1.pos[1], cp2.pos[1], cp3.pos[1], localT);
            const z = this.catmullRom(cp0.pos[2], cp1.pos[2], cp2.pos[2], cp3.pos[2], localT);
            const bank = this.catmullRom(cp0.bank, cp1.bank, cp2.bank, cp3.bank, localT);

            if (x < this.bounds.minX) this.bounds.minX = x;
            if (x > this.bounds.maxX) this.bounds.maxX = x;
            if (z < this.bounds.minZ) this.bounds.minZ = z;
            if (z > this.bounds.maxZ) this.bounds.maxZ = z;

            rawPoints.push({
                pos: [x, y, z],
                bank: bank,
                zone: cp1.zone
            });
        }

        this.totalLength = 0;
        for (let i = 0; i < this.numSamples; i++) {
            const prev = rawPoints[(i - 1 + this.numSamples) % this.numSamples];
            const curr = rawPoints[i];
            const next = rawPoints[(i + 1) % this.numSamples];

            const dx = next.pos[0] - prev.pos[0];
            const dy = next.pos[1] - prev.pos[1];
            const dz = next.pos[2] - prev.pos[2];
            const len = Math.hypot(dx, dy, dz) || 1;
            const forward = [dx / len, dy / len, dz / len];

            // Right-handed Right vector: forward x worldUp(0, 1, 0) = [-forward.z, 0, forward.x]
            let rx = -forward[2];
            let ry = 0;
            let rz = forward[0];
            const rLen = Math.hypot(rx, rz) || 1;
            rx /= rLen;
            rz /= rLen;

            const cosB = Math.cos(curr.bank);
            const sinB = Math.sin(curr.bank);
            const bankedRight = [rx * cosB, sinB, rz * cosB];

            const up = [
                bankedRight[1] * forward[2] - bankedRight[2] * forward[1],
                bankedRight[2] * forward[0] - bankedRight[0] * forward[2],
                bankedRight[0] * forward[1] - bankedRight[1] * forward[0]
            ];

            if (i > 0) {
                const p0 = rawPoints[i - 1].pos;
                this.totalLength += Math.hypot(
                    curr.pos[0] - p0[0],
                    curr.pos[1] - p0[1],
                    curr.pos[2] - p0[2]
                );
            }

            const yaw = Math.atan2(-forward[0], forward[2]);

            this.samples.push({
                index: i,
                t: i / this.numSamples,
                distance: this.totalLength,
                pos: curr.pos,
                forward: forward,
                right: bankedRight,
                up: up,
                yaw: yaw,
                bank: curr.bank,
                zone: curr.zone !== undefined ? curr.zone : (Math.floor((i / this.numSamples) * 4) % 4)
            });
        }

        // Compute signed curvature (+ = Right turn ahead, - = Left turn ahead)
        for (let i = 0; i < this.numSamples; i++) {
            const s0 = this.samples[i];
            const s1 = this.samples[(i + 8) % this.numSamples];
            s0.curvature = RRR.wrapAngle(s1.yaw - s0.yaw);
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

        return {
            t: wrapped,
            zone: s0.zone,
            bank: s0.bank + (s1.bank - s0.bank) * frac,
            curvature: s0.curvature + (s1.curvature - s0.curvature) * frac,
            yaw: Math.atan2(-forward[0], forward[2]),
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

    getNearestPoint(pos, hintIndex = -1) {
        let bestIdx = 0;
        let bestDistSq = Infinity;

        if (hintIndex >= 0) {
            const window = 40;
            for (let offset = -window; offset <= window; offset++) {
                const idx = (hintIndex + offset + this.numSamples) % this.numSamples;
                const s = this.samples[idx];
                const dx = pos[0] - s.pos[0];
                const dz = pos[2] - s.pos[2];
                const d2 = dx * dx + dz * dz;
                if (d2 < bestDistSq) {
                    bestDistSq = d2;
                    bestIdx = idx;
                }
            }
        } else {
            for (let i = 0; i < this.numSamples; i++) {
                const s = this.samples[i];
                const dx = pos[0] - s.pos[0];
                const dz = pos[2] - s.pos[2];
                const d2 = dx * dx + dz * dz;
                if (d2 < bestDistSq) {
                    bestDistSq = d2;
                    bestIdx = i;
                }
            }
        }

        const discreteSample = this.samples[bestIdx];
        const relX = pos[0] - discreteSample.pos[0];
        const relZ = pos[2] - discreteSample.pos[2];

        const alongMeters = relX * discreteSample.forward[0] + relZ * discreteSample.forward[2];
        const continuousT = ((discreteSample.t + (alongMeters / this.totalLength)) % 1.0 + 1.0) % 1.0;
        const interpSample = this.getSampleAtNormalizedT(continuousT);

        const exactRelX = pos[0] - interpSample.pos[0];
        const exactRelZ = pos[2] - interpSample.pos[2];
        const lateralOffset = exactRelX * interpSample.right[0] + exactRelZ * interpSample.right[2];

        return {
            sampleIndex: bestIdx,
            t: continuousT,
            sample: interpSample,
            lateralOffset: lateralOffset,
            distSq: bestDistSq
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
        venue_emerald_coast: {
            id: 'venue_emerald_coast',
            name: 'VENUE 01 // EMERALD BAY CIRCUIT',
            type: 'VENUE',
            dj: 'DJ KINETIX (138 BPM)',
            startZone: 0,
            coords: [68, 30],
            desc: 'Hiroshi Nagai palm boulevards, acoustic bass tunnel & suspension bridge.'
        },
        venue_boiler_tunnel: {
            id: 'venue_boiler_tunnel',
            name: 'VENUE 02 // BOILER ROOM UNDERGROUND',
            type: 'VENUE',
            dj: 'DJ KINETIX // ACID SET',
            startZone: 1,
            coords: [78, 68],
            desc: 'Subterranean acoustic bunker with wall-to-wall LED jumbotrons.'
        },
        venue_shibuya_skyway: {
            id: 'venue_shibuya_skyway',
            name: 'VENUE 03 // SHIBUYA NEON SKYWAY',
            type: 'VENUE',
            dj: 'DJ KINETIX // VIP REMIX',
            startZone: 3,
            coords: [48, 20],
            desc: 'Midnight urban hairpins and elevated highway signs.'
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
                subtitle: '3.2 KM TO VENUE — BASS FREQUENCY RISING',
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
