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
            smudgeIntensity: 0.85,
            smudgeThreshold: 0.58,
            kuwaharaStrength: 0.75,
            inkOutlineStrength: 0.90,
            speedLinesIntensity: 0.85,
            fovBase: 62.0,
            fovMax: 106.0,
            audioReactivity: 1.0
        };

        // Camera state (Pillar 1.3: Dynamic Sense-of-Speed Camera + Dev Inspection Modes)
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
        this.prevYaw = 0.0;
        this.angularVelYaw = 0.0;
        this.screenShake = 0.0;

        // Stylized VFX Particles (Toon Tire Smoke + Collision Paint Splatters)
        this.particles = [];
        this.maxParticles = 140;

        this.width = 0;
        this.height = 0;
        this.pingPongIndex = 0;
        this.time = 0;

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
        return prog;
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

            if (uv.y < horizonY) {
                // Turquoise Hiroshi Nagai Ocean Bay below horizon
                float seaT = clamp((horizonY - uv.y) / max(0.01, horizonY), 0.0, 1.0);
                vec3 seaDeep = mix(u_shadowCool, vec3(0.02, 0.45, 0.68), 0.65);
                vec3 seaShallow = mix(u_skyHorizon, vec3(0.10, 0.88, 0.86), 0.55);
                float quantSea = floor(seaT * 8.0) / 8.0;
                vec3 col = mix(seaShallow, seaDeep, quantSea);

                // Crisp horizontal sun reflection shimmer bars on water
                float sunX = fract(0.5 - u_camYaw / 6.28318);
                float dx = abs(uv.x - sunX);
                float wave = sin(uv.y * 190.0 + u_time * 6.0) * 0.015;
                if (dx + wave < 0.09 * (1.0 - seaT * 0.7)) {
                    if (fract(uv.y * 55.0 - u_time * 0.8) > 0.35) {
                        col = u_sunColor;
                    }
                }
                fragColor = vec4(col, 1.0);
                return;
            }

            // Quantized Banded Nagai Sky above horizon
            float skyT = clamp((uv.y - horizonY) / (1.0 - horizonY), 0.0, 1.0);
            float dither = bayer4x4(gl_FragCoord.xy) * 0.032;
            float bandedT = floor((pow(skyT, 0.75) + dither) * 10.0) / 10.0;
            vec3 skyCol = mix(u_skyHorizon, u_skyTop, clamp(bandedT, 0.0, 1.0));

            // Oversized Crisp Sun Disc with retro horizontal slices
            float sunX = fract(0.5 - u_camYaw / 6.28318);
            vec2 sunDelta = vec2((uv.x - sunX) * 1.7, uv.y - (horizonY + 0.16));
            float sunDist = length(sunDelta);
            float sunRadius = 0.135 + u_bassPulse * 0.015;
            if (sunDist < sunRadius) {
                float sliceY = sunDelta.y / sunRadius;
                bool cut = (sliceY < -0.15 && fract(sliceY * 9.0) < 0.28);
                if (!cut) {
                    skyCol = mix(u_sunColor, vec3(1.0, 0.35, 0.55), clamp((0.5 - sliceY) * 0.5, 0.0, 1.0));
                }
            }

            // Static Parallax Painted Cumulus Clouds (Flat Nagai White/Coral)
            float cloudX = uv.x * 4.5 + u_camYaw * 0.7 + u_time * 0.01;
            float cloudY = uv.y - horizonY;
            if (cloudY > 0.02 && cloudY < 0.20) {
                float puff = sin(cloudX * 3.2) * 0.5 + sin(cloudX * 7.1 + 1.3) * 0.3 + cos(cloudX * 13.0) * 0.15;
                float topEdge = 0.08 + max(0.0, puff) * 0.085;
                if (cloudY < topEdge && cloudY > 0.025) {
                    vec3 cloudLit = mix(vec3(1.0, 0.98, 0.95), u_sunColor, 0.25);
                    vec3 cloudShade = mix(u_skyHorizon, u_shadowCool, 0.45);
                    skyCol = (cloudY > topEdge - 0.025) ? cloudLit : cloudShade;
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

        out vec3 v_worldPos;
        out vec3 v_normal;
        out vec4 v_colorId;
        out vec2 v_uv;

        void main() {
            mat3 normalMat = mat3(u_model);
            vec3 norm = normalize(normalMat * a_normal);
            vec3 localPos = a_pos + a_normal * u_outlineExtrude;
            vec4 worldPos = u_model * vec4(localPos, 1.0);

            v_worldPos = worldPos.xyz;
            v_normal = norm;
            v_colorId = a_colorId;
            v_uv = a_uv;
            gl_Position = u_viewProj * worldPos;
        }`;

        const worldFS = `#version 300 es
        precision highp float;
        in vec3 v_worldPos;
        in vec3 v_normal;
        in vec4 v_colorId;
        in vec2 v_uv;

        out vec4 fragColor;

        uniform int u_passMode; // 0 = Nagai Toon Lit, 1 = Black Ink Outline, 2 = DJ Jumbotron Screen
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
        uniform vec3 u_foliageLit;
        uniform vec3 u_foliageShadow;
        uniform vec4 u_audioSpectrum; // x=SubBass, y=LowMid, z=HighMid, w=Treble
        uniform float u_beatPulse;
        uniform float u_time;
        uniform sampler2D u_djTex;

        void main() {
            // Pass 1: Inverted-Hull Black Ink Outline (Auto Modellista)
            if (u_passMode == 1) {
                fragColor = vec4(0.03, 0.01, 0.06, 1.0);
                return;
            }

            // Pass 2: Trackside Boiler Room LED Jumbotron Screen
            if (u_passMode == 2) {
                vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
                // Subtle bass glitch distortion on LED screen
                float glitch = (u_beatPulse > 0.7) ? sin(uv.y * 80.0 + u_time * 40.0) * 0.008 * u_beatPulse : 0.0;
                vec3 djCol = texture(u_djTex, clamp(uv + vec2(glitch, 0.0), 0.0, 1.0)).rgb;

                // LED Pixel Grid Mask
                vec2 ledGrid = fract(uv * vec2(128.0, 64.0));
                float mask = (ledGrid.x > 0.12 && ledGrid.y > 0.12) ? 1.18 : 0.55;
                djCol *= mask * (1.0 + u_audioSpectrum.x * 0.35);
                fragColor = vec4(djCol, 1.0);
                return;
            }

            // Pass 0: Hiroshi Nagai Crisp Two-Tone Cel Shading (Zero soft gradients!)
            vec3 N = normalize(v_normal);
            vec3 L = normalize(u_lightDir);
            vec3 V = normalize(u_camPos - v_worldPos);

            float NdotL = dot(N, L);
            // Stepped ramp per spec: smoothstep(0.0, 0.01, NdotL)
            float litStep = smoothstep(-0.02, 0.015, NdotL);

            int zoneId = int(floor(v_colorId.g * 10.0 + 0.5));
            vec3 baseLit = u_carPrimary;
            vec3 baseShade = u_shadowCool;

            if (zoneId == 0) {
                // Road Asphalt + Audio-Reactive Center/Edge Striping
                baseLit = u_roadLit;
                baseShade = u_roadShadow;
                // Center dashed rave line & edge glow lines
                float centerLine = abs(v_uv.x - 0.5);
                if (centerLine < 0.014 && fract(v_uv.y * 0.5) < 0.45) {
                    baseLit = mix(u_curbB, vec3(1.0), 0.4 + u_audioSpectrum.x * 0.5);
                    baseShade = baseLit;
                } else if (v_uv.x < 0.035 || v_uv.x > 0.965) {
                    baseLit = mix(u_curbA, vec3(1.0), u_audioSpectrum.x * 0.45);
                    baseShade = baseLit;
                }
            } else if (zoneId == 1) {
                // Alternating Vibe Curbs
                bool alt = fract(v_uv.y * 0.75) > 0.5;
                baseLit = alt ? u_curbA : u_curbB;
                baseShade = mix(baseLit, u_shadowCool, 0.45);
            } else if (zoneId == 2) {
                // Nagai Palm Trees & Coastal Foliage
                baseLit = u_foliageLit;
                baseShade = u_foliageShadow;
            } else if (zoneId == 3) {
                // Architecture / Bridge / Tunnel Concrete
                baseLit = mix(u_carTrim, u_roadLit, 0.35);
                baseShade = u_shadowCool;
            } else if (zoneId == 4) {
                // Audio-Reactive Neon Arches, Billboards & Taillights
                float pulse = 1.0 + u_audioSpectrum.x * 0.85 + u_beatPulse * 0.45;
                vec3 neon = mix(u_carEmissive, u_curbA, fract(v_uv.y * 0.2 + u_time * 0.5));
                fragColor = vec4(neon * pulse, 1.0);
                return;
            } else if (zoneId == 5) {
                // Car Primary Body
                baseLit = u_carPrimary;
                baseShade = mix(u_carPrimary * 0.42, u_shadowCool, 0.58);
            } else if (zoneId == 6) {
                // Car Secondary Trim / Aero Wing
                baseLit = u_carSecondary;
                baseShade = mix(u_carSecondary * 0.4, u_shadowCool, 0.6);
            } else if (zoneId == 7) {
                // Car Windshield & Canopy (Auto Modellista View-Space Matcap Light Streaks!)
                vec3 R = reflect(-V, N);
                float streak = step(0.32, fract(R.x * 2.4 + R.y * 1.6));
                vec3 glass = mix(u_shadowCool * 0.6, u_carPrimary, 0.35);
                vec3 finalGlass = mix(glass, vec3(1.0, 1.0, 1.0), streak * 0.88);
                fragColor = vec4(finalGlass, 1.0);
                return;
            } else if (zoneId == 8) {
                // Dark Tire / Chassis Black with Crisp Rim
                baseLit = vec3(0.16, 0.15, 0.22);
                baseShade = vec3(0.05, 0.04, 0.09);
            }

            vec3 finalColor = mix(baseShade, baseLit, litStep);

            // Auto Modellista View-Space Hard Specular Anime Streak on Car Body (zoneId 5 & 6)
            if (zoneId == 5 || zoneId == 6) {
                vec3 H = normalize(L + V);
                float spec = step(0.92, max(0.0, dot(N, H)));
                float rim = step(0.76, 1.0 - max(0.0, dot(N, V)));
                finalColor = mix(finalColor, vec3(1.0), spec * 0.75);
                finalColor = mix(finalColor, u_carEmissive, rim * 0.55);
            }

            // Emissive / Audio-Reactive Mask channel (a)
            if (v_colorId.a > 0.1) {
                float glow = v_colorId.a * (1.0 + u_audioSpectrum.x * 0.9);
                finalColor = mix(finalColor, u_carEmissive * 1.35, clamp(glow, 0.0, 1.0));
            }

            fragColor = vec4(finalColor, 1.0);
        }`;
        this.worldProg = this.createProgram(worldVS, worldFS);

        // 3. PILLAR 2.2: PING-PONG TEMPORAL "PAINT SMUDGE" + KUWAHARA + REDLINE SPEED-LINE SHADER
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
        uniform float u_normalizedSpeed;
        uniform float u_boostIntensity;
        uniform float u_angularYawVel;
        uniform float u_smudgeSetting;
        uniform float u_kuwaharaSetting;
        uniform float u_inkSetting;
        uniform float u_speedLinesSetting;
        uniform float u_bassPulse;
        uniform float u_time;
        uniform vec3 u_vibeEmissive;

        // Procedural anisotropic brush-stroke flow noise
        vec2 brushFlow(vec2 uv, float t) {
            float n1 = sin(uv.x * 42.0 + t * 14.0) * cos(uv.y * 36.0 - t * 11.0);
            float n2 = cos(uv.x * 85.0 - t * 19.0) * sin(uv.y * 74.0 + t * 16.0);
            return vec2(n1 + n2 * 0.5, n2 - n1 * 0.5);
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

            // Center focal area mask (keep center road readable, smear outer periphery heavily!)
            vec2 vanishPt = vec2(0.5 - clamp(u_angularYawVel * 0.12, -0.22, 0.22), 0.44);
            vec2 toCenter = vanishPt - uv;
            float radialDist = length(toCenter * vec2(1.25, 1.0));
            float peripheryMask = smoothstep(0.16, 0.68, radialDist);

            // Effective speed factor for Paint Smudge
            float speedFactor = clamp((u_normalizedSpeed - 0.52) / 0.55, 0.0, 1.0);
            float smudgePower = clamp(speedFactor * 0.8 + u_boostIntensity * 0.65, 0.0, 1.0) * u_smudgeSetting;

            // 1. Directional 4-Sector Kuwahara Oil-Paint Filter on Outer Periphery at High Speed
            vec3 currentColor = texture(u_currentScene, uv).rgb;
            float kuwRadius = smudgePower * peripheryMask * u_kuwaharaSetting * 3.0;
            if (kuwRadius > 0.45) {
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
                currentColor = mix(currentColor, bestMean, clamp(peripheryMask * 0.85, 0.0, 1.0));
            }

            // 2. Radial + Camera Angular Advection + Anisotropic Brush-Stroke Distortion
            vec2 radialDir = normalize(toCenter + vec2(0.0001));
            vec2 brush = brushFlow(uv * 2.2, u_time) * 0.0045 * (0.5 + speedFactor);
            vec2 lateralAdvect = vec2(u_angularYawVel * 0.012, 0.0);
            vec2 advectOffset = (radialDir * (0.011 + u_boostIntensity * 0.014) + lateralAdvect + brush) * (0.35 + peripheryMask * 0.95) * smudgePower;

            vec2 histUV = clamp(uv + advectOffset, 0.002, 0.998);
            vec3 historyColor = texture(u_historyTex, histUV).rgb;

            // Slight painterly hue rotation along the trail during Drift Boosts
            if (u_boostIntensity > 0.05) {
                historyColor = mix(historyColor, historyColor.gbr * 1.12, u_boostIntensity * 0.14);
            }

            // Weight smear persistence heavily toward saturated & bright paint strokes
            float histSat = saturation(historyColor);
            float histLum = luma(historyColor);
            float paintWeight = clamp(0.45 + histSat * 0.45 + histLum * 0.35, 0.0, 1.0);
            float blendFactor = clamp(smudgePower * peripheryMask * paintWeight * 0.91, 0.0, 0.92);

            vec3 smudgedColor = mix(currentColor, max(currentColor, historyColor * 0.97), blendFactor);

            fragColor = vec4(smudgedColor, 1.0);
        }`;
        this.smudgeProg = this.createProgram(postVS, smudgeFS);

        // 4. FINAL SCREEN COMPOSITE PASS: Roberts Cross Heavy Ink Outlines + Redline Polar Speed Lines
        const compositeFS = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        out vec4 fragColor;

        uniform sampler2D u_smudgedTex;
        uniform sampler2D u_rawSceneTex;
        uniform vec2 u_resolution;
        uniform float u_normalizedSpeed;
        uniform float u_boostIntensity;
        uniform float u_inkSetting;
        uniform float u_speedLinesSetting;
        uniform float u_bassPulse;
        uniform float u_time;
        uniform vec3 u_vibeEmissive;
        uniform int u_debugBufferMode;

        float luma(vec3 c) {
            return dot(c, vec3(0.299, 0.587, 0.114));
        }

        void main() {
            vec2 uv = v_uv;
            vec2 texel = 1.0 / u_resolution;

            if (u_debugBufferMode == 1) {
                fragColor = vec4(texture(u_rawSceneTex, uv).rgb, 1.0);
                return;
            }
            if (u_debugBufferMode == 2) {
                fragColor = vec4(texture(u_smudgedTex, uv).rgb, 1.0);
                return;
            }

            vec3 col = texture(u_smudgedTex, uv).rgb;

            // 1. Roberts Cross Heavy Anime Ink Edge Detection on Raw Scene
            if (u_inkSetting > 0.05) {
                vec3 c00 = texture(u_rawSceneTex, uv).rgb;
                vec3 c11 = texture(u_rawSceneTex, uv + texel * 1.25).rgb;
                vec3 c10 = texture(u_rawSceneTex, uv + vec2(texel.x * 1.25, 0.0)).rgb;
                vec3 c01 = texture(u_rawSceneTex, uv + vec2(0.0, texel.y * 1.25)).rgb;

                vec3 diff1 = c00 - c11;
                vec3 diff2 = c10 - c01;
                float edge = sqrt(dot(diff1, diff1) + dot(diff2, diff2));
                float inkMask = smoothstep(0.28, 0.52, edge) * u_inkSetting;
                col = mix(col, vec3(0.03, 0.01, 0.06), inkMask * 0.78);
            }

            // 2. Redline Anime Polar Speed-Lines at High Speed / Boost
            float speedIntensity = clamp((u_normalizedSpeed - 0.65) / 0.45 + u_boostIntensity * 0.85, 0.0, 1.0) * u_speedLinesSetting;
            if (speedIntensity > 0.05) {
                vec2 delta = (uv - vec2(0.5, 0.45)) * vec2(u_resolution.x / u_resolution.y, 1.0);
                float r = length(delta);
                float angle = atan(delta.y, delta.x);

                // Quantized angular spikes
                float angularCell = floor(angle * 72.0);
                float hash = fract(sin(angularCell * 127.1 + floor(u_time * 24.0) * 311.7) * 43758.5453);
                float spikeStart = 0.48 + (1.0 - speedIntensity) * 0.28 + hash * 0.26;

                if (r > spikeStart && hash > 0.72) {
                    float thin = abs(fract(angle * 72.0) - 0.5);
                    if (thin < 0.18 * (r - spikeStart) * 2.5) {
                        // Alternate between heavy black Redline ink streaks and blazing Vibe neon streaks!
                        vec3 streakCol = (hash > 0.88) ? mix(vec3(1.0), u_vibeEmissive, 0.6) : vec3(0.02, 0.01, 0.05);
                        col = streakCol;
                    }
                }
            }

            // Subtle vignette & contrast punch
            float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.35;
            col *= vig;

            fragColor = vec4(col, 1.0);
        }`;
        this.compositeProg = this.createProgram(postVS, compositeFS);
    }

    initTextures() {
        const gl = this.gl;
        this.djTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    updateDJTexture(djCanvas) {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, djCanvas);
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
        this.sceneFBO = this.createFBO(w, h, true);
        this.historyFBOs = [
            this.createFBO(w, h, false),
            this.createFBO(w, h, false)
        ];
    }

    createVAOFromArrays(verts) {
        // Interleaved vertex format: [x,y,z, nx,ny,nz, r,g,b,a, u,v] = 12 floats per vertex
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        const data = new Float32Array(verts);
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
        return { vao, count: verts.length / 12 };
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
        // Top
        this.pushQuad(verts, [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz], [0, 1, 0], colorId);
        // Bottom
        this.pushQuad(verts, [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [0, -1, 0], colorId);
        // Front (+Z)
        this.pushQuad(verts, [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz], [0, 0, 1], colorId);
        // Back (-Z)
        this.pushQuad(verts, [cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz], [0, 0, -1], colorId);
        // Right (+X)
        this.pushQuad(verts, [cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz], [1, 0, 0], colorId);
        // Left (-X)
        this.pushQuad(verts, [cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz], [-1, 0, 0], colorId);
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
    }

    buildTrackAndJumbotronMeshes() {
        const spline = this.trackSpline;
        const samples = spline.samples;
        const n = samples.length;
        const hw = spline.roadHalfWidth;
        const curbW = 1.65;

        const trackVerts = [];
        const jumbotronVerts = [];

        for (let i = 0; i < n; i++) {
            const s0 = samples[i];
            const s1 = samples[(i + 1) % n];

            const addPt = (s, lat, upOff) => [
                s.pos[0] + s.right[0] * lat + s.up[0] * upOff,
                s.pos[1] + s.right[1] * lat + s.up[1] * upOff,
                s.pos[2] + s.right[2] * lat + s.up[2] * upOff
            ];

            // Road Asphalt Surface (zoneId = 0.0)
            const rL0 = addPt(s0, -hw, 0);
            const rR0 = addPt(s0, hw, 0);
            const rR1 = addPt(s1, hw, 0);
            const rL1 = addPt(s1, -hw, 0);
            this.pushQuad(trackVerts, rL0, rR0, rR1, rL1, s0.up, [0.5, 0.0, 0.0, 0.0], [0, i * 0.25], [1, (i + 1) * 0.25]);

            // Left & Right Raised Curbs / Guardrails (zoneId = 0.1)
            const cL0 = addPt(s0, -hw - curbW, 0.45);
            const cL1 = addPt(s1, -hw - curbW, 0.45);
            this.pushQuad(trackVerts, cL0, rL0, rL1, cL1, s0.up, [0.8, 0.1, 0.0, 0.0], [0, i * 0.5], [1, (i + 1) * 0.5]);

            const cR0 = addPt(s0, hw + curbW, 0.45);
            const cR1 = addPt(s1, hw + curbW, 0.45);
            this.pushQuad(trackVerts, rR0, cR0, cR1, rR1, s0.up, [0.8, 0.1, 0.0, 0.0], [0, i * 0.5], [1, (i + 1) * 0.5]);

            // Sector-Specific Hiroshi Nagai Set-Pieces!
            // SECTOR 0: Emerald Coast Palm Trees & Sunlit Promenade
            if (s0.zone === 0 && i % 9 === 0) {
                for (const side of [-1, 1]) {
                    const base = addPt(s0, side * (hw + 5.5), 0);
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
                const pL = addPt(s0, -hw - 2.0, 0);
                const pR = addPt(s0, hw + 2.0, 0);
                const pTopL = addPt(s0, -hw - 1.0, 11.5);
                const pTopR = addPt(s0, hw + 1.0, 11.5);
                // Concrete outer arch (zoneId = 0.3)
                this.pushBox(trackVerts, [pL[0], pL[1] + 5.5, pL[2]], [1.6, 11.5, 1.6], [0.5, 0.3, 0.0, 0.0]);
                this.pushBox(trackVerts, [pR[0], pR[1] + 5.5, pR[2]], [1.6, 11.5, 1.6], [0.5, 0.3, 0.0, 0.0]);
                // Glowing Sub-Bass Neon Roof Beam (zoneId = 0.4)
                const roofMid = [(pTopL[0] + pTopR[0]) * 0.5, (pTopL[1] + pTopR[1]) * 0.5, (pTopL[2] + pTopR[2]) * 0.5];
                this.pushBox(trackVerts, roofMid, [hw * 2.1, 1.1, 1.4], [1.0, 0.4, 0.0, 1.0]);
            }

            // SECTOR 2: Bayshore Suspension Bridge Towers & Cables
            if (s0.zone === 2 && i % 8 === 0) {
                const pL = addPt(s0, -hw - 2.2, 0);
                const pR = addPt(s0, hw + 2.2, 0);
                const towerH = (i % 32 === 0) ? 28.0 : 12.0;
                const zId = (i % 32 === 0) ? 0.3 : 0.4;
                this.pushBox(trackVerts, [pL[0], pL[1] + towerH * 0.5, pL[2]], [1.4, towerH, 1.4], [0.9, zId, 0.0, zId === 0.4 ? 0.8 : 0.0]);
                this.pushBox(trackVerts, [pR[0], pR[1] + towerH * 0.5, pR[2]], [1.4, towerH, 1.4], [0.9, zId, 0.0, zId === 0.4 ? 0.8 : 0.0]);
                if (i % 32 === 0) {
                    const crossMid = [(pL[0] + pR[0]) * 0.5, pL[1] + 22.0, (pL[2] + pR[2]) * 0.5];
                    this.pushBox(trackVerts, crossMid, [hw * 2.2, 2.2, 2.2], [0.9, 0.3, 0.0, 0.0]);
                }
            }

            // SECTOR 3: Shibuya Neon Hairpins (Stylized Monolith Towers & Neon Strips)
            if (s0.zone === 3 && i % 10 === 0) {
                for (const side of [-1, 1]) {
                    const bPos = addPt(s0, side * (hw + 11.0), 0);
                    const bH = 22.0 + ((i * 13) % 18);
                    this.pushBox(trackVerts, [bPos[0], bPos[1] + bH * 0.4, bPos[2]], [7.5, bH, 7.5], [0.6, 0.3, 0.0, 0.0]);
                    // Neon vertical billboard strip on building face
                    const nPos = addPt(s0, side * (hw + 6.9), bH * 0.45);
                    this.pushBox(trackVerts, nPos, [0.6, bH * 0.65, 2.4], [1.0, 0.4, 0.0, 1.0]);
                }
            }

            // GIANT TRACKSIDE BOILER ROOM DJ JUMBOTRONS (Every 50 samples along the course!)
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
                const pilL = addPt(s0, -hw - 2.4, 5.5);
                const pilR = addPt(s0, hw + 2.4, 5.5);
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

        this.trackMesh = this.createVAOFromArrays(trackVerts);
        this.jumbotronMesh = this.createVAOFromArrays(jumbotronVerts);
    }

    buildSportsCarMesh() {
        // Stylized 90s JDM Ridge Racer Type 4 / Auto Modellista Wedge Sports Car
        // Zone IDs: 0.5 = Primary Body, 0.6 = Secondary Trim/Wing, 0.7 = Windshield Canopy, 0.8 = Wheels, 0.4 = Emissive Taillights
        const v = [];

        // Lower Wide Aero Body (Primary = 0.5)
        this.pushBox(v, [0, 0.52, 0], [2.15, 0.52, 4.55], [0.9, 0.5, 1.0, 0.0]);
        // Front Sleek Wedge Nose
        this.pushBox(v, [0, 0.44, 2.35], [2.05, 0.34, 0.65], [0.9, 0.5, 1.0, 0.0]);
        // Side Skirts & Diffuser (Secondary = 0.6)
        this.pushBox(v, [0, 0.26, 0], [2.26, 0.18, 4.30], [0.8, 0.6, 0.5, 0.15]);

        // Cabin Canopy (Windshield with Anime Light Streaks = 0.7)
        this.pushBox(v, [0, 0.96, -0.22], [1.68, 0.46, 2.15], [1.0, 0.7, 1.0, 0.0]);
        // Cabin Roof Cap (Primary = 0.5)
        this.pushBox(v, [0, 1.21, -0.28], [1.52, 0.08, 1.65], [1.0, 0.5, 1.0, 0.0]);

        // Iconic Giant GT Rear Wing (Secondary = 0.6)
        this.pushBox(v, [-0.72, 1.05, -2.05], [0.12, 0.55, 0.35], [0.8, 0.6, 0.5, 0.0]);
        this.pushBox(v, [0.72, 1.05, -2.05], [0.12, 0.55, 0.35], [0.8, 0.6, 0.5, 0.0]);
        this.pushBox(v, [0, 1.32, -2.12], [2.22, 0.10, 0.48], [1.0, 0.6, 1.0, 0.35]);

        // Glowing Twin Afterburner Taillights Bar (Emissive = 0.4, alpha=1.0)
        this.pushBox(v, [0, 0.62, -2.30], [1.95, 0.22, 0.12], [1.0, 0.4, 1.0, 1.0]);
        // Headlight Strips
        this.pushBox(v, [-0.68, 0.54, 2.66], [0.48, 0.12, 0.10], [1.0, 0.4, 1.0, 1.0]);
        this.pushBox(v, [0.68, 0.54, 2.66], [0.48, 0.12, 0.10], [1.0, 0.4, 1.0, 1.0]);

        // 4 Wide Arcade Racing Wheels (zoneId = 0.8)
        const wheelCoords = [
            [-1.08, 0.38, 1.42],
            [1.08, 0.38, 1.42],
            [-1.10, 0.40, -1.42],
            [1.10, 0.40, -1.42]
        ];
        for (const wc of wheelCoords) {
            this.pushBox(v, wc, [0.36, 0.74, 0.74], [0.3, 0.8, 0.0, 0.0]);
            // Glowing Vibe Wheel Rim Hub
            const rimX = wc[0] + Math.sign(wc[0]) * 0.19;
            this.pushBox(v, [rimX, wc[1], wc[2]], [0.05, 0.44, 0.44], [1.0, 0.6, 1.0, 0.7]);
        }

        this.carMesh = this.createVAOFromArrays(v);
    }

    spawnParticle(pos, vel, scale, life, isPaintSplatter = false) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }
        this.particles.push({
            pos: [pos[0], pos[1], pos[2]],
            vel: [vel[0], vel[1], vel[2]],
            scale: scale,
            life: life,
            maxLife: life,
            isPaintSplatter: isPaintSplatter
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

    updateCameraAndParticles(dt, playerCar) {
        this.time += dt;
        if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 1.8);

        // 1. Pillar 1.3: Dynamic Sense-of-Speed Camera (FOV Warp, Dutch Roll, Spring Lag, Micro-Jitter)
        const speedNorm = Math.min(1.25, playerCar.normalizedSpeed);
        const boost = playerCar.boostIntensity;

        const targetFov = this.settings.fovBase +
            (this.settings.fovMax - this.settings.fovBase) * Math.pow(Math.min(1.0, speedNorm), 1.4) +
            boost * 10.0;
        this.currentFov += (targetFov - this.currentFov) * Math.min(1.0, dt * 8.0);

        // Drift Dutch Angle Roll (up to ±6.5 degrees proportional to slip angle)
        const targetDutch = -playerCar.visualSlipAngle * 0.16;
        this.currentDutchRoll += (targetDutch - this.currentDutchRoll) * Math.min(1.0, dt * 7.5);

        // Elastic spring-arm lag on boost ignition
        const targetLag = boost * 1.85;
        this.camSpringLag += (targetLag - this.camSpringLag) * Math.min(1.0, dt * 9.0);

        const followDist = 6.8 + this.camSpringLag - Math.min(0.8, speedNorm * 0.55);
        const followHeight = 2.45 - Math.min(0.28, speedNorm * 0.22);

        // Micro-jitter at redline speeds or collision shake
        const jitterAmp = (speedNorm > 0.85 ? (speedNorm - 0.85) * 0.08 : 0) + this.screenShake * 0.35;
        const jX = (Math.sin(this.time * 53.0) * jitterAmp);
        const jY = (Math.cos(this.time * 47.0) * jitterAmp);

        if (this.cameraMode === 'ORBIT_CAR') {
            if (this.orbitAutoRotate) {
                this.orbitYaw = RRR.wrapAngle(this.orbitYaw + dt * 0.45);
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
        } else {
            // Standard FOLLOW sense-of-speed camera
            if (this.camYaw === undefined) {
                this.camYaw = playerCar.headingYaw;
            }
            const yawTargetDiff = RRR.wrapAngle(playerCar.headingYaw - this.camYaw);
            this.camYaw = RRR.wrapAngle(this.camYaw + yawTargetDiff * Math.min(1.0, dt * 12.0));

            const camFwdX = -Math.sin(this.camYaw);
            const camFwdY = playerCar.forward[1];
            const camFwdZ = Math.cos(this.camYaw);
            const camRightX = -Math.cos(this.camYaw);
            const camRightZ = -Math.sin(this.camYaw);

            this.camPos[0] = playerCar.pos[0] - camFwdX * followDist + camRightX * jX;
            this.camPos[1] = playerCar.pos[1] + followHeight - camFwdY * (followDist * 0.45) + jY;
            this.camPos[2] = playerCar.pos[2] - camFwdZ * followDist + camRightZ * jX;

            this.camTarget[0] = playerCar.pos[0] + camFwdX * 12.0;
            this.camTarget[1] = playerCar.pos[1] + 1.15 + camFwdY * 10.0;
            this.camTarget[2] = playerCar.pos[2] + camFwdZ * 12.0;

            const dYaw = RRR.wrapAngle(this.camYaw - this.prevYaw);
            this.angularVelYaw = (dYaw / Math.max(0.001, dt)) * 0.35 + playerCar.visualSlipAngle * 1.4;
            this.prevYaw = this.camYaw;
        }

        // 2. Spawn Cel-Shaded Tire Smoke Puffs during Drifts & Boosts
        if (playerCar.driftState === 'DRIFTING' || playerCar.boostTimer > 0) {
            const F = playerCar.visualForward;
            const R = playerCar.visualRight;
            for (const side of [-0.95, 0.95]) {
                const wx = playerCar.pos[0] - F[0] * 1.85 + R[0] * side;
                const wy = playerCar.pos[1] + 0.25;
                const wz = playerCar.pos[2] - F[2] * 1.85 + R[2] * side;
                this.spawnParticle(
                    [wx, wy, wz],
                    [(Math.random() - 0.5) * 3.0, 1.4 + Math.random() * 1.8, (Math.random() - 0.5) * 3.0],
                    0.42 + playerCar.driftCharge * 0.38,
                    0.38,
                    playerCar.boostTimer > 0
                );
            }
        }

        // Update active VFX particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.pos[0] += p.vel[0] * dt;
            p.pos[1] += p.vel[1] * dt;
            p.pos[2] += p.vel[2] * dt;
            p.scale += dt * 1.1;
        }
    }

    render(vehicles, playerCar, vibeController, audioState, djController) {
        const gl = this.gl;
        if (!gl) return;
        this.resize();

        // Upload live Boiler Room DJ canvas to shared GPU texture
        this.updateDJTexture(djController.canvas);

        const vState = vibeController.activeState;
        const aspect = this.width / this.height;
        const viewProj = this.computeViewProjMatrix(aspect);

        // =========================================================================
        // PASS 1: RENDER 3D SCENE TO SceneFBO (Skybox + Track + Jumbotrons + Cars)
        // =========================================================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
        gl.viewport(0, 0, this.width, this.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 1A. Hiroshi Nagai Banded Skybox
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this.skyProg);
        gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'u_skyTop'), vState.skyTop);
        gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'u_skyHorizon'), vState.skyHorizon);
        gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'u_sunColor'), vState.sunColor);
        gl.uniform3fv(gl.getUniformLocation(this.skyProg, 'u_shadowCool'), vState.shadowCool);
        gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_camYaw'), this.prevYaw);
        gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_camPitch'), playerCar.forward[1]);
        gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_time'), this.time);
        gl.uniform1f(gl.getUniformLocation(this.skyProg, 'u_bassPulse'), audioState.beatPulse * this.settings.audioReactivity);

        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 1B. 3D World Track & Sector Set-Pieces (Stepped Nagai Cel Shading)
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.useProgram(this.worldProg);

        gl.uniformMatrix4fv(gl.getUniformLocation(this.worldProg, 'u_viewProj'), false, viewProj);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_camPos'), this.camPos);
        gl.uniform3f(gl.getUniformLocation(this.worldProg, 'u_lightDir'), 0.45, 0.82, -0.35);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_shadowCool'), vState.shadowCool);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_roadLit'), vState.roadLit);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_roadShadow'), vState.roadShadow);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_curbA'), vState.curbA);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_curbB'), vState.curbB);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carPrimary'), vState.carPrimary);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carSecondary'), vState.carSecondary);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carTrim'), vState.carTrim);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carEmissive'), vState.carEmissive);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_foliageLit'), vState.foliageLit);
        gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_foliageShadow'), vState.foliageShadow);

        const ar = this.settings.audioReactivity;
        gl.uniform4f(
            gl.getUniformLocation(this.worldProg, 'u_audioSpectrum'),
            audioState.subBass * ar,
            audioState.lowMid * ar,
            audioState.highMid * ar,
            audioState.treble * ar
        );
        gl.uniform1f(gl.getUniformLocation(this.worldProg, 'u_beatPulse'), audioState.beatPulse * ar);
        gl.uniform1f(gl.getUniformLocation(this.worldProg, 'u_time'), this.time);

        const identityMat = this.identityMatrix();
        gl.uniformMatrix4fv(gl.getUniformLocation(this.worldProg, 'u_model'), false, identityMat);
        gl.uniform1f(gl.getUniformLocation(this.worldProg, 'u_outlineExtrude'), 0.0);
        gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 0);

        gl.bindVertexArray(this.trackMesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.trackMesh.count);

        // 1C. Trackside Boiler Room LED Jumbotrons (Sampling Shared DJ RenderTexture!)
        gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 2);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.djTexture);
        gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_djTex'), 0);

        gl.bindVertexArray(this.jumbotronMesh.vao);
        gl.drawArrays(gl.TRIANGLES, 0, this.jumbotronMesh.count);

        // 1D. Auto Modellista 3D Sports Cars (Player + AI Rivals)
        gl.bindVertexArray(this.carMesh.vao);
        for (const car of vehicles) {
            const carMat = this.computeCarModelMatrix(car);
            gl.uniformMatrix4fv(gl.getUniformLocation(this.worldProg, 'u_model'), false, carMat);

            // Per-car Vibe Palette override so each rival rocks their signature Vibe!
            const carPalette = RRR.VIBE_PALETTES[car.vibeKey] || RRR.VIBE_PALETTES.pacific_sunset;
            const cZone = carPalette.zones[vibeController.targetZoneIndex] || carPalette.zones[0];
            const primary = car.isPlayer ? vState.carPrimary : cZone.carPrimary;
            const secondary = car.isPlayer ? vState.carSecondary : cZone.carSecondary;
            const emissive = car.isBoiling ? [1.0, 0.06, 0.18] : (car.isUntouchable ? [1.0, 0.88, 0.20] : cZone.carEmissive);

            gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carPrimary'), primary);
            gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carSecondary'), secondary);
            gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carEmissive'), emissive);

            // Pass 1: Inverted-Hull Black Ink Outline (extruded along vertex normals)
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.FRONT);
            gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 1);
            gl.uniform1f(gl.getUniformLocation(this.worldProg, 'u_outlineExtrude'), 0.075);
            gl.drawArrays(gl.TRIANGLES, 0, this.carMesh.count);

            // Pass 2: Stepped Toon + Matcap Streak Body Shading
            gl.cullFace(gl.BACK);
            gl.disable(gl.CULL_FACE);
            gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 0);
            gl.uniform1f(gl.getUniformLocation(this.worldProg, 'u_outlineExtrude'), 0.0);
            gl.drawArrays(gl.TRIANGLES, 0, this.carMesh.count);
        }

        // 1E. Stylized Anime Toon Smoke & Collision Paint Splatters
        if (this.particles.length > 0) {
            gl.bindVertexArray(this.particleMesh.vao);
            gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 0);
            gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carEmissive'), vState.carEmissive);
            for (const p of this.particles) {
                const s = p.scale * (p.life / p.maxLife);
                const pMat = this.translationScaleMatrix(p.pos, s);
                gl.uniformMatrix4fv(gl.getUniformLocation(this.worldProg, 'u_model'), false, pMat);
                gl.drawArrays(gl.TRIANGLES, 0, this.particleMesh.count);
            }
        }

        // 1F. 3D Basis Vector Debug Arrows (Travel Forward = Green, Visual Nose = Cyan, Right = Red)
        if (this.showDebugVectors) {
            gl.bindVertexArray(this.particleMesh.vao);
            gl.uniform1i(gl.getUniformLocation(this.worldProg, 'u_passMode'), 0);
            const drawVectorDots = (dir, color, maxDist, yOff) => {
                gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_carEmissive'), color);
                gl.uniform3fv(gl.getUniformLocation(this.worldProg, 'u_curbA'), color);
                for (let step = 1.6; step <= maxDist; step += 0.55) {
                    const pos = [
                        playerCar.pos[0] + dir[0] * step,
                        playerCar.pos[1] + yOff + dir[1] * step,
                        playerCar.pos[2] + dir[2] * step
                    ];
                    const sz = (step > maxDist - 0.6) ? 0.34 : 0.18;
                    const pMat = this.translationScaleMatrix(pos, sz);
                    gl.uniformMatrix4fv(gl.getUniformLocation(this.worldProg, 'u_model'), false, pMat);
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
        gl.uniform1i(gl.getUniformLocation(this.smudgeProg, 'u_currentScene'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, readHist.tex);
        gl.uniform1i(gl.getUniformLocation(this.smudgeProg, 'u_historyTex'), 1);

        gl.uniform2f(gl.getUniformLocation(this.smudgeProg, 'u_resolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_normalizedSpeed'), playerCar.normalizedSpeed);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_boostIntensity'), playerCar.boostIntensity);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_angularYawVel'), this.angularVelYaw);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_smudgeSetting'), this.settings.smudgeIntensity);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_kuwaharaSetting'), this.settings.kuwaharaStrength);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_inkSetting'), this.settings.inkOutlineStrength);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_speedLinesSetting'), this.settings.speedLinesIntensity);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_bassPulse'), audioState.beatPulse * ar);
        gl.uniform1f(gl.getUniformLocation(this.smudgeProg, 'u_time'), this.time);
        gl.uniform3fv(gl.getUniformLocation(this.smudgeProg, 'u_vibeEmissive'), vState.carEmissive);

        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // =========================================================================
        // PASS 3: FINAL COMPOSITE TO SCREEN (ROBERTS CROSS INK + REDLINE SPEED LINES)
        // =========================================================================
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.useProgram(this.compositeProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, writeHist.tex);
        gl.uniform1i(gl.getUniformLocation(this.compositeProg, 'u_smudgedTex'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
        gl.uniform1i(gl.getUniformLocation(this.compositeProg, 'u_rawSceneTex'), 1);

        gl.uniform2f(gl.getUniformLocation(this.compositeProg, 'u_resolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_normalizedSpeed'), playerCar.normalizedSpeed);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_boostIntensity'), playerCar.boostIntensity);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_inkSetting'), this.settings.inkOutlineStrength);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_speedLinesSetting'), this.settings.speedLinesIntensity);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_bassPulse'), audioState.beatPulse * ar);
        gl.uniform1f(gl.getUniformLocation(this.compositeProg, 'u_time'), this.time);
        gl.uniform3fv(gl.getUniformLocation(this.compositeProg, 'u_vibeEmissive'), vState.carEmissive);
        gl.uniform1i(gl.getUniformLocation(this.compositeProg, 'u_debugBufferMode'), this.debugBufferMode || 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Swap ping-pong history buffers
        this.pingPongIndex = 1 - this.pingPongIndex;
    }

    // =========================================================================
    // 3D MATRIX MATH HELPERS
    // =========================================================================
    identityMatrix() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    translationScaleMatrix(pos, s) {
        return new Float32Array([
            s, 0, 0, 0,
            0, s, 0, 0,
            0, 0, s, 0,
            pos[0], pos[1], pos[2], 1
        ]);
    }

    computeCarModelMatrix(car) {
        const R = car.visualRight || [-1, 0, 0];
        const U = car.visualUp || [0, 1, 0];
        const F = car.visualForward || [0, 0, 1];
        const P = car.pos;

        // Orthonormal right-handed basis matrix: Column 0 = Left (-R), Column 1 = Up (U), Column 2 = Forward (F)
        return new Float32Array([
            -R[0], -R[1], -R[2], 0,
             U[0],  U[1],  U[2], 0,
             F[0],  F[1],  F[2], 0,
             P[0],  P[1],  P[2], 1
        ]);
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

        const out = new Float32Array(16);
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
