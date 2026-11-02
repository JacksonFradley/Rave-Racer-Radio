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
        roadHalfWidth: 15.0,
        controlPoints: [
            // 750m Dead-Straight Main Runway along +Z (X = 0 across P_last..P_4 so curvature is strictly 0.000 at start!)
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, 150], bank: 0.0, halfWidth: 14.0, zone: 0 },
            { pos: [0, 0, 300], bank: 0.0, halfWidth: 13.5, zone: 0 },
            { pos: [0, 0, 450], bank: 0.0, halfWidth: 13.0, zone: 1 },
            { pos: [0, 0, 600], bank: 0.0, halfWidth: 13.5, zone: 1 },
            { pos: [0, 0, 750], bank: 0.0, halfWidth: 15.5, zone: 2 },
            // Wide gentle turnaround loop back to start
            { pos: [-120, 0, 880], bank: 0.06, halfWidth: 17.0, zone: 2 },
            { pos: [-260, 0, 750], bank: 0.04, halfWidth: 16.0, zone: 2 },
            { pos: [-260, 0, 350], bank: 0.0, halfWidth: 13.5, zone: 3 },
            { pos: [-260, 0, -180], bank: 0.0, halfWidth: 15.0, zone: 3 },
            { pos: [-130, 0, -320], bank: 0.06, halfWidth: 16.8, zone: 0 },
            { pos: [0, 0, -220], bank: 0.0, halfWidth: 15.0, zone: 0 },
            { pos: [0, 0, -110], bank: 0.0, halfWidth: 14.8, zone: 0 }
        ]
    },

    drift_skidpad: {
        id: 'drift_skidpad',
        name: 'TRACK 02 // R4 DRIFT SKIDPAD & HAIRPIN ARENA',
        subtitle: 'Wide Constant-Radius Drift Curves + 180° Hairpins + Chicane',
        desc: 'Designed to tune R4 drift initiation, slip angles (15°–48°), centrifugal corner push, drift charge rate, and boost exits.',
        roadHalfWidth: 15.0,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 13.5, zone: 0 },
            { pos: [0, 0, 120], bank: 0.0, halfWidth: 15.2, zone: 0 },
            // Long sweeping Right drift arc (widened apex for deep slip angles)
            { pos: [-70, 0, 230], bank: 0.12, halfWidth: 16.8, zone: 1 },
            { pos: [-190, 0, 230], bank: 0.14, halfWidth: 17.2, zone: 1 },
            { pos: [-260, 0, 120], bank: 0.12, halfWidth: 16.0, zone: 1 },
            // S-Chicane transition
            { pos: [-210, 0, 10], bank: -0.10, halfWidth: 15.2, zone: 2 },
            { pos: [-270, 0, -100], bank: 0.12, halfWidth: 15.8, zone: 2 },
            // Tight 180° Hairpin Left (wide entry funnel + wide drift apex)
            { pos: [-160, 0, -210], bank: -0.16, halfWidth: 17.0, zone: 3 },
            { pos: [-30, 0, -160], bank: 0.10, halfWidth: 15.5, zone: 3 },
            { pos: [0, 0, -80], bank: 0.0, halfWidth: 13.8, zone: 0 }
        ]
    },

    elevation_bank: {
        id: 'elevation_bank',
        name: 'TRACK 03 // ELEVATION & BANKING ROLLERCOASTER',
        subtitle: 'Steep +28m Climb, Blind Crest, Plunge & High-Banked Bowl',
        desc: 'Tests 3D surface normal alignment, uphill/downhill camera pitch tracking, and banked corner roll.',
        roadHalfWidth: 14.0,
        controlPoints: [
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 13.0, zone: 0 },
            { pos: [0, 14, 130], bank: 0.0, halfWidth: 12.6, zone: 0 },
            { pos: [0, 28, 250], bank: 0.0, halfWidth: 14.2, zone: 2 },
            { pos: [-90, 18, 360], bank: 0.24, halfWidth: 16.5, zone: 2 },
            { pos: [-220, -8, 310], bank: 0.28, halfWidth: 16.8, zone: 1 },
            { pos: [-280, -14, 160], bank: -0.22, halfWidth: 15.8, zone: 1 },
            { pos: [-220, 6, 20], bank: 0.18, halfWidth: 15.2, zone: 3 },
            { pos: [-100, 12, -100], bank: 0.22, halfWidth: 16.2, zone: 3 },
            { pos: [-15, 2, -90], bank: 0.08, halfWidth: 13.8, zone: 0 }
        ]
    },

    nagai_bayshore: {
        id: 'nagai_bayshore',
        name: 'TRACK 04 // FULL NAGAI BAYSHORE CIRCUIT',
        subtitle: 'Complete 4-Sector Circuit (Palms → Bass Tunnel → Bridge → Shibuya)',
        desc: 'The full race course with all 4 Track Vibe Zones, trackside DJ Jumbotrons, and 3 AI Rivals.',
        roadHalfWidth: 13.5,
        controlPoints: [
            // Sector 0: Emerald Coast Palms (narrow fast straight into wide coastal sweep)
            { pos: [0, 0, 0], bank: 0.0, halfWidth: 12.4, zone: 0 },
            { pos: [0, 0, 140], bank: 0.0, halfWidth: 12.2, zone: 0 },
            { pos: [-35, 2, 270], bank: 0.08, halfWidth: 14.8, zone: 0 },
            { pos: [-130, 5, 360], bank: 0.14, halfWidth: 16.4, zone: 0 },
            // Sector 1: Boiler Room Bass Tunnel (sweeping acoustic S-bends)
            { pos: [-260, 2, 380], bank: 0.08, halfWidth: 15.2, zone: 1 },
            { pos: [-380, -6, 320], bank: -0.12, halfWidth: 16.0, zone: 1 },
            { pos: [-450, -10, 200], bank: 0.14, halfWidth: 16.6, zone: 1 },
            { pos: [-440, -6, 60], bank: 0.10, halfWidth: 14.8, zone: 1 },
            // Sector 2: Bayshore Suspension Bridge (high-speed decompression straight)
            { pos: [-360, 8, -70], bank: -0.06, halfWidth: 13.6, zone: 2 },
            { pos: [-270, 16, -185], bank: 0.0, halfWidth: 12.2, zone: 2 },
            { pos: [-160, 16, -255], bank: 0.0, halfWidth: 12.2, zone: 2 },
            { pos: [-45, 10, -250], bank: 0.08, halfWidth: 15.2, zone: 2 },
            // Sector 3: Shibuya Neon Hairpins (wide entry funnel & smooth S-curve return to main straight)
            { pos: [45, 4, -195], bank: 0.16, halfWidth: 16.6, zone: 3 },
            { pos: [60, 0, -125], bank: 0.18, halfWidth: 17.0, zone: 3 },
            { pos: [18, 0, -65], bank: 0.10, halfWidth: 15.4, zone: 3 }
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
                zone: cp1.zone !== undefined ? cp1.zone : (Math.floor((k / rawCount) * 4) % 4)
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

        // 2. Resample strictly uniform 3D arc-length intervals across this.numSamples = 720
        const N = this.numSamples;
        const uniformPts = new Array(N);

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

            if (x < this.bounds.minX) this.bounds.minX = x;
            if (x > this.bounds.maxX) this.bounds.maxX = x;
            if (z < this.bounds.minZ) this.bounds.minZ = z;
            if (z > this.bounds.maxZ) this.bounds.maxZ = z;

            uniformPts[i] = {
                distance: targetS,
                pos: [x, y, z],
                bank: pA.bank + (pB.bank - pA.bank) * alpha,
                halfWidth: Math.max(10.0, pA.halfWidth + (pB.halfWidth - pA.halfWidth) * alpha),
                zone: pA.zone
            };
        }

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

            // Right-handed Right vector: forward x worldUp(0, 1, 0) = [-forward.z, 0, forward.x]
            let rx = -forward[2];
            let rz = forward[0];
            const rLen = Math.hypot(rx, rz) || 1.0;
            rx /= rLen;
            rz /= rLen;

            const cosB = Math.cos(bank);
            const sinB = Math.sin(bank);
            const bankedRight = [rx * cosB, sinB, rz * cosB];

            const up = [
                bankedRight[1] * forward[2] - bankedRight[2] * forward[1],
                bankedRight[2] * forward[0] - bankedRight[0] * forward[2],
                bankedRight[0] * forward[1] - bankedRight[1] * forward[0]
            ];
            const uLen = Math.hypot(up[0], up[1], up[2]) || 1.0;
            up[0] /= uLen;
            up[1] /= uLen;
            up[2] /= uLen;

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
                zone: uniformPts[i].zone
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
