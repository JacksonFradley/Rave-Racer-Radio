/**
 * RAVE RACER REMIX — Pillar 2.1, 2.2, 2.3 & 7.1:
 * WebGL2 Rendering Engine:
 *  - Hiroshi Nagai Quantized Skybox + Stepped Cel-Shading (Zero soft gradients, cool indigo shadows)
 *  - Auto Modellista 3D Sports Cars (Inverted-Hull Ink Outlines + View-Space Matcap Streaks + Vibe Shading)
 *  - Trackside Boiler Room LED Jumbotrons sampling live DJ RenderTexture
 *  - Ping-Pong Temporal "Paint Smudge" + Kuwahara Oil-Paint + Redline Speed-Line Post-Processing Pass
 */
window.RRR = window.RRR || {};

RRR.WebGLRenderer = class WebGLRenderer {
    constructor(canvas, trackSpline) {
        this.canvas = canvas;
        this.trackSpline = trackSpline;
        this.gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true });
        if (!this.gl) {
            console.error('WebGL2 not available');
            return;
        }

        // User-tunable shader & camera settings (exposed in Live Tuning Drawer)
        this.settings = {
            jsrPixelDither: 0.90,      // JSR x Nam_Mac Point-Filtered Texel Snap + Bayer 4x4 Shadow Halftone Dither
            facetCreaseInk: 0.92,      // Pixel_Tempys Grease-Pencil Internal Facet & Panel Seam Ink Lines
            smudgeIntensity: 0.85,
            smudgeThreshold: 0.58,
            kuwaharaStrength: 0.75,
            inkOutlineStrength: 0.95,
            speedLinesIntensity: 0.85,
            taillightTrailsIntensity: 1.0,
            cameraDriftSwing: 1.0,
            fovBase: 62.0,
            fovMax: 108.0,
            audioReactivity: 1.0
        };

        // Camera state (Pillar 1.3 & PIP-03: Dynamic Sense-of-Speed Camera + Dev Inspection Modes)
        this.cameraMode = 'FOLLOW'; // 'FOLLOW' | 'ORBIT_CAR' | 'TOP_DOWN' | 'JUMBOTRON_STAGE'
        this.orbitYaw = 0.55;
        this.orbitPitch = 0.28;
        this.orbitDist = 5.8;
        this.orbitAutoRotate = false;
        this.showDebugVectors = false;
        this.debugBufferMode = 0;   // 0 = Final Composite, 1 = Raw Scene FBO, 2 = Smudge History Buffer

        this.camPos = [0, 4, -8];
        this.camTarget = [0, 2, 10];
        this.camUp = [0, 1, 0];
        this.currentFov = 62.0;
        this.currentDutchRoll = 0.0;
        this.camSpringLag = 0.0;
        this.camSpringLagVel = 0.0;
        this.camLateralOffset = 0.0;
        this.camLateralVel = 0.0;
        this.camPitchOffset = 0.0;
        this.camPitchVel = 0.0;
        this.prevCarGear = 1;
        this.prevBoostTimer = 0.0;
        this.prevYaw = 0.0;
        this.angularVelYaw = 0.0;
        this.screenShake = 0.0;
        this.vanishingPointUV = [0.5, 0.44];

        // Stylized VFX Particles, 3D R4 Taillight Ribbons & Frustum Wind Streaks
        this.particles = [];
        this.maxParticles = 180;
        this.carTrails = {};
        this.windStreaks = [];

        this.width = 0;
        this.height = 0;
        this.pingPongIndex = 0;
        this.time = 0;
        this.djTexWidth = 0;
        this.djTexHeight = 0;

        // Pre-allocated scratch matrices & dynamic vertex buffers (zero per-frame GC allocations)
        this._identityMat = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
        this._viewProjMat = new Float32Array(16);
        this._carMat = new Float32Array(16);
        this._wheelLocalMat = new Float32Array(16);
        this._wheelWorldMat = new Float32Array(16);
        this._offsetLocalMat = new Float32Array(16);
        this._offsetWorldMat = new Float32Array(16);
        this._tempMat = new Float32Array(16);
        this._trailBuffer = new Float32Array(28 * 4 * 2 * 6 * 12);

        this.initShaders();
        this.initMeshes();
        this.initTextures();
        this.resize();
    }

    compileShader(type, source) {
        const gl = this.gl;
        const sh = gl.createShader(type);
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(sh), source);
        }
        return sh;
    }

    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const prog = gl.createProgram();
        gl.attachShader(prog, this.compileShader(gl.VERTEX_SHADER, vsSource));
        gl.attachShader(prog, this.compileShader(gl.FRAGMENT_SHADER, fsSource));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
        }
        prog._uCache = {};
        return prog;
    }

    uLoc(prog, name) {
        let loc = prog._uCache[name];
        if (loc === undefined) {
            loc = this.gl.getUniformLocation(prog, name);
            prog._uCache[name] = loc;
        }
        return loc;
    }

    initShaders() {
        const gl = this.gl;

        // 1. HIROSHI NAGAI QUANTIZED SKYBOX & OCEAN HORIZON SHADER
        const skyVS = `#version 300 es
        layout(location = 0) in vec2 a_pos;
        out vec2 v_uv;
        void main() {
            v_uv = a_pos * 0.5 + 0.5;
            gl_Position = vec4(a_pos, 0.999, 1.0);
        }`;

        const skyFS = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;

        uniform vec3 u_skyTop;
        uniform vec3 u_skyHorizon;
        uniform vec3 u_sunColor;
        uniform vec3 u_shadowCool;
        uniform float u_camYaw;
        uniform float u_camPitch;
        uniform float u_time;
        uniform float u_bassPulse;
        uniform vec4 u_audioSpectrum; // x=SubBass, y=LowMid, z=HighMid, w=Treble
        uniform float u_dropIntensity;

        // Bayer 4x4 dithering matrix for Hiroshi Nagai sky band transitions
        float bayer4x4(vec2 pos) {
            int x = int(mod(pos.x, 4.0));
            int y = int(mod(pos.y, 4.0));
            int index = x + y * 4;
            float m[16] = float[16](
                0.0,  8.0,  2.0, 10.0,
                12.0, 4.0, 14.0,  6.0,
                3.0, 11.0,  1.0,  9.0,
                15.0, 7.0, 13.0,  5.0
            );
            return (m[index] / 16.0) - 0.5;
        }

        void main() {
            vec2 uv = v_uv;
            float horizonY = 0.44 - u_camPitch * 0.35;
            float songScale = clamp(u_dropIntensity, 0.0, 1.0);
            float grooveGate = smoothstep(0.28, 0.78, songScale);
            float dropGate = smoothstep(0.58, 0.90, songScale);

            if (uv.y < horizonY) {
                // Turquoise Hiroshi Nagai Ocean Bay below horizon with Song-Scaled Bass Waves
                float seaT = clamp((horizonY - uv.y) / max(0.01, horizonY), 0.0, 1.0);
                vec3 seaDeep = mix(u_shadowCool, vec3(0.02, 0.45, 0.68), 0.65);
                vec3 seaShallow = mix(u_skyHorizon, vec3(0.10, 0.88, 0.86), 0.55 + u_audioSpectrum.x * 0.25 * songScale);
                float quantSea = floor((seaT - u_bassPulse * 0.05 * grooveGate) * 8.0) / 8.0;
                vec3 col = mix(seaShallow, seaDeep, clamp(quantSea, 0.0, 1.0));

                // Traveling sub-bass neon ripples across the ocean bay (scales with Groove & Drop)
                if (grooveGate > 0.05) {
                    float bassRipple = sin(seaT * 42.0 - u_time * 7.5) * 0.5 + 0.5;
                    if (bassRipple > 0.84 - u_audioSpectrum.x * 0.20 * grooveGate) {
                        col = mix(col, u_sunColor, (0.22 + u_bassPulse * 0.42) * grooveGate * (1.0 - seaT * 0.6));
                    }
                }

                // Crisp horizontal sun reflection shimmer bars on water
                float sunX = fract(0.5 - u_camYaw / 6.28318);
                float dx = abs(uv.x - sunX);
                float wave = sin(uv.y * 190.0 + u_time * 8.0) * (0.015 + u_audioSpectrum.x * 0.020 * songScale);
                float shimmerWidth = (0.09 + (u_bassPulse * 0.060 + u_audioSpectrum.w * 0.040) * songScale) * (1.0 - seaT * 0.65);
                if (dx + wave < shimmerWidth) {
                    if (fract(uv.y * 55.0 - u_time * 1.6) > 0.32 - u_bassPulse * 0.16 * songScale) {
                        col = mix(u_sunColor, vec3(1.0, 0.98, 0.92), u_bassPulse * 0.40 * songScale);
                    }
                }
                fragColor = vec4(col, 1.0);
                return;
            }

            // Quantized Banded Nagai Sky above horizon
            float skyT = clamp((uv.y - horizonY) / (1.0 - horizonY), 0.0, 1.0);
            float dither = bayer4x4(gl_FragCoord.xy) * 0.032;
            float bandShift = (u_bassPulse * 0.07 + u_audioSpectrum.y * 0.04) * grooveGate;
            float bandedT = floor((pow(max(0.0, skyT - bandShift * 0.5), 0.75) + dither) * 10.0) / 10.0;
            vec3 skyCol = mix(u_skyHorizon, u_skyTop, clamp(bandedT, 0.0, 1.0));

            // Rave Aurora / Laser Sky Beams shooting from the horizon ONLY during high-energy Builds & Drops!
            float musicExcite = clamp((u_bassPulse * 0.55 + u_audioSpectrum.z * 0.45) * dropGate, 0.0, 1.0);
            if (musicExcite > 0.12 && skyT < 0.78) {
                float beamAngle = (uv.x - 0.5) * 3.8 + u_camYaw * 1.2 + sin(skyT * 3.0 + u_time * 2.0) * 0.15;
                float beamPattern = sin(beamAngle * 14.0 + u_time * 4.5) * cos(beamAngle * 9.0 - u_time * 3.2);
                if (beamPattern > 0.70 - musicExcite * 0.24) {
                    float beamFade = (1.0 - skyT / 0.78) * musicExcite * 0.55;
                    vec3 laserCol = mix(u_sunColor, vec3(0.2, 1.0, 0.95), fract(beamAngle * 2.0));
                    skyCol = mix(skyCol, laserCol, clamp(beamFade, 0.0, 0.62));
                }
            }

            // Oversized Crisp Sun Disc with Beat-Scrolling Retro Slices & Concentric Bass Shockwave Rings
            float sunX = fract(0.5 - u_camYaw / 6.28318);
            vec2 sunDelta = vec2((uv.x - sunX) * 1.7, uv.y - (horizonY + 0.16 + u_bassPulse * 0.016 * songScale));
            float sunDist = length(sunDelta);
            float sunRadius = 0.135 + (u_bassPulse * 0.045 + u_audioSpectrum.x * 0.030) * songScale;
            if (sunDist < sunRadius) {
                float sliceY = sunDelta.y / sunRadius;
                bool cut = (sliceY < -0.10 && fract(sliceY * 9.0 - u_time * (0.4 + 1.4 * songScale)) < 0.28 - u_bassPulse * 0.10 * songScale);
                if (!cut) {
                    skyCol = mix(u_sunColor, vec3(1.0, 0.28, 0.58), clamp((0.5 - sliceY) * 0.5, 0.0, 1.0));
                    skyCol = mix(skyCol, vec3(1.0, 0.98, 0.92), u_bassPulse * 0.32 * songScale);
                }
            } else if (sunDist < sunRadius + 0.28 && grooveGate > 0.05) {
                // Concentric Bass Shockwave Rings radiating from the Sun (scales up from Groove -> Drop!)
                float ringSpace = (sunDist - sunRadius) / 0.28;
                float ringWave = fract(ringSpace * 4.5 - u_time * 1.85);
                float ringMask = smoothstep(0.14, 0.0, abs(ringWave - 0.5)) * (1.0 - ringSpace);
                float ringEnergy = clamp(u_bassPulse * 0.85 + u_audioSpectrum.x * 0.65, 0.0, 1.0) * grooveGate;
                skyCol = mix(skyCol, u_sunColor * 1.25, ringMask * ringEnergy * 0.60);
            }

            // Stepped 36-Column Graphic Equalizer Skyline Silhouette along the Horizon (scales with song intensity)
            if (songScale > 0.18) {
                float eqColIdx = floor((uv.x + u_camYaw * 0.35) * 36.0);
                float colHash = fract(sin(eqColIdx * 91.7) * 43758.5453);
                int bandSel = int(mod(abs(eqColIdx), 4.0));
                float bandVal = (bandSel == 0) ? u_audioSpectrum.x : ((bandSel == 1) ? u_audioSpectrum.y : ((bandSel == 2) ? u_audioSpectrum.z : u_audioSpectrum.w));
                float eqHeight = ((0.008 + colHash * 0.022) * grooveGate) + (bandVal * 0.090 + u_bassPulse * 0.042) * (0.45 + colHash * 0.75) * songScale;
                float colFract = fract((uv.x + u_camYaw * 0.35) * 36.0);
                if (skyT < eqHeight && colFract > 0.14 && colFract < 0.86) {
                    float segY = fract(skyT * 95.0);
                    if (segY > 0.22) {
                        vec3 eqColor = mix(u_sunColor, vec3(1.0, 0.95, 0.85), clamp(skyT / max(0.01, eqHeight), 0.0, 1.0));
                        skyCol = mix(skyCol, eqColor, (0.25 + songScale * 0.55));
                    }
                }
            }

            // Static Parallax Painted Cumulus Clouds (Flat Nagai White/Coral, rim-lit by the beat!)
            float cloudX = uv.x * 4.5 + u_camYaw * 0.7 + u_time * 0.015;
            float cloudY = uv.y - horizonY;
            if (cloudY > 0.02 && cloudY < 0.22) {
                float puff = sin(cloudX * 3.2) * 0.5 + sin(cloudX * 7.1 + 1.3) * 0.3 + cos(cloudX * 13.0) * 0.15;
                float topEdge = 0.08 + max(0.0, puff) * (0.085 + u_bassPulse * 0.022 * songScale);
                if (cloudY < topEdge && cloudY > 0.025) {
                    vec3 cloudLit = mix(vec3(1.0, 0.98, 0.95), u_sunColor, 0.25 + u_bassPulse * 0.32 * songScale);
                    vec3 cloudShade = mix(u_skyHorizon, u_shadowCool, 0.45);
                    skyCol = (cloudY > topEdge - 0.028) ? cloudLit : cloudShade;
                }
            }

            fragColor = vec4(skyCol, 1.0);
        }`;
        this.skyProg = this.createProgram(skyVS, skyFS);

        // 2. HIROSHI NAGAI STEPPED TOON WORLD & AUTO MODELLISTA CAR SHADER
        const worldVS = `#version 300 es
        layout(location = 0) in vec3 a_pos;
        layout(location = 1) in vec3 a_normal;
        layout(location = 2) in vec4 a_colorId; // r=luminance, g=materialZoneID, b=specWeight, a=emissiveMask
        layout(location = 3) in vec2 a_uv;

        uniform mat4 u_viewProj;
        uniform mat4 u_model;
        uniform float u_outlineExtrude;
        uniform float u_propBounceScale;
        uniform vec4 u_audioSpectrum;
        uniform float u_beatPulse;
        uniform float u_dropIntensity;
        uniform float u_time;

        out vec3 v_worldPos;
        out vec3 v_localPos;
        out vec3 v_normal;
        out vec4 v_colorId;
        out vec2 v_uv;

        void main() {
            mat3 normalMat = mat3(u_model);
            vec3 norm = normalize(normalMat * a_normal);
            int zoneId = int(floor(a_colorId.g * 10.0 + 0.5));
            float songScale = clamp(u_dropIntensity, 0.0, 1.0);
            float bounceGate = smoothstep(0.32, 0.88, songScale);

            // Pulse Inverted-Hull Black Ink Outlines scaled by song intensity
            float extrude = u_outlineExtrude * (1.0 + (u_beatPulse * 0.12 + u_audioSpectrum.x * 0.08) * songScale);
            vec3 localPos = a_pos + a_normal * extrude;

            // Subtle, Ground-Anchored Audio-Driven Architecture & Palm Foliage Nod
            // Quantized to 12 FPS ("on twos") per Nam_Mac & Pixel_Tempys stepped animation feel!
            float propH = a_uv.x;
            float steppedTime = floor(u_time * 12.0) / 12.0;
            if (u_propBounceScale > 0.0 && u_outlineExtrude == 0.0 && bounceGate > 0.01 && (zoneId == 2 || zoneId == 3 || zoneId == 4) && propH > 0.5) {
                float spatialPhase = a_pos.x * 0.055 + a_pos.z * 0.045;
                float wave = 0.5 + 0.5 * sin(spatialPhase + steppedTime * 5.0);
                float eqBounce = (u_beatPulse * 0.045 + u_audioSpectrum.x * 0.035 + u_audioSpectrum.z * 0.020 * wave) * bounceGate * u_propBounceScale;
                float heightFactor = clamp((propH - 0.5) / 16.0, 0.0, 1.0);
                localPos.y += eqBounce * heightFactor;
                if (zoneId == 2) {
                    localPos.x += sin(steppedTime * 3.5 + spatialPhase) * heightFactor * (0.018 * u_audioSpectrum.y + 0.022 * u_beatPulse) * bounceGate * u_propBounceScale;
                }
            }

            vec4 worldPos = u_model * vec4(localPos, 1.0);

            v_worldPos = worldPos.xyz;
            v_localPos = a_pos;
            v_normal = norm;
            v_colorId = a_colorId;
            v_uv = a_uv;
            gl_Position = u_viewProj * worldPos;
        }`;

        const worldFS = `#version 300 es
        precision highp float;
        in vec3 v_worldPos;
        in vec3 v_localPos;
        in vec3 v_normal;
        in vec4 v_colorId;
        in vec2 v_uv;

        out vec4 fragColor;

        uniform int u_passMode; // 0 = Nagai Toon Lit, 1 = Black Ink Outline, 2 = DJ Jumbotron Screen, 3 = R4 Taillight Ribbon & Afterburner
        uniform int u_carLiveryId; // 0 = Clean, 1 = Wild Horses, 2 = Gravel Ravers Camo, 3 = Shakotan Cyber Dragon
        uniform float u_stickerDensity;
        uniform vec4 u_carDriveState; // x=brakeLightIntensity, y=boostIntensity, z=driftCharge, w=exhaustFlameIntensity
        uniform vec3 u_camPos;
        uniform vec3 u_lightDir;
        uniform vec3 u_shadowCool;
        uniform vec3 u_roadLit;
        uniform vec3 u_roadShadow;
        uniform vec3 u_curbA;
        uniform vec3 u_curbB;
        uniform vec3 u_carPrimary;
        uniform vec3 u_carSecondary;
        uniform vec3 u_carTrim;
        uniform vec3 u_carEmissive;
        uniform vec3 u_carLiveryCol1;
        uniform vec3 u_carLiveryCol2;
        uniform vec3 u_carFrontRimColor;
        uniform vec3 u_carRearRimColor;
        uniform vec3 u_carCageColor;
        uniform vec3 u_carGlowColor;
        uniform vec3 u_foliageLit;
        uniform vec3 u_foliageShadow;
        uniform vec4 u_audioSpectrum; // x=SubBass, y=LowMid, z=HighMid, w=Treble
        uniform float u_beatPulse;
        uniform float u_dropIntensity;
        uniform float u_time;
        uniform float u_jsrPixelDither; // JSR x Nam_Mac Point Texel Snap + Bayer 4x4 Halftone Dither
        uniform float u_facetCreaseInk; // Pixel_Tempys Grease-Pencil Internal Facet & Panel Seam Ink
        uniform sampler2D u_djTex;

        // Bayer 4x4 ordered dithering matrix (scaled 2x for crisp retro PS2/Dreamcast halftone pixels)
        float bayer4x4World(vec2 fragCoord) {
            vec2 p = floor(fragCoord * 0.5);
            int x = int(mod(p.x, 4.0));
            int y = int(mod(p.y, 4.0));
            int index = x + y * 4;
            float m[16] = float[16](
                0.0,  8.0,  2.0, 10.0,
                12.0, 4.0, 14.0,  6.0,
                3.0, 11.0,  1.0,  9.0,
                15.0, 7.0, 13.0,  5.0
            );
            return (m[index] / 16.0) - 0.5;
        }

        void main() {
            float songScale = clamp(u_dropIntensity, 0.0, 1.0);
            float grooveGate = smoothstep(0.30, 0.80, songScale);
            float dropGate = smoothstep(0.55, 0.90, songScale);
            float ditherVal = bayer4x4World(gl_FragCoord.xy);

            // Pass 1: Inverted-Hull Black Ink Outline (JSR / Auto Modellista / Pixel_Tempys)
            // Alpha = 0.25 marks the car silhouette as "Ink-Protected" from Kuwahara blur!
            if (u_passMode == 1) {
                fragColor = vec4(0.02, 0.01, 0.05, 0.25);
                return;
            }

            // Pass 2: Trackside Boiler Room LED Jumbotron Screen (Point-Filtered 12 FPS Stepped Look)
            if (u_passMode == 2) {
                vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
                if (u_jsrPixelDither > 0.1) {
                    uv = floor(uv * vec2(128.0, 64.0) + 0.5) / vec2(128.0, 64.0);
                }
                float steppedT = floor(u_time * 12.0) / 12.0;
                // Subtle bass glitch distortion on LED screen during Drops
                float glitch = (u_beatPulse > 0.7 && dropGate > 0.2) ? sin(uv.y * 80.0 + steppedT * 40.0) * 0.008 * u_beatPulse * dropGate : 0.0;
                vec3 djCol = texture(u_djTex, clamp(uv + vec2(glitch, 0.0), 0.0, 1.0)).rgb;

                // LED Pixel Grid Mask
                vec2 ledGrid = fract(v_uv * vec2(128.0, 64.0));
                float mask = (ledGrid.x > 0.14 && ledGrid.y > 0.14) ? 1.22 : 0.48;
                djCol *= mask * (1.0 + u_audioSpectrum.x * 0.35 * songScale);
                fragColor = vec4(djCol, 1.0);
                return;
            }

            // Pass 3: R4 Ridge Racer Type 4 3D Taillight Light-Trail Ribbon & Exhaust Afterburner Cone
            if (u_passMode == 3) {
                float fade = clamp(v_colorId.a, 0.0, 1.0);
                float core = smoothstep(0.48, 0.05, abs(v_uv.x - 0.5));
                vec3 ribbonCol = mix(u_carEmissive, vec3(1.0, 0.96, 0.90), core * 0.68);
                fragColor = vec4(ribbonCol * fade * 1.35, fade);
                return;
            }

            // Pass 0: JSR x Nam_Mac x Pixel_Tempys Stepped Cel Shading + Bayer 4x4 Halftone Terminator
            vec3 N = normalize(v_normal);
            vec3 L = normalize(u_lightDir);
            vec3 V = normalize(u_camPos - v_worldPos);

            float NdotL = dot(N, L);
            // Nam_Mac Ordered Bayer 4x4 Halftone Dither Band at the Cel Shadow Terminator
            float ditherBand = ditherVal * 0.24 * u_jsrPixelDither;
            float litStep = smoothstep(-0.015, 0.015, NdotL + ditherBand);

            int zoneId = int(floor(v_colorId.g * 10.0 + 0.5));
            int subZone = int(floor(v_colorId.b * 10.0 + 0.5));
            vec3 baseLit = u_carPrimary;
            vec3 baseShade = u_shadowCool;

            // JSR / Nam_Mac Nearest-Neighbor Point-Filtered Local Coordinate Quantization (~36 texels/meter on car liveries)
            vec3 qLocal = (u_jsrPixelDither > 0.05)
                ? mix(v_localPos, floor(v_localPos * 36.0 + 0.5) / 36.0, u_jsrPixelDither * 0.85)
                : v_localPos;

            if (zoneId == 0) {
                // PIP-03 Phase 1: High-Frequency Ground Asphalt Optical Flow + Song-Scaled Bass Waves & Spectrum Strips
                baseLit = u_roadLit;
                baseShade = u_roadShadow;

                // 1. Longitudinal racing-line tire-wear tracks & stepped Nagai micro-grain striations
                float laneTrack = smoothstep(0.18, 0.02, abs(abs(v_uv.x - 0.5) - 0.24));
                float striation = step(0.52, fract(v_uv.x * 38.0 + floor(v_uv.y * 6.0) * 0.37));
                baseLit = mix(baseLit, baseShade, laneTrack * 0.18 + striation * 0.05);

                // 1B. Traveling Sub-Bass Neon Shockwave Rings racing down the asphalt (unlocks in Builds & Drops!)
                if (dropGate > 0.05) {
                    float travelWave = fract(v_uv.y * 0.065 - u_time * 1.45);
                    float waveBand = smoothstep(0.14, 0.0, abs(travelWave - 0.5)) * (u_beatPulse * 0.72 + u_audioSpectrum.x * 0.62) * dropGate;
                    if (waveBand > 0.02) {
                        vec3 waveCol = mix(u_curbB, u_carEmissive, abs(v_uv.x - 0.5) * 2.0);
                        baseLit = mix(baseLit, waveCol, clamp(waveBand * 0.55, 0.0, 0.72));
                        baseShade = mix(baseShade, waveCol * 0.75, clamp(waveBand * 0.45, 0.0, 0.62));
                    }
                }

                // 2. Crisp lateral concrete expansion seams every ~12m — light up like equalizer bars scaled by song intensity
                float seamPhase = fract(v_uv.y * 0.33333);
                if (seamPhase < 0.050) {
                    float eqWidth = abs(v_uv.x - 0.5) * 2.0;
                    bool eqLit = grooveGate > 0.15 && (eqWidth < (u_audioSpectrum.x * 0.65 + u_beatPulse * 0.55) * grooveGate);
                    vec3 seamCol = eqLit
                        ? mix(u_curbB, u_carEmissive, 0.5 + 0.5 * sin(v_uv.y + u_time * 8.0)) * (1.0 + u_beatPulse * 0.40 * songScale)
                        : mix(baseShade * 0.72, u_curbB, 0.18 + u_audioSpectrum.x * 0.25 * songScale);
                    baseLit = seamCol;
                    baseShade = seamCol;
                }

                // 3. Multi-lane dashed markers (center 0.5 + quarter lanes 0.25 & 0.75) & glowing Cat's-Eye reflector studs
                float centerDist = abs(v_uv.x - 0.5);
                float quarterDist = abs(abs(v_uv.x - 0.5) - 0.25);
                float dashLong = fract(v_uv.y * 0.5);
                if (centerDist < 0.015 && dashLong < 0.50) {
                    baseLit = mix(u_curbB, vec3(1.0), 0.42 + (u_audioSpectrum.x * 0.50 + u_beatPulse * 0.32) * songScale);
                    baseShade = baseLit;
                } else if (quarterDist < 0.009 && fract(v_uv.y * 0.5 + 0.25) < 0.34) {
                    baseLit = mix(u_roadLit, u_curbA, 0.65 + u_audioSpectrum.z * 0.30 * songScale);
                    baseShade = baseLit;
                } else if ((centerDist < 0.019 || quarterDist < 0.013) && abs(dashLong - 0.74) < 0.050) {
                    // Raised glowing Cat's-Eye road studs between dashes
                    vec3 studCol = mix(u_carEmissive, vec3(1.0, 0.95, 0.8), 0.55);
                    baseLit = studCol * (1.15 + (u_beatPulse * 0.80 + u_audioSpectrum.w * 0.50) * songScale);
                    baseShade = baseLit;
                } else if (v_uv.x < 0.048 || v_uv.x > 0.952) {
                    // Roadside LED Spectrum Equalizer Strips along track edges (scales from subtle curb line to full LED runway in Drops)
                    float seg = fract(v_uv.y * 1.5 - u_time * 3.0 * dropGate);
                    vec3 edgeNeon = (seg < 0.55 && grooveGate > 0.2) ? mix(u_curbA, u_carEmissive, u_audioSpectrum.z * grooveGate) : u_curbA;
                    baseLit = mix(edgeNeon, vec3(1.0), (u_audioSpectrum.x * 0.45 + u_beatPulse * 0.38) * songScale);
                    baseShade = baseLit;
                }
            } else if (zoneId == 1) {
                // Alternating Vibe Curbs — Classic in calm sections, beat-chasing during Drops!
                float chaseOffset = (dropGate > 0.25) ? floor(u_time * 4.6) * 0.5 : 0.0;
                bool alt = fract(v_uv.y * 0.75 - chaseOffset) > 0.5;
                vec3 curbCol = alt ? u_curbA : u_curbB;
                curbCol = mix(curbCol, vec3(1.0), (alt ? u_beatPulse : u_audioSpectrum.z) * 0.36 * songScale);
                baseLit = curbCol;
                baseShade = mix(curbCol, u_shadowCool, 0.42 - u_beatPulse * 0.16 * songScale);
            } else if (zoneId == 2) {
                // Nagai Palm Trees & Coastal Foliage — Bioluminescent canopy pulse scaled by song intensity
                float canopyGlow = clamp((v_worldPos.y - 1.5) * 0.18, 0.0, 1.0) * (u_audioSpectrum.y * 0.52 + u_beatPulse * 0.42) * grooveGate;
                baseLit = mix(u_foliageLit, u_carEmissive, canopyGlow * 0.52);
                baseShade = mix(u_foliageShadow, u_curbB * 0.65, canopyGlow * 0.38);
            } else if (zoneId == 3) {
                // Architecture / Bridge / Tunnel / Shibuya Towers — Equalizer Window Grids scale from ground floor in Breakdown to rooftops in Drop!
                baseLit = mix(u_carTrim, u_roadLit, 0.35);
                baseShade = u_shadowCool;

                if (v_worldPos.y > 0.9 && songScale > 0.15) {
                    float colCoord = (v_worldPos.x + v_worldPos.z) * 0.45;
                    float colIdx = floor(colCoord);
                    float colF = fract(colCoord);
                    float rowF = fract(v_worldPos.y * 0.85);
                    int bIdx = int(mod(abs(colIdx), 4.0));
                    float specVal = (bIdx == 0) ? u_audioSpectrum.x : ((bIdx == 1) ? u_audioSpectrum.y : ((bIdx == 2) ? u_audioSpectrum.z : u_audioSpectrum.w));
                    float maxEqY = 1.0 + (specVal * 15.5 + u_beatPulse * 8.0) * songScale * (0.45 + 0.55 * fract(sin(colIdx * 43.1) * 913.7));
                    if (colF > 0.18 && colF < 0.82 && rowF > 0.24 && rowF < 0.82 && v_worldPos.y < maxEqY) {
                        vec3 winCol = mix(u_curbB, u_carEmissive, clamp(v_worldPos.y / 14.0, 0.0, 1.0));
                        winCol = mix(winCol, u_curbA, u_beatPulse * 0.45 * songScale);
                        vec3 archBase = mix(baseShade, baseLit, litStep);
                        fragColor = vec4(mix(archBase, winCol * (1.1 + u_beatPulse * 0.6 * songScale), 0.35 + songScale * 0.65), 1.0);
                        return;
                    }
                }
            } else if (zoneId == 4) {
                // Audio-Reactive Neon Arches, Billboards, Car Taillights, Headlight Lens Tint & Underglow
                float pulse = 1.0 + (u_audioSpectrum.x * 1.15 + u_beatPulse * 0.85 + u_audioSpectrum.w * 0.50) * songScale;
                vec3 neon = (subZone == 1)
                    ? u_carGlowColor
                    : mix(u_carEmissive, u_curbA, fract(v_uv.y * 0.25 + u_time * (0.35 + 0.55 * songScale)));
                if (subZone != 1) {
                    neon = mix(neon, u_curbB, u_audioSpectrum.z * 0.42 * songScale);
                }
                // Rear car taillights & exhaust tips flare crimson on braking and white-hot cyan on boost!
                if (v_localPos.z < -1.1 && abs(v_localPos.x) < 1.05) {
                    vec3 brakeCrimson = vec3(1.0, 0.06, 0.18);
                    vec3 boostOverdrive = vec3(0.35, 0.98, 1.0);
                    neon = mix(neon, brakeCrimson, clamp(u_carDriveState.x * 0.85, 0.0, 1.0));
                    neon = mix(neon, boostOverdrive, clamp(u_carDriveState.y * 0.85, 0.0, 1.0));
                    pulse += u_carDriveState.x * 0.95 + u_carDriveState.y * 1.15 + u_carDriveState.w * 0.65;
                }
                fragColor = vec4(neon * pulse, 1.0);
                return;
            } else if (zoneId == 5) {
                // Car Primary Body + 12 Procedural Street-Rave Liveries & Sticker-Bomb System
                // Uses qLocal (Point-Filtered Nearest-Neighbor Texel Snap) for crisp JSR / Nam_Mac pixel-art decals!
                vec3 paint = u_carPrimary;
                float lx = qLocal.x;
                float ly = qLocal.y;
                float lz = qLocal.z;
                float ax = abs(lx);

                if (u_carLiveryId == 1) {
                    // LIVERY 01: WILD HORSES // Blue Cat & Vermilion Graphic Slash + Sticker-Bomb
                    float diag = lz * 0.85 + ax * 1.35;
                    if (diag > -0.35 && diag < 0.28) {
                        paint = u_carLiveryCol1;
                    } else if (diag >= 0.28 && diag < 0.44) {
                        paint = u_carLiveryCol2;
                    }
                    if (ax > 0.78 && lz > -0.58 && lz < 0.48 && ly > 0.34 && ly < 0.72) {
                        paint = u_carLiveryCol2;
                        if (fract(lz * 6.5) < 0.42 && ly > 0.44 && ly < 0.62) {
                            paint = vec3(0.05, 0.08, 0.22);
                        }
                    }
                    if (u_stickerDensity > 0.05 && (lz > 0.95 || lz < -1.15)) {
                        vec2 cell = floor(vec2((lx + lz) * 7.5, (ly - lz * 0.5) * 9.0));
                        float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
                        if (h < u_stickerDensity * 0.62) {
                            paint = (h < 0.20) ? u_carLiveryCol1 : ((h < 0.38) ? u_carLiveryCol2 : u_carGlowColor);
                        }
                    }
                } else if (u_carLiveryId == 2) {
                    // LIVERY 02: GRAVEL RAVERS // Acid Woodland Camo + #01 Door Plate + Crimson Kanji
                    float cWave = sin(lz * 2.9 + lx * 2.2) + cos(lz * 5.1 - ly * 4.2) * 0.65;
                    if (cWave > 0.42) {
                        paint = mix(u_carPrimary, vec3(0.14, 0.22, 0.12), 0.65);
                    } else if (cWave < -0.48) {
                        paint = mix(u_carPrimary, u_carLiveryCol2, 0.45);
                    }
                    float brush = lz + ax * 0.95;
                    if (brush > -1.05 && brush < -0.55) {
                        paint = u_carLiveryCol1;
                    }
                    bool onDoorPlate = (ax > 0.76 && lz > -0.45 && lz < 0.52 && ly > 0.32 && ly < 0.76);
                    bool onHoodPlate = (ax < 0.44 && lz > 0.98 && lz < 1.68 && ly > 0.62);
                    if (onDoorPlate || onHoodPlate) {
                        paint = u_carLiveryCol2;
                        if (onDoorPlate && ly > 0.66) {
                            paint = u_carLiveryCol1;
                        } else if (abs(lz - 0.04) < 0.16 && ax > 0.48) {
                            paint = vec3(0.06, 0.06, 0.10);
                        }
                    }
                } else if (u_carLiveryId == 3) {
                    // LIVERY 03: SHAKOTAN CYBER // Hot-Pink D1GP Tribal Dragon & Chrome Pin-Stripe
                    float spear = abs(ly - 0.46 - sin(lz * 3.4) * 0.14) - (0.24 - clamp((0.8 - lz) * 0.11, 0.0, 0.22));
                    if (ax > 0.65 && spear < 0.0) {
                        paint = u_carLiveryCol1;
                    } else if (ax > 0.65 && spear >= 0.0 && spear < 0.045) {
                        paint = u_carLiveryCol2;
                    }
                    float hoodV = abs(ax - (1.85 - lz) * 0.38);
                    if (lz > 0.65 && ly > 0.50 && hoodV < 0.14) {
                        paint = (hoodV < 0.09) ? u_carLiveryCol1 : u_carLiveryCol2;
                    }
                } else if (u_carLiveryId == 4) {
                    // LIVERY 04: HARIGAYA FLAME // Wrapping Hot-Rod Flames & Kanji (Reference Cars/01 JZX100!)
                    float flameReach = 2.35 - lz; // Distance back from front nose
                    float sideTongue = sin(ly * 14.0 + lz * 3.2) * 0.34 + cos(ly * 27.0 - lz * 4.5) * 0.18;
                    float hoodTongue = sin(ax * 13.0 + lz * 2.8) * 0.38 + cos(ax * 25.0) * 0.16;
                    float flameEnv = (ax > 0.62)
                        ? (1.85 - flameReach * 0.72 + sideTongue)
                        : (1.55 - flameReach * 0.85 + hoodTongue);
                    if (flameEnv > 0.18) {
                        // Inner yellow-hot core vs outer blazing orange flame tongue + white pinstripe outline
                        paint = (flameEnv > 0.52) ? u_carLiveryCol2 : u_carLiveryCol1;
                    } else if (flameEnv > 0.09) {
                        paint = vec3(0.98, 0.98, 1.0);
                    }
                    // Angled Harigaya Jidousha Kanji Door Banner
                    float kDiag = lz * 0.65 + (ly - 0.48) * 1.4;
                    if (ax > 0.78 && lz > -0.65 && lz < 0.35 && abs(kDiag) < 0.16) {
                        if (fract((lz - ly * 0.4) * 7.5) < 0.58) {
                            paint = (abs(kDiag) < 0.10) ? vec3(1.0) : u_carGlowColor;
                        }
                    }
                } else if (u_carLiveryId == 5) {
                    // LIVERY 05: ULTRAVIOLET TRIBAL // Acid-Green Tribal Lightning Flames & Star Sparkles (Cars/02!)
                    float tribWave = abs(sin(ly * 16.0 - lz * 4.2) * 0.22 + cos(lz * 6.5) * 0.12);
                    float tribMask = (1.65 - (2.25 - lz) * 0.68) - tribWave * 2.1;
                    if ((ax > 0.60 || ly > 0.55) && tribMask > 0.0 && tribMask < 0.36) {
                        paint = (tribMask < 0.26) ? u_carLiveryCol1 : u_carLiveryCol2;
                    }
                    // 4-Point Y2K Star Sparkles across rear quarter & hood
                    vec2 starCell = fract(vec2(lz * 2.6, (ly + ax) * 2.6)) - 0.5;
                    float starCross = min(abs(starCell.x) + abs(starCell.y) * 0.25, abs(starCell.y) + abs(starCell.x) * 0.25);
                    if (starCross < 0.045 * u_stickerDensity && abs(starCell.x) < 0.22 && abs(starCell.y) < 0.22) {
                        paint = u_carLiveryCol2;
                    }
                } else if (u_carLiveryId == 6) {
                    // LIVERY 06: Y2K DUOTONE // Posterized STI Rally Swoosh & Star Cluster (Cars/03!)
                    float swoosh = lz * 0.75 - (ly - 0.45) * 1.65;
                    if ((swoosh > -0.85 && swoosh < -0.15) || (lz > 1.05 && ax > 0.52 && ly < 0.62)) {
                        paint = u_carLiveryCol1;
                    } else if (abs(swoosh + 0.12) < 0.05 || abs(swoosh + 0.88) < 0.05) {
                        paint = u_carLiveryCol2;
                    }
                    // STI Star Cluster on front door
                    if (ax > 0.76 && lz > 0.05 && lz < 0.75 && ly > 0.36 && ly < 0.68) {
                        vec2 sc = fract(vec2(lz * 5.0, ly * 6.0)) - 0.5;
                        if (min(abs(sc.x) + abs(sc.y) * 0.3, abs(sc.y) + abs(sc.x) * 0.3) < 0.07) {
                            paint = u_carLiveryCol1;
                        }
                    }
                } else if (u_carLiveryId == 7) {
                    // LIVERY 07: PINK STYLE SUPER-D // Hot-Pink-to-Violet Fade, Splash Flame & Checkers (Cars/04!)
                    float gradT = clamp((0.85 - lz) * 0.42, 0.0, 1.0);
                    paint = mix(u_carPrimary, u_carSecondary, gradT);
                    // Jagged D1GP Splash-Flame across mid-body
                    float splash = sin(ly * 18.0 + lz * 5.0) * 0.24 + cos(lz * 9.0 - ax * 7.0) * 0.16;
                    if (abs(lz - 0.15 + splash) < 0.34) {
                        paint = (abs(lz - 0.15 + splash) < 0.22) ? u_carLiveryCol1 : u_carLiveryCol2;
                    }
                    // Skewed Racing Checkerboard Flag across lower door & rear quarter
                    if (ax > 0.72 && ly < 0.54 && lz < 0.45 && lz > -1.45) {
                        vec2 chk = floor(vec2((lz + ly * 0.65) * 7.5, ly * 9.5));
                        if (mod(chk.x + chk.y, 2.0) < 1.0) {
                            paint = (ly < 0.36) ? u_carLiveryCol2 : vec3(0.98, 0.98, 1.0);
                        }
                    }
                } else if (u_carLiveryId == 8) {
                    // LIVERY 08: TEKKAMEN PANDA // 80s Skyline R30 RS-Turbo Two-Tone & Stencil (Cars/05!)
                    if (ly < 0.46) {
                        paint = u_carSecondary;
                    } else if (ly >= 0.46 && ly < 0.52) {
                        paint = u_carLiveryCol1; // Horizontal beltline rub-strip
                    } else if (ly >= 0.52 && ly < 0.58 && ax > 0.76 && lz > -0.75 && lz < 0.75) {
                        // Crisp "RS-TURBO" door stencil stripe above beltline
                        paint = (fract(lz * 8.0) < 0.65) ? u_carLiveryCol2 : u_carPrimary;
                    }
                } else if (u_carLiveryId == 9) {
                    // LIVERY 09: LBWK KIDS DOODLE // Hand-Drawn Street-Marker Hearts & Graffiti Tags (Cars/06!)
                    vec2 dGrid = vec2((lz + lx * 0.4) * 5.2, (ly + ax * 0.5) * 5.8);
                    vec2 dCell = floor(dGrid);
                    vec2 p = (fract(dGrid) - 0.5) * 2.2;
                    float rnd = fract(sin(dot(dCell, vec2(27.1, 61.7))) * 43758.5453);
                    if (rnd < u_stickerDensity * 0.85 && ly < 0.88) {
                        // Implicit Heart SDF: (x^2 + (y - sqrt(|x|))^2)
                        float hy = p.y + 0.22 - sqrt(max(0.01, abs(p.x))) * 0.68;
                        float heartD = p.x * p.x + hy * hy;
                        if (heartD < 0.36) {
                            paint = (heartD > 0.22) ? u_carLiveryCol2 : u_carLiveryCol1;
                        } else if (rnd > 0.45 && abs(p.y + p.x * 0.35) < 0.14 && abs(p.x) < 0.65) {
                            // Hand-drawn marker tag stroke
                            paint = u_carLiveryCol2;
                        }
                    }
                } else if (u_carLiveryId == 10) {
                    // LIVERY 10: CARS ARE PAIN // Black Nose Clip + Inverse Yellow Flames & Slash Text (Cars/07!)
                    float noseBorder = 0.65 + sin(ly * 15.0) * 0.28 + cos(ax * 14.0) * 0.22;
                    if (lz > noseBorder) {
                        // Matte black front clip with licking inverse primary flames!
                        paint = u_carLiveryCol1;
                        float invFlame = sin(ly * 22.0 + lz * 4.0) * 0.18;
                        if (lz < noseBorder + 0.42 && abs(invFlame) < 0.09) {
                            paint = u_carPrimary;
                        }
                    } else if (lz < -0.45 - (ly - 0.5) * 0.65) {
                        // Black rear quarter panel + giant diagonal "CARS ARE PAIN" white typography blocks
                        paint = u_carLiveryCol1;
                        float textBand = (lz + 1.15) * 0.75 + (ly - 0.52) * 1.15;
                        if (ax > 0.72 && abs(textBand) < 0.22 && fract((lz - ly * 0.5) * 7.0) < 0.62) {
                            paint = u_carLiveryCol2;
                        }
                    }
                } else if (u_carLiveryId == 11) {
                    // LIVERY 11: SAVANNA #39 // Twin-Pinstripe Center Racing Stripe & #39 Roundel (Cars/08!)
                    if (ly > 0.35) {
                        if (ax < 0.24) {
                            paint = u_carLiveryCol1; // Wide emerald green center stripe
                        } else if (ax >= 0.24 && ax < 0.285) {
                            paint = u_carLiveryCol2; // Crisp white twin pinstripes
                        } else if (ax >= 0.285 && ax < 0.32) {
                            paint = u_carLiveryCol1; // Outer accent pinstripe
                        }
                    }
                    // Door & Hood "#39" Racing Roundel Circle
                    float rDoor = length(vec2(lz - 0.08, ly - 0.50));
                    if (ax > 0.76 && rDoor < 0.25) {
                        paint = (rDoor > 0.21) ? u_carLiveryCol1 : u_carLiveryCol2;
                        if (rDoor < 0.14 && fract(lz * 11.0) < 0.52) {
                            paint = vec3(0.08, 0.08, 0.12); // "#39" digits
                        }
                    }
                }

                baseLit = paint;
                baseShade = mix(paint * 0.42, u_shadowCool, 0.58);
            } else if (zoneId == 6) {
                // Car Sub-Zones: 0 = Secondary Body/Aero, 1 = Front Wheel Rim, 2 = Rear Wheel Rim, 3 = Interior Roll Cage & Seats
                vec3 z6Col = u_carSecondary;
                if (subZone == 1) {
                    z6Col = u_carFrontRimColor;
                } else if (subZone == 2) {
                    z6Col = u_carRearRimColor;
                } else if (subZone == 3) {
                    z6Col = u_carCageColor * (1.12 + u_beatPulse * 0.28 * songScale);
                }
                baseLit = z6Col;
                baseShade = mix(z6Col * 0.44, u_shadowCool, 0.56);
            } else if (zoneId == 7) {
                // Car Windshield & Canopy (subZone 1 = Top Windshield Sun-Strip Banner!)
                if (subZone == 1) {
                    vec3 bannerCol = mix(u_carLiveryCol2, u_carSecondary, step(0.5, fract(qLocal.x * 4.5)));
                    fragColor = vec4(bannerCol, 0.25);
                    return;
                }
                vec3 R = reflect(-V, N);
                float streak = step(0.32, fract(R.x * 2.4 + R.y * 1.6 + ditherVal * 0.12 * u_jsrPixelDither));
                vec3 glass = mix(u_shadowCool * 0.6, u_carPrimary, 0.35);
                vec3 finalGlass = mix(glass, vec3(1.0, 1.0, 1.0), streak * 0.88);
                // Frame outline along windshield perimeter (Pixel_Tempys graphic linework)
                float glassFrame = smoothstep(0.015, 0.035, length(fwidth(N))) * u_facetCreaseInk;
                finalGlass = mix(finalGlass, vec3(0.02, 0.01, 0.05), clamp(glassFrame, 0.0, 0.9));
                fragColor = vec4(finalGlass, 0.25);
                return;
            } else if (zoneId == 8) {
                // Dark Tire / Chassis Black with Crisp Rim
                baseLit = vec3(0.16, 0.15, 0.22);
                baseShade = vec3(0.05, 0.04, 0.09);
            }

            vec3 finalColor = mix(baseShade, baseLit, litStep);

            // =====================================================================
            // JSR x NAM_MAC x PIXEL_TEMPYS SIGNATURE SHADING & GREASE-PENCIL CREASE INK
            // =====================================================================
            if (zoneId >= 5 && zoneId <= 8) {
                // 1. Nam_Mac Vertical Vertex-Color Cavity Gradient (subtle ground-to-roof depth + dither)
                float cavityAO = clamp(0.62 + (v_localPos.y + ditherVal * 0.06 * u_jsrPixelDither) * 0.48, 0.56, 1.06);
                finalColor *= mix(1.0, cavityAO, u_jsrPixelDither * 0.65);

                // 2. Auto Modellista View-Space Hard Specular Anime Streak & Nam_Mac Moody Shadow-Side Neon Rim
                if (zoneId == 5 || zoneId == 6) {
                    vec3 H = normalize(L + V);
                    float spec = step(0.91 - u_beatPulse * 0.06 * songScale, max(0.0, dot(N, H)) + ditherVal * 0.04 * u_jsrPixelDither);
                    float fresnel = 1.0 - max(0.0, dot(N, V));
                    float rim = step(0.70 - (u_beatPulse * 0.14 + u_audioSpectrum.x * 0.10) * songScale, fresnel + ditherVal * 0.08 * u_jsrPixelDither);
                    // Nam_Mac signature: Rim light pops strongest on the shadowed side against deep indigo!
                    float shadowRimBoost = mix(0.55, 0.92, 1.0 - litStep * 0.65);
                    finalColor = mix(finalColor, vec3(1.0), spec * (0.75 + u_beatPulse * 0.25 * songScale));
                    finalColor = mix(finalColor, u_carEmissive * (1.08 + u_beatPulse * 0.42 * songScale), rim * shadowRimBoost);

                    // Underbody / Side-Skirt Audio-Reactive Neon Underglow + R4 Drift Charge Tier Glow
                    if (v_localPos.y < 0.38) {
                        float musicUnderglow = clamp(u_beatPulse * 0.65 + u_audioSpectrum.x * 0.55, 0.0, 1.0) * songScale;
                        float driftGlow = clamp(u_carDriveState.z, 0.0, 1.0);
                        float glowStrength = max(musicUnderglow * 0.72, driftGlow);
                        if (glowStrength > 0.08) {
                            vec3 chargeCol = (u_carDriveState.z >= 1.0)
                                ? vec3(1.0, 0.88, 0.18)
                                : ((u_carDriveState.z >= 0.66) ? vec3(1.0, 0.12, 0.78) : mix(u_carEmissive, vec3(0.10, 0.92, 1.0), 0.55));
                            float skirtMask = clamp((0.38 - v_localPos.y) * 3.8, 0.0, 1.0) * glowStrength;
                            finalColor = mix(finalColor, chargeCol * (1.20 + u_beatPulse * 0.42 * songScale), skirtMask * 0.75);
                        }
                    }
                }

                // 3. Pixel_Tempys Grease-Pencil Internal Facet Crease & Panel-Seam Ink Lines
                if (u_facetCreaseInk > 0.05) {
                    // Screen-space derivative normal & zone discontinuity detection (draws crisp ink on every low-poly facet break!)
                    float normEdge = length(fwidth(N));
                    float zoneEdge = fwidth(v_colorId.g * 10.0) + fwidth(v_colorId.b * 10.0);
                    float facetInk = smoothstep(0.18, 0.42, normEdge + zoneEdge * 0.85);

                    // Graphic JSR / Pixel_Tempys hand-inked door cutlines, hood/trunk panel seams & widebody arch bolts
                    float panelSeam = 0.0;
                    if (zoneId == 5) {
                        float ax = abs(v_localPos.x);
                        float ly = v_localPos.y;
                        float lz = v_localPos.z;
                        // Door vertical cutlines (z = 0.58 and z = -0.48 on side doors)
                        if (ax > 0.74 && ly > 0.24 && ly < 0.78) {
                            if (abs(lz - 0.58) < 0.018 || abs(lz + 0.48) < 0.018 || abs(ly - 0.50) < 0.014) {
                                panelSeam = 0.88;
                            }
                        }
                        // Hood & Trunk shut-lines on top deck
                        if (ly > 0.55 && ax > 0.54 && ax < 0.58 && (lz > 0.75 || lz < -1.15)) {
                            panelSeam = 0.85;
                        }
                    }
                    float totalCreaseInk = clamp(max(facetInk * 0.90, panelSeam) * u_facetCreaseInk, 0.0, 0.95);
                    finalColor = mix(finalColor, vec3(0.02, 0.01, 0.05), totalCreaseInk);
                }
            } else if (u_facetCreaseInk > 0.05 && (zoneId == 1 || zoneId == 2 || zoneId == 3)) {
                // Pixel_Tempys Facet Ink on low-poly track curbs, Nagai palm fronds & Shibuya buildings
                float envNormEdge = length(fwidth(N));
                float envCrease = smoothstep(0.24, 0.55, envNormEdge) * u_facetCreaseInk * 0.78;
                finalColor = mix(finalColor, vec3(0.02, 0.01, 0.05), envCrease);
            }

            // Emissive / Audio-Reactive Mask channel (a)
            if (v_colorId.a > 0.1) {
                float glow = v_colorId.a * (1.0 + (u_audioSpectrum.x * 1.10 + u_beatPulse * 0.60) * songScale);
                finalColor = mix(finalColor, u_carEmissive * 1.40, clamp(glow, 0.0, 1.0));
            }

            // Output alpha = 0.25 for Car Subject (zoneId >= 5) so Kuwahara/Smudge post-processing preserves razor-sharp Car Ink & Pixel Art!
            float outAlpha = (zoneId >= 5) ? 0.25 : 1.0;
            fragColor = vec4(finalColor, outAlpha);
        }`;
        this.worldProg = this.createProgram(worldVS, worldFS);

        // 3. PILLAR 2.2 & PIP-03 PHASE 4: PING-PONG TEMPORAL "PAINT SMUDGE" + KUWAHARA + REDLINE SPEED-LINE SHADER
        const postVS = `#version 300 es
        layout(location = 0) in vec2 a_pos;
        out vec2 v_uv;
        void main() {
            v_uv = a_pos * 0.5 + 0.5;
            gl_Position = vec4(a_pos, 0.0, 1.0);
        }`;

        const smudgeFS = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;

        uniform sampler2D u_currentScene;
        uniform sampler2D u_historyTex;
        uniform vec2 u_resolution;
        uniform vec2 u_vanishingPointUV;
        uniform float u_normalizedSpeed;
        uniform float u_boostIntensity;
        uniform float u_angularYawVel;
        uniform float u_smudgeSetting;
        uniform float u_smudgeThreshold;
        uniform float u_kuwaharaSetting;
        uniform float u_inkSetting;
        uniform float u_speedLinesSetting;
        uniform float u_bassPulse;
        uniform vec4 u_audioSpectrum;
        uniform float u_dropIntensity;
        uniform float u_time;
        uniform vec3 u_vibeEmissive;

        // Procedural anisotropic brush-stroke flow noise stretched along radial velocity vector
        vec2 brushFlow(vec2 uv, vec2 radialDir, float t) {
            vec2 orthoDir = vec2(-radialDir.y, radialDir.x);
            vec2 anisoUV = vec2(dot(uv, radialDir) * 0.45, dot(uv, orthoDir) * 2.35);
            float n1 = sin(anisoUV.x * 42.0 + t * 16.0) * cos(anisoUV.y * 38.0 - t * 11.0);
            float n2 = cos(anisoUV.x * 85.0 - t * 21.0) * sin(anisoUV.y * 74.0 + t * 16.0);
            return radialDir * (n1 + n2 * 0.5) + orthoDir * (n2 - n1 * 0.5) * 0.35;
        }

        float luma(vec3 c) {
            return dot(c, vec3(0.299, 0.587, 0.114));
        }

        float saturation(vec3 c) {
            float mx = max(max(c.r, c.g), c.b);
            float mn = min(min(c.r, c.g), c.b);
            return (mx > 0.001) ? (mx - mn) / mx : 0.0;
        }

        void main() {
            vec2 uv = v_uv;
            vec2 texel = 1.0 / u_resolution;
            float songScale = clamp(u_dropIntensity, 0.0, 1.0);
            float dropGate = smoothstep(0.50, 0.90, songScale);

            // PIP-03 Phase 4: True 3D Projected Vanishing-Point Focal Mask (keep apex/car sharp, smear outer periphery!)
            vec2 vanishPt = clamp(u_vanishingPointUV, vec2(0.18, 0.22), vec2(0.82, 0.68));
            vec2 toCenter = vanishPt - uv;
            float radialDist = length(toCenter * vec2(1.25, 1.0));
            float peripheryMask = smoothstep(0.15, 0.65, radialDist);

            // Effective speed + song-section-gated music factor for Paint Smudge (clean in Breakdowns/Grooves, smears on Drops!)
            float thresh = clamp(u_smudgeThreshold, 0.10, 0.85);
            float speedFactor = clamp((u_normalizedSpeed - thresh) / max(0.15, 1.0 - thresh), 0.0, 1.0);
            float musicSmudge = clamp(u_bassPulse * 0.65 + u_audioSpectrum.x * 0.48 + u_audioSpectrum.z * 0.30, 0.0, 1.0) * dropGate;
            float smudgePower = clamp(max(speedFactor * 0.82, musicSmudge * 0.76) + u_boostIntensity * 0.68 + u_bassPulse * 0.22 * dropGate, 0.0, 1.0) * u_smudgeSetting;

            // 1. Directional 4-Sector Kuwahara Oil-Paint Filter on Outer Periphery Driven by Speed + Drop Intensity
            // JSR x Nam_Mac x Pixel_Tempys Ink Protection: alpha < 0.5 marks the Car Subject, keeping its pixel art & crease ink 100% sharp!
            vec4 sceneSample = texture(u_currentScene, uv);
            vec3 currentColor = sceneSample.rgb;
            float carInkProtect = (sceneSample.a < 0.5) ? 0.0 : 1.0;
            float kuwRadius = smudgePower * peripheryMask * carInkProtect * u_kuwaharaSetting * (3.0 + u_bassPulse * 1.25 * dropGate);
            if (kuwRadius > 0.42) {
                vec3 mean[4];
                vec3 sigma[4];
                vec2 offsets[4] = vec2[4](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0));
                float minVar = 1e6;
                vec3 bestMean = currentColor;

                for (int k = 0; k < 4; k++) {
                    vec3 m = vec3(0.0);
                    vec3 s = vec3(0.0);
                    for (int i = 0; i <= 1; i++) {
                        for (int j = 0; j <= 1; j++) {
                            vec2 sampleUV = uv + (offsets[k] * vec2(float(i), float(j)) * texel * kuwRadius);
                            vec3 c = texture(u_currentScene, clamp(sampleUV, 0.0, 1.0)).rgb;
                            m += c;
                            s += c * c;
                        }
                    }
                    m *= 0.25;
                    s = abs(s * 0.25 - m * m);
                    float variance = s.r + s.g + s.b;
                    if (variance < minVar) {
                        minVar = variance;
                        bestMean = m;
                    }
                }
                currentColor = mix(currentColor, bestMean, clamp(peripheryMask * carInkProtect * 0.86, 0.0, 1.0));
            }

            // 2. Radial + Camera Angular Advection + Audio-Reactive Anisotropic Brush-Stroke Distortion
            vec2 radialDir = normalize(toCenter + vec2(0.0001));
            vec2 brush = brushFlow(uv * 2.2, radialDir, u_time) * 0.0052 * (0.45 + speedFactor + u_bassPulse * 0.80 * dropGate);
            vec2 lateralAdvect = vec2(u_angularYawVel * 0.012, 0.0);
            float radialPull = 0.011 + u_boostIntensity * 0.016 + (u_bassPulse * 0.012 + u_audioSpectrum.x * 0.008) * dropGate;
            vec2 advectOffset = (radialDir * radialPull + lateralAdvect + brush) * (0.35 + peripheryMask * 0.95) * smudgePower;

            vec2 histUV = clamp(uv + advectOffset, 0.002, 0.998);
            vec3 historyColor = texture(u_historyTex, histUV).rgb;

            // Painterly hue & neon harmonic shimmer along the trail during Drift Boosts & Beat Drops
            float hueShiftAmt = clamp(u_boostIntensity * 0.14 + (u_bassPulse * 0.12 + u_audioSpectrum.w * 0.08) * dropGate, 0.0, 0.28);
            if (hueShiftAmt > 0.02) {
                historyColor = mix(historyColor, historyColor.gbr * 1.12, hueShiftAmt);
            }

            // Weight smear persistence heavily toward saturated & bright paint strokes (while keeping car subject crisp!)
            float histSat = saturation(historyColor);
            float histLum = luma(historyColor);
            float paintWeight = clamp(0.45 + histSat * 0.45 + histLum * 0.35, 0.0, 1.0);
            float blendFactor = clamp(smudgePower * peripheryMask * carInkProtect * paintWeight * 0.91, 0.0, 0.92);

            vec3 smudgedColor = mix(currentColor, max(currentColor, historyColor * 0.97), blendFactor);

            fragColor = vec4(smudgedColor, sceneSample.a);
        }`;
        this.smudgeProg = this.createProgram(postVS, smudgeFS);

        // 4. FINAL SCREEN COMPOSITE PASS: Roberts Cross Heavy Ink Outlines + Chromatic Overdrive + Redline Polar Speed Lines
        const compositeFS = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;

        uniform sampler2D u_smudgedTex;
        uniform sampler2D u_rawSceneTex;
        uniform vec2 u_resolution;
        uniform vec2 u_vanishingPointUV;
        uniform float u_normalizedSpeed;
        uniform float u_boostIntensity;
        uniform float u_inkSetting;
        uniform float u_speedLinesSetting;
        uniform float u_bassPulse;
        uniform vec4 u_audioSpectrum;
        uniform float u_dropIntensity;
        uniform float u_time;
        uniform vec3 u_vibeEmissive;
        uniform int u_debugBufferMode;

        float luma(vec3 c) {
            return dot(c, vec3(0.299, 0.587, 0.114));
        }

        void main() {
            vec2 uv = v_uv;
            vec2 texel = 1.0 / u_resolution;
            float songScale = clamp(u_dropIntensity, 0.0, 1.0);
            float dropGate = smoothstep(0.52, 0.90, songScale);

            if (u_debugBufferMode == 1) {
                fragColor = vec4(texture(u_rawSceneTex, uv).rgb, 1.0);
                return;
            }
            if (u_debugBufferMode == 2) {
                fragColor = vec4(texture(u_smudgedTex, uv).rgb, 1.0);
                return;
            }

            vec2 vanishPt = clamp(u_vanishingPointUV, vec2(0.18, 0.22), vec2(0.82, 0.68));
            vec2 toVanish = uv - vanishPt;
            float radialDist = length(toVanish * vec2(1.25, 1.0));
            float peripheryMask = smoothstep(0.16, 0.70, radialDist);

            // Peripheral Radial Chromatic Aberration Overdrive on High Speed / Drift Boost / Song Drop Kicks
            float chromaStrength = (clamp((u_normalizedSpeed - 0.72) / 0.35, 0.0, 1.0) * 0.45 + u_boostIntensity * 0.95 + (u_bassPulse * 0.82 + u_audioSpectrum.x * 0.50) * dropGate) * peripheryMask;
            vec2 chromaShift = normalize(toVanish + vec2(0.0001)) * texel * (4.0 * chromaStrength);
            vec3 col;
            col.r = texture(u_smudgedTex, clamp(uv + chromaShift, 0.001, 0.999)).r;
            col.g = texture(u_smudgedTex, uv).g;
            col.b = texture(u_smudgedTex, clamp(uv - chromaShift, 0.001, 0.999)).b;

            // 1. Roberts Cross Heavy Anime Ink Edge Detection on Raw Scene (neon highlights unlock on Drops!)
            if (u_inkSetting > 0.05) {
                float edgeStep = 1.25 + u_bassPulse * 0.42 * dropGate;
                vec3 c00 = texture(u_rawSceneTex, uv).rgb;
                vec3 c11 = texture(u_rawSceneTex, uv + texel * edgeStep).rgb;
                vec3 c10 = texture(u_rawSceneTex, uv + vec2(texel.x * edgeStep, 0.0)).rgb;
                vec3 c01 = texture(u_rawSceneTex, uv + vec2(0.0, texel.y * edgeStep)).rgb;

                vec3 diff1 = c00 - c11;
                vec3 diff2 = c10 - c01;
                float edge = sqrt(dot(diff1, diff1) + dot(diff2, diff2));
                float inkMask = smoothstep(0.26, 0.50, edge) * u_inkSetting;
                vec3 inkColor = mix(vec3(0.03, 0.01, 0.06), u_vibeEmissive * 1.15, peripheryMask * clamp((u_bassPulse * 0.42 + u_audioSpectrum.w * 0.32) * dropGate, 0.0, 0.65));
                col = mix(col, inkColor, inkMask * 0.80);
            }

            // 2. Redline Anime Polar Speed-Lines Anchored to True 3D Vanishing Point (driven by Speed + Drop Beats/Snares!)
            float musicLines = clamp((u_bassPulse * 0.72 + u_audioSpectrum.z * 0.48 + u_audioSpectrum.w * 0.45 - 0.36) * dropGate, 0.0, 0.85);
            float speedIntensity = clamp(max((u_normalizedSpeed - 0.62) / 0.45, musicLines) + u_boostIntensity * 0.88, 0.0, 1.0) * u_speedLinesSetting;
            if (speedIntensity > 0.05) {
                vec2 delta = (uv - vanishPt) * vec2(u_resolution.x / u_resolution.y, 1.0);
                float r = length(delta);
                float angle = atan(delta.y, delta.x);

                // Quantized angular spikes
                float angularCell = floor(angle * 72.0);
                float hash = fract(sin(angularCell * 127.1 + floor(u_time * 24.0) * 311.7) * 43758.5453);
                float spikeStart = 0.44 + (1.0 - speedIntensity) * 0.28 + hash * 0.26;

                if (r > spikeStart && hash > 0.68) {
                    float thin = abs(fract(angle * 72.0) - 0.5);
                    if (thin < 0.19 * (r - spikeStart) * 2.5) {
                        // Alternate between heavy black Redline ink streaks and blazing Vibe neon streaks!
                        vec3 streakCol = (hash > 0.82 - u_bassPulse * 0.15 * dropGate) ? mix(vec3(1.0), u_vibeEmissive, 0.68) : vec3(0.02, 0.01, 0.05);
                        col = streakCol;
                    }
                }
            }

            // 3. Rhythmic Peripheral Neon Rave Glow & Vignette Punch (scales with song intensity)
            float bassGlow = peripheryMask * (u_bassPulse * 0.18 + u_audioSpectrum.x * 0.14) * dropGate;
            col = mix(col, max(col, u_vibeEmissive * 1.15), clamp(bassGlow, 0.0, 0.30));

            float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * (0.35 - u_bassPulse * 0.10 * songScale);
            col *= vig;

            fragColor = vec4(col, 1.0);
        }`;
        this.compositeProg = this.createProgram(postVS, compositeFS);
    }

    initTextures() {
        const gl = this.gl;
        this.djTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        // Point / Nearest-Neighbor filtering for crisp JSR x Nam_Mac x Pixel_Tempys pixel-art broadcast
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    updateDJTexture(djCanvas) {
        if (!djCanvas) return;
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        const w = djCanvas.width || 512;
        const h = djCanvas.height || 256;
        if (this.djTexWidth !== w || this.djTexHeight !== h) {
            this.djTexWidth = w;
            this.djTexHeight = h;
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, djCanvas);
        } else {
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, djCanvas);
        }
    }

    resize() {
        const gl = this.gl;
        if (!gl) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const w = Math.max(320, Math.floor(window.innerWidth * dpr));
        const h = Math.max(240, Math.floor(window.innerHeight * dpr));
        if (w === this.width && h === this.height) return;

        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;

        this.initFramebuffers(w, h);
    }

    disposeFBO(fboObj) {
        const gl = this.gl;
        if (!fboObj || !gl) return;
        if (fboObj.tex) gl.deleteTexture(fboObj.tex);
        if (fboObj.depthRb) gl.deleteRenderbuffer(fboObj.depthRb);
        if (fboObj.fbo) gl.deleteFramebuffer(fboObj.fbo);
    }

    createFBO(w, h, withDepth) {
        const gl = this.gl;
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

        let depthRb = null;
        if (withDepth) {
            depthRb = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fbo, tex, depthRb };
    }

    initFramebuffers(w, h) {
        if (this.sceneFBO) this.disposeFBO(this.sceneFBO);
        if (this.historyFBOs) {
            for (const fbo of this.historyFBOs) this.disposeFBO(fbo);
        }
        this.sceneFBO = this.createFBO(w, h, true);
        this.historyFBOs = [
            this.createFBO(w, h, false),
            this.createFBO(w, h, false)
        ];
    }

    disposeMesh(mesh) {
        const gl = this.gl;
        if (!mesh || !gl) return;
        if (mesh.vbo) gl.deleteBuffer(mesh.vbo);
        if (mesh.vao) gl.deleteVertexArray(mesh.vao);
    }

    createVAOFromArrays(verts) {
        // Interleaved vertex format: [x,y,z, nx,ny,nz, r,g,b,a, u,v] = 12 floats per vertex
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const data = (verts instanceof Float32Array) ? verts : new Float32Array(verts);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

        const stride = 12 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 6 * 4);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 10 * 4);

        gl.bindVertexArray(null);
        return { vao, vbo, count: data.length / 12 };
    }

    pushQuad(verts, p0, p1, p2, p3, normal, colorId, uv0 = [0, 0], uv1 = [1, 1]) {
        const v = (p, uv) => {
            verts.push(
                p[0], p[1], p[2],
                normal[0], normal[1], normal[2],
                colorId[0], colorId[1], colorId[2], colorId[3],
                uv[0], uv[1]
            );
        };
        v(p0, [uv0[0], uv0[1]]);
        v(p1, [uv1[0], uv0[1]]);
        v(p2, [uv1[0], uv1[1]]);
        v(p0, [uv0[0], uv0[1]]);
        v(p2, [uv1[0], uv1[1]]);
        v(p3, [uv0[0], uv1[1]]);
    }

    pushBox(verts, center, size, colorId) {
        const [cx, cy, cz] = center;
        const [hx, hy, hz] = [size[0] * 0.5, size[1] * 0.5, size[2] * 0.5];
        const hasGround = (this.currentGroundY !== undefined && this.currentGroundY !== null);
        const hBot = hasGround ? Math.max(0.0, (cy - hy) - this.currentGroundY) : 0.0;
        const hTop = hasGround ? Math.max(0.0, (cy + hy) - this.currentGroundY) : 0.0;

        let rx = 1.0, rz = 0.0, fx = 0.0, fz = 1.0;
        if (this.currentTrackSample && this.currentTrackSample.forward) {
            const fwd = this.currentTrackSample.forward;
            const fLen = Math.hypot(fwd[0], fwd[2]) || 1.0;
            fx = fwd[0] / fLen;
            fz = fwd[2] / fLen;
            rx = fz;
            rz = -fx;
        }

        const pt = (lx, ly, lz) => [
            cx + rx * lx + fx * lz,
            cy + ly,
            cz + rz * lx + fz * lz
        ];

        const p000 = pt(-hx, -hy, -hz), p100 = pt(hx, -hy, -hz), p101 = pt(hx, -hy, hz), p001 = pt(-hx, -hy, hz);
        const p010 = pt(-hx,  hy, -hz), p110 = pt(hx,  hy, -hz), p111 = pt(hx,  hy, hz), p011 = pt(-hx,  hy, hz);

        const pushFace = (p0, p1, p2, p3, normal, uv0, uv1, uv2, uv3) => {
            const v = (p, uv) => {
                verts.push(
                    p[0], p[1], p[2],
                    normal[0], normal[1], normal[2],
                    colorId[0], colorId[1], colorId[2], colorId[3],
                    uv[0], uv[1]
                );
            };
            v(p0, uv0);
            v(p1, uv1);
            v(p2, uv2);
            v(p0, uv0);
            v(p2, uv2);
            v(p3, uv3);
        };
        // Top (+Y)
        pushFace(p010, p110, p111, p011, [0, 1, 0], [hTop, 0], [hTop, 0], [hTop, 1], [hTop, 1]);
        // Bottom (-Y)
        pushFace(p001, p101, p100, p000, [0, -1, 0], [hBot, 0], [hBot, 0], [hBot, 1], [hBot, 1]);
        // Front (+F)
        pushFace(p001, p101, p111, p011, [fx, 0, fz], [hBot, 0], [hBot, 0], [hTop, 1], [hTop, 1]);
        // Back (-F)
        pushFace(p100, p000, p010, p110, [-fx, 0, -fz], [hBot, 0], [hBot, 0], [hTop, 1], [hTop, 1]);
        // Right (+R)
        pushFace(p101, p100, p110, p111, [rx, 0, rz], [hBot, 0], [hBot, 0], [hTop, 1], [hTop, 1]);
        // Left (-R)
        pushFace(p000, p001, p011, p010, [-rx, 0, -rz], [hBot, 0], [hBot, 0], [hTop, 1], [hTop, 1]);
    }

    initMeshes() {
        const gl = this.gl;

        // 1. Fullscreen Quad for Skybox & Post-Processing
        this.quadVAO = gl.createVertexArray();
        gl.bindVertexArray(this.quadVAO);
        const qBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);

        // 2. Build 3D Track Mesh, Sector Set-Pieces & Jumbotron Screens along TrackSpline
        this.buildTrackAndJumbotronMeshes();

        // 3. Build Stylized 90s JDM / Ridge Racer Aero Sports Car Mesh
        this.buildSportsCarMesh();

        // 4. Unit Cube for Toon Smoke & Paint Splatter VFX Particles
        const pVerts = [];
        this.pushBox(pVerts, [0, 0, 0], [1, 1, 1], [1.0, 0.4, 0.0, 0.8]);
        this.particleMesh = this.createVAOFromArrays(pVerts);

        // 5. Low-Poly 3D Exhaust Afterburner / Gear-Shift Backfire Flame Cone (points along -Z)
        const fVerts = [];
        const coneSegs = 8;
        const baseR = 0.11;
        for (let i = 0; i < coneSegs; i++) {
            const a0 = (i / coneSegs) * Math.PI * 2;
            const a1 = ((i + 1) / coneSegs) * Math.PI * 2;
            const x0 = Math.cos(a0) * baseR, y0 = Math.sin(a0) * baseR;
            const x1 = Math.cos(a1) * baseR, y1 = Math.sin(a1) * baseR;
            // Outer flame sheath (alpha fade from 0.95 at nozzle z=0 to 0.15 at tip z=-1.0)
            fVerts.push(
                x0, y0,  0.0,  x0, y0, 0,  1.0, 0.4, 0.0, 0.95,  0.15, 0.0,
                x1, y1,  0.0,  x1, y1, 0,  1.0, 0.4, 0.0, 0.95,  0.85, 0.0,
                0,  0,  -1.0,  0,  0, -1,  1.0, 0.4, 0.0, 0.18,  0.50, 1.0
            );
            // Inner white-hot core cone
            fVerts.push(
                x0 * 0.55, y0 * 0.55,  0.02,  0, 0, -1,  1.0, 0.4, 0.0, 1.0,  0.50, 0.0,
                x1 * 0.55, y1 * 0.55,  0.02,  0, 0, -1,  1.0, 0.4, 0.0, 1.0,  0.50, 0.0,
                0,         0,         -0.62,  0, 0, -1,  1.0, 0.4, 0.0, 0.85, 0.50, 1.0
            );
        }
        this.afterburnerMesh = this.createVAOFromArrays(fVerts);

        // 6. Dynamic Streaming VBO/VAO for R4 Ridge Racer Type 4 3D Taillight Light-Trail Ribbons
        this.trailVAO = gl.createVertexArray();
        gl.bindVertexArray(this.trailVAO);
        this.trailVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.trailVBO);
        this.maxTrailVerts = 28 * 4 * 2 * 6; // 4 cars * 2 taillights * 28 segments * 6 verts
        gl.bufferData(gl.ARRAY_BUFFER, this.maxTrailVerts * 12 * 4, gl.DYNAMIC_DRAW);
        const stride = 12 * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 3 * 4);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 6 * 4);
        gl.enableVertexAttribArray(3);
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 10 * 4);
        gl.bindVertexArray(null);
    }

    buildTrackAndJumbotronMeshes() {
        if (this.trackMesh) this.disposeMesh(this.trackMesh);
        if (this.jumbotronMesh) this.disposeMesh(this.jumbotronMesh);

        const spline = this.trackSpline;
        const samples = spline.samples;
        const n = samples.length;

        const trackVerts = [];
        const jumbotronVerts = [];
        let cumDistL = 0.0;
        let cumDistR = 0.0;

        for (let i = 0; i < n; i++) {
            const s0 = samples[i];
            const s1 = samples[(i + 1) % n];
            this.currentGroundY = s0.pos[1];
            this.currentTrackSample = s0;
            const hw0 = s0.halfWidth || spline.roadHalfWidth;
            const hw1 = s1.halfWidth || spline.roadHalfWidth;
            const chev = s0.chevronIntensity || 0.0;
            const inCorner = chev >= 0.15;
            const curbW = inCorner ? 2.1 : 1.45;
            const curbH = inCorner ? 0.48 : 0.55;

            const addPt = (s, lat, upOff) => [
                s.pos[0] + s.right[0] * lat + s.up[0] * upOff,
                s.pos[1] + s.right[1] * lat + s.up[1] * upOff,
                s.pos[2] + s.right[2] * lat + s.up[2] * upOff
            ];

            // 1. Road Asphalt Surface (zoneId = 0.0) parameterized in TRUE PHYSICAL METERS (1 UV unit = 10.0m)
            const rL0 = addPt(s0, -hw0, 0);
            const rR0 = addPt(s0, hw0, 0);
            const rR1 = addPt(s1, hw1, 0);
            const rL1 = addPt(s1, -hw1, 0);
            const s0Dist = s0.distance !== undefined ? s0.distance : (i / n) * spline.totalLength;
            const s1Dist = (i + 1 < n && s1.distance !== undefined) ? s1.distance : spline.totalLength;
            const roadUv0 = s0Dist / 10.0;
            const roadUv1 = s1Dist / 10.0;
            this.pushQuad(trackVerts, rL0, rR0, rR1, rL1, s0.up, [0.5, 0.0, 0.0, 0.0], [0, roadUv0], [1, roadUv1]);

            // Track true 3D arc-length along Left and Right road edges so inner/outer curb stripes never squash or stretch in turns!
            const segLenL = Math.hypot(rL1[0] - rL0[0], rL1[1] - rL0[1], rL1[2] - rL0[2]);
            const segLenR = Math.hypot(rR1[0] - rR0[0], rR1[1] - rR0[1], rR1[2] - rR0[2]);
            const curbUvL0 = cumDistL / 4.0;
            const curbUvL1 = (cumDistL + segLenL) / 4.0;
            const curbUvR0 = cumDistR / 4.0;
            const curbUvR1 = (cumDistR + segLenR) / 4.0;
            cumDistL += segLenL;
            cumDistR += segLenR;

            // 1B. 3D Checkered Start / Finish Line Strip (at lap boundary i = 0..1 and grid launch line i = 19)
            if (i === 0 || i === 1 || i === 19) {
                const numChecks = 12;
                for (let c = 0; c < numChecks; c++) {
                    const f0 = -0.92 + (c / numChecks) * 1.84;
                    const f1 = -0.92 + ((c + 1) / numChecks) * 1.84;
                    const isWhite = (c + i) % 2 === 0;
                    const zCol = isWhite ? [1.0, 0.3, 0.0, 0.35] : [0.2, 0.8, 0.0, 0.0];
                    const pA = addPt(s0, f0 * hw0, 0.04);
                    const pB = addPt(s0, f1 * hw0, 0.04);
                    const pC = addPt(s1, f1 * hw1, 0.04);
                    const pD = addPt(s1, f0 * hw1, 0.04);
                    this.pushQuad(trackVerts, pA, pB, pC, pD, s0.up, zCol, [0, 0], [0, 1]);
                }
            }

            // 1C. Starting Grid Box Brackets on Asphalt (samples 9, 12, 15, 17)
            if (i === 9 || i === 12 || i === 15 || i === 17) {
                const gridLat = (i === 9 || i === 15) ? 3.4 : -3.4;
                const gL0 = addPt(s0, gridLat - 1.35, 0.035);
                const gR0 = addPt(s0, gridLat + 1.35, 0.035);
                const gFrontL = addPt(s1, gridLat - 1.35, 0.035);
                const gFrontR = addPt(s1, gridLat + 1.35, 0.035);
                this.pushQuad(trackVerts, gL0, gR0, gFrontR, gFrontL, s0.up, [1.0, 0.4, 0.0, 0.65], [0, 0], [0, 1]);
            }

            // 2. Corner-Focused Apex Rumble Curbs vs Straightaway Guardrail Barriers (True Edge-Length Meter UVs)
            const cL0 = addPt(s0, -hw0 - curbW, curbH);
            const cL1 = addPt(s1, -hw1 - curbW, curbH);
            const cR0 = addPt(s0, hw0 + curbW, curbH);
            const cR1 = addPt(s1, hw1 + curbW, curbH);

            if (inCorner) {
                // High-contrast alternating Vibe rumble curbs at corners (zoneId = 0.1) with true edge-meter UVs
                const curbGlow = Math.min(0.45, chev * 0.45);
                this.pushQuad(trackVerts, cL0, rL0, rL1, cL1, s0.up, [0.9, 0.1, 0.0, curbGlow], [0, curbUvL0], [1, curbUvL1]);
                this.pushQuad(trackVerts, rR0, cR0, cR1, rR1, s0.up, [0.9, 0.1, 0.0, curbGlow], [0, curbUvR0], [1, curbUvR1]);

                // Inner-apex traversable rumble apron strip (1.4m wide, 0.06m high) on inside of turn
                const apexSide = s0.apexSide || Math.sign(s0.curvatureRadPerMeter || s0.curvature || 0);
                if (apexSide !== 0) {
                    const apronW = 1.4;
                    const aOuter0 = addPt(s0, apexSide * hw0, 0.06);
                    const aInner0 = addPt(s0, apexSide * (hw0 - apronW), 0.02);
                    const aInner1 = addPt(s1, apexSide * (hw1 - apronW), 0.02);
                    const aOuter1 = addPt(s1, apexSide * hw1, 0.06);
                    if (apexSide < 0) {
                        this.pushQuad(trackVerts, aOuter0, aInner0, aInner1, aOuter1, s0.up, [0.95, 0.1, 0.0, 0.3], [0, curbUvL0], [1, curbUvL1]);
                    } else {
                        this.pushQuad(trackVerts, aInner0, aOuter0, aOuter1, aInner1, s0.up, [0.95, 0.1, 0.0, 0.3], [0, curbUvR0], [1, curbUvR1]);
                    }
                }
            } else {
                // Sleek architectural concrete/metal guardrail barriers on straights (zoneId = 0.3, uv.x = 0 so road guardrails never bounce)
                this.pushQuad(trackVerts, cL0, rL0, rL1, cL1, s0.up, [0.75, 0.3, 0.0, 0.0], [0, curbUvL0], [0, curbUvL1]);
                this.pushQuad(trackVerts, rR0, cR0, cR1, rR1, s0.up, [0.75, 0.3, 0.0, 0.0], [0, curbUvR0], [0, curbUvR1]);
            }

            // PIP-03 Phase 1: High-Frequency Roadside Neon Speed Bollards / Reflector Posts every 4 samples (strictly 10.0m intervals!)
            if (i % 4 === 0) {
                const bollardLat = hw0 + curbW * 0.55;
                const bollardH = inCorner ? 0.42 : 0.52;
                const bL = addPt(s0, -bollardLat, curbH + bollardH * 0.5);
                const bR = addPt(s0,  bollardLat, curbH + bollardH * 0.5);
                // Dark post base + high-contrast audio-reactive neon reflector cap (zoneId = 0.4)
                this.pushBox(trackVerts, bL, [0.22, bollardH, 0.32], [0.45, 0.3, 0.0, 0.0]);
                this.pushBox(trackVerts, bR, [0.22, bollardH, 0.32], [0.45, 0.3, 0.0, 0.0]);
                const capL = addPt(s0, -bollardLat, curbH + bollardH + 0.10);
                const capR = addPt(s0,  bollardLat, curbH + bollardH + 0.10);
                this.pushBox(trackVerts, capL, [0.28, 0.22, 0.48], [1.0, 0.4, 0.0, 0.92]);
                this.pushBox(trackVerts, capR, [0.28, 0.22, 0.48], [1.0, 0.4, 0.0, 0.92]);
            }

            // 3. Outer-Wall Neon Chevron Sightline Boards (>>>) for 200m+ corner telegraphing
            if (chev > 0.24 && i % 3 === 0) {
                const turnDir = Math.sign(s0.curvatureRadPerMeter || s0.curvature || 1);
                const outerSide = -turnDir; // Left wall (-1) for Right turn (+1), Right wall (+1) for Left turn (-1)
                const boardBase = addPt(s0, outerSide * (hw0 + curbW + 1.1), 2.5);

                // Backing signpost & dark frame (zoneId = 0.3)
                this.pushBox(trackVerts, [boardBase[0], boardBase[1] - 1.1, boardBase[2]], [0.45, 2.6, 0.45], [0.5, 0.3, 0.0, 0.0]);
                this.pushBox(trackVerts, boardBase, [1.8, 1.55, 1.8], [0.4, 0.3, 0.0, 0.0]);

                // High-visibility glowing neon chevron arrow strips pointing toward the inner apex (zoneId = 0.4)
                const tipOffset = turnDir * 0.55;
                const upperWing = addPt(s0, outerSide * (hw0 + curbW + 0.85) + tipOffset * 0.5, 2.92);
                const midTip = addPt(s0, outerSide * (hw0 + curbW + 0.72) + tipOffset, 2.50);
                const lowerWing = addPt(s0, outerSide * (hw0 + curbW + 0.85) + tipOffset * 0.5, 2.08);
                this.pushBox(trackVerts, upperWing, [1.35, 0.34, 1.35], [1.0, 0.4, 0.0, 1.0]);
                this.pushBox(trackVerts, midTip, [1.45, 0.38, 1.45], [1.0, 0.4, 0.0, 1.0]);
                this.pushBox(trackVerts, lowerWing, [1.35, 0.34, 1.35], [1.0, 0.4, 0.0, 1.0]);
            }

            // 4. Corner Turn-In Distance Marker Pillars (150m / 100m / 50m countdown gates)
            if (s0.isCornerEntryGate) {
                const bars = s0.isCornerEntryGate === 150 ? 3 : (s0.isCornerEntryGate === 100 ? 2 : 1);
                const pilH = 3.6 + bars * 1.05;
                for (const side of [-1, 1]) {
                    const gatePos = addPt(s0, side * (hw0 + curbW + 1.6), 0);
                    // Structural marker pylon (zoneId = 0.3)
                    this.pushBox(trackVerts, [gatePos[0], gatePos[1] + pilH * 0.5, gatePos[2]], [0.85, pilH, 0.85], [0.8, 0.3, 0.0, 0.0]);
                    // 3-bar (150m), 2-bar (100m), or 1-bar (50m) glowing neon countdown stripes (zoneId = 0.4)
                    for (let b = 0; b < bars; b++) {
                        const barY = gatePos[1] + 2.2 + b * 1.15;
                        const barInward = addPt(s0, side * (hw0 + curbW + 1.15), 2.2 + b * 1.15);
                        this.pushBox(trackVerts, [barInward[0], barY, barInward[2]], [1.55, 0.42, 1.15], [1.0, 0.4, 0.0, 1.0]);
                    }
                }
            }

            // 5. Sector & Custom Map Set-Pieces!
            const sp = s0.setPiece || null;

            if (sp === 'CRANE_PORT') {
                // Port Container Gantry Cranes straddling the roadway + Stacked Shipping Container Yards
                if (i % 14 === 0) {
                    const craneSide = (i % 28 === 0) ? -1 : 1;
                    const legInner = addPt(s0, craneSide * (hw0 + 3.2), 0);
                    const legOuter = addPt(s0, craneSide * (hw0 + 14.5), 0);
                    const boomTopY = s0.pos[1] + 29.0;
                    // Twin Portal Legs & Cross-Struts (zoneId = 0.3)
                    this.pushBox(trackVerts, [legInner[0], s0.pos[1] + 14.5, legInner[2]], [1.8, 29.0, 1.8], [0.85, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [legOuter[0], s0.pos[1] + 14.5, legOuter[2]], [1.8, 29.0, 1.8], [0.85, 0.3, 0.0, 0.0]);
                    // Cantilevered Horizontal Crane Boom spanning across the track (+29m)
                    const boomMid = addPt(s0, craneSide * 2.5, 29.0);
                    this.pushBox(trackVerts, [boomMid[0], boomTopY, boomMid[2]], [hw0 * 2.4, 2.2, 2.4], [0.95, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [boomMid[0], boomTopY + 1.5, boomMid[2]], [hw0 * 2.3, 0.45, 0.8], [1.0, 0.4, 0.0, 1.0]);
                    // Upper A-Frame Tower & Tension Mast (+38m)
                    this.pushBox(trackVerts, [legInner[0], boomTopY + 5.5, legInner[2]], [1.5, 11.0, 1.5], [0.9, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [legInner[0], boomTopY + 11.2, legInner[2]], [2.2, 1.2, 2.2], [1.0, 0.4, 0.0, 1.0]);
                    // Suspended Hoist Spreader & Glowing Shipping Container hanging 14m above the asphalt!
                    const containerPos = addPt(s0, -craneSide * 3.5, 15.2);
                    this.pushBox(trackVerts, [containerPos[0], containerPos[1] + 6.5, containerPos[2]], [0.35, 11.0, 0.35], [0.5, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, containerPos, [3.4, 3.2, 8.2], [0.95, 0.1, 0.0, 0.35]);
                }
                if (i % 7 === 0) {
                    for (const side of [-1, 1]) {
                        const cBase = addPt(s0, side * (hw0 + 7.2), 1.6);
                        this.pushBox(trackVerts, cBase, [3.4, 3.2, 7.6], [0.85, 0.3, 0.0, 0.0]);
                        const cTop = addPt(s0, side * (hw0 + 7.2), 4.9);
                        this.pushBox(trackVerts, cTop, [3.3, 3.1, 7.4], [0.95, 0.1, 0.0, 0.25]);
                        const cStrip = addPt(s0, side * (hw0 + 5.4), 3.3);
                        this.pushBox(trackVerts, cStrip, [0.35, 0.45, 7.2], [1.0, 0.4, 0.0, 0.9]);
                    }
                }
            } else if (sp === 'HELIX_TOWER') {
                // Climbing 270° Spiral Viaduct Under-Deck Piers & Overhead Velocity Arches
                if (i % 6 === 0) {
                    const pierDepth = Math.max(12.0, s0.pos[1] + 8.0);
                    const pierPos = [s0.pos[0], s0.pos[1] - pierDepth * 0.5 - 0.5, s0.pos[2]];
                    this.pushBox(trackVerts, pierPos, [3.2, pierDepth, 3.2], [0.65, 0.3, 0.0, 0.0]);
                    // Cross-head T-beam under road deck
                    const capPos = [s0.pos[0], s0.pos[1] - 0.9, s0.pos[2]];
                    this.pushBox(trackVerts, capPos, [hw0 * 1.9, 1.6, 2.8], [0.8, 0.3, 0.0, 0.0]);
                    // Outer Helix Neon Guide Ribs
                    const outerArch = addPt(s0, -hw0 - 2.2, 6.2);
                    this.pushBox(trackVerts, outerArch, [1.2, 12.4, 1.2], [1.0, 0.4, 0.0, 0.95]);
                }
            } else if (sp === 'REACTOR_TUBE') {
                // Submerged Harbor Reactor Tube: Octagonal Pressure Bulkheads & Plasma Rings
                if (i % 4 === 0) {
                    const pL = addPt(s0, -hw0 - 2.2, 5.8);
                    const pR = addPt(s0, hw0 + 2.2, 5.8);
                    const roof = addPt(s0, 0, 12.2);
                    this.pushBox(trackVerts, pL, [1.8, 12.0, 1.8], [0.55, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, pR, [1.8, 12.0, 1.8], [0.55, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, roof, [hw0 * 2.25, 1.5, 1.8], [0.55, 0.3, 0.0, 0.0]);
                    // Inner Glowing Sub-Bass Plasma Conduit Ring
                    const ringL = addPt(s0, -hw0 - 1.1, 5.8);
                    const ringR = addPt(s0, hw0 + 1.1, 5.8);
                    const ringTop = addPt(s0, 0, 11.1);
                    this.pushBox(trackVerts, ringL, [0.55, 10.8, 0.85], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, ringR, [0.55, 10.8, 0.85], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, ringTop, [hw0 * 2.1, 0.65, 0.95], [1.0, 0.4, 0.0, 1.0]);
                }
            } else if (sp === 'TOLL_PLAZA') {
                // Multi-Lane Highway Automatic Toll Plaza Canopy & Lane Beacons
                if (i % 16 === 0) {
                    const pL = addPt(s0, -hw0 - 3.5, 5.5);
                    const pR = addPt(s0, hw0 + 3.5, 5.5);
                    const canopy = addPt(s0, 0, 10.5);
                    this.pushBox(trackVerts, pL, [2.2, 11.0, 2.8], [0.85, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, pR, [2.2, 11.0, 2.8], [0.85, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, canopy, [hw0 * 2.45, 2.4, 4.2], [0.92, 0.3, 0.0, 0.0]);
                    // 5 Overhead ETC Neon Lane Status Beacons
                    for (let lane = -2; lane <= 2; lane++) {
                        const bPos = addPt(s0, lane * (hw0 * 0.42), 9.0);
                        this.pushBox(trackVerts, bPos, [1.8, 0.75, 1.2], [1.0, 0.4, 0.0, 1.0]);
                    }
                }
            } else if (sp === 'WIND_TURBINES') {
                // 38m Coastal & Mountain Ridge Wind Turbines + Nagai Stepped Terraces
                if (i % 11 === 0) {
                    for (const side of [-1, 1]) {
                        if (side === -1 && i % 22 !== 0) continue;
                        const tBase = addPt(s0, side * (hw0 + 10.5), 0);
                        // 34m Tapered Wind Turbine Tower (zoneId = 0.3)
                        this.pushBox(trackVerts, [tBase[0], tBase[1] + 17.0, tBase[2]], [1.6, 34.0, 1.6], [0.95, 0.3, 0.0, 0.0]);
                        // Nacelle Generator Housing & Glowing Hub (+34m)
                        const hub = [tBase[0], tBase[1] + 34.2, tBase[2]];
                        this.pushBox(trackVerts, hub, [2.8, 2.4, 4.2], [0.98, 0.3, 0.0, 0.0]);
                        this.pushBox(trackVerts, [hub[0], hub[1] + 1.5, hub[2]], [1.2, 0.8, 1.2], [1.0, 0.4, 0.0, 1.0]);
                        // 3 Giant Rotor Blades (vertical + horizontal cross-span)
                        this.pushBox(trackVerts, [hub[0], hub[1] + 8.5, hub[2]], [0.65, 16.0, 1.2], [0.98, 0.3, 0.0, 0.0]);
                        this.pushBox(trackVerts, [hub[0], hub[1] - 5.5, hub[2] - 6.5], [0.65, 11.0, 13.0], [0.98, 0.3, 0.0, 0.0]);
                    }
                }
            } else if (sp === 'SOLAR_DISH') {
                // Summit Observatory Deep-Space Parabolic Radio Dishes & Solar Collector Arches
                if (i % 10 === 0) {
                    const side = (i % 20 === 0) ? -1 : 1;
                    const dBase = addPt(s0, side * (hw0 + 11.5), 0);
                    // Concrete Pedestal
                    this.pushBox(trackVerts, [dBase[0], dBase[1] + 4.5, dBase[2]], [3.6, 9.0, 3.6], [0.8, 0.3, 0.0, 0.0]);
                    // Stepped Parabolic Reflector Dish Bowl
                    this.pushBox(trackVerts, [dBase[0], dBase[1] + 10.2, dBase[2]], [11.5, 2.2, 11.5], [0.95, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [dBase[0], dBase[1] + 12.0, dBase[2]], [14.8, 1.8, 14.8], [0.98, 0.3, 0.0, 0.0]);
                    // Central Feed-Horn Antenna & Glowing Pulse Receiver
                    this.pushBox(trackVerts, [dBase[0], dBase[1] + 16.5, dBase[2]], [0.85, 8.5, 0.85], [0.7, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [dBase[0], dBase[1] + 21.0, dBase[2]], [2.2, 2.2, 2.2], [1.0, 0.4, 0.0, 1.0]);
                }
            } else if (sp === 'LASER_CATHEDRAL') {
                // 3D Wireframe Laser Pyramid Cathedral Tunnel (Acid Lime / Violet Grid Ribs)
                if (i % 3 === 0) {
                    const baseL = addPt(s0, -hw0 - 3.2, 0);
                    const baseR = addPt(s0, hw0 + 3.2, 0);
                    const midL = addPt(s0, -hw0 * 0.62, 10.5);
                    const midR = addPt(s0, hw0 * 0.62, 10.5);
                    const apex = addPt(s0, 0, 21.0);
                    // Stepped Triangular Pyramid Laser Ribs (zoneId = 0.4)
                    this.pushBox(trackVerts, [baseL[0], baseL[1] + 3.5, baseL[2]], [0.9, 7.0, 0.9], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, [baseR[0], baseR[1] + 3.5, baseR[2]], [0.9, 7.0, 0.9], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, midL, [hw0 * 0.85, 0.85, 0.85], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, midR, [hw0 * 0.85, 0.85, 0.85], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(trackVerts, apex, [hw0 * 0.95, 1.1, 1.1], [1.0, 0.4, 0.0, 1.0]);
                    // Dark Obsidian Outer Void Wall Panels every 6 samples
                    if (i % 6 === 0) {
                        const wallL = addPt(s0, -hw0 - 4.8, 6.0);
                        const wallR = addPt(s0, hw0 + 4.8, 6.0);
                        this.pushBox(trackVerts, wallL, [1.2, 12.0, 6.5], [0.25, 0.8, 0.0, 0.0]);
                        this.pushBox(trackVerts, wallR, [1.2, 12.0, 6.5], [0.25, 0.8, 0.0, 0.0]);
                    }
                }
            } else if (sp === 'GORGE_VIADUCT') {
                // Deep Mountain Canyon Red-Truss Viaduct Pylons & Cliffside Mega-Billboards
                if (i % 6 === 0) {
                    const pL = addPt(s0, -hw0 + 1.5, -18.0);
                    const pR = addPt(s0, hw0 - 1.5, -18.0);
                    this.pushBox(trackVerts, pL, [2.2, 36.0, 2.2], [0.75, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, pR, [2.2, 36.0, 2.2], [0.75, 0.3, 0.0, 0.0]);
                    const strut = addPt(s0, 0, -9.0);
                    this.pushBox(trackVerts, strut, [hw0 * 1.85, 1.5, 1.5], [0.9, 0.1, 0.0, 0.3]);
                }
                if (i % 12 === 0) {
                    const side = (i % 24 === 0) ? -1 : 1;
                    const bbPos = addPt(s0, side * (hw0 + 7.5), 7.5);
                    this.pushBox(trackVerts, [bbPos[0], bbPos[1] - 4.0, bbPos[2]], [1.4, 14.0, 1.4], [0.6, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, bbPos, [1.8, 8.5, 11.0], [1.0, 0.4, 0.0, 0.95]);
                }
            } else if (sp === 'SHIBUYA_SKYBRIDGE' || sp === 'BOWLING_PIN_PLAZA') {
                // Dense Shibuya Cyber-Skyscrapers + Overhead Enclosed Pedestrian Skybridges
                if (i % 8 === 0) {
                    for (const side of [-1, 1]) {
                        const bPos = addPt(s0, side * (hw0 + 11.5), 0);
                        const bH = 28.0 + ((i * 17) % 24);
                        this.pushBox(trackVerts, [bPos[0], bPos[1] + bH * 0.45, bPos[2]], [8.5, bH, 8.5], [0.62, 0.3, 0.0, 0.0]);
                        const nPos = addPt(s0, side * (hw0 + 7.0), bH * 0.48);
                        this.pushBox(trackVerts, nPos, [0.7, bH * 0.72, 2.8], [1.0, 0.4, 0.0, 1.0]);
                    }
                }
                if (i % 24 === 0) {
                    const bridge = addPt(s0, 0, 15.5);
                    this.pushBox(trackVerts, bridge, [hw0 * 2.4, 3.2, 4.4], [0.85, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [bridge[0], bridge[1] - 1.7, bridge[2]], [hw0 * 2.35, 0.5, 4.6], [1.0, 0.4, 0.0, 1.0]);
                }
            } else if (sp === 'ODAIBA_MEGASPHERE') {
                // Elevated Figure-8 Crossover Skyway Truss Towers & Under-Deck Girders
                if (i % 7 === 0) {
                    const gPos = [s0.pos[0], s0.pos[1] - 1.2, s0.pos[2]];
                    this.pushBox(trackVerts, gPos, [hw0 * 2.05, 1.8, 2.4], [0.78, 0.3, 0.0, 0.0]);
                    const pL = addPt(s0, -hw0 - 2.2, 8.0);
                    const pR = addPt(s0, hw0 + 2.2, 8.0);
                    this.pushBox(trackVerts, pL, [1.4, 16.0, 1.4], [0.9, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, pR, [1.4, 16.0, 1.4], [0.9, 0.3, 0.0, 0.0]);
                    if (i % 14 === 0) {
                        const beam = addPt(s0, 0, 15.2);
                        this.pushBox(trackVerts, beam, [hw0 * 2.2, 1.2, 1.2], [1.0, 0.4, 0.0, 0.9]);
                    }
                }
            } else if (sp === 'NAGAI_RESORT') {
                // Hiroshi Nagai Coastal Sunset Resort: White Art-Deco Terraces, Pool Aprons & Palm Colonnades
                if (i % 8 === 0) {
                    for (const side of [-1, 1]) {
                        const base = addPt(s0, side * (hw0 + 5.2), 0);
                        this.pushBox(trackVerts, [base[0], base[1] + 5.5, base[2]], [0.9, 11.0, 0.9], [0.6, 0.3, 0.0, 0.0]);
                        const top = [base[0], base[1] + 11.2, base[2]];
                        this.pushBox(trackVerts, top, [7.8, 1.1, 1.9], [0.95, 0.2, 0.0, 0.0]);
                        this.pushBox(trackVerts, top, [1.9, 1.1, 7.8], [0.95, 0.2, 0.0, 0.0]);
                    }
                }
                if (i % 16 === 0) {
                    const villa = addPt(s0, -(hw0 + 14.0), 6.0);
                    this.pushBox(trackVerts, villa, [11.0, 12.0, 14.0], [0.98, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [villa[0], villa[1] + 7.5, villa[2]], [7.5, 4.5, 9.5], [0.98, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [villa[0], villa[1] + 10.2, villa[2]], [8.0, 0.65, 10.0], [1.0, 0.4, 0.0, 0.9]);
                }
            } else if (sp === 'SUBWOOFER_TRENCH') {
                // Subterranean Crossover Trench & Stacked Boiler Room Subwoofer Monolith Walls
                if (i % 4 === 0) {
                    for (const side of [-1, 1]) {
                        const wall = addPt(s0, side * (hw0 + 3.0), 6.5);
                        // Dark Speaker Enclosure Stack (zoneId = 0.8)
                        this.pushBox(trackVerts, wall, [2.8, 13.0, 3.6], [0.3, 0.8, 0.0, 0.0]);
                        // 3 Glowing Sub-Bass Woofer Cones per Stack (zoneId = 0.4)
                        for (let w = 0; w < 3; w++) {
                            const cone = addPt(s0, side * (hw0 + 1.45), 2.4 + w * 4.0);
                            this.pushBox(trackVerts, cone, [0.45, 2.6, 2.6], [1.0, 0.4, 0.0, 1.0]);
                        }
                    }
                }
            } else {
                // Default Sector Set-Pieces (Tracks 01–04)
                // SECTOR 0: Emerald Coast Palm Trees & Sunlit Promenade
                if (s0.zone === 0 && i % 9 === 0) {
                    for (const side of [-1, 1]) {
                        const base = addPt(s0, side * (hw0 + 5.5), 0);
                        // Palm Trunk
                        this.pushBox(trackVerts, [base[0], base[1] + 5.5, base[2]], [0.9, 11.0, 0.9], [0.6, 0.3, 0.0, 0.0]);
                        // Crisp Geometric Palm Fronds (zoneId = 0.2)
                        const top = [base[0], base[1] + 11.2, base[2]];
                        this.pushBox(trackVerts, top, [7.5, 1.1, 1.8], [0.9, 0.2, 0.0, 0.0]);
                        this.pushBox(trackVerts, top, [1.8, 1.1, 7.5], [0.9, 0.2, 0.0, 0.0]);
                    }
                }

                // SECTOR 1: Boiler Room Bass Tunnel (Pulsing Neon Acoustic Ribs)
                if (s0.zone === 1 && i % 5 === 0) {
                    const pL = addPt(s0, -hw0 - 2.4, 0);
                    const pR = addPt(s0, hw0 + 2.4, 0);
                    const pTopL = addPt(s0, -hw0 - 1.2, 11.5);
                    const pTopR = addPt(s0, hw0 + 1.2, 11.5);
                    // Concrete outer arch (zoneId = 0.3)
                    this.pushBox(trackVerts, [pL[0], pL[1] + 5.5, pL[2]], [1.6, 11.5, 1.6], [0.5, 0.3, 0.0, 0.0]);
                    this.pushBox(trackVerts, [pR[0], pR[1] + 5.5, pR[2]], [1.6, 11.5, 1.6], [0.5, 0.3, 0.0, 0.0]);
                    // Glowing Sub-Bass Neon Roof Beam (zoneId = 0.4)
                    const roofMid = [(pTopL[0] + pTopR[0]) * 0.5, (pTopL[1] + pTopR[1]) * 0.5, (pTopL[2] + pTopR[2]) * 0.5];
                    this.pushBox(trackVerts, roofMid, [hw0 * 2.15, 1.1, 1.4], [1.0, 0.4, 0.0, 1.0]);
                }

                // SECTOR 2: Bayshore Suspension Bridge Towers & Cables
                if (s0.zone === 2 && i % 8 === 0) {
                    const pL = addPt(s0, -hw0 - 2.4, 0);
                    const pR = addPt(s0, hw0 + 2.4, 0);
                    const towerH = (i % 32 === 0) ? 28.0 : 12.0;
                    const zId = (i % 32 === 0) ? 0.3 : 0.4;
                    this.pushBox(trackVerts, [pL[0], pL[1] + towerH * 0.5, pL[2]], [1.4, towerH, 1.4], [0.9, zId, 0.0, zId === 0.4 ? 0.8 : 0.0]);
                    this.pushBox(trackVerts, [pR[0], pR[1] + towerH * 0.5, pR[2]], [1.4, towerH, 1.4], [0.9, zId, 0.0, zId === 0.4 ? 0.8 : 0.0]);
                    if (i % 32 === 0) {
                        const crossMid = [(pL[0] + pR[0]) * 0.5, pL[1] + 22.0, (pL[2] + pR[2]) * 0.5];
                        this.pushBox(trackVerts, crossMid, [hw0 * 2.25, 2.2, 2.2], [0.9, 0.3, 0.0, 0.0]);
                    }
                }

                // SECTOR 3: Shibuya Neon Hairpins (Stylized Monolith Towers & Neon Strips)
                if (s0.zone === 3 && i % 10 === 0) {
                    for (const side of [-1, 1]) {
                        const bPos = addPt(s0, side * (hw0 + 11.0), 0);
                        const bH = 22.0 + ((i * 13) % 18);
                        this.pushBox(trackVerts, [bPos[0], bPos[1] + bH * 0.4, bPos[2]], [7.5, bH, 7.5], [0.6, 0.3, 0.0, 0.0]);
                        // Neon vertical billboard strip on building face
                        const nPos = addPt(s0, side * (hw0 + 6.9), bH * 0.45);
                        this.pushBox(trackVerts, nPos, [0.6, bH * 0.65, 2.4], [1.0, 0.4, 0.0, 1.0]);
                    }
                }
            }

            // GIANT TRACKSIDE BOILER ROOM DJ JUMBOTRONS (Every 48 samples along the course!)
            if (i % 48 === 0) {
                // Overhead or Trackside Gantry Frame
                const jRight = s0.right;
                const jUp = [0, 1, 0];
                const jFwd = s0.forward;
                const center = [
                    s0.pos[0],
                    s0.pos[1] + 10.8,
                    s0.pos[2]
                ];
                const halfW = 9.2;
                const halfH = 4.6;

                // Support Pillars
                const pilL = addPt(s0, -hw0 - 2.6, 5.5);
                const pilR = addPt(s0, hw0 + 2.6, 5.5);
                this.pushBox(trackVerts, pilL, [1.2, 13.0, 1.2], [0.7, 0.3, 0.0, 0.0]);
                this.pushBox(trackVerts, pilR, [1.2, 13.0, 1.2], [0.7, 0.3, 0.0, 0.0]);

                // Double-sided Jumbotron Quad facing oncoming traffic
                const p0 = [center[0] - jRight[0] * halfW - jUp[0] * halfH, center[1] - halfH, center[2] - jRight[2] * halfW];
                const p1 = [center[0] + jRight[0] * halfW - jUp[0] * halfH, center[1] - halfH, center[2] + jRight[2] * halfW];
                const p2 = [center[0] + jRight[0] * halfW + jUp[0] * halfH, center[1] + halfH, center[2] + jRight[2] * halfW];
                const p3 = [center[0] - jRight[0] * halfW + jUp[0] * halfH, center[1] + halfH, center[2] - jRight[2] * halfW];

                // Both front and back faces so screen is visible from any direction
                this.pushQuad(jumbotronVerts, p0, p1, p2, p3, [-jFwd[0], -jFwd[1], -jFwd[2]], [1, 1, 1, 1], [0, 0], [1, 1]);
                this.pushQuad(jumbotronVerts, p1, p0, p3, p2, [jFwd[0], jFwd[1], jFwd[2]], [1, 1, 1, 1], [0, 0], [1, 1]);
            }
        }

        // 6. Build Colossal Hero Landmark Megastructures for Complex Maps (Tracks 05, 06, 07)
        this.currentTrackSample = null;
        if (spline.heroSetPieces && spline.heroSetPieces.length > 0) {
            this.buildHeroSetPieces(trackVerts, spline.heroSetPieces);
        }
        this.currentGroundY = null;

        this.trackMesh = this.createVAOFromArrays(trackVerts);
        this.jumbotronMesh = this.createVAOFromArrays(jumbotronVerts);
    }

    buildHeroSetPieces(verts, heroSetPieces) {
        for (const hero of heroSetPieces) {
            const [hx, hy, hz] = hero.pos;
            this.currentGroundY = hy;

            if (hero.type === 'HELIX_RADAR_SPIRE') {
                // 72m Central Harbor Radar & Broadcast Spire inside the 270° Spiral Helix
                this.pushBox(verts, [hx, hy + 28.0, hz], [14.0, 56.0, 14.0], [0.75, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 62.0, hz], [4.5, 22.0, 4.5], [1.0, 0.4, 0.0, 1.0]);
                // 4 Cantilevered Neon Observation Halo Rings (+16m, +28m, +40m, +52m)
                for (let tier = 0; tier < 4; tier++) {
                    const ty = hy + 16.0 + tier * 12.0;
                    const span = 28.0 - tier * 3.2;
                    this.pushBox(verts, [hx, ty, hz], [span, 2.8, span], [0.9, 0.3, 0.0, 0.0]);
                    this.pushBox(verts, [hx, ty + 1.8, hz], [span + 2.5, 0.9, span + 2.5], [1.0, 0.4, 0.0, 1.0]);
                }
                // Top Crossbar Radar Array
                this.pushBox(verts, [hx, hy + 58.0, hz], [34.0, 2.2, 4.0], [1.0, 0.4, 0.0, 1.0]);
            } else if (hero.type === 'COSMO_FERRIS_WHEEL') {
                // 90m Neon Ferris Wheel ("COSMO CLOCK 99") overlooking the Harbor Hairpins
                const hubY = hy + 46.0;
                const radius = 38.0;
                // A-Frame Support Struts & Central Hub Axle
                this.pushBox(verts, [hx - 12.0, hy + 23.0, hz], [3.5, 46.0, 6.5], [0.75, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx + 12.0, hy + 23.0, hz], [3.5, 46.0, 6.5], [0.75, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hubY, hz], [9.0, 9.0, 12.0], [1.0, 0.4, 0.0, 1.0]);
                // 16-Gondola Glowing Rim & Radial Spokes in XY plane
                const numPods = 16;
                for (let k = 0; k < numPods; k++) {
                    const ang = (k / numPods) * Math.PI * 2;
                    const px = hx + Math.cos(ang) * radius;
                    const py = hubY + Math.sin(ang) * radius;
                    // Gondola Pod & Outer Neon Rim Segment
                    this.pushBox(verts, [px, py, hz], [5.2, 5.2, 5.2], [1.0, 0.4, 0.0, 1.0]);
                    this.pushBox(verts, [px, py - 3.6, hz], [4.2, 3.2, 4.2], [0.95, 0.1, 0.0, 0.4]);
                    // Mid-Spoke Node
                    const mx = hx + Math.cos(ang) * (radius * 0.55);
                    const my = hubY + Math.sin(ang) * (radius * 0.55);
                    this.pushBox(verts, [mx, my, hz], [2.6, 2.6, 2.6], [1.0, 0.4, 0.0, 0.85]);
                }
            } else if (hero.type === 'LASER_PYRAMID_MONOLITH') {
                // 64m Stepped Cyber-Ziggurat Laser Pyramid rising above the Hakone Laser Cathedral
                for (let t = 0; t < 7; t++) {
                    const w = 56.0 - t * 7.2;
                    const ty = hy + t * 7.5 + 3.5;
                    this.pushBox(verts, [hx, ty, hz], [w, 6.2, w], [0.3, 0.8, 0.0, 0.0]);
                    this.pushBox(verts, [hx, ty + 3.4, hz], [w + 1.4, 0.9, w + 1.4], [1.0, 0.4, 0.0, 1.0]);
                }
                // Floating Neon Apex Beacon & Sky-Beam Column
                this.pushBox(verts, [hx, hy + 68.0, hz], [6.5, 24.0, 6.5], [1.0, 0.4, 0.0, 1.0]);
            } else if (hero.type === 'SUMMIT_OBSERVATORY_DOME') {
                // +44m Mountain Summit Astro-Observatory & Giant Parabolic Array
                this.pushBox(verts, [hx, hy + 12.0, hz], [32.0, 24.0, 32.0], [0.92, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 28.0, hz], [22.0, 14.0, 22.0], [0.98, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 36.5, hz], [25.0, 1.6, 25.0], [1.0, 0.4, 0.0, 1.0]);
                this.pushBox(verts, [hx, hy + 46.0, hz], [4.0, 18.0, 4.0], [1.0, 0.4, 0.0, 1.0]);
            } else if (hero.type === 'ODAIBA_MEGASPHERE_TOWER') {
                // Iconic Odaiba Twin-Tower Suspended Broadcast Megasphere straddling the Figure-8 Crossover!
                const offset = 36.0;
                for (const sx of [-1, 1]) {
                    for (const sz of [-1, 1]) {
                        this.pushBox(verts, [hx + sx * offset, hy + 32.0, hz + sz * offset], [6.5, 64.0, 6.5], [0.85, 0.3, 0.0, 0.0]);
                    }
                }
                // Upper Sky-Corridors at +54m connecting the 4 corner towers above the +28m crossover bridge
                this.pushBox(verts, [hx, hy + 54.0, hz - offset], [offset * 2.15, 4.5, 6.0], [0.92, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 54.0, hz + offset], [offset * 2.15, 4.5, 6.0], [0.92, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx - offset, hy + 54.0, hz], [6.0, 4.5, offset * 2.15], [0.92, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx + offset, hy + 54.0, hz], [6.0, 4.5, offset * 2.15], [0.92, 0.3, 0.0, 0.0]);
                // Suspended Central Geodesic Broadcast Megasphere (+48m, 20m directly over the Upper Bridge!)
                this.pushBox(verts, [hx, hy + 48.0, hz], [22.0, 14.0, 22.0], [0.96, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 48.0, hz], [16.0, 20.0, 16.0], [0.98, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 48.0, hz], [25.5, 2.2, 25.5], [1.0, 0.4, 0.0, 1.0]);
            } else if (hero.type === 'GIANT_BOWLING_PIN_PLAZA') {
                // 46m Sculpted Giant Neon Bowling Pin Monument (World Map Landmark Set-Piece!)
                this.pushBox(verts, [hx, hy + 3.0, hz], [22.0, 6.0, 22.0], [0.75, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 6.5, hz], [24.0, 1.0, 24.0], [1.0, 0.4, 0.0, 1.0]);
                // Lower Belly of Bowling Pin
                this.pushBox(verts, [hx, hy + 15.0, hz], [13.5, 16.0, 13.5], [0.98, 0.3, 0.0, 0.0]);
                // Tapered Neck with Twin Glowing Red/Neon Stripes
                this.pushBox(verts, [hx, hy + 27.5, hz], [7.5, 10.0, 7.5], [0.98, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 26.0, hz], [8.4, 1.6, 8.4], [1.0, 0.4, 0.0, 1.0]);
                this.pushBox(verts, [hx, hy + 29.2, hz], [8.4, 1.6, 8.4], [1.0, 0.4, 0.0, 1.0]);
                // Pin Head Crown
                this.pushBox(verts, [hx, hy + 37.5, hz], [10.5, 10.0, 10.5], [0.98, 0.3, 0.0, 0.0]);
                this.pushBox(verts, [hx, hy + 43.5, hz], [7.0, 3.0, 7.0], [1.0, 0.4, 0.0, 1.0]);
            } else if (hero.type === 'NAGAI_RESORT_HOTEL') {
                // Hiroshi Nagai Sunset Resort Ziggurat Hotel & Infinity Pool Complex
                for (let floor = 0; floor < 5; floor++) {
                    const w = 44.0 - floor * 6.0;
                    const fy = hy + floor * 7.5 + 3.75;
                    this.pushBox(verts, [hx, fy, hz], [w, 7.0, 24.0], [0.98, 0.3, 0.0, 0.0]);
                    this.pushBox(verts, [hx, fy + 3.6, hz], [w + 1.2, 0.7, 25.0], [1.0, 0.4, 0.0, 0.95]);
                }
                // Turquoise Poolside Terrace Apron
                this.pushBox(verts, [hx, hy + 0.6, hz + 24.0], [38.0, 1.2, 18.0], [0.95, 0.2, 0.0, 0.4]);
            }
        }
    }

    createVehicleMeshBundle(built) {
        const chassisMesh = this.createVAOFromArrays(built.chassisVertices || built.vertices);
        const wheelMeshes = (built.wheels || []).map(w => {
            const m = this.createVAOFromArrays(w.vertices);
            return {
                vao: m.vao,
                vbo: m.vbo,
                count: m.count,
                pos: w.pos,
                isFront: w.isFront,
                side: w.side,
                camberTiltZ: w.camberTiltZ
            };
        });
        return {
            vao: chassisMesh.vao,
            vbo: chassisMesh.vbo,
            count: chassisMesh.count,
            chassisMesh: chassisMesh,
            wheelMeshes: wheelMeshes,
            exhaustNozzles: built.exhaustNozzles || [[-0.58, 0.24, -2.05], [0.58, 0.24, -2.05]],
            taillightAnchors: built.taillightAnchors || {
                left:  [-0.76, 0.64, -1.86],
                right: [ 0.76, 0.64, -1.86]
            }
        };
    }

    disposeVehicleMeshBundle(bundle) {
        if (!bundle || !this.gl) return;
        if (bundle.chassisMesh) {
            this.disposeMesh(bundle.chassisMesh);
        } else {
            this.disposeMesh(bundle);
        }
        if (bundle.wheelMeshes) {
            for (const w of bundle.wheelMeshes) {
                this.disposeMesh(w);
            }
        }
    }

    buildSportsCarMesh() {
        // Build Player Customized Hero Car + 3 Distinct AI Rival Hero Archetypes showcasing the new Reference Builds
        if (this.rivalCarMeshes) {
            for (const rivalId in this.rivalCarMeshes) {
                this.disposeVehicleMeshBundle(this.rivalCarMeshes[rivalId]);
            }
        }
        this.rivalCarMeshes = {};
        this.rivalBuildConfigs = {
            rival_kai:  RRR.CONCEPT_PRESETS.preset_pink_style_ps13,
            rival_mira: RRR.CONCEPT_PRESETS.preset_ultraviolet_tribal,
            rival_rex:  RRR.CONCEPT_PRESETS.preset_savanna_fc3s
        };

        for (const rivalId in this.rivalBuildConfigs) {
            const built = RRR.LowPolyCarBuilder.buildCustomVehicleMesh(this.rivalBuildConfigs[rivalId]);
            this.rivalCarMeshes[rivalId] = this.createVehicleMeshBundle(built);
        }

        this.rebuildPlayerCarMesh(this.playerBuildConfig || RRR.DEFAULT_PLAYER_BUILD);
    }

    rebuildPlayerCarMesh(buildConfig) {
        this.playerBuildConfig = Object.assign({}, RRR.DEFAULT_PLAYER_BUILD, buildConfig || {});
        const built = RRR.LowPolyCarBuilder.buildCustomVehicleMesh(this.playerBuildConfig);

        if (this.carMesh) {
            this.disposeVehicleMeshBundle(this.carMesh);
        }
        this.carMesh = this.createVehicleMeshBundle(built);
        this.lastMeshTelemetry = {
            vertexCount: built.vertexCount,
            triangleCount: built.triangleCount
        };
        return this.lastMeshTelemetry;
    }

    spawnParticle(pos, vel, scale, life, isPaintSplatter = false, customColor = null) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }
        this.particles.push({
            pos: [pos[0], pos[1], pos[2]],
            vel: [vel[0], vel[1], vel[2]],
            scale: scale,
            life: life,
            maxLife: life,
            isPaintSplatter: isPaintSplatter,
            customColor: customColor
        });
    }

    triggerCollisionVFX(pos) {
        // Burst 18 Vibe-colored paint splatter & spark droplets on car ramming!
        for (let i = 0; i < 18; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 6.0 + Math.random() * 18.0;
            this.spawnParticle(
                [pos[0], pos[1] + 0.9, pos[2]],
                [Math.cos(ang) * spd, 3.0 + Math.random() * 8.0, Math.sin(ang) * spd],
                0.38 + Math.random() * 0.45,
                0.55 + Math.random() * 0.35,
                true
            );
        }
        this.screenShake = 0.45;
    }

    updateCameraAndParticles(dt, playerCar, vehicles = null, audioState = null) {
        const physDt = Math.min(dt, 0.05);
        this.time += physDt;
        if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - physDt * 1.8);

        // =====================================================================
        // 1. PIP-03 PHASE 2: LOW-SLUNG ELASTIC CHASE CAMERA + LATERAL DRIFT FRAMING + G-FORCE WHIP + BASS KICK
        // =====================================================================
        const speedNorm = Math.min(1.25, playerCar.normalizedSpeed);
        const boost = playerCar.boostIntensity || 0.0;
        const ar = this.settings.audioReactivity !== undefined ? this.settings.audioReactivity : 1.0;
        const dropScale = audioState ? Math.pow(Math.max(0.0, Math.min(1.0, audioState.dropIntensity ?? 0.35)), 1.35) : 0.35;
        const beatPulse = audioState ? (audioState.beatPulse || 0.0) * ar * dropScale : 0.0;
        const subBass = audioState ? (audioState.subBass || 0.0) * ar * dropScale : 0.0;
        const highMid = audioState ? (audioState.highMid || 0.0) * ar * dropScale : 0.0;

        // Wide-angle Redline FOV warp (62° -> 108°) coupled with camera pull-in + Rhythmic Bass FOV Kick (scaled by song intensity)!
        const targetFov = this.settings.fovBase +
            (this.settings.fovMax - this.settings.fovBase) * Math.pow(Math.min(1.0, speedNorm), 1.35) +
            boost * 11.0 +
            beatPulse * 4.5 +
            subBass * 2.8;
        this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, physDt * 11.0);

        // Drift Dutch Angle Roll (up to ±7.5 degrees proportional to slip angle)
        const targetDutch = -playerCar.visualSlipAngle * 0.18;
        this.currentDutchRoll += (targetDutch - this.currentDutchRoll) * Math.min(1.0, physDt * 8.0);

        // Detect Boost Ignition & 6-Speed Gear Upshifts for 2nd-order camera spring-arm impulses
        if ((playerCar.boostTimer || 0) > (this.prevBoostTimer || 0) + 0.12) {
            this.camSpringLagVel += 7.5; // Whip camera back on boost ignition!
            this.camPitchVel -= 0.45;
        }
        this.prevBoostTimer = playerCar.boostTimer || 0.0;

        const curGear = playerCar.gear || 1;
        if (curGear > this.prevCarGear && playerCar.speed > 20.0) {
            // Crisp mechanical upshift kick!
            this.camSpringLagVel += 2.65;
            this.camPitchVel += 0.38;
        }
        this.prevCarGear = curGear;

        const brakeAmt = (playerCar.input && playerCar.input.brake > 0.1 && playerCar.speed > 12.0) ? playerCar.input.brake : 0.0;
        const targetLag = boost * 1.75 - brakeAmt * 0.68;
        const lagSpringK = 68.0;
        const lagDamp = 10.5;
        this.camSpringLagVel += ((targetLag - this.camSpringLag) * lagSpringK - this.camSpringLagVel * lagDamp) * physDt;
        this.camSpringLag += this.camSpringLagVel * physDt;
        this.camSpringLag = Math.max(-0.95, Math.min(2.6, this.camSpringLag));

        const targetPitchOff = brakeAmt * 0.14 - boost * 0.08;
        this.camPitchVel += ((targetPitchOff - this.camPitchOffset) * 64.0 - this.camPitchVel * 11.0) * physDt;
        this.camPitchOffset += this.camPitchVel * physDt;

        // 2nd-Order Lateral Drift Swing (swings camera to the outside of the drift so player sees the car's side profile & corner apex!)
        const driftSwingScale = this.settings.cameraDriftSwing !== undefined ? this.settings.cameraDriftSwing : 1.0;
        const targetLatOffset = (-playerCar.visualSlipAngle * 1.65 - (playerCar.steerSmoothed || 0) * 0.65) * driftSwingScale;
        this.camLateralVel += ((targetLatOffset - this.camLateralOffset) * 54.0 - this.camLateralVel * 10.5) * physDt;
        this.camLateralOffset += this.camLateralVel * physDt;
        this.camLateralOffset = Math.max(-2.4, Math.min(2.4, this.camLateralOffset));

        // Low-slung road-hugging height (1.92m -> 1.42m at top speed/boost) & Redline pull-in distance (6.15m -> 5.15m)
        const followDist = 6.15 + this.camSpringLag - Math.min(1.0, speedNorm * 0.85);
        const followHeight = Math.max(1.15, 1.92 - Math.min(0.42, speedNorm * 0.34) - boost * 0.08 + this.camPitchOffset * 0.55);

        // Micro-jitter at redline speeds or collision shake
        const jitterAmp = (speedNorm > 0.82 ? (speedNorm - 0.82) * 0.085 : 0) + this.screenShake * 0.35;
        const jX = (Math.sin(this.time * 53.0) * jitterAmp);
        const jY = (Math.cos(this.time * 47.0) * jitterAmp);

        if (this.cameraMode === 'ORBIT_CAR') {
            if (this.orbitAutoRotate) {
                this.orbitYaw = RRR.wrapAngle(this.orbitYaw + physDt * 0.45);
            }
            this.currentFov = 54.0;
            this.currentDutchRoll = 0.0;
            const totalYaw = playerCar.headingYaw + this.orbitYaw;
            const cosP = Math.cos(this.orbitPitch);
            const sinP = Math.sin(this.orbitPitch);
            this.camPos[0] = playerCar.pos[0] + Math.sin(totalYaw) * cosP * this.orbitDist;
            this.camPos[1] = playerCar.pos[1] + Math.max(0.6, sinP * this.orbitDist + 0.8);
            this.camPos[2] = playerCar.pos[2] - Math.cos(totalYaw) * cosP * this.orbitDist;

            this.camTarget[0] = playerCar.pos[0];
            this.camTarget[1] = playerCar.pos[1] + 0.75;
            this.camTarget[2] = playerCar.pos[2];
            this.prevYaw = totalYaw;
            this.angularVelYaw = 0.0;
        } else if (this.cameraMode === 'TOP_DOWN') {
            this.currentFov = 58.0;
            this.currentDutchRoll = 0.0;
            const camFwdX = -Math.sin(playerCar.headingYaw);
            const camFwdZ = Math.cos(playerCar.headingYaw);
            this.camPos[0] = playerCar.pos[0] - camFwdX * 3.0;
            this.camPos[1] = playerCar.pos[1] + 24.0;
            this.camPos[2] = playerCar.pos[2] - camFwdZ * 3.0;

            this.camTarget[0] = playerCar.pos[0] + camFwdX * 6.0;
            this.camTarget[1] = playerCar.pos[1];
            this.camTarget[2] = playerCar.pos[2] + camFwdZ * 6.0;
            this.prevYaw = playerCar.headingYaw;
            this.angularVelYaw = 0.0;
        } else if (this.cameraMode === 'JUMBOTRON_STAGE') {
            this.currentFov = 58.0;
            this.currentDutchRoll = 0.0;
            const camFwdX = -Math.sin(playerCar.headingYaw);
            const camFwdZ = Math.cos(playerCar.headingYaw);
            this.camPos[0] = playerCar.pos[0] - camFwdX * 14.0;
            this.camPos[1] = playerCar.pos[1] + 4.5;
            this.camPos[2] = playerCar.pos[2] - camFwdZ * 14.0;

            this.camTarget[0] = playerCar.pos[0] + camFwdX * 18.0;
            this.camTarget[1] = playerCar.pos[1] + 8.2;
            this.camTarget[2] = playerCar.pos[2] + camFwdZ * 18.0;
            this.prevYaw = playerCar.headingYaw;
            this.angularVelYaw = 0.0;
        } else if (this.cameraMode === 'HOOD') {
            // Namco Rave Racer First-Person Hood / Bumper View + Rear-View Look-Back
            const lookBack = !!this.lookBackActive;
            const dirSign = lookBack ? -1.0 : 1.0;
            this.currentFov = Math.min(98.0, this.settings.fovBase + 6.0 + speedNorm * 14.0 + boost * 8.0);
            this.currentDutchRoll = lookBack ? 0.0 : -playerCar.visualSlipAngle * 0.10;

            const F = playerCar.visualForward;
            const U = playerCar.visualUp;
            const R = playerCar.visualRight;

            this.camPos[0] = playerCar.pos[0] + F[0] * (lookBack ? -1.2 : 0.65) + U[0] * 1.12 + R[0] * (jX * 0.35);
            this.camPos[1] = playerCar.pos[1] + F[1] * (lookBack ? -1.2 : 0.65) + U[1] * 1.12 + jY * 0.35;
            this.camPos[2] = playerCar.pos[2] + F[2] * (lookBack ? -1.2 : 0.65) + U[2] * 1.12 + R[2] * (jX * 0.35);

            this.camTarget[0] = this.camPos[0] + F[0] * (28.0 * dirSign);
            this.camTarget[1] = this.camPos[1] + F[1] * (28.0 * dirSign) - 0.45;
            this.camTarget[2] = this.camPos[2] + F[2] * (28.0 * dirSign);
            this.prevYaw = lookBack ? RRR.wrapAngle(playerCar.visualYaw + Math.PI) : playerCar.visualYaw;
            this.angularVelYaw = playerCar.yawRate * 0.25;
        } else if (this.cameraMode === 'TV_BROADCAST') {
            // Post-Race / Attract Mode Dynamic Trackside & Helicopter Broadcast Camera
            const cutIndex = Math.floor(this.time / 4.2) % 3;
            this.currentDutchRoll = Math.sin(this.time * 0.9) * 0.04;
            const F = playerCar.forward;
            const R = playerCar.right;
            if (cutIndex === 0) {
                // Low-angle dramatic corner panning camera ahead of the car
                this.currentFov = 48.0;
                const phase = (this.time % 4.2) / 4.2;
                const aheadDist = 18.0 - phase * 34.0;
                this.camPos[0] = playerCar.pos[0] + F[0] * aheadDist + R[0] * 6.2;
                this.camPos[1] = playerCar.pos[1] + 1.35;
                this.camPos[2] = playerCar.pos[2] + F[2] * aheadDist + R[2] * 6.2;
            } else if (cutIndex === 1) {
                // Swooping Helicopter Chase Cam
                this.currentFov = 64.0;
                const sweep = Math.sin(this.time * 0.85) * 7.5;
                this.camPos[0] = playerCar.pos[0] - F[0] * 9.5 + R[0] * sweep;
                this.camPos[1] = playerCar.pos[1] + 4.8 + Math.cos(this.time * 1.1) * 1.2;
                this.camPos[2] = playerCar.pos[2] - F[2] * 9.5 + R[2] * sweep;
            } else {
                // Close wheel-well action rig
                this.currentFov = 74.0;
                this.camPos[0] = playerCar.pos[0] + F[0] * 2.4 - R[0] * 2.5;
                this.camPos[1] = playerCar.pos[1] + 0.72;
                this.camPos[2] = playerCar.pos[2] + F[2] * 2.4 - R[2] * 2.5;
            }
            this.camTarget[0] = playerCar.pos[0] + F[0] * 1.5;
            this.camTarget[1] = playerCar.pos[1] + 0.75;
            this.camTarget[2] = playerCar.pos[2] + F[2] * 1.5;
            this.prevYaw = Math.atan2(-(this.camTarget[0] - this.camPos[0]), this.camTarget[2] - this.camPos[2]);
            this.angularVelYaw = 0.0;
        } else {
            // Standard FOLLOW sense-of-speed camera with Lateral Drift Swing & Apex Look-Ahead (plus Rear Look-Back support)
            if (this.camYaw === undefined) {
                this.camYaw = playerCar.headingYaw;
            }
            const lookBack = !!this.lookBackActive;
            const targetHeading = lookBack ? RRR.wrapAngle(playerCar.headingYaw + Math.PI) : playerCar.headingYaw;
            const yawTargetDiff = RRR.wrapAngle(targetHeading - this.camYaw);
            this.camYaw = RRR.wrapAngle(this.camYaw + yawTargetDiff * Math.min(1.0, physDt * (lookBack ? 24.0 : 12.0)));

            const camFwdX = -Math.sin(this.camYaw);
            const camFwdY = playerCar.forward[1];
            const camFwdZ = Math.cos(this.camYaw);
            const camRightX = -Math.cos(this.camYaw);
            const camRightZ = -Math.sin(this.camYaw);

            const totalLat = this.camLateralOffset + jX;
            this.camPos[0] = playerCar.pos[0] - camFwdX * followDist + camRightX * totalLat;
            this.camPos[1] = playerCar.pos[1] + followHeight - camFwdY * (followDist * 0.82) + jY;
            this.camPos[2] = playerCar.pos[2] - camFwdZ * followDist + camRightZ * totalLat;

            // Apex Look-Ahead: pan target slightly into the inside of the turn/drift so the corner exit is centered
            const apexLookLat = -this.camLateralOffset * 1.35;
            this.camTarget[0] = playerCar.pos[0] + camFwdX * 13.5 + camRightX * apexLookLat;
            this.camTarget[1] = playerCar.pos[1] + 1.05 + camFwdY * 11.0 - this.camPitchOffset * 1.2;
            this.camTarget[2] = playerCar.pos[2] + camFwdZ * 13.5 + camRightZ * apexLookLat;

            const dYaw = RRR.wrapAngle(this.camYaw - this.prevYaw);
            this.angularVelYaw = (dYaw / Math.max(0.001, physDt)) * 0.35 + playerCar.visualSlipAngle * 1.4;
            this.prevYaw = this.camYaw;
        }

        // =====================================================================
        // 2. PIP-03 PHASE 3: STATIC CAR-LOCKED 3D TAILLIGHT LIGHT-TRAIL RIBBONS
        // =====================================================================
        this.windStreaks.length = 0;

        // 3. Spawn Cel-Shaded Tire Smoke Puffs & R4 Charge-Tier Sparks during Drifts & Boosts
        if (playerCar.driftState === 'DRIFTING' || playerCar.boostTimer > 0) {
            const F = playerCar.visualForward;
            const R = playerCar.visualRight;
            const dc = playerCar.driftCharge || 0.0;
            const chargeSparkCol = (dc >= 1.0)
                ? [1.0, 0.88, 0.18]
                : ((dc >= 0.66) ? [1.0, 0.12, 0.78] : (dc >= 0.33 ? [0.10, 0.92, 1.0] : null));

            for (const side of [-0.95, 0.95]) {
                const wx = playerCar.pos[0] - F[0] * 1.85 + R[0] * side;
                const wy = playerCar.pos[1] + 0.25;
                const wz = playerCar.pos[2] - F[2] * 1.85 + R[2] * side;
                this.spawnParticle(
                    [wx, wy, wz],
                    [(Math.random() - 0.5) * 3.0, 1.4 + Math.random() * 1.8, (Math.random() - 0.5) * 3.0],
                    0.42 + dc * 0.38,
                    0.38,
                    playerCar.boostTimer > 0,
                    chargeSparkCol
                );
            }
        }

        // Update active VFX particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= physDt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.pos[0] += p.vel[0] * physDt;
            p.pos[1] += p.vel[1] * physDt;
            p.pos[2] += p.vel[2] * physDt;
            p.scale += physDt * 1.1;
        }
    }

    render(vehicles, playerCar, vibeController, audioState, djController) {
        const gl = this.gl;
        if (!gl) return;
        this.resize();

        // Upload live Boiler Room DJ canvas to shared GPU texture
        if (djController && djController.canvas) {
            this.updateDJTexture(djController.canvas);
        }

        const vState = vibeController.activeState;
        const aspect = this.width / this.height;
        const viewProj = this.computeViewProjMatrix(aspect);

        // PIP-03 Phase 4: Project 3D Horizon Velocity Focus Point (playerCar.pos + playerCar.forward * 65m) into Screen UV [0, 1]^2
        const focusWorld = [
            playerCar.pos[0] + playerCar.forward[0] * 65.0,
            playerCar.pos[1] + playerCar.forward[1] * 65.0 + 1.2,
            playerCar.pos[2] + playerCar.forward[2] * 65.0
        ];
        const projectedUV = this.projectWorldToUV(viewProj, focusWorld);
        if (projectedUV) {
            this.vanishingPointUV[0] += (projectedUV[0] - this.vanishingPointUV[0]) * 0.35;
            this.vanishingPointUV[1] += (projectedUV[1] - this.vanishingPointUV[1]) * 0.35;
        }

        // =========================================================================
        // PASS 1: RENDER 3D SCENE TO SceneFBO (Skybox + Track + Jumbotrons + Cars)
        // =========================================================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 1A. Hiroshi Nagai Banded Skybox + Audio Equalizer Horizon & Sun Bass Rings
        const ar = this.settings.audioReactivity;
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this.skyProg);
        gl.uniform3fv(this.uLoc(this.skyProg, 'u_skyTop'), vState.skyTop);
        gl.uniform3fv(this.uLoc(this.skyProg, 'u_skyHorizon'), vState.skyHorizon);
        gl.uniform3fv(this.uLoc(this.skyProg, 'u_sunColor'), vState.sunColor);
        gl.uniform3fv(this.uLoc(this.skyProg, 'u_shadowCool'), vState.shadowCool);
        gl.uniform1f(this.uLoc(this.skyProg, 'u_camYaw'), this.prevYaw);
        gl.uniform1f(this.uLoc(this.skyProg, 'u_camPitch'), playerCar.forward[1]);
        gl.uniform1f(this.uLoc(this.skyProg, 'u_time'), this.time);
        gl.uniform1f(this.uLoc(this.skyProg, 'u_bassPulse'), audioState.beatPulse * ar);
        gl.uniform4f(
            this.uLoc(this.skyProg, 'u_audioSpectrum'),
            audioState.subBass * ar,
            audioState.lowMid * ar,
            audioState.highMid * ar,
            audioState.treble * ar
        );
        gl.uniform1f(this.uLoc(this.skyProg, 'u_dropIntensity'), (audioState.dropIntensity ?? 0.5) * ar);

        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 1B. 3D World Track & Sector Set-Pieces (Stepped Nagai Cel Shading)
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(this.worldProg);

        gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_viewProj'), false, viewProj);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_camPos'), this.camPos);
        gl.uniform3f(this.uLoc(this.worldProg, 'u_lightDir'), 0.45, 0.82, -0.35);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_shadowCool'), vState.shadowCool);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_roadLit'), vState.roadLit);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_roadShadow'), vState.roadShadow);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_curbA'), vState.curbA);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_curbB'), vState.curbB);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_carPrimary'), vState.carPrimary);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_carSecondary'), vState.carSecondary);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_carTrim'), vState.carTrim);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), vState.carEmissive);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_foliageLit'), vState.foliageLit);
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_foliageShadow'), vState.foliageShadow);
        gl.uniform4f(this.uLoc(this.worldProg, 'u_carDriveState'), 0.0, 0.0, 0.0, 0.0);

        gl.uniform4f(
            this.uLoc(this.worldProg, 'u_audioSpectrum'),
            audioState.subBass * ar,
            audioState.lowMid * ar,
            audioState.highMid * ar,
            audioState.treble * ar
        );
        gl.uniform1f(this.uLoc(this.worldProg, 'u_beatPulse'), audioState.beatPulse * ar);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_dropIntensity'), (audioState.dropIntensity ?? 0.35) * ar);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_time'), this.time);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_jsrPixelDither'), this.settings.jsrPixelDither ?? 0.90);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_facetCreaseInk'), this.settings.facetCreaseInk ?? 0.92);

        const identityMat = this.identityMatrix();
        gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, identityMat);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_outlineExtrude'), 0.0);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_propBounceScale'), 1.0);
        gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 0);

        gl.bindVertexArray(this.trackMesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.trackMesh.count);
        gl.uniform1f(this.uLoc(this.worldProg, 'u_propBounceScale'), 0.0);

        // 1C. Trackside Boiler Room LED Jumbotrons (Sampling Shared DJ RenderTexture!)
        gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 2);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        gl.uniform1i(this.uLoc(this.worldProg, 'u_djTex'), 0);

        gl.bindVertexArray(this.jumbotronMesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.jumbotronMesh.count);

        // 1D. Auto Modellista 3D Low-Poly Sports Cars with Articulated 4-Wheel Spin/Steer/Counter-Steer/Jounce
        for (const car of vehicles) {
            const activeMesh = car.isPlayer
                ? this.carMesh
                : ((this.rivalCarMeshes && this.rivalCarMeshes[car.id]) || this.carMesh);
            const buildCfg = car.isPlayer
                ? (this.playerBuildConfig || RRR.DEFAULT_PLAYER_BUILD)
                : ((this.rivalBuildConfigs && this.rivalBuildConfigs[car.id]) || RRR.DEFAULT_PLAYER_BUILD);

            const carMat = this.computeCarModelMatrix(car);

            // Per-car Fluid Race Color Shift + Individual Zone Color Customization!
            const carPalette = RRR.VIBE_PALETTES[car.vibeKey] || RRR.VIBE_PALETTES.pacific_sunset;
            const cZone = carPalette.zones[vibeController.targetZoneIndex] || carPalette.zones[0];
            const activeVState = car.isPlayer ? vState : cZone;
            const fluidColors = RRR.computeFluidCarColors(buildCfg, activeVState, cZone, car, audioState, this.time);
            if (car.isPlayer) {
                this.lastPlayerFluidColors = fluidColors;
            }

            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carPrimary'), fluidColors.primary);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carSecondary'), fluidColors.secondary);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carTrim'), fluidColors.trim);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), fluidColors.emissive);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carLiveryCol1'), fluidColors.livery1);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carLiveryCol2'), fluidColors.livery2);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carFrontRimColor'), fluidColors.frontRim);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carRearRimColor'), fluidColors.rearRim);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carCageColor'), fluidColors.cage);
            gl.uniform3fv(this.uLoc(this.worldProg, 'u_carGlowColor'), fluidColors.glow);
            gl.uniform1i(this.uLoc(this.worldProg, 'u_carLiveryId'), Number(buildCfg.liveryId ?? 1));
            gl.uniform1f(this.uLoc(this.worldProg, 'u_stickerDensity'), Number(buildCfg.stickerDensity ?? 0.85));
            gl.uniform4f(
                this.uLoc(this.worldProg, 'u_carDriveState'),
                car.brakeLightIntensity || 0.0,
                car.boostIntensity || 0.0,
                car.driftCharge || 0.0,
                car.exhaustFlameIntensity || 0.0
            );

            const chassisMesh = activeMesh.chassisMesh || activeMesh;
            const wheelMeshes = activeMesh.wheelMeshes || [];

            // Pass 1: Inverted-Hull Black Ink Outline (extruded along vertex normals, scaled by inkOutlineStrength)
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 1);
            gl.uniform1f(this.uLoc(this.worldProg, 'u_outlineExtrude'), 0.068 * (this.settings.inkOutlineStrength ?? 0.95));

            gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, carMat);
            gl.bindVertexArray(chassisMesh.vao);
            gl.drawArrays(gl.TRIANGLES, 0, chassisMesh.count);

            for (let wIdx = 0; wIdx < wheelMeshes.length; wIdx++) {
                const w = wheelMeshes[wIdx];
                const wMat = this.computeWheelModelMatrix(carMat, car, w, wIdx);
                gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, wMat);
                gl.bindVertexArray(w.vao);
                gl.drawArrays(gl.TRIANGLES, 0, w.count);
            }

            // Pass 2: Stepped Toon + Street-Rave Livery + Matcap Streak Body & Wheel Shading
            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);
            gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 0);
            gl.uniform1f(this.uLoc(this.worldProg, 'u_outlineExtrude'), 0.0);

            gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, carMat);
            gl.bindVertexArray(chassisMesh.vao);
            gl.drawArrays(gl.TRIANGLES, 0, chassisMesh.count);

            for (let wIdx = 0; wIdx < wheelMeshes.length; wIdx++) {
                const w = wheelMeshes[wIdx];
                const wMat = this.computeWheelModelMatrix(carMat, car, w, wIdx);
                gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, wMat);
                gl.bindVertexArray(w.vao);
                gl.drawArrays(gl.TRIANGLES, 0, w.count);
            }

            // Pass 3A: 3D Exhaust Afterburner / Gear-Shift Backfire + Beat-Pop Flame Cones (gated to Pre-Drop / Main Drop)
            const dropFactor = Math.max(0.0, ((audioState.dropIntensity ?? 0.35) - 0.55) / 0.45);
            const beatFlame = (car.speed > 12.0 && audioState.beatPulse > 0.52 && dropFactor > 0.0)
                ? audioState.beatPulse * 0.65 * dropFactor * ar
                : 0.0;
            const flame = Math.max(car.exhaustFlameIntensity || 0.0, beatFlame);
            if (flame > 0.08 && this.afterburnerMesh && activeMesh.exhaustNozzles) {
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                gl.depthMask(false);
                gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 3);

                const flameCol = (car.boostTimer > 0)
                    ? [0.15, 0.95, 1.0]
                    : ((car.shiftTimer > 0) ? [1.0, 0.65, 0.12] : vState.carEmissive);
                gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), flameCol);
                gl.bindVertexArray(this.afterburnerMesh.vao);

                const sx = 0.72 + flame * 0.55;
                const sz = 0.50 + flame * 1.45 + Math.sin(this.time * 68.0) * 0.18;
                for (const nozzle of activeMesh.exhaustNozzles) {
                    const fMat = this.computeLocalOffsetScaleMatrix(carMat, nozzle, [sx, sx, sz]);
                    gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, fMat);
                    gl.drawArrays(gl.TRIANGLES, 0, this.afterburnerMesh.count);
                }

                gl.depthMask(true);
                gl.disable(gl.BLEND);
            }
        }
        gl.uniform4f(this.uLoc(this.worldProg, 'u_carDriveState'), 0.0, 0.0, 0.0, 0.0);

        // 1E. Static Car-Locked 3D Taillight Light-Trail Ribbons (strictly behind taillights, zero float)
        this.renderTaillightRibbons(vehicles, vState, audioState);

        // 1F. Stylized Anime Toon Smoke & R4 Charge Sparks
        if (this.particles.length > 0) {
            gl.bindVertexArray(this.particleMesh.vao);
            gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 0);

            for (const p of this.particles) {
                const s = p.scale * (p.life / p.maxLife);
                const pMat = this.translationScaleMatrix(p.pos, s);
                gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), p.customColor || vState.carEmissive);
                gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, pMat);
                gl.drawArrays(gl.TRIANGLES, 0, this.particleMesh.count);
            }
        }

        // 1G. 3D Basis Vector Debug Arrows (Travel Forward = Green, Visual Nose = Cyan, Right = Red)
        if (this.showDebugVectors) {
            gl.bindVertexArray(this.particleMesh.vao);
            gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 0);
            const drawVectorDots = (dir, color, maxDist, yOff) => {
                gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), color);
                gl.uniform3fv(this.uLoc(this.worldProg, 'u_curbA'), color);
                for (let step = 1.6; step <= maxDist; step += 0.55) {
                    const pos = [
                        playerCar.pos[0] + dir[0] * step,
                        playerCar.pos[1] + yOff + dir[1] * step,
                        playerCar.pos[2] + dir[2] * step
                    ];
                    const sz = (step > maxDist - 0.6) ? 0.34 : 0.18;
                    const pMat = this.translationScaleMatrix(pos, sz);
                    gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, pMat);
                    gl.drawArrays(gl.TRIANGLES, 0, this.particleMesh.count);
                }
            };
            // Green = True Travel Velocity Direction (forward)
            drawVectorDots(playerCar.forward, [0.1, 1.0, 0.35], 6.5, 0.65);
            // Cyan = Visual Chassis Nose (visualForward, shows slip angle!)
            drawVectorDots(playerCar.visualForward, [0.0, 0.95, 1.0], 5.8, 0.85);
            // Red/Magenta = Right Vector (visualRight)
            drawVectorDots(playerCar.visualRight, [1.0, 0.15, 0.4], 4.2, 0.65);
        }

        // =========================================================================
        // PASS 2: PING-PONG TEMPORAL "PAINT SMUDGE" & KUWAHARA ACCUMULATION PASS
        // =========================================================================
        const readHist = this.historyFBOs[this.pingPongIndex];
        const writeHist = this.historyFBOs[1 - this.pingPongIndex];

        gl.bindFramebuffer(gl.FRAMEBUFFER, writeHist.fbo);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this.smudgeProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
        gl.uniform1i(this.uLoc(this.smudgeProg, 'u_currentScene'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, readHist.tex);
        gl.uniform1i(this.uLoc(this.smudgeProg, 'u_historyTex'), 1);

        gl.uniform2f(this.uLoc(this.smudgeProg, 'u_resolution'), this.width, this.height);
        gl.uniform2fv(this.uLoc(this.smudgeProg, 'u_vanishingPointUV'), this.vanishingPointUV);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_normalizedSpeed'), playerCar.normalizedSpeed);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_boostIntensity'), playerCar.boostIntensity);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_angularYawVel'), this.angularVelYaw);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_smudgeSetting'), this.settings.smudgeIntensity);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_smudgeThreshold'), this.settings.smudgeThreshold ?? 0.46);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_kuwaharaSetting'), this.settings.kuwaharaStrength);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_inkSetting'), this.settings.inkOutlineStrength);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_speedLinesSetting'), this.settings.speedLinesIntensity);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_bassPulse'), audioState.beatPulse * ar);
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_dropIntensity'), (audioState.dropIntensity ?? 0.35) * ar);
        gl.uniform4f(
            this.uLoc(this.smudgeProg, 'u_audioSpectrum'),
            audioState.subBass * ar,
            audioState.lowMid * ar,
            audioState.highMid * ar,
            audioState.treble * ar
        );
        gl.uniform1f(this.uLoc(this.smudgeProg, 'u_time'), this.time);
        gl.uniform3fv(this.uLoc(this.smudgeProg, 'u_vibeEmissive'), vState.carEmissive);

        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // =========================================================================
        // PASS 3: FINAL COMPOSITE TO SCREEN (ROBERTS CROSS INK + CHROMATIC OVERDRIVE + REDLINE SPEED LINES)
        // =========================================================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.compositeProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, writeHist.tex);
        gl.uniform1i(this.uLoc(this.compositeProg, 'u_smudgedTex'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
        gl.uniform1i(this.uLoc(this.compositeProg, 'u_rawSceneTex'), 1);

        gl.uniform2f(this.uLoc(this.compositeProg, 'u_resolution'), this.width, this.height);
        gl.uniform2fv(this.uLoc(this.compositeProg, 'u_vanishingPointUV'), this.vanishingPointUV);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_normalizedSpeed'), playerCar.normalizedSpeed);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_boostIntensity'), playerCar.boostIntensity);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_inkSetting'), this.settings.inkOutlineStrength);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_speedLinesSetting'), this.settings.speedLinesIntensity);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_bassPulse'), audioState.beatPulse * ar);
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_dropIntensity'), (audioState.dropIntensity ?? 0.35) * ar);
        gl.uniform4f(
            this.uLoc(this.compositeProg, 'u_audioSpectrum'),
            audioState.subBass * ar,
            audioState.lowMid * ar,
            audioState.highMid * ar,
            audioState.treble * ar
        );
        gl.uniform1f(this.uLoc(this.compositeProg, 'u_time'), this.time);
        gl.uniform3fv(this.uLoc(this.compositeProg, 'u_vibeEmissive'), vState.carEmissive);
        gl.uniform1i(this.uLoc(this.compositeProg, 'u_debugBufferMode'), this.debugBufferMode || 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Swap ping-pong history buffers
        this.pingPongIndex = 1 - this.pingPongIndex;
    }

    renderTaillightRibbons(vehicles, vState, audioState = null) {
        const gl = this.gl;
        if (!this.trailVAO || !this.trailVBO) return;
        const trailSetting = this.settings.taillightTrailsIntensity !== undefined ? this.settings.taillightTrailsIntensity : 1.0;
        if (trailSetting <= 0.01) return;

        const buf = this._trailBuffer;
        const maxFloats = buf.length;
        let vi = 0;
        const halfH = 0.052; // Static taillight-lens vertical half-height (never floats or expands)
        const numSegs = 8;

        for (const car of vehicles) {
            const emitStrength = Math.min(
                1.0,
                Math.max(
                    0.0,
                    (car.normalizedSpeed - 0.18) * 1.15 +
                    (car.boostIntensity || 0) * 0.85 +
                    (car.driftState === 'DRIFTING' ? 0.45 : 0.0) +
                    (car.brakeLightIntensity || 0) * 0.35
                )
            ) * trailSetting;

            if (emitStrength <= 0.05 || car.speed <= 10.0) continue;

            const activeMesh = car.isPlayer
                ? this.carMesh
                : ((this.rivalCarMeshes && this.rivalCarMeshes[car.id]) || this.carMesh);
            const anchors = (activeMesh && activeMesh.taillightAnchors) || {
                left:  [-0.74, 0.64, -1.86],
                right: [ 0.74, 0.64, -1.86]
            };

            const carMat = this.computeCarModelMatrix(car);
            const leftWorld  = this.transformPointMat4(carMat, anchors.left);
            const rightWorld = this.transformPointMat4(carMat, anchors.right);

            // Extend strictly backward along the road-aligned travel tangent at taillight height (never above the car)
            const F = car.forward || [0, 0, 1];
            const R = car.right   || [1, 0, 0];
            const U = car.up      || [0, 1, 0];
            const trailLen = Math.min(3.2, Math.max(0.75, car.normalizedSpeed * 2.4 + (car.boostIntensity || 0) * 0.75));
            const yawCurve = Math.max(-0.38, Math.min(0.38, (car.yawRate || 0) * 0.12));

            for (const startPt of [leftWorld, rightWorld]) {
                for (let s = 0; s < numSegs; s++) {
                    if (vi + 72 > maxFloats) break;
                    const t0 = s / numSegs;
                    const t1 = (s + 1) / numSegs;
                    const d0 = t0 * trailLen;
                    const d1 = t1 * trailLen;
                    const lat0 = yawCurve * t0 * t0 * trailLen * 0.30;
                    const lat1 = yawCurve * t1 * t1 * trailLen * 0.30;
                    const drop0 = d0 * 0.025;
                    const drop1 = d1 * 0.025;

                    const p0x = startPt[0] - F[0] * d0 + R[0] * lat0 - U[0] * drop0;
                    const p0y = startPt[1] - F[1] * d0 + R[1] * lat0 - U[1] * drop0;
                    const p0z = startPt[2] - F[2] * d0 + R[2] * lat0 - U[2] * drop0;

                    const p1x = startPt[0] - F[0] * d1 + R[0] * lat1 - U[0] * drop1;
                    const p1y = startPt[1] - F[1] * d1 + R[1] * lat1 - U[1] * drop1;
                    const p1z = startPt[2] - F[2] * d1 + R[2] * lat1 - U[2] * drop1;

                    const a0 = Math.max(0.0, (1.0 - t0) * (1.0 - t0) * emitStrength * 0.88);
                    const a1 = Math.max(0.0, (1.0 - t1) * (1.0 - t1) * emitStrength * 0.88);
                    if (a0 <= 0.01 && a1 <= 0.01) continue;

                    const ux = U[0] * halfH, uy = U[1] * halfH, uz = U[2] * halfH;
                    const b0x = p0x - ux, b0y = p0y - uy, b0z = p0z - uz;
                    const t0x = p0x + ux, t0y = p0y + uy, t0z = p0z + uz;
                    const b1x = p1x - ux, b1y = p1y - uy, b1z = p1z - uz;
                    const t1x = p1x + ux, t1y = p1y + uy, t1z = p1z + uz;

                    // Tri 1: b0, top0, top1
                    buf[vi++] = b0x; buf[vi++] = b0y; buf[vi++] = b0z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a0; buf[vi++] = 0; buf[vi++] = 0;
                    buf[vi++] = t0x; buf[vi++] = t0y; buf[vi++] = t0z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a0; buf[vi++] = 1; buf[vi++] = 0;
                    buf[vi++] = t1x; buf[vi++] = t1y; buf[vi++] = t1z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a1; buf[vi++] = 1; buf[vi++] = 1;
                    // Tri 2: b0, top1, b1
                    buf[vi++] = b0x; buf[vi++] = b0y; buf[vi++] = b0z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a0; buf[vi++] = 0; buf[vi++] = 0;
                    buf[vi++] = t1x; buf[vi++] = t1y; buf[vi++] = t1z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a1; buf[vi++] = 1; buf[vi++] = 1;
                    buf[vi++] = b1x; buf[vi++] = b1y; buf[vi++] = b1z; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0; buf[vi++] = 1; buf[vi++] = 0.4; buf[vi++] = 0; buf[vi++] = a1; buf[vi++] = 0; buf[vi++] = 1;
                }
            }
        }

        const vertCount = Math.min(this.maxTrailVerts, Math.floor(vi / 12));
        if (vertCount <= 0) return;

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);

        gl.uniformMatrix4fv(this.uLoc(this.worldProg, 'u_model'), false, this.identityMatrix());
        gl.uniform1f(this.uLoc(this.worldProg, 'u_propBounceScale'), 0.0);
        gl.uniform1i(this.uLoc(this.worldProg, 'u_passMode'), 3);
        const ribbonTint = [
            Math.min(1.0, vState.carEmissive[0] * 0.65 + 0.35),
            Math.min(1.0, vState.carEmissive[1] * 0.45 + 0.08),
            Math.min(1.0, vState.carEmissive[2] * 0.55 + 0.22)
        ];
        gl.uniform3fv(this.uLoc(this.worldProg, 'u_carEmissive'), ribbonTint);

        gl.bindVertexArray(this.trailVAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.trailVBO);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf, 0, vertCount * 12);
        gl.drawArrays(gl.TRIANGLES, 0, vertCount);

        gl.depthMask(true);
        gl.disable(gl.BLEND);
    }

    // =========================================================================
    // 3D MATRIX MATH HELPERS
    // =========================================================================
    identityMatrix() {
        return this._identityMat;
    }

    translationScaleMatrix(pos, s) {
        const m = this._tempMat;
        m[0] = s;      m[1] = 0;      m[2] = 0;      m[3] = 0;
        m[4] = 0;      m[5] = s;      m[6] = 0;      m[7] = 0;
        m[8] = 0;      m[9] = 0;      m[10] = s;     m[11] = 0;
        m[12] = pos[0]; m[13] = pos[1]; m[14] = pos[2]; m[15] = 1;
        return m;
    }

    transformPointMat4(m, p) {
        return [
            m[0] * p[0] + m[4] * p[1] + m[8]  * p[2] + m[12],
            m[1] * p[0] + m[5] * p[1] + m[9]  * p[2] + m[13],
            m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]
        ];
    }

    multiplyMat4(a, b, out = null) {
        const dst = out || new Float32Array(16);
        for (let col = 0; col < 4; col++) {
            const b0 = b[col * 4 + 0];
            const b1 = b[col * 4 + 1];
            const b2 = b[col * 4 + 2];
            const b3 = b[col * 4 + 3];
            dst[col * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3;
            dst[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3;
            dst[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
            dst[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
        }
        return dst;
    }

    computeWheelModelMatrix(carMat, car, wheelDesc, wheelIdx) {
        const spin = car.wheelSpin || 0.0;
        const cs = Math.cos(spin), ss = Math.sin(spin);
        const tiltZ = wheelDesc.camberTiltZ || 0.0;
        const cz = Math.cos(tiltZ), sz = Math.sin(tiltZ);
        const steer = wheelDesc.isFront ? (car.wheelSteerAngle || 0.0) : 0.0;
        const cy = Math.cos(steer), sy = Math.sin(steer);

        // 1. Spin around X -> 2. Camber tilt around Z -> 3. Front steer/counter-steer around Y
        const xCam0 = cz,        xCam1 = sz,       xCam2 = 0.0;
        const yCam0 = -cs * sz,  yCam1 = cs * cz,  yCam2 = ss;
        const zCam0 =  ss * sz,  zCam1 = -ss * cz, zCam2 = cs;

        const c0x = xCam0 * cy - xCam2 * sy, c0y = xCam1, c0z = xCam0 * sy + xCam2 * cy;
        const c1x = yCam0 * cy - yCam2 * sy, c1y = yCam1, c1z = yCam0 * sy + yCam2 * cy;
        const c2x = zCam0 * cy - zCam2 * sy, c2y = zCam1, c2z = zCam0 * sy + zCam2 * cy;

        const jounce = (car.wheelJounce && car.wheelJounce[wheelIdx] !== undefined) ? car.wheelJounce[wheelIdx] : 0.0;
        const tx = wheelDesc.pos[0];
        const ty = wheelDesc.pos[1] + jounce;
        const tz = wheelDesc.pos[2];

        const localMat = this._wheelLocalMat;
        localMat[0] = c0x; localMat[1] = c0y; localMat[2] = c0z; localMat[3] = 0;
        localMat[4] = c1x; localMat[5] = c1y; localMat[6] = c1z; localMat[7] = 0;
        localMat[8] = c2x; localMat[9] = c2y; localMat[10] = c2z; localMat[11] = 0;
        localMat[12] = tx; localMat[13] = ty; localMat[14] = tz;  localMat[15] = 1;
        return this.multiplyMat4(carMat, localMat, this._wheelWorldMat);
    }

    computeLocalOffsetScaleMatrix(carMat, localPos, scaleVec) {
        const localMat = this._offsetLocalMat;
        localMat[0] = scaleVec[0]; localMat[1] = 0;           localMat[2] = 0;           localMat[3] = 0;
        localMat[4] = 0;           localMat[5] = scaleVec[1]; localMat[6] = 0;           localMat[7] = 0;
        localMat[8] = 0;           localMat[9] = 0;           localMat[10] = scaleVec[2]; localMat[11] = 0;
        localMat[12] = localPos[0]; localMat[13] = localPos[1]; localMat[14] = localPos[2]; localMat[15] = 1;
        return this.multiplyMat4(carMat, localMat, this._offsetWorldMat);
    }

    computeOrientedStreakMatrix(pos, R, U, F, sx, sy, sz) {
        const m = this._tempMat;
        m[0] = R[0] * sx; m[1] = R[1] * sx; m[2] = R[2] * sx; m[3] = 0;
        m[4] = U[0] * sy; m[5] = U[1] * sy; m[6] = U[2] * sy; m[7] = 0;
        m[8] = F[0] * sz; m[9] = F[1] * sz; m[10] = F[2] * sz; m[11] = 0;
        m[12] = pos[0];   m[13] = pos[1];   m[14] = pos[2];   m[15] = 1;
        return m;
    }

    projectWorldToUV(viewProj, worldPos) {
        const x = worldPos[0], y = worldPos[1], z = worldPos[2];
        const cx = viewProj[0] * x + viewProj[4] * y + viewProj[8]  * z + viewProj[12];
        const cy = viewProj[1] * x + viewProj[5] * y + viewProj[9]  * z + viewProj[13];
        const cw = viewProj[3] * x + viewProj[7] * y + viewProj[11] * z + viewProj[15];
        if (cw <= 0.1) return null;
        const ndcX = cx / cw;
        const ndcY = cy / cw;
        return [
            Math.max(0.15, Math.min(0.85, ndcX * 0.5 + 0.5)),
            Math.max(0.18, Math.min(0.72, ndcY * 0.5 + 0.5))
        ];
    }

    computeCarModelMatrix(car) {
        const R = car.visualRight || [-1, 0, 0];
        const U = car.visualUp || [0, 1, 0];
        const F = car.visualForward || [0, 0, 1];
        const P = car.pos;

        // Orthonormal right-handed basis matrix: Column 0 = Left (-R), Column 1 = Up (U), Column 2 = Forward (F)
        const m = this._carMat;
        m[0] = -R[0]; m[1] = -R[1]; m[2] = -R[2]; m[3] = 0;
        m[4] =  U[0]; m[5] =  U[1]; m[6] =  U[2]; m[7] = 0;
        m[8] =  F[0]; m[9] =  F[1]; m[10] = F[2]; m[11] = 0;
        m[12] = P[0]; m[13] = P[1]; m[14] = P[2]; m[15] = 1;
        return m;
    }

    computeViewProjMatrix(aspect) {
        const fovRad = (this.currentFov * Math.PI) / 180.0;
        const f = 1.0 / Math.tan(fovRad * 0.5);
        const near = 0.5;
        const far = 950.0;
        const nf = 1.0 / (near - far);

        const proj = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];

        // Camera LookAt with screen-space Drift Dutch Angle Roll
        const eye = this.camPos;
        const target = this.camTarget;
        let zx = eye[0] - target[0];
        let zy = eye[1] - target[1];
        let zz = eye[2] - target[2];
        let zLen = Math.hypot(zx, zy, zz) || 1;
        zx /= zLen; zy /= zLen; zz /= zLen;

        // Unrolled camera right = worldUp(0,1,0) x zAxis
        let xx = zz;
        let xy = 0;
        let xz = -zx;
        let xLen = Math.hypot(xx, xy, xz) || 1;
        xx /= xLen; xy /= xLen; xz /= xLen;

        // Unrolled camera up = zAxis x xAxis
        let yx = zy * xz - zz * xy;
        let yy = zz * xx - zx * xz;
        let yz = zx * xy - zy * xx;

        // Apply Dutch Angle roll in camera screen plane around zAxis
        const cr = Math.cos(this.currentDutchRoll);
        const sr = Math.sin(this.currentDutchRoll);
        const rxx = xx * cr + yx * sr;
        const rxy = xy * cr + yy * sr;
        const rxz = xz * cr + yz * sr;
        const ryx = -xx * sr + yx * cr;
        const ryy = -xy * sr + yy * cr;
        const ryz = -xz * sr + yz * cr;

        const view = [
            rxx, ryx, zx, 0,
            rxy, ryy, zy, 0,
            rxz, ryz, zz, 0,
            -(rxx * eye[0] + rxy * eye[1] + rxz * eye[2]),
            -(ryx * eye[0] + ryy * eye[1] + ryz * eye[2]),
            -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
            1
        ];

        const out = this._viewProjMat;
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                out[j * 4 + i] =
                    proj[0 * 4 + i] * view[j * 4 + 0] +
                    proj[1 * 4 + i] * view[j * 4 + 1] +
                    proj[2 * 4 + i] * view[j * 4 + 2] +
                    proj[3 * 4 + i] * view[j * 4 + 3];
            }
        }
        return out;
    }
};
