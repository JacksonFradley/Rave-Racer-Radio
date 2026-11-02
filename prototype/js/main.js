/**
 * RAVE RACER REMIX — Main Game Director, Developer Mechanic Troubleshooting Hub,
 * Global Triad State Bus, Landmark "Drive-Over" Loading Controller, and Live Telemetry
 */
window.RRR = window.RRR || {};

RRR.GameApp = class GameApp {
    constructor() {
        // Engine & Session Lifecycle Flags (Lazy-loaded only after a race or demo is selected)
        this.isEngineInitialized = false;
        this.hasActiveSession = false;
        this.isLoopRunning = false;

        this.trackSpline = null;
        this.vibeController = null;
        this.audioEngine = null;
        this.djController = null;
        this.glCanvas = document.getElementById('gl-canvas');
        this.renderer = null;
        this.expressionHUD = null;

        // Mirror DJ Broadcast Canvas to HUD Boiler Room Monitor
        this.djHudCanvas = document.getElementById('dj-hud-canvas');
        this.djHudCtx = this.djHudCanvas ? this.djHudCanvas.getContext('2d') : null;

        // Mirror 256x16 Vibe 2D LUT to HUD Swatch
        this.lutHudCanvas = document.getElementById('lut-preview-canvas');
        this.lutHudCtx = this.lutHudCanvas ? this.lutHudCanvas.getContext('2d') : null;

        // Landmark Drive-Over Loading Canvas
        this.landmarkCanvas = document.getElementById('landmark-canvas');
        this.landmarkCtx = this.landmarkCanvas ? this.landmarkCanvas.getContext('2d') : null;

        // Diagnostics Minimap + Vector Compass Canvas
        this.diagCanvas = document.getElementById('diag-compass-canvas');
        this.diagCtx = this.diagCanvas ? this.diagCanvas.getContext('2d') : null;

        // Developer Sandbox Flags
        this.aiRivalsEnabled = true;
        this.activeLabName = 'SELECT A TRACK OR LAB';
        this.isOrbitDragging = false;
        this.lastPointer = [0, 0];

        this.playerCar = null;
        this.rivals = [];
        this.vehicles = [];
        this.hasRaceStarted = false;

        // Game Flow State: 'DEV_MENU' | 'RACING' | 'WORLD_MAP' | 'LANDMARK_LOADING'
        this.mode = 'DEV_MENU';
        this.autoPilot = false;
        this.keys = {};
        this.landmarkLoadState = {
            active: false,
            progress: 0,
            route: null,
            targetVenue: null,
            scrollX: 0
        };

        this.bindMenuEvents();
        this.buildWorldMapUI();
    }

    /**
     * Lazily initializes the 3D WebGL renderer, track spline, vehicles, audio engine,
     * and HUD only after the user explicitly selects a race or developer demo.
     */
    ensureEngineInitialized(initialPresetKey = 'straight_drag') {
        if (this.isEngineInitialized) return false;
        this.isEngineInitialized = true;

        // Reveal in-game canvases and HUD containers
        if (this.glCanvas) this.glCanvas.classList.remove('hidden');
        const impactCanvas = document.getElementById('impact-vfx-canvas');
        if (impactCanvas) impactCanvas.classList.remove('hidden');
        const hudRoot = document.getElementById('hud-root');
        if (hudRoot) hudRoot.classList.remove('hidden');
        const tuningDrawer = document.getElementById('tuning-drawer');
        if (tuningDrawer) tuningDrawer.classList.remove('hidden');

        this.trackSpline = new RRR.TrackSpline(initialPresetKey);
        this.vibeController = new RRR.VibeController();
        this.audioEngine = new RRR.AudioEngine();
        this.djController = new RRR.TrackDJController();
        this.renderer = new RRR.WebGLRenderer(this.glCanvas, this.trackSpline);

        this.expressionHUD = new RRR.ExpressionHUD(
            document.getElementById('char-box-strip'),
            document.getElementById('banter-stage'),
            impactCanvas
        );

        // Vehicles (Player + 3 Personality AI Rivals)
        this.initVehicles();

        // Wire Audio Markers -> Track DJ State Machine
        this.audioEngine.onMarkerCallback = (section) => {
            this.djController.onSongMarker(section);
        };
        this.audioEngine.onBeatCallback = () => {
            this.triggerBeatHaptics(0.28);
        };

        this.bindGameEvents();
        this.updateLUTPreview();
        this.startLoop();
        return true;
    }

    startLoop() {
        if (this.isLoopRunning) return;
        this.isLoopRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    initVehicles() {
        this.hasRaceStarted = false;

        this.playerCar = new RRR.ArcadeVehicle({
            id: 'player',
            name: 'REN "PHASE"',
            shortName: 'REN',
            isPlayer: true,
            vibeKey: 'pacific_sunset',
            startT: 0.02,
            startLateral: 0.0,
            startSpeed: 0.0,
            initialRage: 22,
            initialCockiness: 40
        }, this.trackSpline);

        this.rivals = [
            new RRR.ArcadeVehicle({
                id: 'rival_kai',
                name: 'KAI "REDLINE"',
                shortName: 'KAI',
                isPlayer: false,
                vibeKey: 'cyber_flamingo',
                startT: 0.032,
                startLateral: 4.0,
                startSpeed: 0.0,
                initialRage: 68,
                initialCockiness: 35,
                personality: { aggression: 0.9, driftSkill: 0.75, baseSpeedScalar: 1.0 }
            }, this.trackSpline),
            new RRR.ArcadeVehicle({
                id: 'rival_mira',
                name: 'MIRA "VAPOR"',
                shortName: 'MIRA',
                isPlayer: false,
                vibeKey: 'pacific_sunset',
                startT: 0.042,
                startLateral: -4.0,
                startSpeed: 0.0,
                initialRage: 15,
                initialCockiness: 78,
                personality: { aggression: 0.4, driftSkill: 0.95, baseSpeedScalar: 1.01 }
            }, this.trackSpline),
            new RRR.ArcadeVehicle({
                id: 'rival_rex',
                name: 'REX "303"',
                shortName: 'REX',
                isPlayer: false,
                vibeKey: 'acid_warehouse',
                startT: 0.052,
                startLateral: 4.0,
                startSpeed: 0.0,
                initialRage: 30,
                initialCockiness: 55,
                personality: { aggression: 0.65, driftSkill: 0.85, baseSpeedScalar: 0.99 }
            }, this.trackSpline)
        ];

        this.vehicles = [this.playerCar, ...this.rivals];
        this.expressionHUD.initBoxes(this.vehicles);
    }

    getActiveVehicles() {
        return this.aiRivalsEnabled ? this.vehicles : [this.playerCar];
    }

    /**
     * Developer Starting Menu Mode Launcher
     */
    launchDevMode(modeKey) {
        if (modeKey === 'lab_world_map') {
            this.toggleDevMenu(false, true);
            this.toggleWorldMapModal(true);
            this.activeLabName = 'LAB 05 // WORLD MAP';
            return;
        }

        const presetByMode = {
            track_straight: 'straight_drag',
            track_skidpad: 'drift_skidpad',
            track_elevation: 'elevation_bank',
            track_full_race: 'nagai_bayshore',
            lab_car_mechanics: 'straight_drag',
            lab_shaders_vibe: 'nagai_bayshore',
            lab_combat_boxes: 'straight_drag',
            lab_dj_audio: 'straight_drag'
        };
        const targetPreset = presetByMode[modeKey] || 'straight_drag';
        const justInitialized = this.ensureEngineInitialized(targetPreset);

        this.hasActiveSession = true;
        const btnResume = document.getElementById('btn-resume-from-menu');
        if (btnResume) btnResume.classList.remove('hidden');

        this.audioEngine.init();
        const badge = document.getElementById('audio-status-btn');
        if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';

        // Reset defaults before applying mode-specific config
        RRR.PHYSICS_TUNING.stationaryTurntable = false;
        this.renderer.cameraMode = 'FOLLOW';
        this.renderer.showDebugVectors = false;
        this.renderer.debugBufferMode = 0;
        this.autoPilot = false;
        this.toggleRekordboxPanel(false);

        if (!justInitialized || this.trackSpline.activePresetKey !== targetPreset) {
            this.switchTrackPreset(targetPreset);
        } else {
            this.resetPlayerAndRivals();
        }

        if (modeKey === 'track_straight') {
            this.aiRivalsEnabled = false;
            this.renderer.showDebugVectors = true;
            this.activeLabName = 'TRACK 01 // STRAIGHTAWAY';
        } else if (modeKey === 'track_skidpad') {
            this.aiRivalsEnabled = false;
            this.renderer.showDebugVectors = true;
            this.activeLabName = 'TRACK 02 // DRIFT SKIDPAD';
        } else if (modeKey === 'track_elevation') {
            this.aiRivalsEnabled = false;
            this.activeLabName = 'TRACK 03 // 3D ELEVATION';
        } else if (modeKey === 'track_full_race') {
            this.aiRivalsEnabled = true;
            this.activeLabName = 'TRACK 04 // FULL RACE';
        } else if (modeKey === 'lab_car_mechanics') {
            this.aiRivalsEnabled = false;
            this.renderer.cameraMode = 'ORBIT_CAR';
            this.renderer.orbitYaw = 0.55;
            this.renderer.orbitPitch = 0.25;
            this.renderer.orbitDist = 5.6;
            this.renderer.showDebugVectors = true;
            RRR.PHYSICS_TUNING.stationaryTurntable = true;
            this.activeLabName = 'LAB 01 // CAR TURNTABLE';
        } else if (modeKey === 'lab_shaders_vibe') {
            this.aiRivalsEnabled = true;
            this.autoPilot = true; // Auto-cruise at high speed so Paint Smudge & Vibe LUT are immediately active
            this.activeLabName = 'LAB 02 // SHADER STUDIO';
            document.getElementById('tuning-drawer').classList.remove('collapsed');
        } else if (modeKey === 'lab_combat_boxes') {
            this.aiRivalsEnabled = true;
            this.activeLabName = 'LAB 03 // COMBAT & BOXES';
            // Place Kai right next to player for immediate sideswipe testing
            this.rivals[0].placeOnTrack(this.trackSpline, 0.022, 3.2);
            setTimeout(() => this.triggerDemoBoxRam(), 250);
        } else if (modeKey === 'lab_dj_audio') {
            this.aiRivalsEnabled = false;
            // Park right in front of the first Jumbotron (at sample 0, t = 0.0)
            this.playerCar.placeOnTrack(this.trackSpline, 0.988, 0.0);
            this.renderer.cameraMode = 'JUMBOTRON_STAGE';
            this.activeLabName = 'LAB 04 // REKORDBOX AI DJ STUDIO';
            this.djController.triggerReaction('DROP_HYPE', 'REKORDBOX BOILER ROOM STUDIO', 4.0);
            this.toggleRekordboxPanel(true);
        }

        this.updateControlButtonStates();
        this.toggleDevMenu(false);
    }

    switchTrackPreset(presetKey) {
        this.trackSpline.loadPreset(presetKey);
        this.renderer.buildTrackAndJumbotronMeshes();
        this.resetPlayerAndRivals();
    }

    resetPlayerAndRivals() {
        this.hasRaceStarted = false;
        this.playerCar.placeOnTrack(this.trackSpline, 0.02, 0.0);
        this.playerCar.speed = 0.0;
        this.playerCar.boostTimer = 0.0;
        this.playerCar.driftState = 'GRIP';
        this.playerCar.driftCharge = 0.0;
        this.renderer.camYaw = this.playerCar.headingYaw;

        this.rivals.forEach((r, idx) => {
            r.placeOnTrack(this.trackSpline, (0.032 + idx * 0.012) % 1.0, idx % 2 === 0 ? 4.0 : -4.0);
            r.speed = 0.0;
        });
    }

    toggleDevMenu(forceShow, allowWithoutSession = false) {
        const menuEl = document.getElementById('dev-start-menu');
        if (!menuEl) return;
        const show = forceShow !== undefined ? forceShow : menuEl.classList.contains('hidden');
        if (!show && !this.hasActiveSession && !allowWithoutSession) {
            return;
        }
        menuEl.classList.toggle('hidden', !show);
        if (show) {
            this.keys = {};
            this.mode = 'DEV_MENU';
        } else if (this.hasActiveSession) {
            this.mode = 'RACING';
        }
    }

    cycleCameraMode() {
        const modes = ['FOLLOW', 'TOP_DOWN', 'ORBIT_CAR', 'JUMBOTRON_STAGE'];
        const currIdx = modes.indexOf(this.renderer.cameraMode);
        this.renderer.cameraMode = modes[(currIdx + 1) % modes.length];
        this.updateControlButtonStates();
    }

    updateControlButtonStates() {
        const elMode = document.getElementById('diag-active-mode');
        if (elMode) elMode.textContent = this.activeLabName;

        const elZone = document.getElementById('hud-zone-name');
        if (elZone && this.trackSpline.activePreset) {
            elZone.textContent = this.trackSpline.activePreset.name;
        }

        const btnCam = document.getElementById('btn-cam-cycle');
        if (btnCam) {
            const labels = {
                FOLLOW: '📷 CAM: CHASE (V)',
                TOP_DOWN: '📷 CAM: TOP-DOWN (V)',
                ORBIT_CAR: '📷 CAM: 360° ORBIT (V)',
                JUMBOTRON_STAGE: '📷 CAM: DJ STAGE (V)'
            };
            btnCam.textContent = labels[this.renderer.cameraMode] || '📷 CAM: CHASE (V)';
        }

        const btnVec = document.getElementById('btn-vectors-toggle');
        if (btnVec) {
            btnVec.textContent = this.renderer.showDebugVectors ? '🧭 3D VECTORS: ON' : '🧭 3D VECTORS: OFF';
            btnVec.classList.toggle('active', this.renderer.showDebugVectors);
        }

        const btnStat = document.getElementById('btn-stationary-toggle');
        if (btnStat) {
            const st = RRR.PHYSICS_TUNING.stationaryTurntable;
            btnStat.textContent = st ? '📌 IN-PLACE RIG: ON' : '📌 IN-PLACE RIG: OFF';
            btnStat.classList.toggle('active', st);
        }

        const btnAi = document.getElementById('btn-ai-rivals-toggle');
        if (btnAi) {
            btnAi.textContent = this.aiRivalsEnabled ? '🏎️ AI RIVALS: ON' : '🏎️ AI RIVALS: OFF';
            btnAi.classList.toggle('active', this.aiRivalsEnabled);
        }

        const btnAuto = document.getElementById('btn-autopilot');
        if (btnAuto) {
            btnAuto.classList.toggle('active', this.autoPilot);
            btnAuto.textContent = this.autoPilot ? '🤖 AI CRUISE: ON (P)' : '🎮 AI CRUISE: OFF (P)';
        }

        const btnLatch = document.getElementById('btn-latch-drift-toggle');
        if (btnLatch) {
            const ld = RRR.PHYSICS_TUNING.latchDrift;
            btnLatch.textContent = ld ? '🎯 DRIFT: R4 LATCH' : '🎯 DRIFT: HOLD SPACE';
            btnLatch.classList.toggle('active', ld);
        }

        document.querySelectorAll('[data-buf-mode]').forEach((b) => {
            b.classList.toggle('active', parseInt(b.getAttribute('data-buf-mode'), 10) === this.renderer.debugBufferMode);
        });
    }

    bindMenuEvents() {
        // Developer Menu Card Launchers
        document.querySelectorAll('[data-launch-mode]').forEach((card) => {
            card.addEventListener('click', () => {
                this.launchDevMode(card.getAttribute('data-launch-mode'));
            });
        });

        const btnResume = document.getElementById('btn-resume-from-menu');
        if (btnResume) {
            btnResume.addEventListener('click', () => {
                if (!this.hasActiveSession) return;
                if (this.audioEngine) this.audioEngine.init();
                this.toggleDevMenu(false);
            });
        }

        const btnCloseMap = document.getElementById('btn-close-map');
        if (btnCloseMap) btnCloseMap.addEventListener('click', () => this.toggleWorldMapModal(false));

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.mode === 'WORLD_MAP') {
                    this.toggleWorldMapModal(false);
                } else if (this.hasActiveSession) {
                    this.toggleDevMenu();
                }
                return;
            }

            // Do not process driving inputs or in-race hotkeys while in menus or before a session is loaded
            if (!this.hasActiveSession || this.mode !== 'RACING') return;

            if (this.audioEngine) {
                this.audioEngine.init();
                const badge = document.getElementById('audio-status-btn');
                if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';
            }

            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
            if (e.key) this.keys[e.key.toLowerCase()] = true;

            if (e.code === 'KeyR') {
                this.resetPlayerAndRivals();
            } else if (e.code === 'KeyV') {
                this.cycleCameraMode();
            } else if (e.code === 'KeyC') {
                this.triggerDemoBoxRam();
            } else if (e.code === 'KeyB') {
                this.triggerManualBoost();
            } else if (e.code === 'KeyZ') {
                this.cycleTrackZone();
            } else if (e.code === 'KeyP') {
                this.toggleAutoPilot();
            } else if (e.code === 'KeyK') {
                this.toggleRekordboxPanel();
            } else if (e.code === 'KeyM') {
                this.toggleWorldMapModal();
            } else if (e.code >= 'Digit1' && e.code <= 'Digit4') {
                const keys = ['pacific_sunset', 'acid_warehouse', 'midnight_shibuya', 'cyber_flamingo'];
                const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
                this.selectVibe(keys[idx]);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.key) this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    bindGameEvents() {
        const unlockAudio = () => {
            if (!this.audioEngine) return;
            this.audioEngine.init();
            const badge = document.getElementById('audio-status-btn');
            if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';
        };

        const btnOpenDev = document.getElementById('btn-open-dev-menu');
        if (btnOpenDev) btnOpenDev.addEventListener('click', () => this.toggleDevMenu());

        const btnReset = document.getElementById('btn-reset-car');
        if (btnReset) btnReset.addEventListener('click', () => this.resetPlayerAndRivals());

        const btnCam = document.getElementById('btn-cam-cycle');
        if (btnCam) btnCam.addEventListener('click', () => this.cycleCameraMode());

        const btnVec = document.getElementById('btn-vectors-toggle');
        if (btnVec) {
            btnVec.addEventListener('click', () => {
                this.renderer.showDebugVectors = !this.renderer.showDebugVectors;
                this.updateControlButtonStates();
            });
        }

        const btnStat = document.getElementById('btn-stationary-toggle');
        if (btnStat) {
            btnStat.addEventListener('click', () => {
                RRR.PHYSICS_TUNING.stationaryTurntable = !RRR.PHYSICS_TUNING.stationaryTurntable;
                this.updateControlButtonStates();
            });
        }

        const btnAi = document.getElementById('btn-ai-rivals-toggle');
        if (btnAi) {
            btnAi.addEventListener('click', () => {
                this.aiRivalsEnabled = !this.aiRivalsEnabled;
                this.updateControlButtonStates();
            });
        }

        const btnLatch = document.getElementById('btn-latch-drift-toggle');
        if (btnLatch) {
            btnLatch.addEventListener('click', () => {
                RRR.PHYSICS_TUNING.latchDrift = !RRR.PHYSICS_TUNING.latchDrift;
                this.updateControlButtonStates();
            });
        }

        // Mouse drag on WebGL canvas to orbit in ORBIT_CAR mode
        this.glCanvas.addEventListener('pointerdown', (e) => {
            unlockAudio();
            this.isOrbitDragging = true;
            this.lastPointer = [e.clientX, e.clientY];
        });
        window.addEventListener('pointermove', (e) => {
            if (!this.isOrbitDragging) return;
            const dx = e.clientX - this.lastPointer[0];
            const dy = e.clientY - this.lastPointer[1];
            this.lastPointer = [e.clientX, e.clientY];
            if (this.renderer.cameraMode === 'ORBIT_CAR') {
                this.renderer.orbitYaw = RRR.wrapAngle(this.renderer.orbitYaw + dx * 0.008);
                this.renderer.orbitPitch = Math.max(0.05, Math.min(1.25, this.renderer.orbitPitch + dy * 0.006));
            }
        });
        window.addEventListener('pointerup', () => {
            this.isOrbitDragging = false;
        });
        this.glCanvas.addEventListener('wheel', (e) => {
            if (this.renderer.cameraMode === 'ORBIT_CAR') {
                this.renderer.orbitDist = Math.max(3.2, Math.min(16.0, this.renderer.orbitDist + e.deltaY * 0.005));
            }
        }, { passive: true });

        // Vibe Selector Buttons
        document.querySelectorAll('[data-vibe]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                this.selectVibe(btn.getAttribute('data-vibe'));
            });
        });

        // Render Buffer View Buttons (Final / Raw 3D / Smudge History)
        document.querySelectorAll('[data-buf-mode]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.renderer.debugBufferMode = parseInt(btn.getAttribute('data-buf-mode'), 10);
                this.updateControlButtonStates();
            });
        });

        // Quick Action Buttons in Bottom Bar
        const btnRam = document.getElementById('btn-test-ram');
        if (btnRam) btnRam.addEventListener('click', () => { unlockAudio(); this.triggerDemoBoxRam(); });

        const btnEgo = document.getElementById('btn-ego-shatter');
        if (btnEgo) btnEgo.addEventListener('click', () => { unlockAudio(); this.triggerEgoShatterDemo(); });

        const btnBoost = document.getElementById('btn-test-boost');
        if (btnBoost) btnBoost.addEventListener('click', () => { unlockAudio(); this.triggerManualBoost(); });

        const btnZone = document.getElementById('btn-cycle-zone');
        if (btnZone) btnZone.addEventListener('click', () => { unlockAudio(); this.cycleTrackZone(); });

        const btnDjDrop = document.getElementById('btn-dj-drop');
        if (btnDjDrop) {
            btnDjDrop.addEventListener('click', () => {
                unlockAudio();
                this.audioEngine.state.section = 'DROP';
                this.audioEngine.state.beatPulse = 1.0;
                this.djController.triggerReaction('DROP_HYPE', 'CROSSFADER SLAM // 138 BPM DROP!!', 3.0);
            });
        }

        const btnAuto = document.getElementById('btn-autopilot');
        if (btnAuto) btnAuto.addEventListener('click', () => { unlockAudio(); this.toggleAutoPilot(); });

        const btnAudio = document.getElementById('audio-status-btn');
        if (btnAudio) {
            btnAudio.addEventListener('click', () => {
                this.audioEngine.init();
                const muted = this.audioEngine.toggleMute();
                btnAudio.textContent = muted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';
            });
        }

        const btnDrawer = document.getElementById('btn-toggle-tuning');
        const drawer = document.getElementById('tuning-drawer');
        if (btnDrawer && drawer) {
            btnDrawer.addEventListener('click', () => {
                drawer.classList.toggle('collapsed');
            });
        }

        // Live Physics Sliders
        const bindPhysicsSlider = (id, prop, valId, formatter) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(valId);
            if (!el) return;
            el.addEventListener('input', () => {
                const v = parseFloat(el.value);
                RRR.PHYSICS_TUNING[prop] = v;
                if (valEl) valEl.textContent = formatter(v);
            });
        };
        bindPhysicsSlider('slider-steer-angle', 'maxSteerAngle', 'val-steer-angle', (v) => Math.round((v * 180) / Math.PI) + '°');
        bindPhysicsSlider('slider-caster', 'casterSelfCenter', 'val-caster', (v) => v.toFixed(1));
        bindPhysicsSlider('slider-corner-push', 'cornerCentrifugalPush', 'val-corner-push', (v) => Math.round(v * 100) + '%');
        bindPhysicsSlider('slider-drift-slip', 'driftSlipMax', 'val-drift-slip', (v) => Math.round((v * 180) / Math.PI) + '°');

        // Live Shader Sliders
        const bindShaderSlider = (id, prop, valId) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(valId);
            if (!el) return;
            el.addEventListener('input', () => {
                const v = parseFloat(el.value);
                this.renderer.settings[prop] = v;
                if (valEl) valEl.textContent = Math.round(v * 100) + '%';
            });
        };
        bindShaderSlider('slider-smudge', 'smudgeIntensity', 'val-smudge');
        bindShaderSlider('slider-kuwahara', 'kuwaharaStrength', 'val-kuwahara');
        bindShaderSlider('slider-ink', 'inkOutlineStrength', 'val-ink');
        bindShaderSlider('slider-speedlines', 'speedLinesIntensity', 'val-speedlines');

        this.bindRekordboxStudioEvents(unlockAudio);
    }

    toggleRekordboxPanel(forceShow) {
        const panel = document.getElementById('rekordbox-studio-panel');
        if (!panel) return;
        const show = forceShow !== undefined ? forceShow : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !show);
        const btn = document.getElementById('btn-toggle-rekordbox');
        if (btn) btn.classList.toggle('active', show);
        if (show) {
            this.renderRekordboxCrateUI();
        }
    }

    bindRekordboxStudioEvents(unlockAudio) {
        const rb = this.audioEngine.rekordbox;
        if (!rb) return;

        rb.studioCanvas = document.getElementById('rekordbox-canvas');

        const btnToggleRb = document.getElementById('btn-toggle-rekordbox');
        if (btnToggleRb) btnToggleRb.addEventListener('click', () => { unlockAudio(); this.toggleRekordboxPanel(); });

        const btnCloseRb = document.getElementById('btn-close-rekordbox');
        if (btnCloseRb) btnCloseRb.addEventListener('click', () => this.toggleRekordboxPanel(false));

        const btnSourceMode = document.getElementById('btn-rb-source-mode');
        if (btnSourceMode) {
            btnSourceMode.addEventListener('click', () => {
                unlockAudio();
                this.audioEngine.setRekordboxMode(!this.audioEngine.rekordboxMode);
                const isRb = this.audioEngine.rekordboxMode;
                btnSourceMode.textContent = isRb ? '💿 SOURCE: REKORDBOX DECKS' : '🎹 SOURCE: 5-STEM SYNTH';
                btnSourceMode.classList.toggle('active', isRb);
            });
        }

        const btnAiDj = document.getElementById('btn-rb-aidj-toggle');
        if (btnAiDj) {
            btnAiDj.addEventListener('click', () => {
                unlockAudio();
                rb.aiDjEnabled = !rb.aiDjEnabled;
                btnAiDj.textContent = rb.aiDjEnabled ? '🤖 AI DJ AUTO-MIX: ON' : '🖐️ AI DJ AUTO-MIX: MANUAL';
                btnAiDj.classList.toggle('active', rb.aiDjEnabled);
            });
        }

        const btnTrans = document.getElementById('btn-rb-auto-transition');
        if (btnTrans) {
            btnTrans.addEventListener('click', () => {
                unlockAudio();
                rb.triggerAutoTransition('MANUAL BEAT-MATCH TRANSITION');
                this.djController.triggerReaction('DROP_HYPE', 'CROSSFADE BASS-SWAP // DECK 1 ↔ 2', 3.0);
            });
        }

        // Song Folder Input (`webkitdirectory` / multiple files)
        const folderIn = document.getElementById('input-mp3-folder');
        if (folderIn) {
            folderIn.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    unlockAudio();
                    rb.loadFolderFiles(e.target.files);
                }
            });
        }

        // MP3 File Inputs for Deck 1 & Deck 2
        const fileIn1 = document.getElementById('input-mp3-deck1');
        if (fileIn1) {
            fileIn1.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    unlockAudio();
                    rb.loadAudioFileToDeck(e.target.files[0], 1);
                }
            });
        }
        const fileIn2 = document.getElementById('input-mp3-deck2');
        if (fileIn2) {
            fileIn2.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    unlockAudio();
                    rb.loadAudioFileToDeck(e.target.files[0], 2);
                }
            });
        }

        // Global Drag-and-Drop MP3/WAV/JSON/Folder Support Anywhere on Window
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        window.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            unlockAudio();
            this.toggleRekordboxPanel(true);

            const files = Array.from(e.dataTransfer.files);
            if (files.length >= 2) {
                rb.loadFolderFiles(files);
            } else {
                const file = files[0];
                const deckId = e.clientX > window.innerWidth * 0.5 ? 2 : 1;
                if (file.name.endsWith('.json')) {
                    rb.importAnalysisJson(file, deckId);
                } else {
                    rb.loadAudioFileToDeck(file, deckId);
                }
            }
        });

        // Deck 1 & Deck 2 Transport / Sync / Master / Export Buttons
        const bindDeckTransport = (deckId, prefix) => {
            const btnPlay = document.getElementById(`${prefix}-play`);
            if (btnPlay) {
                btnPlay.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) d.togglePlay();
                });
            }
            const btnSync = document.getElementById(`${prefix}-sync`);
            if (btnSync) {
                btnSync.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) {
                        d.syncEnabled = !d.syncEnabled;
                        btnSync.classList.toggle('active', d.syncEnabled);
                    }
                });
            }
            const btnMaster = document.getElementById(`${prefix}-master`);
            if (btnMaster) {
                btnMaster.addEventListener('click', () => {
                    unlockAudio();
                    rb.setMasterDeck(deckId);
                });
            }
            const btnExport = document.getElementById(`${prefix}-export`);
            if (btnExport) {
                btnExport.addEventListener('click', () => {
                    unlockAudio();
                    rb.exportAnalysisJson(deckId);
                });
            }
        };
        bindDeckTransport(1, 'btn-d1');
        bindDeckTransport(2, 'btn-d2');

        // Hot Cue Pads A, B, C, D
        document.querySelectorAll('.rb-cue-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const cueIdx = parseInt(btn.getAttribute('data-cue'), 10);
                const d = rb.getDeck(deckId);
                if (d) d.jumpToHotCue(cueIdx);
            });
        });

        // Beat-Loop Roll Pads (1/4, 1/2, 1, 2, 4, EXIT)
        document.querySelectorAll('.rb-loop-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const beats = parseFloat(btn.getAttribute('data-loop'));
                const d = rb.getDeck(deckId);
                if (!d) return;
                if (beats <= 0) d.clearLoop();
                else d.setBeatLoop(beats);
            });
        });

        // Deck EQ & Sound Color Filter Sliders
        const bindDeckEq = (deckId, prefix) => {
            const map = [
                { id: `${prefix}-low`, prop: 'low' },
                { id: `${prefix}-mid`, prop: 'mid' },
                { id: `${prefix}-hi`, prop: 'high' }
            ];
            map.forEach(({ id, prop }) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('input', () => {
                    const d = rb.getDeck(deckId);
                    if (d) d.eq[prop] = parseFloat(el.value);
                });
            });
            const fltrEl = document.getElementById(`${prefix}-fltr`);
            if (fltrEl) {
                fltrEl.addEventListener('input', () => {
                    const d = rb.getDeck(deckId);
                    if (d) d.colorFilter = parseFloat(fltrEl.value);
                });
            }
        };
        bindDeckEq(1, 'slider-d1');
        bindDeckEq(2, 'slider-d2');

        const xfEl = document.getElementById('slider-rb-crossfader');
        if (xfEl) {
            xfEl.addEventListener('input', () => {
                rb.aiTransitionState.active = false;
                rb.crossfader = parseFloat(xfEl.value);
            });
        }

        rb.onStateChange = () => this.renderRekordboxCrateUI();
    }

    renderRekordboxCrateUI() {
        const rb = this.audioEngine.rekordbox;
        const listEl = document.getElementById('rb-crate-list');
        const countEl = document.getElementById('rb-crate-count');
        if (!rb || !listEl) return;

        if (countEl) {
            countEl.textContent = `${rb.crate.length} TRACKS IN CRATE`;
        }

        const masterDeck = rb.getMasterDeck();
        const masterKey = masterDeck?.analysis?.camelot || masterDeck?.analysis?.key || '8A';
        const d1Id = rb.deckCrateIds[1];
        const d2Id = rb.deckCrateIds[2];

        listEl.innerHTML = '';
        rb.crate.forEach((item, idx) => {
            const analysis = item.analysis;
            if (!analysis) return;

            const isD1 = item.id === d1Id;
            const isD2 = item.id === d2Id;
            const harm = RRR.CamelotWheel.getHarmonicRelation(masterKey, analysis.camelot || analysis.key);

            const row = document.createElement('div');
            row.className = `rb-crate-row${isD1 ? ' active-d1' : ''}${isD2 ? ' active-d2' : ''}`;
            const statusTag = isD1 ? '<strong style="color:#00f5d4;">[DECK 1]</strong> ' : (isD2 ? '<strong style="color:#ff1e6b;">[DECK 2]</strong> ' : '');

            row.innerHTML = `
                <span style="color:#9e96c4;">${idx + 1}.</span>
                <span class="rb-crate-title">${statusTag}${analysis.title}</span>
                <span><strong>${analysis.bpm.toFixed(1)}</strong> BPM</span>
                <span class="rb-key-pill" style="background:${analysis.camelot?.color || '#00f5d4'}">${analysis.key}</span>
                <span class="rb-harm-badge">${harm.badge}</span>
                <div class="rb-crate-actions">
                    <button class="rb-sm-btn" data-load-d1="${item.id}">D1</button>
                    <button class="rb-sm-btn" data-load-d2="${item.id}">D2</button>
                </div>
            `;

            const btnD1 = row.querySelector('[data-load-d1]');
            if (btnD1) {
                btnD1.addEventListener('click', () => {
                    this.audioEngine.init();
                    rb.loadCrateTrackToDeck(item.id, 1);
                });
            }
            const btnD2 = row.querySelector('[data-load-d2]');
            if (btnD2) {
                btnD2.addEventListener('click', () => {
                    this.audioEngine.init();
                    rb.loadCrateTrackToDeck(item.id, 2);
                });
            }
            listEl.appendChild(row);
        });
    }

    selectVibe(vibeKey) {
        if (!RRR.VIBE_PALETTES[vibeKey]) return;
        this.vibeController.setVibe(vibeKey);
        this.playerCar.vibeKey = vibeKey;
        this.updateLUTPreview();

        document.querySelectorAll('[data-vibe]').forEach((b) => {
            b.classList.toggle('active', b.getAttribute('data-vibe') === vibeKey);
        });
        const label = document.getElementById('active-vibe-name');
        if (label) label.textContent = RRR.VIBE_PALETTES[vibeKey].name;
    }

    updateLUTPreview() {
        if (!this.lutHudCtx || !this.lutHudCanvas) return;
        this.lutHudCtx.drawImage(
            this.vibeController.lutCanvas,
            0, 0,
            this.lutHudCanvas.width,
            this.lutHudCanvas.height
        );
    }

    cycleTrackZone() {
        const nextZone = (this.vibeController.targetZoneIndex + 1) % 4;
        this.vibeController.setTrackZone(nextZone);
        const zMeta = RRR.TRACK_ZONE_META[nextZone];
        this.djController.triggerReaction('DROP_HYPE', zMeta.djCue, 2.2);
    }

    toggleAutoPilot() {
        this.autoPilot = !this.autoPilot;
        this.updateControlButtonStates();
    }

    triggerManualBoost() {
        this.hasRaceStarted = true;
        this.playerCar.boostTimer = 2.0;
        this.playerCar.boostIntensity = 1.0;
        this.playerCar.speed = Math.min(this.playerCar.maxBaseSpeed * 1.24, Math.max(82, this.playerCar.speed + 24));
        this.playerCar.addEmotion(-5, 22, 'BOOST');
        this.audioEngine.triggerDriftBoostSFX();
        this.djController.triggerReaction('DROP_HYPE', 'PAINT SMUDGE OVERDRIVE!!', 2.5);
        this.expressionHUD.spawnBanterRibbon(
            this.expressionHUD.boxes.player,
            RRR.DIALOGUE_BARKS.ON_DRIFT_BOOST,
            this.audioEngine
        );
        this.triggerBeatHaptics(0.85);
    }

    triggerEgoShatterDemo() {
        this.playerCar.cockiness = 90;
        this.playerCar.addEmotion(25, -25, 'SLAMMED'); // Triggers Ego Shatter!
        const evt = {
            attacker: this.rivals[0],
            victim: this.playerCar,
            hitType: 'TBONE_SLAM',
            egoShattered: true,
            screenImpactVector: [-1, 0],
            normalizedForce: 1.0
        };
        this.handleCarCollisionEvent(evt);
    }

    triggerDemoBoxRam() {
        this.aiRivalsEnabled = true;
        this.updateControlButtonStates();

        let nearestRival = this.rivals[0];
        let bestDist = Infinity;
        for (const r of this.rivals) {
            const d = Math.abs(r.totalProgress - this.playerCar.totalProgress);
            if (d < bestDist) {
                bestDist = d;
                nearestRival = r;
            }
        }

        if (bestDist > 0.015) {
            nearestRival.placeOnTrack(
                this.trackSpline,
                (this.playerCar.splineT + 0.002) % 1.0,
                this.playerCar.lateralOffset + 2.4
            );
            nearestRival.lap = this.playerCar.lap;
            nearestRival.speed = this.playerCar.speed;
        }

        const playerAttacks = Math.random() > 0.35;
        const attacker = playerAttacks ? this.playerCar : nearestRival;
        const victim = playerAttacks ? nearestRival : this.playerCar;

        attacker.addEmotion(12, 18, 'RAM_SUCCESS');
        const egoEvent = victim.addEmotion(28, -18, 'SLAMMED');

        const evt = {
            attacker: attacker,
            victim: victim,
            hitType: 'TBONE_SLAM',
            egoShattered: egoEvent === 'EGO_SHATTER',
            screenImpactVector: [1, 0],
            normalizedForce: 0.95
        };

        this.handleCarCollisionEvent(evt);
    }

    handleCarCollisionEvent(evt) {
        this.audioEngine.triggerCollisionSFX(evt.normalizedForce);
        this.renderer.triggerCollisionVFX(evt.victim.pos);
        this.expressionHUD.triggerBoxRam(evt, this.audioEngine);
        this.djController.triggerReaction(
            'SHOCK_CRASH',
            evt.egoShattered ? 'EGO SHATTERED ON TRACK!!' : `${evt.attacker.shortName} SLAMS ${evt.victim.shortName}!!`,
            2.6
        );
        this.triggerBeatHaptics(1.0);
    }

    buildWorldMapUI() {
        const listEl = document.getElementById('venue-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        const venues = ['venue_emerald_coast', 'venue_boiler_tunnel', 'venue_shibuya_skyway'];
        venues.forEach((vId) => {
            const node = RRR.WORLD_MAP_GRAPH.nodes[vId];
            const route = RRR.WORLD_MAP_GRAPH.solveRoute('home_base', vId);
            const landmarkNames = route.landmarks.map((l) => l.title).join(' → ');

            const card = document.createElement('div');
            card.className = 'venue-card';
            card.innerHTML = `
                <div class="venue-card-top">
                    <span class="venue-title">${node.name}</span>
                    <span class="venue-dist">${route.totalKm} KM DRIVE</span>
                </div>
                <div class="venue-desc">${node.desc}</div>
                <div class="venue-route-tag">
                    <strong>LANDMARK ROUTE:</strong> ${landmarkNames}
                </div>
                <button class="venue-launch-btn">DRIVE OVER & LAUNCH SET ▶</button>
            `;
            card.querySelector('.venue-launch-btn').addEventListener('click', () => {
                this.startLandmarkDriveOver(node, route);
            });
            listEl.appendChild(card);
        });
    }

    toggleWorldMapModal(forceState) {
        const modal = document.getElementById('world-map-modal');
        if (!modal) return;
        const show = forceState !== undefined ? forceState : modal.classList.contains('hidden');
        modal.classList.toggle('hidden', !show);
        if (show) {
            this.keys = {};
            this.mode = 'WORLD_MAP';
        } else if (this.hasActiveSession) {
            this.mode = 'RACING';
        } else {
            this.toggleDevMenu(true);
        }
    }

    startLandmarkDriveOver(venueNode, route) {
        this.ensureEngineInitialized('nagai_bayshore');
        this.hasActiveSession = true;
        const btnResume = document.getElementById('btn-resume-from-menu');
        if (btnResume) btnResume.classList.remove('hidden');

        this.audioEngine.init();
        const badge = document.getElementById('audio-status-btn');
        if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';

        document.getElementById('world-map-modal').classList.add('hidden');
        const loadOverlay = document.getElementById('landmark-loading-overlay');
        loadOverlay.classList.remove('hidden');

        this.mode = 'LANDMARK_LOADING';
        this.landmarkLoadState = {
            active: true,
            progress: 0.0,
            route: route,
            targetVenue: venueNode,
            scrollX: 0.0
        };
    }

    updateLandmarkLoading(dt) {
        const st = this.landmarkLoadState;
        st.progress += dt * 0.28;
        st.scrollX += dt * 340;

        const landmarks = st.route.landmarks;
        const activeIdx = Math.min(landmarks.length - 1, Math.floor(st.progress * landmarks.length));
        const lm = landmarks[activeIdx] || landmarks[0];

        const titleEl = document.getElementById('landmark-title');
        const subEl = document.getElementById('landmark-subtitle');
        const barEl = document.getElementById('landmark-progress-fill');
        if (titleEl) titleEl.textContent = lm.title;
        if (subEl) subEl.textContent = `${lm.subtitle} // WARMING SHADERS ${Math.min(100, Math.round(st.progress * 100))}%`;
        if (barEl) barEl.style.width = `${Math.min(100, Math.round(st.progress * 100))}%`;

        if (this.landmarkCtx && this.landmarkCanvas) {
            const ctx = this.landmarkCtx;
            const w = this.landmarkCanvas.width = window.innerWidth;
            const h = this.landmarkCanvas.height = window.innerHeight;

            const grad = ctx.createLinearGradient(0, 0, 0, h * 0.68);
            grad.addColorStop(0, lm.skyTop);
            grad.addColorStop(1, lm.skyHorizon);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h * 0.68);

            ctx.fillStyle = '#fff099';
            ctx.beginPath();
            ctx.arc(w * 0.72, h * 0.36, 95, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0c5280';
            ctx.fillRect(0, h * 0.62, w, h * 0.14);

            ctx.save();
            ctx.strokeStyle = '#0d0822';
            ctx.fillStyle = '#0d0822';
            ctx.lineWidth = 6;
            const parallaxX = -(st.scrollX * 0.65) % (w * 0.5);

            if (lm.type === 'TURBINES') {
                for (let i = 0; i < 5; i++) {
                    const tx = (i * 340 + parallaxX + w) % (w + 300) - 100;
                    const ty = h * 0.62;
                    ctx.fillRect(tx - 5, ty - 220, 10, 220);
                    ctx.save();
                    ctx.translate(tx, ty - 220);
                    ctx.rotate(this.renderer.time * 2.5 + i);
                    for (let b = 0; b < 3; b++) {
                        ctx.rotate((Math.PI * 2) / 3);
                        ctx.fillRect(-4, 0, 8, 95);
                    }
                    ctx.restore();
                }
            } else if (lm.type === 'BRIDGE') {
                for (let i = 0; i < 3; i++) {
                    const bx = (i * 580 + parallaxX + w) % (w + 500) - 150;
                    ctx.fillRect(bx - 18, h * 0.18, 36, h * 0.48);
                    ctx.fillRect(bx - 18, h * 0.28, 120, 14);
                }
            } else {
                for (let i = 0; i < 4; i++) {
                    const nx = (i * 420 + parallaxX + w) % (w + 400) - 100;
                    ctx.fillStyle = '#ff2a85';
                    ctx.fillRect(nx - 24, h * 0.34, 48, h * 0.30);
                }
            }
            ctx.restore();

            ctx.fillStyle = '#191430';
            ctx.fillRect(0, h * 0.72, w, h * 0.28);
            ctx.fillStyle = '#00f5d4';
            for (let i = 0; i < 12; i++) {
                const lx = ((i * 180 - st.scrollX * 2.4) % (w + 180) + (w + 180)) % (w + 180) - 90;
                ctx.fillRect(lx, h * 0.72, 90, 8);
                ctx.fillRect(lx, h * 0.84, 70, 6);
            }

            const carX = w * 0.28;
            const carY = h * 0.77 + Math.sin(st.scrollX * 0.05) * 2.5;
            const vPal = this.vibeController.activeState;
            ctx.fillStyle = this.vibeController.toCSS(vPal.carPrimary);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(carX - 95, carY + 18);
            ctx.lineTo(carX - 85, carY - 12);
            ctx.lineTo(carX - 35, carY - 28);
            ctx.lineTo(carX + 35, carY - 28);
            ctx.lineTo(carX + 95, carY - 4);
            ctx.lineTo(carX + 100, carY + 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = this.vibeController.toCSS(vPal.carEmissive);
            ctx.fillRect(carX - 240, carY - 6, 150, 8);
        }

        if (st.progress >= 1.0) {
            st.active = false;
            this.mode = 'RACING';
            document.getElementById('landmark-loading-overlay').classList.add('hidden');
            this.switchTrackPreset('nagai_bayshore');
            const targetZone = st.targetVenue.startZone || 0;
            this.vibeController.setTrackZone(targetZone);
            const startT = (targetZone * 0.25 + 0.01) % 1.0;
            this.playerCar.placeOnTrack(this.trackSpline, startT, -3.2);
            this.playerCar.speed = 0.0;
            this.hasRaceStarted = false;
            this.rivals.forEach((r, idx) => {
                r.placeOnTrack(this.trackSpline, (startT + (idx + 1) * 0.010) % 1.0, idx % 2 === 0 ? 3.4 : -3.4);
                r.speed = 0.0;
            });
            this.djController.triggerReaction('DROP_HYPE', `WELCOME TO ${st.targetVenue.name}`, 3.0);
        }
    }

    triggerBeatHaptics(intensity = 0.4) {
        if (!navigator.getGamepads) return;
        const pads = navigator.getGamepads();
        for (const pad of pads) {
            if (pad && pad.vibrationActuator && pad.vibrationActuator.playEffect) {
                pad.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: 90,
                    weakMagnitude: Math.min(1.0, this.playerCar.driftState === 'DRIFTING' ? 0.65 : intensity * 0.4),
                    strongMagnitude: Math.min(1.0, intensity)
                }).catch(() => {});
            }
        }
    }

    readPlayerInputs() {
        if (this.autoPilot) {
            this.hasRaceStarted = true;
            const lookT = (this.playerCar.splineT + 0.025) % 1.0;
            const lookSample = this.trackSpline.getSampleAtNormalizedT(lookT);
            const targetLat = Math.sign(lookSample.curvature) * 5.0;
            const latError = targetLat - this.playerCar.lateralOffset;

            this.playerCar.input.throttle = 1.0;
            this.playerCar.input.brake = 0.0;
            this.playerCar.input.steer = Math.max(-1.0, Math.min(1.0, latError * 0.22 + lookSample.curvature * 1.1));
            this.playerCar.input.drift = Math.abs(lookSample.curvature) > 0.11 && this.playerCar.speed > 52;
            return;
        }

        let throttle = (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp'] || this.keys['arrowup']) ? 1.0 : 0.0;
        let brake = (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown'] || this.keys['arrowdown']) ? 1.0 : 0.0;
        let steer = 0.0;
        if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft'] || this.keys['arrowleft']) steer -= 1.0;
        if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight'] || this.keys['arrowright']) steer += 1.0;
        let drift = !!(this.keys['Space'] || this.keys[' '] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['shift']);

        if (navigator.getGamepads) {
            const pads = navigator.getGamepads();
            for (const pad of pads) {
                if (!pad) continue;
                if (Math.abs(pad.axes[0]) > 0.12) steer = pad.axes[0];
                if (pad.buttons[7] && pad.buttons[7].value > 0.1) throttle = pad.buttons[7].value;
                if (pad.buttons[6] && pad.buttons[6].value > 0.1) brake = pad.buttons[6].value;
                if ((pad.buttons[0] && pad.buttons[0].pressed) || (pad.buttons[1] && pad.buttons[1].pressed)) {
                    drift = true;
                }
            }
        }

        if (throttle > 0 || brake > 0 || this.playerCar.boostTimer > 0) {
            this.hasRaceStarted = true;
        }

        this.playerCar.input.throttle = throttle;
        this.playerCar.input.brake = brake;
        this.playerCar.input.steer = steer;
        this.playerCar.input.drift = drift;
    }

    /**
     * Renders the Left-Side Developer Diagnostics Panel:
     * 1. Key Press Indicators (W, S, A, D, SPACE)
     * 2. 2D Top-Down Track Minimap (Left half of canvas)
     * 3. Live Car Vector Compass (Right half of canvas: Road Tangent vs Travel Forward vs Visual Chassis Nose)
     */
    renderDiagnosticsTelemetry() {
        const p = this.playerCar;

        // Key Press Visualizers
        const toggleKey = (id, active) => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('pressed', !!active);
        };
        toggleKey('key-viz-w', p.input.throttle > 0);
        toggleKey('key-viz-s', p.input.brake > 0);
        toggleKey('key-viz-a', p.input.steer < -0.05);
        toggleKey('key-viz-d', p.input.steer > 0.05);
        toggleKey('key-viz-space', p.input.drift);

        // Numeric Telemetry
        const sample = this.trackSpline.getSampleAtNormalizedT(p.splineT);
        const setTxt = (id, txt) => {
            const el = document.getElementById(id);
            if (el) el.textContent = txt;
        };
        setTxt('diag-lat', `${p.lateralOffset >= 0 ? '+' : ''}${p.lateralOffset.toFixed(1)}m`);
        setTxt('diag-head', `${((p.headingOffset * 180) / Math.PI).toFixed(1)}°`);
        setTxt('diag-slip', `${((p.visualSlipAngle * 180) / Math.PI).toFixed(1)}°`);
        setTxt('diag-curve', sample.curvature.toFixed(2));

        if (!this.diagCtx || !this.diagCanvas) return;
        const ctx = this.diagCtx;
        const w = this.diagCanvas.width;
        const h = this.diagCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Divider between Minimap (Left 118px) and Vector Compass (Right 126px)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(118, 0);
        ctx.lineTo(118, h);
        ctx.stroke();

        // =====================================================================
        // LEFT HALF: TOP-DOWN 2D TRACK MINIMAP
        // =====================================================================
        const b = this.trackSpline.bounds;
        const spanX = Math.max(100, b.maxX - b.minX);
        const spanZ = Math.max(100, b.maxZ - b.minZ);
        const scale = Math.min(92 / spanX, 92 / spanZ);
        const midX = (b.minX + b.maxX) * 0.5;
        const midZ = (b.minZ + b.maxZ) * 0.5;

        // Note: In our right-handed world, +Z is North (Up on minimap) and -X is East (Right on minimap)!
        const toMapX = (wx) => 59 - (wx - midX) * scale;
        const toMapY = (wz) => 57 - (wz - midZ) * scale;

        ctx.strokeStyle = '#332966';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const samples = this.trackSpline.samples;
        for (let i = 0; i < samples.length; i += 6) {
            const sp = samples[i].pos;
            const mx = toMapX(sp[0]);
            const my = toMapY(sp[2]);
            if (i === 0) ctx.moveTo(mx, my);
            else ctx.lineTo(mx, my);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw AI Rivals on minimap
        if (this.aiRivalsEnabled) {
            for (const r of this.rivals) {
                ctx.fillStyle = '#ff2a7a';
                ctx.beginPath();
                ctx.arc(toMapX(r.pos[0]), toMapY(r.pos[2]), 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw Player Car + Heading Line on minimap
        const px = toMapX(p.pos[0]);
        const py = toMapY(p.pos[2]);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.visualForward[0] * 11, py - p.visualForward[2] * 11);
        ctx.stroke();

        ctx.fillStyle = '#00f5d4';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        // =====================================================================
        // RIGHT HALF: LIVE CAR BASIS VECTOR COMPASS (Road Tangent = Up)
        // =====================================================================
        const cx = 181;
        const cy = 62;
        const radius = 40;

        // Compass ring
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 1. White Dashed Line: Road Tangent (0° Up)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy + 25);
        ctx.lineTo(cx, cy - radius - 4);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Green Arrow: Travel Velocity Direction (headingOffset)
        const hAng = p.headingOffset;
        const gx = cx + Math.sin(hAng) * radius;
        const gy = cy - Math.cos(hAng) * radius;
        ctx.strokeStyle = '#1aff66';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(gx, gy);
        ctx.stroke();

        // 3. Cyan Car Chassis Box + Visual Nose Arrow (headingOffset + visualSlipAngle)
        const vAng = p.headingOffset + p.visualSlipAngle;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(vAng);

        //Rotated Car Chassis Rectangle
        ctx.fillStyle = 'rgba(0, 245, 212, 0.28)';
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.fillRect(-8, -15, 16, 30);
        ctx.strokeRect(-8, -15, 16, 30);

        // Visual Nose Vector (Cyan)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius);
        ctx.stroke();

        // Right Basis Vector (Red/Magenta)
        ctx.strokeStyle = '#ff1e6b';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, 0);
        ctx.stroke();
        ctx.restore();

        // Compass Legend
        ctx.fillStyle = '#1aff66';
        ctx.font = 'bold 8px "Chakra Petch", sans-serif';
        ctx.fillText('■ VEL', 124, 12);
        ctx.fillStyle = '#00f5d4';
        ctx.fillText('■ NOSE', 158, 12);
        ctx.fillStyle = '#ff1e6b';
        ctx.fillText('■ RIGHT', 198, 12);
    }

    updateHUDTelemetry() {
        const p = this.playerCar;
        const kmh = Math.round(Math.abs(p.speed) * 3.6);

        const elSpeed = document.getElementById('hud-speed-val');
        if (elSpeed) elSpeed.textContent = kmh;

        const elSpeedBar = document.getElementById('hud-speed-bar');
        if (elSpeedBar) elSpeedBar.style.width = `${Math.min(100, Math.round(p.normalizedSpeed * 85))}%`;

        const elDriftState = document.getElementById('hud-drift-badge');
        if (elDriftState) {
            const gearNum = p.gear || 1;
            const rpmFormatted = Math.round(p.rpm || 1200).toLocaleString();
            if (p.boostTimer > 0) {
                const tierLabels = { 3: '★ TIER 3 REDLINE OVERDRIVE ★', 2: '★ TIER 2 FLAME BOOST ★', 1: '★ TIER 1 SPARK BOOST ★' };
                elDriftState.textContent = tierLabels[p.boostTier] || '★ PAINT SMUDGE BOOST ★';
                elDriftState.className = 'hud-badge badge-boost';
            } else if (p.driftState === 'INITIATING') {
                elDriftState.textContent = `R4 DRIFT INIT // G${gearNum} ${rpmFormatted} RPM`;
                elDriftState.className = 'hud-badge badge-drift';
            } else if (p.driftState === 'DRIFTING') {
                const chargePct = Math.min(100, Math.round(p.driftCharge * 100));
                const tierPreview = p.driftCharge >= 0.95 ? ' [T3 MAX]' : (p.driftCharge >= 0.65 ? ' [T2]' : (p.driftCharge >= 0.35 ? ' [T1]' : ''));
                elDriftState.textContent = `R4 DRIFT // CHARGE ${chargePct}%${tierPreview}`;
                elDriftState.className = 'hud-badge badge-drift';
            } else if (p.driftState === 'RECOVERY') {
                elDriftState.textContent = `EXIT SNAP // G${gearNum} ${rpmFormatted} RPM`;
                elDriftState.className = 'hud-badge badge-drift';
            } else {
                elDriftState.textContent = `GRIP // G${gearNum} • ${rpmFormatted} RPM`;
                elDriftState.className = 'hud-badge';
            }
        }

        const rageFill = document.getElementById('player-rage-fill');
        const rageVal = document.getElementById('player-rage-val');
        if (rageFill) rageFill.style.width = `${Math.round(p.rage)}%`;
        if (rageVal) {
            rageVal.textContent = p.isBoiling ? `BOILING (${Math.round(p.rage)}%)` : `${Math.round(p.rage)}%`;
            rageVal.classList.toggle('text-boiling', p.isBoiling);
        }

        const egoFill = document.getElementById('player-ego-fill');
        const egoVal = document.getElementById('player-ego-val');
        if (egoFill) egoFill.style.width = `${Math.round(p.cockiness)}%`;
        if (egoVal) {
            egoVal.textContent = p.isUntouchable ? `UNTOUCHABLE (${Math.round(p.cockiness)}%)` : `${Math.round(p.cockiness)}%`;
            egoVal.classList.toggle('text-untouchable', p.isUntouchable);
        }

        const elRank = document.getElementById('hud-race-rank');
        if (elRank) elRank.textContent = `${p.raceRank}${['ST', 'ND', 'RD', 'TH'][p.raceRank - 1] || 'TH'}`;

        const elLap = document.getElementById('hud-lap-val');
        if (elLap) elLap.textContent = `LAP ${p.lap} / 3`;

        if (this.djHudCtx && this.djHudCanvas) {
            this.djHudCtx.drawImage(this.djController.canvas, 0, 0, this.djHudCanvas.width, this.djHudCanvas.height);
        }

        const stems = this.audioEngine.state.stems;
        const setBar = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.style.height = `${Math.round(Math.max(8, v * 100))}%`;
        };
        setBar('stem-kick', stems.kickSub * (0.6 + this.audioEngine.state.subBass * 0.4));
        setBar('stem-tops', stems.percTops);
        setBar('stem-chords', stems.synthChords);
        setBar('stem-acid', stems.leadAcid);
        setBar('stem-riser', stems.fxRisers);

        // Sync Rekordbox Studio UI Sliders & Status Message with AI DJ Live Movements
        const rb = this.audioEngine.rekordbox;
        if (rb && rb.deck1 && rb.deck2) {
            const rbMsg = document.getElementById('rb-status-msg');
            if (rbMsg) rbMsg.textContent = rb.statusMessage;

            if (rb.aiDjEnabled) {
                const syncVal = (id, v) => {
                    const el = document.getElementById(id);
                    if (el && document.activeElement !== el) el.value = v.toFixed(2);
                };
                syncVal('slider-d1-low', rb.deck1.eq.low);
                syncVal('slider-d1-mid', rb.deck1.eq.mid);
                syncVal('slider-d1-hi', rb.deck1.eq.high);
                syncVal('slider-d1-fltr', rb.deck1.colorFilter);
                syncVal('slider-d2-low', rb.deck2.eq.low);
                syncVal('slider-d2-mid', rb.deck2.eq.mid);
                syncVal('slider-d2-hi', rb.deck2.eq.high);
                syncVal('slider-d2-fltr', rb.deck2.colorFilter);
                syncVal('slider-rb-crossfader', rb.crossfader);
            }
        }

        this.renderDiagnosticsTelemetry();
    }

    loop(now) {
        const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) * 0.001));
        this.lastTime = now;

        if (!this.isEngineInitialized || !this.hasActiveSession) {
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (this.mode === 'LANDMARK_LOADING') {
            this.updateLandmarkLoading(dt);
        }

        if (this.mode === 'RACING') {
            // 1. Read Controls & Update Active Vehicles
            this.readPlayerInputs(dt);

            const activeVehicles = this.getActiveVehicles();

            if (this.aiRivalsEnabled && this.hasRaceStarted) {
                for (const r of this.rivals) {
                    r.updateAIBrain(dt, this.trackSpline, this.playerCar, activeVehicles);
                }
            } else {
                for (const r of this.rivals) {
                    r.input.throttle = 0.0;
                    r.input.brake = 1.0;
                    r.input.steer = 0.0;
                }
            }

            const callbacks = {
                onDriftBoost: (car) => {
                    if (car.isPlayer) {
                        this.audioEngine.triggerDriftBoostSFX();
                        this.djController.triggerReaction('DROP_HYPE', 'DRIFT BOOST IGNITION!!', 2.0);
                        this.expressionHUD.spawnBanterRibbon(
                            this.expressionHUD.boxes.player,
                            RRR.DIALOGUE_BARKS.ON_DRIFT_BOOST,
                            this.audioEngine
                        );
                    }
                },
                onWallScrape: (car) => {
                    if (car.isPlayer) {
                        this.renderer.triggerCollisionVFX(car.pos);
                    }
                }
            };

            for (const v of activeVehicles) {
                v.update(dt, this.trackSpline, activeVehicles, callbacks);
            }

            const sorted = [...activeVehicles].sort((a, b) => b.totalProgress - a.totalProgress);
            sorted.forEach((v, idx) => {
                if (v.isPlayer && v.raceRank > 1 && idx === 0) {
                    this.djController.triggerReaction('OVERTAKE_SMIRK', 'NEW RACE LEADER // P1!!', 2.5);
                }
                v.raceRank = idx + 1;
            });

            // 2. Check Car-to-Car Combat Collisions & Near-Misses
            if (activeVehicles.length > 1) {
                RRR.CarCombatSystem.checkCollisions(
                    activeVehicles,
                    this.trackSpline,
                    (evt) => this.handleCarCollisionEvent(evt),
                    () => {
                        this.expressionHUD.spawnBanterRibbon(
                            this.expressionHUD.boxes.player,
                            RRR.DIALOGUE_BARKS.ON_NEAR_MISS,
                            this.audioEngine
                        );
                    }
                );
            }
        }

        const activeVehicles = this.getActiveVehicles();

        // 3. Check Track Vibe Zone along Spline & Update Vibe LUT Controller
        const playerSample = this.trackSpline.getSampleAtNormalizedT(this.playerCar.splineT);
        this.vibeController.setTrackZone(playerSample.zone);
        this.vibeController.update(dt, this.audioEngine.state, {
            rage: this.playerCar.rage,
            cockiness: this.playerCar.cockiness
        });

        // 4. Update Interactive 5-Stem Rave Audio Engine & FFT Bus
        this.audioEngine.update(dt, {
            normalizedSpeed: this.playerCar.normalizedSpeed,
            isDrifting: this.playerCar.driftState === 'DRIFTING',
            driftCharge: this.playerCar.driftCharge,
            cockiness: this.playerCar.cockiness,
            rage: this.playerCar.rage,
            isFirstPlace: this.playerCar.raceRank === 1,
            isFinalLap: this.playerCar.lap >= 3,
            isLoadingMuffled: this.mode === 'LANDMARK_LOADING'
        });

        // 5. Update Track DJ Boiler Room Broadcast Canvas
        this.djController.updateAndRender(
            dt,
            this.audioEngine.state,
            this.vibeController.activeState,
            this.audioEngine.rekordboxMode ? this.audioEngine.rekordbox : null
        );

        // 6. Update 2D Physics Character Portrait Boxes & HUD
        this.expressionHUD.update(dt, this.audioEngine.state);
        this.updateHUDTelemetry();

        // 7. Update Sense-of-Speed Camera & Render Multi-Pass WebGL2 Scene + Paint Smudge
        if (this.mode === 'RACING') {
            this.renderer.updateCameraAndParticles(dt, this.playerCar);
        }
        this.renderer.render(
            activeVehicles,
            this.playerCar,
            this.vibeController,
            this.audioEngine.state,
            this.djController
        );

        requestAnimationFrame((t) => this.loop(t));
    }
};

window.addEventListener('DOMContentLoaded', () => {
    window.raveRacerApp = new RRR.GameApp();
});
