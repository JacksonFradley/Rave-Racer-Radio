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

        // Dedicated Bottom-Left Arcade Course Radar Minimap Canvas
        this.arcadeMinimapCanvas = document.getElementById('arcade-minimap-canvas');
        this.arcadeMinimapCtx = this.arcadeMinimapCanvas ? this.arcadeMinimapCanvas.getContext('2d') : null;

        // Namco Rave Racer Virtual Rear-View Mirror & Rival Radar Strip Canvas
        this.rearMirrorCanvas = document.getElementById('rear-mirror-canvas');
        this.rearMirrorCtx = this.rearMirrorCanvas ? this.rearMirrorCanvas.getContext('2d') : null;

        // Interactive Tokyo Highway Network Map Canvas
        this.worldMapCanvas = document.getElementById('world-map-canvas');
        this.worldMapCtx = this.worldMapCanvas ? this.worldMapCanvas.getContext('2d') : null;
        this.selectedMapVenueId = 'venue_emerald_coast';
        this.mapAnimTime = 0.0;

        // Garage 3D Turntable Preview Canvas inside Main Menu
        this.garageCanvas = document.getElementById('garage-turntable-canvas');
        this.garageCtx = this.garageCanvas ? this.garageCanvas.getContext('2d') : null;
        this.isGarageOrbitDragging = false;
        this.garageLastPointer = [0, 0];
        this.activeMenuTab = 'garage';
        this.playerBuild = Object.assign({}, RRR.DEFAULT_PLAYER_BUILD);

        // Developer Sandbox vs Clean Arcade HUD Flags
        this.studioHudEnabled = false;
        this.speedUnits = 'KMH'; // 'KMH' | 'MPH'
        this.wrongWayTimer = 0.0;
        this.styleCalloutTimer = 0.0;
        this.sectorFlashTimer = 0.0;
        this.lastDisplayedSector = -1;
        this._tachSegs = null;
        this.prevGamepadButtons = {};

        this.aiRivalsEnabled = true;
        this.activeLabName = 'SELECT A TRACK OR LAB';
        this.isOrbitDragging = false;
        this.lastPointer = [0, 0];

        this.playerCar = null;
        this.rivals = [];
        this.vehicles = [];
        this.hasRaceStarted = false;

        // Game Flow State: 'ATTRACT_TITLE' | 'DEV_MENU' | 'RACING' | 'PAUSED' | 'WORLD_MAP' | 'LANDMARK_LOADING'
        this.mode = 'ATTRACT_TITLE';
        this.autoPilot = false;
        this.keys = {};
        this.landmarkLoadState = {
            active: false,
            progress: 0,
            route: null,
            targetVenue: null,
            scrollX: 0
        };

        // Official Grand Prix Race Configuration & Live Race State Machine
        this.raceConfig = {
            trackPresetKey: 'nagai_bayshore',
            totalLaps: 3,
            aiDifficulty: 'PRO' // 'ROOKIE' | 'PRO' | 'RAVE_DEMON'
        };
        this.personalBests = this.loadPersonalBests();
        this.raceState = this.createFreshRaceState();
        this._domCache = {};
        this._rbKillBtns = null;
        this._rbStemBtns = null;

        this.setStudioHudMode(false);
        this.bindMenuEvents();
        this.buildWorldMapUI();
        // Initialize 3D WebGL engine immediately so the Attract Mode & Garage 3D Turntable are live on startup
        this.ensureEngineInitialized('nagai_bayshore');
        this.bindGarageCustomizerEvents();
        this.bindRaceSetupAndModalEvents();
        this.applyPlayerBuild(this.playerBuild, 'preset_harigaya_chaser');
        this.syncRaceSetupUI();
        this.enterAttractTitleMode();
    }

    getEl(id) {
        let el = this._domCache[id];
        if (el === undefined) {
            el = document.getElementById(id) || null;
            this._domCache[id] = el;
        }
        return el;
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
                name: 'KAI "REDLINE" // SHAKOTAN S13',
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
                name: 'MIRA "VAPOR" // WILD HORSES',
                shortName: 'MIRA',
                isPlayer: false,
                vibeKey: 'wild_horses_cobalt',
                startT: 0.042,
                startLateral: -4.0,
                startSpeed: 0.0,
                initialRage: 15,
                initialCockiness: 78,
                personality: { aggression: 0.4, driftSkill: 0.95, baseSpeedScalar: 1.01 }
            }, this.trackSpline),
            new RRR.ArcadeVehicle({
                id: 'rival_rex',
                name: 'REX "303" // GRAVEL GC8',
                shortName: 'REX',
                isPlayer: false,
                vibeKey: 'gravel_raver_camo',
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

    // =========================================================================
    // CLEAN ARCADE HUD vs. STUDIO / DEV HUD MODE & STYLE CALLOUTS
    // =========================================================================
    setStudioHudMode(enabled) {
        this.studioHudEnabled = !!enabled;
        document.body.classList.toggle('arcade-hud-clean', !this.studioHudEnabled);
        const btnTop = document.getElementById('btn-toggle-studio-hud');
        if (btnTop) {
            btnTop.textContent = this.studioHudEnabled ? '🎛️ HUD: STUDIO (TAB)' : '🕹️ HUD: CLEAN ARCADE (TAB)';
            btnTop.classList.toggle('studio-active', this.studioHudEnabled);
        }
        this.syncPauseModalQuickSettings();
    }

    toggleStudioHudMode() {
        this.setStudioHudMode(!this.studioHudEnabled);
    }

    showStyleCallout(text, duration = 2.1) {
        const el = document.getElementById('arcade-style-callout');
        if (!el) return;
        el.textContent = text;
        el.classList.remove('hidden');
        this.styleCalloutTimer = duration;
    }

    // =========================================================================
    // ARCADE ATTRACT-MODE TITLE OVERLAY (LIVE 3D AI DEMO BACKGROUND)
    // =========================================================================
    enterAttractTitleMode() {
        this.ensureEngineInitialized('nagai_bayshore');
        this.exitOfficialRaceMode();
        this.toggleRekordboxPanel(false);

        const titleEl = document.getElementById('arcade-title-overlay');
        if (titleEl) titleEl.classList.remove('hidden');
        const menuEl = document.getElementById('dev-start-menu');
        if (menuEl) menuEl.classList.add('hidden');
        const pauseEl = document.getElementById('race-pause-modal');
        if (pauseEl) pauseEl.classList.add('hidden');
        const hudEl = document.getElementById('hud-root');
        if (hudEl) hudEl.classList.add('hidden');

        RRR.PHYSICS_TUNING.stationaryTurntable = false;
        this.autoPilot = true;
        this.aiRivalsEnabled = true;
        this.hasRaceStarted = true;
        this.attractCameraTimer = 0.0;
        this.attractCameraIndex = 0;
        if (this.renderer) {
            this.renderer.cameraMode = 'TV_BROADCAST';
            this.renderer.orbitAutoRotate = true;
            this.renderer.showDebugVectors = false;
            this.renderer.debugBufferMode = 0;
        }
        this.mode = 'ATTRACT_TITLE';
    }

    exitAttractTitleMode(destination = 'quick_race') {
        const titleEl = document.getElementById('arcade-title-overlay');
        if (titleEl) titleEl.classList.add('hidden');
        const hudEl = document.getElementById('hud-root');
        if (hudEl) hudEl.classList.remove('hidden');

        if (this.audioEngine) {
            this.audioEngine.init();
            const badge = document.getElementById('audio-status-btn');
            if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';
        }

        if (destination === 'quick_race') {
            this.startOfficialRace({
                trackPresetKey: this.raceConfig.trackPresetKey || 'nagai_bayshore',
                totalLaps: this.raceConfig.totalLaps || 3,
                aiDifficulty: this.raceConfig.aiDifficulty || 'PRO'
            });
        } else if (destination === 'garage') {
            this.toggleDevMenu(true, true, 'garage');
        } else if (destination === 'race_setup') {
            this.toggleDevMenu(true, true, 'race');
        } else if (destination === 'tracks') {
            this.toggleDevMenu(true, true, 'tracks');
        } else if (destination === 'dj_studio') {
            this.launchDevMode('lab_dj_audio');
        } else if (destination === 'world_map') {
            this.toggleWorldMapModal(true);
        }
    }

    updateAttractTitleMode(dt) {
        this.attractCameraTimer += dt;
        const camCycle = [
            { mode: 'TV_BROADCAST', label: '🎥 LIVE ATTRACT DEMO // TV TRACKSIDE BROADCAST' },
            { mode: 'FOLLOW',       label: '🎥 LIVE ATTRACT DEMO // R4 DYNAMIC CHASE CAM' },
            { mode: 'HOOD',         label: '🎥 LIVE ATTRACT DEMO // NAMCO BUMPER / HOOD CAM' },
            { mode: 'ORBIT_CAR',    label: '🎥 LIVE ATTRACT DEMO // 360° LOW-POLY CEL RIG' }
        ];
        if (this.attractCameraTimer >= 6.5) {
            this.attractCameraTimer = 0.0;
            this.attractCameraIndex = ((this.attractCameraIndex || 0) + 1) % camCycle.length;
            const entry = camCycle[this.attractCameraIndex];
            if (this.renderer) {
                this.renderer.cameraMode = entry.mode;
                this.renderer.orbitAutoRotate = true;
                this.renderer.orbitDist = 5.0;
            }
            const lbl = document.getElementById('attract-camera-lbl');
            if (lbl) lbl.textContent = entry.label;
        }
    }

    // =========================================================================
    // DEDICATED IN-RACE PAUSE & QUICK SETTINGS MODAL (ESC / START)
    // =========================================================================
    togglePauseModal(forceShow) {
        const modal = document.getElementById('race-pause-modal');
        if (!modal) return;
        const show = forceShow !== undefined ? forceShow : modal.classList.contains('hidden');
        if (show && this.mode !== 'RACING' && this.mode !== 'PAUSED') return;

        modal.classList.toggle('hidden', !show);
        if (show) {
            this.keys = {};
            if (this.renderer) this.renderer.lookBackActive = false;
            this.mode = 'PAUSED';
            const sub = document.getElementById('pm-track-subtitle');
            const trackName = this.trackSpline && this.trackSpline.activePreset ? this.trackSpline.activePreset.name : 'NAGAI BAYSHORE LOOP';
            if (sub) {
                sub.textContent = `${trackName} // ${this.activeLabName}`;
            }
            this.syncPauseModalQuickSettings();
        } else if (this.mode === 'PAUSED') {
            this.mode = 'RACING';
        }
    }

    syncPauseModalQuickSettings() {
        const btnUnits = document.getElementById('btn-pm-units');
        if (btnUnits) btnUnits.textContent = this.speedUnits === 'MPH' ? 'MPH' : 'KM/H';

        const isMt = RRR.PHYSICS_TUNING.transmissionMode === 'MT';
        const btnTrans = document.getElementById('btn-pm-trans');
        if (btnTrans) btnTrans.textContent = isMt ? 'MT (6-SPEED Q/E)' : 'AT (AUTOMATIC)';

        const btnHud = document.getElementById('btn-pm-hud-mode');
        if (btnHud) btnHud.textContent = this.studioHudEnabled ? 'STUDIO DEV HUD' : 'CLEAN ARCADE';

        const btnCam = document.getElementById('btn-pm-camera');
        if (btnCam && this.renderer) {
            const names = {
                FOLLOW: 'CHASE CAM',
                HOOD: 'HOOD / BUMPER',
                TOP_DOWN: 'TOP-DOWN',
                ORBIT_CAR: '360° ORBIT',
                TV_BROADCAST: 'TV BROADCAST',
                JUMBOTRON_STAGE: 'DJ STAGE'
            };
            btnCam.textContent = names[this.renderer.cameraMode] || this.renderer.cameraMode;
        }
    }

    /**
     * Developer Starting Menu Mode Launcher
     */
    launchDevMode(modeKey) {
        const titleEl = document.getElementById('arcade-title-overlay');
        if (titleEl) titleEl.classList.add('hidden');
        const pauseEl = document.getElementById('race-pause-modal');
        if (pauseEl) pauseEl.classList.add('hidden');
        const hudEl = document.getElementById('hud-root');
        if (hudEl) hudEl.classList.remove('hidden');

        if (modeKey === 'lab_world_map') {
            this.toggleDevMenu(false, true);
            this.toggleWorldMapModal(true);
            this.activeLabName = 'LAB 05 // WORLD MAP';
            return;
        }

        if (modeKey === 'official_race') {
            this.startOfficialRace(this.raceConfig);
            return;
        }
        if (modeKey === 'track_full_race') {
            this.startOfficialRace({
                trackPresetKey: 'nagai_bayshore',
                totalLaps: 3,
                aiDifficulty: this.raceConfig.aiDifficulty || 'PRO'
            });
            return;
        }

        this.exitOfficialRaceMode();

        const presetByMode = {
            track_straight: 'straight_drag',
            track_skidpad: 'drift_skidpad',
            track_elevation: 'elevation_bank',
            track_full_race: 'nagai_bayshore',
            track_wangan: 'wangan_cyberport',
            track_hakone: 'hakone_canyon',
            track_odaiba: 'odaiba_megaplex',
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

        // Automatically enable Studio HUD for Mechanic Labs, Clean Arcade HUD for Track Drives
        const isStudioLab = modeKey.startsWith('lab_') || modeKey === 'track_straight' || modeKey === 'track_skidpad';
        this.setStudioHudMode(isStudioLab);

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
        } else if (modeKey === 'track_wangan') {
            this.aiRivalsEnabled = true;
            this.activeLabName = 'TRACK 05 // WANGAN CYBER-PORT';
        } else if (modeKey === 'track_hakone') {
            this.aiRivalsEnabled = true;
            this.activeLabName = 'TRACK 06 // HAKONE CANYON';
        } else if (modeKey === 'track_odaiba') {
            this.aiRivalsEnabled = true;
            this.activeLabName = 'TRACK 07 // ODAIBA FIGURE-8';
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
            this.toggleDJTrainerPanel(false);
        } else if (modeKey === 'lab_dj_trainer') {
            this.aiRivalsEnabled = false;
            this.playerCar.placeOnTrack(this.trackSpline, 0.988, 0.0);
            this.renderer.cameraMode = 'JUMBOTRON_STAGE';
            this.activeLabName = 'LAB 06 // AI DJ RLHF TRANSITION TRAINER';
            this.djController.triggerReaction('DROP_HYPE', 'RLHF TRANSITION RATING STUDIO // TRAIN AI DJ', 4.5);
            this.toggleRekordboxPanel(true);
            this.toggleDJTrainerPanel(true);
            const rb = this.audioEngine && this.audioEngine.rekordbox;
            if (rb && rb.trainer) {
                setTimeout(() => {
                    rb.trainer.auditionTransitionSnippet();
                }, 120);
            }
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
        if (this.raceState && this.raceState.isRaceMode && this.mode === 'RACING') {
            this.startOfficialRace();
            return;
        }
        this.hasRaceStarted = false;
        this.playerCar.placeOnTrack(this.trackSpline, 0.02, 0.0);
        this.playerCar.lap = 1;
        this.playerCar.totalProgress = this.playerCar.splineT;
        this.playerCar.speed = 0.0;
        this.playerCar.gear = 1;
        this.playerCar.rpm = 1200;
        this.playerCar.boostTimer = 0.0;
        this.playerCar.boostTier = 0;
        this.playerCar.boostIntensity = 0.0;
        this.playerCar.driftState = 'GRIP';
        this.playerCar.driftCharge = 0.0;
        this.renderer.camYaw = this.playerCar.headingYaw;

        this.rivals.forEach((r, idx) => {
            r.placeOnTrack(this.trackSpline, (0.032 + idx * 0.012) % 1.0, idx % 2 === 0 ? 4.0 : -4.0);
            r.lap = 1;
            r.totalProgress = r.splineT;
            r.speed = 0.0;
            r.boostTimer = 0.0;
        });
    }

    toggleDevMenu(forceShow, allowWithoutSession = false, targetTab = null) {
        const menuEl = document.getElementById('dev-start-menu');
        if (!menuEl) return;
        const show = forceShow !== undefined ? forceShow : menuEl.classList.contains('hidden');
        if (!show && !this.hasActiveSession && !allowWithoutSession) {
            return;
        }
        const titleEl = document.getElementById('arcade-title-overlay');
        if (titleEl) titleEl.classList.add('hidden');
        const pauseEl = document.getElementById('race-pause-modal');
        if (pauseEl) pauseEl.classList.add('hidden');

        if (targetTab) {
            this.switchMenuTab(targetTab);
        }
        menuEl.classList.toggle('hidden', !show);
        if (show) {
            this.keys = {};
            if (this.mode === 'RACING' && this.renderer) {
                this.savedCameraModeBeforeMenu = this.renderer.cameraMode;
            }
            this.mode = 'DEV_MENU';
            this.syncRaceSetupUI();
        } else if (this.hasActiveSession) {
            const hudEl = document.getElementById('hud-root');
            if (hudEl) hudEl.classList.remove('hidden');
            if (this.renderer && this.savedCameraModeBeforeMenu) {
                this.renderer.cameraMode = this.savedCameraModeBeforeMenu;
                this.renderer.orbitAutoRotate = false;
            }
            this.mode = 'RACING';
        }
    }

    switchMenuTab(tabKey) {
        const validTabs = ['garage', 'race', 'tracks'];
        this.activeMenuTab = validTabs.includes(tabKey) ? tabKey : 'garage';
        const tabGarage = document.getElementById('menu-tab-garage');
        const tabRace = document.getElementById('menu-tab-race');
        const tabTracks = document.getElementById('menu-tab-tracks');
        const btnGarage = document.getElementById('tab-btn-garage');
        const btnRace = document.getElementById('tab-btn-race');
        const btnTracks = document.getElementById('tab-btn-tracks');
        if (tabGarage) tabGarage.classList.toggle('hidden', this.activeMenuTab !== 'garage');
        if (tabRace) tabRace.classList.toggle('hidden', this.activeMenuTab !== 'race');
        if (tabTracks) tabTracks.classList.toggle('hidden', this.activeMenuTab !== 'tracks');
        if (btnGarage) btnGarage.classList.toggle('active', this.activeMenuTab === 'garage');
        if (btnRace) btnRace.classList.toggle('active', this.activeMenuTab === 'race');
        if (btnTracks) btnTracks.classList.toggle('active', this.activeMenuTab === 'tracks');
        if (this.activeMenuTab === 'race') {
            this.syncRaceSetupUI();
        }
    }

    // =========================================================================
    // OFFICIAL GRAND PRIX RACE MECHANIC (MENU -> COUNTDOWN -> TELEMETRY STATS)
    // =========================================================================
    createFreshRaceState() {
        return {
            isRaceMode: false,
            phase: 'IDLE', // 'IDLE' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
            trackPresetKey: this.raceConfig ? this.raceConfig.trackPresetKey : 'nagai_bayshore',
            totalLaps: this.raceConfig ? this.raceConfig.totalLaps : 3,
            aiDifficulty: this.raceConfig ? this.raceConfig.aiDifficulty : 'PRO',
            countdownTimer: 3.6,
            lastCountdownStage: null,
            goBannerTimer: 0.0,
            splitBannerTimer: 0.0,
            finishDelayTimer: 0.0,
            resultsShown: false,
            elapsedTime: 0.0,
            currentLapStartTime: 0.0,
            lapTimes: [],
            bestLapTime: Infinity,
            launchResult: 'CLEAN START',
            launchRpm: 1200,
            isNewBestRace: false,
            isNewBestLap: false,
            prevBestRace: null,
            prevBestLap: null,
            finishedOrder: [],
            rivalTelemetry: {},
            stats: {
                topSpeedKmh: 0,
                speedSampleSum: 0,
                speedSampleCount: 0,
                driftDistanceMeters: 0,
                driftTimeSeconds: 0,
                currentDriftDistanceMeters: 0,
                longestDriftMeters: 0,
                peakSlipAngleDeg: 0,
                driftBoostCount: 0,
                tier3BoostCount: 0,
                ramAttackCount: 0,
                ramVictimCount: 0,
                egoShatterCount: 0,
                nearMissCount: 0,
                wallScrapeCount: 0,
                currentLapScrapes: 0,
                cleanLapsCount: 0,
                peakRage: 0,
                peakCockiness: 0
            }
        };
    }

    loadPersonalBests() {
        try {
            const raw = localStorage.getItem('rrr_race_personal_bests_v1');
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    savePersonalBests() {
        try {
            localStorage.setItem('rrr_race_personal_bests_v1', JSON.stringify(this.personalBests));
        } catch (e) {}
    }

    formatRaceTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '--:--.---';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    }

    bindRaceSetupAndModalEvents() {
        document.querySelectorAll('[data-race-track]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.raceConfig.trackPresetKey = btn.getAttribute('data-race-track');
                this.syncRaceSetupUI();
            });
        });

        document.querySelectorAll('[data-race-laps]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.raceConfig.totalLaps = parseInt(btn.getAttribute('data-race-laps'), 10) || 3;
                this.syncRaceSetupUI();
            });
        });

        document.querySelectorAll('[data-race-diff]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.raceConfig.aiDifficulty = btn.getAttribute('data-race-diff') || 'PRO';
                this.syncRaceSetupUI();
            });
        });

        document.querySelectorAll('[data-race-trans]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-race-trans') || 'AT';
                this.raceConfig.transmissionMode = mode;
                RRR.PHYSICS_TUNING.transmissionMode = mode;
                this.syncRaceSetupUI();
                this.syncPauseModalQuickSettings();
            });
        });

        const btnLaunchRace = document.getElementById('btn-launch-configured-race');
        if (btnLaunchRace) {
            btnLaunchRace.addEventListener('click', () => {
                this.startOfficialRace(this.raceConfig);
            });
        }

        const btnRematch = document.getElementById('btn-rr-rematch');
        if (btnRematch) {
            btnRematch.addEventListener('click', () => {
                this.closeRaceResultsModal();
                this.startOfficialRace();
            });
        }

        const btnSetup = document.getElementById('btn-rr-setup');
        if (btnSetup) {
            btnSetup.addEventListener('click', () => {
                this.closeRaceResultsModal();
                this.toggleDevMenu(true, true, 'race');
            });
        }

        const btnGarage = document.getElementById('btn-rr-garage');
        if (btnGarage) {
            btnGarage.addEventListener('click', () => {
                this.closeRaceResultsModal();
                this.toggleDevMenu(true, true, 'garage');
            });
        }

        const btnFreeDrive = document.getElementById('btn-rr-freedrive');
        if (btnFreeDrive) {
            btnFreeDrive.addEventListener('click', () => {
                this.closeRaceResultsModal();
                this.exitOfficialRaceMode();
                this.autoPilot = false;
                if (this.renderer) {
                    this.renderer.cameraMode = 'FOLLOW';
                    this.renderer.orbitAutoRotate = false;
                }
                this.updateControlButtonStates();
            });
        }
    }

    syncRaceSetupUI() {
        const cfg = this.raceConfig;
        document.querySelectorAll('[data-race-track]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-race-track') === cfg.trackPresetKey);
        });
        document.querySelectorAll('[data-race-laps]').forEach((btn) => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-race-laps'), 10) === cfg.totalLaps);
        });
        document.querySelectorAll('[data-race-diff]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-race-diff') === cfg.aiDifficulty);
        });
        const activeTrans = RRR.PHYSICS_TUNING.transmissionMode || cfg.transmissionMode || 'AT';
        document.querySelectorAll('[data-race-trans]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-race-trans') === activeTrans);
        });

        const arch = RRR.VEHICLE_ARCHETYPES[this.playerBuild?.archetypeId] || RRR.VEHICLE_ARCHETYPES.pocket_rocket;
        const vibe = RRR.VIBE_PALETTES[this.playerBuild?.vibeKey] || RRR.VIBE_PALETTES.pacific_sunset;
        const elCar = document.getElementById('race-menu-player-car');
        const elVibe = document.getElementById('race-menu-player-vibe');
        if (elCar && arch) elCar.textContent = `REN — ${arch.name} (${arch.chassisModel})`;
        if (elVibe && vibe) elVibe.textContent = `${vibe.name} LUT`;

        this.renderMenuRaceRecords();
    }

    renderMenuRaceRecords() {
        const body = document.getElementById('menu-race-records-body');
        if (!body) return;
        const keys = Object.keys(this.personalBests || {});
        if (keys.length === 0) {
            body.innerHTML = `<div class="race-record-empty">NO OFFICIAL RACE RECORDS YET — LAUNCH A RACE TO LOG TELEMETRY!</div>`;
            return;
        }
        body.innerHTML = '';
        keys.forEach((recKey) => {
            const rec = this.personalBests[recKey];
            if (!rec) return;
            const row = document.createElement('div');
            row.className = 'race-record-row';
            const rankNum = rec.bestRank || 1;
            const suffix = ['ST', 'ND', 'RD', 'TH'][rankNum - 1] || 'TH';
            row.innerHTML = `
                <strong style="color:#00f5d4;">${rec.trackName || recKey} (${rec.laps || 3}L)</strong>
                <span>RACE: <strong>${this.formatRaceTime(rec.bestRaceTime)}</strong></span>
                <span>LAP: <strong>${this.formatRaceTime(rec.bestLapTime)}</strong></span>
                <span style="color:#ffe600;font-weight:800;text-align:right;">${rankNum}${suffix} • ${rec.styleGrade || 'A'}</span>
            `;
            body.appendChild(row);
        });
    }

    exitOfficialRaceMode() {
        this.raceState = this.createFreshRaceState();
        const cdOverlay = document.getElementById('race-countdown-overlay');
        if (cdOverlay) cdOverlay.classList.add('hidden');
        const rrModal = document.getElementById('race-results-modal');
        if (rrModal) rrModal.classList.add('hidden');
        const splitBanner = document.getElementById('race-split-banner');
        if (splitBanner) splitBanner.classList.add('hidden');
    }

    startOfficialRace(customConfig = null) {
        if (customConfig) {
            this.raceConfig = Object.assign({}, this.raceConfig, customConfig);
        }

        const titleEl = document.getElementById('arcade-title-overlay');
        if (titleEl) titleEl.classList.add('hidden');
        const pauseEl = document.getElementById('race-pause-modal');
        if (pauseEl) pauseEl.classList.add('hidden');
        const hudEl = document.getElementById('hud-root');
        if (hudEl) hudEl.classList.remove('hidden');

        // Default official races to Clean Arcade HUD
        this.setStudioHudMode(false);

        const targetPreset = this.raceConfig.trackPresetKey || 'nagai_bayshore';
        this.ensureEngineInitialized(targetPreset);
        this.hasActiveSession = true;
        const btnResume = document.getElementById('btn-resume-from-menu');
        if (btnResume) btnResume.classList.remove('hidden');

        this.audioEngine.init();
        const badge = document.getElementById('audio-status-btn');
        if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';

        // Reset sandbox / camera overrides for an official race
        RRR.PHYSICS_TUNING.stationaryTurntable = false;
        this.renderer.cameraMode = 'FOLLOW';
        this.renderer.orbitAutoRotate = false;
        this.renderer.showDebugVectors = false;
        this.renderer.debugBufferMode = 0;
        this.autoPilot = false;
        this.aiRivalsEnabled = true;
        this.toggleRekordboxPanel(false);
        this.closeRaceResultsModal();

        // Load circuit spline & rebuild 3D road/starting-grid meshes
        this.trackSpline.loadPreset(targetPreset);
        this.renderer.buildTrackAndJumbotronMeshes();

        // Apply AI Difficulty speed scalar to the 3 rivals
        const diffScalarMap = {
            ROOKIE: 0.92,
            PRO: 0.99,
            RAVE_DEMON: 1.05
        };
        const diffScalar = diffScalarMap[this.raceConfig.aiDifficulty] || 0.99;
        const baseScalars = [1.0, 1.01, 0.99];
        this.rivals.forEach((r, idx) => {
            r.personality.baseSpeedScalar = baseScalars[idx] * diffScalar;
        });

        // Position 4 cars in a 2x2 Staggered Starting Grid just ahead of splineT = 0.000:
        // P1: Mira (t = 0.024, Left -3.4m)
        // P2: Kai  (t = 0.020, Right +3.4m)
        // P3: Rex  (t = 0.016, Left -3.4m)
        // P4: Ren / Player (t = 0.012, Right +3.4m)
        const gridSlots = [
            { car: this.playerCar, t: 0.012, lat: 3.4, rank: 4 },
            { car: this.rivals[2], t: 0.016, lat: -3.4, rank: 3 }, // Rex P3
            { car: this.rivals[0], t: 0.020, lat: 3.4, rank: 2 },  // Kai P2
            { car: this.rivals[1], t: 0.024, lat: -3.4, rank: 1 }  // Mira P1
        ];

        for (const slot of gridSlots) {
            const c = slot.car;
            c.placeOnTrack(this.trackSpline, slot.t, slot.lat);
            c.lap = 1;
            c.totalProgress = c.splineT;
            c.raceRank = slot.rank;
            c.speed = 0.0;
            c.gear = 1;
            c.rpm = 1200;
            c.boostTimer = 0.0;
            c.boostTier = 0;
            c.boostIntensity = 0.0;
            c.driftState = 'GRIP';
            c.driftCharge = 0.0;
            c.rage = c.isPlayer ? 20 : 30;
            c.cockiness = c.isPlayer ? 45 : 55;
        }

        // Set camera slightly angled during countdown so player sees the 4-car grid & gantry
        this.renderer.camYaw = this.playerCar.headingYaw + 0.22;

        // Initialize fresh race state
        this.raceState = this.createFreshRaceState();
        this.raceState.isRaceMode = true;
        this.raceState.phase = 'COUNTDOWN';
        this.raceState.trackPresetKey = targetPreset;
        this.raceState.totalLaps = this.raceConfig.totalLaps || 3;
        this.raceState.aiDifficulty = this.raceConfig.aiDifficulty || 'PRO';
        this.raceState.countdownTimer = 3.6;
        this.raceState.lastCountdownStage = null;

        this.rivals.forEach((r) => {
            this.raceState.rivalTelemetry[r.id] = {
                car: r,
                lapStartTime: 0.0,
                lapTimes: [],
                bestLap: Infinity,
                finishTime: null,
                finished: false
            };
        });

        this.hasRaceStarted = false;
        const trackName = this.trackSpline.activePreset ? this.trackSpline.activePreset.name : 'NAGAI BAYSHORE LOOP';
        this.activeLabName = `🏆 ${this.raceState.totalLaps}-LAP GRAND PRIX // ${this.raceState.aiDifficulty}`;

        // Populate & show Countdown Overlay
        const cdOverlay = document.getElementById('race-countdown-overlay');
        const cdSub = document.getElementById('cd-race-subtitle');
        const cdTitle = document.getElementById('cd-track-title');
        const cdMain = document.getElementById('cd-main-text');
        const cdRevBox = document.getElementById('cd-rev-box');
        const cdRevHint = document.getElementById('cd-rev-hint');
        if (cdOverlay) cdOverlay.classList.remove('hidden');
        if (cdSub) cdSub.textContent = `${this.raceState.totalLaps}-LAP GRAND PRIX // ${this.raceState.aiDifficulty} CLASS // 4-CAR GRID`;
        if (cdTitle) cdTitle.textContent = trackName;
        if (cdMain) {
            cdMain.textContent = 'READY';
            cdMain.className = 'cd-main-text';
        }
        if (cdRevBox) cdRevBox.classList.remove('hidden');
        if (cdRevHint) {
            cdRevHint.textContent = 'HOLD [W / ↑] FOR R4 BOOST-START (SWEET SPOT: 6,500–8,400 RPM)';
            cdRevHint.style.color = '#ffe600';
        }
        for (let i = 1; i <= 4; i++) {
            const lamp = document.getElementById(`cd-lamp-${i}`);
            if (lamp) lamp.className = 'cd-lamp';
        }

        const splitBanner = document.getElementById('race-split-banner');
        if (splitBanner) splitBanner.classList.add('hidden');

        this.djController.triggerReaction('DROP_HYPE', `GRID LOCKED // ${this.raceState.totalLaps}-LAP GRAND PRIX`, 3.2);
        this.updateControlButtonStates();
        this.toggleDevMenu(false);
    }

    updateRaceCountdown(dt) {
        const rs = this.raceState;
        if (!rs || rs.phase !== 'COUNTDOWN') return;

        rs.countdownTimer -= dt;
        const t = rs.countdownTimer;

        // Read throttle input for R4 Starting Grid Rev-Matching
        let revThrottle = (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp'] || this.keys['arrowup']) ? 1.0 : 0.0;
        if (navigator.getGamepads) {
            const pads = navigator.getGamepads();
            for (const pad of pads) {
                if (pad && pad.buttons[7] && pad.buttons[7].value > 0.1) {
                    revThrottle = Math.max(revThrottle, pad.buttons[7].value);
                }
            }
        }

        const p = this.playerCar;
        p.input.throttle = revThrottle;
        p.input.brake = 1.0;
        p.speed = 0.0;

        if (revThrottle > 0.05) {
            p.rpm = Math.min(9500, p.rpm + dt * 7600 * revThrottle);
            p.exhaustFlameIntensity = p.rpm > 6400 ? (0.4 + 0.6 * Math.abs(Math.sin(performance.now() * 0.025))) : 0.15;
            p.visualRoll = Math.sin(performance.now() * 0.04) * 0.018 * (p.rpm / 9500);
        } else {
            p.rpm = Math.max(1200, p.rpm - dt * 5400);
            p.exhaustFlameIntensity = 0.0;
            p.visualRoll *= 0.85;
        }
        const sample = this.trackSpline.getSampleAtNormalizedT(p.splineT);
        p.syncWorldTransform(sample);

        // Rival idle exhaust rev animations on the grid
        this.rivals.forEach((r, idx) => {
            r.speed = 0.0;
            r.rpm = 4200 + Math.sin(performance.now() * 0.008 + idx * 1.7) * 2200;
            r.exhaustFlameIntensity = r.rpm > 5800 ? 0.35 : 0.0;
        });

        // Update Rev Meter Bar UI
        const revPct = Math.max(0, Math.min(100, ((p.rpm - 1200) / (9500 - 1200)) * 100));
        const revFill = document.getElementById('cd-rev-fill');
        const revRpm = document.getElementById('cd-rev-rpm');
        const revHint = document.getElementById('cd-rev-hint');
        if (revFill) {
            revFill.style.width = `${revPct}%`;
            revFill.classList.toggle('in-sweetspot', p.rpm >= 6500 && p.rpm <= 8400);
            revFill.classList.toggle('in-overrev', p.rpm > 8400);
        }
        if (revRpm) revRpm.textContent = `${Math.round(p.rpm).toLocaleString()} RPM`;
        if (revHint) {
            if (p.rpm >= 6500 && p.rpm <= 8400) {
                revHint.textContent = '⚡ SWEET SPOT LOCKED! HOLD HERE FOR TIER-2 BOOST LAUNCH!';
                revHint.style.color = '#1aff66';
            } else if (p.rpm > 8400) {
                revHint.textContent = '⚠️ OVER-REVVING! FEATHER THROTTLE TO AVOID WHEELSPIN!';
                revHint.style.color = '#ff1e6b';
            } else {
                revHint.textContent = 'HOLD [W / ↑] FOR R4 BOOST-START (SWEET SPOT: 6,500–8,400 RPM)';
                revHint.style.color = '#ffe600';
            }
        }

        // Determine Countdown Stage (READY -> 3 -> 2 -> 1 -> GO)
        let stage = 'READY';
        if (t <= 0.0) stage = 'GO';
        else if (t <= 1.0) stage = '1';
        else if (t <= 2.0) stage = '2';
        else if (t <= 3.0) stage = '3';

        if (stage !== rs.lastCountdownStage) {
            rs.lastCountdownStage = stage;
            const cdMain = document.getElementById('cd-main-text');
            const l1 = document.getElementById('cd-lamp-1');
            const l2 = document.getElementById('cd-lamp-2');
            const l3 = document.getElementById('cd-lamp-3');
            const l4 = document.getElementById('cd-lamp-4');

            if (stage === '3') {
                if (cdMain) { cdMain.textContent = '3'; cdMain.className = 'cd-main-text stage-num'; }
                if (l1) l1.className = 'cd-lamp lit-red';
                this.audioEngine.triggerCountdownSFX('TICK');
                this.triggerBeatHaptics(0.45);
            } else if (stage === '2') {
                if (cdMain) { cdMain.textContent = '2'; cdMain.className = 'cd-main-text stage-num'; }
                if (l1) l1.className = 'cd-lamp lit-red';
                if (l2) l2.className = 'cd-lamp lit-red';
                this.audioEngine.triggerCountdownSFX('TICK');
                this.triggerBeatHaptics(0.55);
            } else if (stage === '1') {
                if (cdMain) { cdMain.textContent = '1'; cdMain.className = 'cd-main-text stage-num'; }
                if (l1) l1.className = 'cd-lamp lit-red';
                if (l2) l2.className = 'cd-lamp lit-red';
                if (l3) l3.className = 'cd-lamp lit-red';
                this.audioEngine.triggerCountdownSFX('TICK');
                this.triggerBeatHaptics(0.65);
            } else if (stage === 'GO') {
                if (cdMain) { cdMain.textContent = 'GO!!'; cdMain.className = 'cd-main-text cd-go'; }
                [l1, l2, l3, l4].forEach((l) => { if (l) l.className = 'cd-lamp lit-go'; });
                const cdRevBox = document.getElementById('cd-rev-box');
                if (cdRevBox) cdRevBox.classList.add('hidden');

                // Transition to active racing!
                rs.phase = 'RACING';
                rs.goBannerTimer = 1.15;
                rs.elapsedTime = 0.0;
                rs.currentLapStartTime = 0.0;
                this.hasRaceStarted = true;

                // Evaluate R4 Boost-Start RPM
                rs.launchRpm = Math.round(p.rpm);
                if (p.rpm >= 6500 && p.rpm <= 8400) {
                    rs.launchResult = '⚡ PERFECT BOOST LAUNCH';
                    p.boostTier = 2;
                    p.boostTimer = 2.1;
                    p.boostIntensity = 1.0;
                    p.speed = 46.0;
                    p.addEmotion(0, 22, 'PERFECT_LAUNCH');
                    rs.stats.driftBoostCount++;
                    this.audioEngine.triggerDriftBoostSFX(2);
                    this.showRaceSplitBanner('⚡ PERFECT R4 BOOST LAUNCH!! (+165 KM/H)', true, 2.4);
                    this.djController.triggerReaction('DROP_HYPE', 'PERFECT R4 BOOST LAUNCH!!', 2.8);
                } else if (p.rpm > 8400) {
                    rs.launchResult = '🔥 OVER-REV WHEELSPIN';
                    p.boostTier = 1;
                    p.boostTimer = 0.75;
                    p.boostIntensity = 0.45;
                    p.speed = 24.0;
                    p.addEmotion(10, -8, 'WHEELSPIN');
                    this.showRaceSplitBanner('🔥 WHEELSPIN LAUNCH // OVER-REVVED!', false, 2.0);
                    this.djController.triggerReaction('DROP_HYPE', 'GREEN FLAG // FLOOR IT!!', 2.4);
                } else {
                    rs.launchResult = 'CLEAN GRID LAUNCH';
                    p.speed = 18.0;
                    this.djController.triggerReaction('DROP_HYPE', 'GREEN FLAG // 138 BPM DROP!!', 2.5);
                }

                // Launch AI rivals off the line
                this.rivals.forEach((r, idx) => {
                    r.speed = 22.0 + idx * 2.5;
                });

                this.audioEngine.triggerCountdownSFX('GO');
                this.triggerBeatHaptics(1.0);
            }
        }
    }

    showRaceSplitBanner(text, isGold = false, duration = 2.6) {
        const banner = document.getElementById('race-split-banner');
        if (!banner) return;
        banner.textContent = text;
        banner.classList.remove('hidden');
        banner.classList.toggle('gold-banner', !!isGold);
        this.raceState.splitBannerTimer = duration;
    }

    handleRaceLapComplete(car, newLap) {
        const rs = this.raceState;
        if (!rs || !rs.isRaceMode || rs.phase !== 'RACING') return;

        if (!car.isPlayer) {
            const rt = rs.rivalTelemetry[car.id];
            if (!rt || rt.finished) return;
            const lapTime = Math.max(4.0, rs.elapsedTime - rt.lapStartTime);
            rt.lapStartTime = rs.elapsedTime;
            rt.lapTimes.push(lapTime);
            if (lapTime < rt.bestLap) rt.bestLap = lapTime;

            if (newLap > rs.totalLaps) {
                rt.finished = true;
                rt.finishTime = rs.elapsedTime;
                if (!rs.finishedOrder.includes(car)) {
                    rs.finishedOrder.push(car);
                }
            }
            return;
        }

        // Player completed a lap!
        const completedLapNum = newLap - 1;
        const lapTime = Math.max(1.0, rs.elapsedTime - rs.currentLapStartTime);
        rs.currentLapStartTime = rs.elapsedTime;
        rs.lapTimes.push(lapTime);

        if (rs.stats.currentLapScrapes === 0) {
            rs.stats.cleanLapsCount++;
        }
        rs.stats.currentLapScrapes = 0;

        const isSessionBestLap = lapTime < rs.bestLapTime;
        if (isSessionBestLap) {
            rs.bestLapTime = lapTime;
        }

        if (newLap > rs.totalLaps) {
            // Player crossed the Checkered Flag!
            this.finishOfficialRace();
        } else {
            const isFinalLap = newLap === rs.totalLaps;
            this.audioEngine.triggerLapCompleteSFX(isFinalLap);
            const prefix = isFinalLap ? '🔥 FINAL LAP!!' : `LAP ${completedLapNum} COMPLETE`;
            const bestTag = isSessionBestLap && completedLapNum > 1 ? ' [BEST LAP!]' : '';
            this.showRaceSplitBanner(`${prefix} // ${this.formatRaceTime(lapTime)}${bestTag}`, isFinalLap || isSessionBestLap, 3.0);
            this.djController.triggerReaction(
                'DROP_HYPE',
                isFinalLap ? 'FINAL LAP // MAXIMUM OVERDRIVE!!' : `LAP ${completedLapNum} SPLIT: ${this.formatRaceTime(lapTime)}`,
                2.8
            );
            this.triggerBeatHaptics(0.75);
        }
    }

    finishOfficialRace() {
        const rs = this.raceState;
        if (!rs || rs.phase === 'FINISHED') return;

        rs.phase = 'FINISHED';
        rs.finishDelayTimer = 1.25;
        rs.resultsShown = false;

        // Hide countdown overlay if still visible
        const cdOverlay = document.getElementById('race-countdown-overlay');
        if (cdOverlay) cdOverlay.classList.add('hidden');

        if (!rs.finishedOrder.includes(this.playerCar)) {
            rs.finishedOrder.push(this.playerCar);
        }
        const playerFinalRank = rs.finishedOrder.indexOf(this.playerCar) + 1;
        this.playerCar.raceRank = playerFinalRank;

        // Compute finish standings for any AI rivals still on track behind the player
        const unfinishedRivals = this.rivals
            .filter((r) => !rs.finishedOrder.includes(r))
            .sort((a, b) => b.totalProgress - a.totalProgress);

        let lastFinishTime = rs.elapsedTime;
        unfinishedRivals.forEach((r) => {
            const rt = rs.rivalTelemetry[r.id];
            const targetProgress = rs.totalLaps + 0.015;
            const remainingProgress = Math.max(0.01, targetProgress - r.totalProgress);
            const remainingMeters = remainingProgress * this.trackSpline.totalLength;
            const estSpeed = Math.max(46.0, r.speed || r.maxBaseSpeed * 0.85);
            const estTime = Math.max(lastFinishTime + 0.24, rs.elapsedTime + remainingMeters / estSpeed);
            lastFinishTime = estTime;

            if (rt) {
                rt.finished = true;
                rt.finishTime = estTime;
                if (!Number.isFinite(rt.bestLap)) {
                    rt.bestLap = estTime / Math.max(1, rs.totalLaps);
                }
            }
            rs.finishedOrder.push(r);
        });

        // Check & update Personal Bests in localStorage
        const recKey = `${rs.trackPresetKey}_${rs.totalLaps}L`;
        const existingPB = this.personalBests[recKey] || null;
        rs.prevBestRace = existingPB ? existingPB.bestRaceTime : null;
        rs.prevBestLap = existingPB ? existingPB.bestLapTime : null;
        rs.isNewBestRace = !existingPB || rs.elapsedTime < existingPB.bestRaceTime;
        rs.isNewBestLap = !existingPB || rs.bestLapTime < existingPB.bestLapTime;

        const gradeObj = this.computeRaceStyleGrade(playerFinalRank, rs.stats, rs.totalLaps);
        rs.styleGrade = gradeObj.grade;
        rs.styleScore = gradeObj.score;

        const trackName = this.trackSpline.activePreset ? this.trackSpline.activePreset.name : rs.trackPresetKey;
        this.personalBests[recKey] = {
            trackPresetKey: rs.trackPresetKey,
            trackName: trackName,
            laps: rs.totalLaps,
            bestRaceTime: rs.isNewBestRace ? rs.elapsedTime : existingPB.bestRaceTime,
            bestLapTime: rs.isNewBestLap ? rs.bestLapTime : existingPB.bestLapTime,
            bestRank: existingPB ? Math.min(existingPB.bestRank || 4, playerFinalRank) : playerFinalRank,
            styleGrade: gradeObj.grade
        };
        this.savePersonalBests();
        this.renderMenuRaceRecords();

        // Celebratory finish banner, fanfare SFX, and autopilot orbit camera
        const suffix = ['ST', 'ND', 'RD', 'TH'][playerFinalRank - 1] || 'TH';
        this.showRaceSplitBanner(`🏁 CHECKERED FLAG // ${playerFinalRank}${suffix} PLACE FINISH (${this.formatRaceTime(rs.elapsedTime)})`, playerFinalRank === 1, 4.0);
        this.audioEngine.triggerRaceFinishSFX(playerFinalRank);
        this.djController.triggerReaction(
            'DROP_HYPE',
            playerFinalRank === 1 ? 'CHECKERED FLAG // P1 GRAND PRIX WINNER!!' : `RACE COMPLETE // P${playerFinalRank} FINISH!!`,
            3.5
        );
        this.triggerBeatHaptics(1.0);

        this.autoPilot = true;
        if (this.renderer) {
            this.renderer.cameraMode = 'TV_BROADCAST';
            this.renderer.orbitAutoRotate = true;
            this.renderer.orbitDist = 5.2;
            this.renderer.orbitPitch = 0.24;
        }
    }

    computeRaceStyleGrade(rank, st, totalLaps) {
        let score = 0;
        // Placement points
        const rankPts = { 1: 5000, 2: 3600, 3: 2500, 4: 1600 };
        score += rankPts[rank] || 1600;
        // Drift & Boost mastery
        score += Math.round(st.driftDistanceMeters * 2.2);
        score += st.driftBoostCount * 350;
        score += st.tier3BoostCount * 450;
        // Combat & Near-Misses
        score += st.ramAttackCount * 280;
        score += st.egoShatterCount * 600;
        score += st.nearMissCount * 220;
        // Clean laps bonus vs wall scrape penalty
        score += st.cleanLapsCount * 500;
        score = Math.max(500, score - st.wallScrapeCount * 150);

        const normScore = score / Math.max(1, totalLaps / 3);
        let grade = 'B';
        if (rank === 1 && normScore >= 7600) grade = 'S+';
        else if (normScore >= 6200) grade = 'S';
        else if (normScore >= 4600) grade = 'A';
        else if (normScore >= 3000) grade = 'B';
        else grade = 'C';

        return { grade, score };
    }

    populateAndShowRaceResultsModal() {
        const rs = this.raceState;
        const modal = document.getElementById('race-results-modal');
        if (!rs || !modal) return;

        const rank = rs.finishedOrder.indexOf(this.playerCar) + 1 || this.playerCar.raceRank || 1;
        const suffix = ['ST', 'ND', 'RD', 'TH'][rank - 1] || 'TH';
        const trackName = this.trackSpline.activePreset ? this.trackSpline.activePreset.name : 'NAGAI BAYSHORE LOOP';
        const st = rs.stats;
        const arch = RRR.VEHICLE_ARCHETYPES[this.playerBuild?.archetypeId] || RRR.VEHICLE_ARCHETYPES.pocket_rocket;
        const vibe = RRR.VIBE_PALETTES[this.playerBuild?.vibeKey] || RRR.VIBE_PALETTES.pacific_sunset;

        const setTxt = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        setTxt('rr-track-meta', `${trackName} • ${rs.totalLaps} ${rs.totalLaps === 1 ? 'LAP' : 'LAPS'} • ${rs.aiDifficulty} AI${rs.isNewBestRace ? ' • ★ NEW CIRCUIT RECORD!' : ''}`);
        const headlines = {
            1: '🏆 1ST PLACE // RAVE GRAND PRIX VICTORY!!',
            2: '🥈 2ND PLACE // PODIUM FINISH!',
            3: '🥉 3RD PLACE // PODIUM FINISH',
            4: '🏁 4TH PLACE // RACE COMPLETE'
        };
        const hlEl = document.getElementById('rr-placement-title');
        if (hlEl) {
            hlEl.textContent = headlines[rank] || `${rank}${suffix} PLACE FINISH`;
            hlEl.style.color = rank === 1 ? '#ffe600' : (rank <= 3 ? '#00f5d4' : '#ffffff');
        }
        setTxt('rr-car-meta', `REN "PHASE" • ${arch.name} (${arch.chassisModel}) • ${vibe.name} LUT`);
        setTxt('rr-style-grade', rs.styleGrade || 'A');
        setTxt('rr-style-score', `${(rs.styleScore || 5000).toLocaleString()} PTS`);

        // 1. Populate 4-Car Final Standings Table (POS | DRIVER & MACHINE | FINISH / GAP | BEST LAP)
        const tbody = document.getElementById('rr-standings-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            let winnerTime = rs.elapsedTime;

            rs.finishedOrder.forEach((car, idx) => {
                const pos = idx + 1;
                const posSuffix = ['ST', 'ND', 'RD', 'TH'][pos - 1] || 'TH';
                let finishTime = rs.elapsedTime;
                let bestLap = rs.bestLapTime;
                let carLabel = `${arch.name} (${arch.code})`;

                if (!car.isPlayer) {
                    const rt = rs.rivalTelemetry[car.id];
                    finishTime = rt && Number.isFinite(rt.finishTime) ? rt.finishTime : rs.elapsedTime + idx * 1.15;
                    bestLap = rt && Number.isFinite(rt.bestLap) ? rt.bestLap : finishTime / Math.max(1, rs.totalLaps);
                    const vPal = RRR.VIBE_PALETTES[car.vibeKey];
                    carLabel = vPal ? vPal.name : 'RIVAL SPEC';
                }
                if (idx === 0) winnerTime = finishTime;
                const gapStr = idx === 0
                    ? `<span style="color:#1aff66;font-weight:700;">WINNER</span>`
                    : `<span style="color:#ff9f1c;font-weight:700;">+${Math.max(0.01, finishTime - winnerTime).toFixed(3)}s</span>`;

                const tr = document.createElement('tr');
                if (car.isPlayer) tr.className = 'rr-row-player';
                tr.innerHTML = `
                    <td><span class="rr-pos-pill rr-pos-${pos}">${pos}${posSuffix}</span></td>
                    <td><strong>${car.name}</strong>${car.isPlayer ? ' <span style="color:#ffe600;font-size:9px;">[YOU]</span>' : ''} <span style="display:block;font-size:9.5px;color:#b8b0dc;">${carLabel}</span></td>
                    <td><strong>${this.formatRaceTime(finishTime)}</strong> <span style="font-size:10px;margin-left:4px;">(${gapStr})</span></td>
                    <td>${this.formatRaceTime(bestLap)}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // 2. Populate Lap-by-Lap Split Breakdown
        const lapsContainer = document.getElementById('rr-laps-breakdown');
        if (lapsContainer) {
            lapsContainer.innerHTML = '';
            rs.lapTimes.forEach((lt, idx) => {
                const isBest = rs.lapTimes.length > 1 && Math.abs(lt - rs.bestLapTime) < 0.0005;
                let deltaHtml = '';
                if (idx > 0) {
                    const diff = lt - rs.lapTimes[idx - 1];
                    const sign = diff >= 0 ? '+' : '';
                    const color = diff <= 0 ? '#1aff66' : '#ff9f1c';
                    deltaHtml = `<span style="color:${color};font-size:10px;">${sign}${diff.toFixed(3)}s vs L${idx}</span>`;
                } else {
                    deltaHtml = `<span style="color:#b8b0dc;font-size:10px;">${rs.launchResult}</span>`;
                }

                const card = document.createElement('div');
                card.className = `rr-lap-row${isBest ? ' best-lap' : ''}`;
                card.innerHTML = `
                    <span>LAP ${idx + 1}${isBest ? '<span class="rr-best-tag">★ BEST</span>' : ''}</span>
                    <strong>${this.formatRaceTime(lt)}</strong>
                    ${deltaHtml}
                `;
                lapsContainer.appendChild(card);
            });
        }

        // 3. Populate 12 Telemetry Stat Cards
        const pbSuffix = rs.isNewBestRace ? ' ★ PB' : '';
        setTxt('rr-stat-total-time', `${this.formatRaceTime(rs.elapsedTime)}${pbSuffix}`);
        setTxt('rr-stat-best-lap', `${this.formatRaceTime(rs.bestLapTime)}${rs.isNewBestLap ? ' ★ PB' : ''}`);

        const avgSpd = st.speedSampleCount > 0 ? Math.round(st.speedSampleSum / st.speedSampleCount) : 0;
        setTxt('rr-stat-top-speed', `${Math.round(st.topSpeedKmh)} KM/H`);
        setTxt('rr-stat-avg-speed', `${avgSpd} KM/H`);

        setTxt('rr-stat-drift-dist', `${Math.round(st.driftDistanceMeters).toLocaleString()}m (${st.driftTimeSeconds.toFixed(1)}s)`);
        setTxt('rr-stat-longest-drift', `${Math.round(st.longestDriftMeters).toLocaleString()}m`);
        setTxt('rr-stat-peak-slip', `${st.peakSlipAngleDeg.toFixed(1)}°`);
        setTxt('rr-stat-boosts', `${st.driftBoostCount} (${st.tier3BoostCount}× TIER 3)`);
        setTxt('rr-stat-launch', `${rs.launchResult} (${rs.launchRpm.toLocaleString()} RPM)`);
        setTxt('rr-stat-rams', `${st.ramAttackCount} SLAMS${st.egoShatterCount > 0 ? ` (${st.egoShatterCount} SHATTER)` : ''}`);
        setTxt('rr-stat-nearmiss', `${st.nearMissCount} NEAR-MISSES`);
        setTxt(
            'rr-stat-walls',
            st.wallScrapeCount === 0
                ? `0 // FLAWLESS (${st.cleanLapsCount}/${rs.totalLaps} CLEAN)`
                : `${st.wallScrapeCount} SCRAPES (${st.cleanLapsCount}/${rs.totalLaps} CLEAN)`
        );

        modal.classList.remove('hidden');
    }

    closeRaceResultsModal() {
        const modal = document.getElementById('race-results-modal');
        if (modal) modal.classList.add('hidden');
    }

    bindGarageCustomizerEvents() {
        // Tab Switchers inside Main Menu
        document.querySelectorAll('[data-menu-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.switchMenuTab(btn.getAttribute('data-menu-tab'));
            });
        });

        // Open Garage button in top HUD toolbar
        const btnOpenGarage = document.getElementById('btn-open-garage');
        if (btnOpenGarage) {
            btnOpenGarage.addEventListener('click', () => {
                this.toggleDevMenu(true, true, 'garage');
            });
        }

        // 1. One-Click Concept Art Presets
        document.querySelectorAll('[data-car-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-car-preset');
                const preset = RRR.CONCEPT_PRESETS[key];
                if (preset) {
                    this.applyPlayerBuild(Object.assign({}, preset), key);
                }
            });
        });

        // Randomize Rave Build Button
        const btnRand = document.getElementById('btn-garage-randomize');
        if (btnRand) {
            btnRand.addEventListener('click', () => {
                this.randomizePlayerBuild();
            });
        }

        // 2. Base Chassis Archetype Buttons
        document.querySelectorAll('[data-car-arch]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.playerBuild.archetypeId = btn.getAttribute('data-car-arch');
                this.applyPlayerBuild(this.playerBuild);
            });
        });

        // 3. Modular Kitbash Selects
        const bindSelect = (id, prop, isNumeric = false) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', () => {
                this.playerBuild[prop] = isNumeric ? parseInt(el.value, 10) : el.value;
                this.applyPlayerBuild(this.playerBuild);
            });
        };
        bindSelect('cust-wheel-style', 'wheelStyle');
        bindSelect('cust-wing-type', 'wingType');
        bindSelect('cust-roof-mod', 'roofMod');
        bindSelect('cust-front-mod', 'frontMod');
        bindSelect('cust-popup-mode', 'popupMode');
        bindSelect('cust-exhaust-type', 'exhaustType');
        bindSelect('cust-livery-id', 'liveryId', true);

        // Mudflaps Toggle Button
        const btnMud = document.getElementById('cust-mudflaps-btn');
        if (btnMud) {
            btnMud.addEventListener('click', () => {
                this.playerBuild.mudflaps = !this.playerBuild.mudflaps;
                this.applyPlayerBuild(this.playerBuild);
            });
        }

        // Individual Car Zone Color Pickers (9 Zones) + Fluid Race Shift Controls
        const bindColorPicker = (id, prop) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                this.playerBuild.useCustomColors = true;
                this.playerBuild[prop] = el.value;
                this.applyPlayerBuild(this.playerBuild);
            });
        };
        bindColorPicker('color-cust-primary',   'customPrimaryHex');
        bindColorPicker('color-cust-shift',     'customShiftHex');
        bindColorPicker('color-cust-secondary', 'customSecondaryHex');
        bindColorPicker('color-cust-livery1',   'customLivery1Hex');
        bindColorPicker('color-cust-livery2',   'customLivery2Hex');
        bindColorPicker('color-cust-front-rim', 'customFrontRimHex');
        bindColorPicker('color-cust-rear-rim',  'customRearRimHex');
        bindColorPicker('color-cust-cage',      'customCageHex');
        bindColorPicker('color-cust-glow',      'customGlowHex');

        const btnColorMode = document.getElementById('btn-cust-color-mode');
        if (btnColorMode) {
            btnColorMode.addEventListener('click', () => {
                this.playerBuild.useCustomColors = !(this.playerBuild.useCustomColors !== false);
                this.applyPlayerBuild(this.playerBuild);
            });
        }

        const btnSyncVibe = document.getElementById('btn-sync-vibe-colors');
        if (btnSyncVibe) {
            btnSyncVibe.addEventListener('click', () => {
                const pal = RRR.VIBE_PALETTES[this.playerBuild.vibeKey] || RRR.VIBE_PALETTES.harigaya_flame_night;
                const z0 = pal.zones[0];
                const z1 = pal.zones[1] || z0;
                this.playerBuild.useCustomColors = true;
                this.playerBuild.customPrimaryHex   = RRR.rgbToHex(z0.carPrimary);
                this.playerBuild.customShiftHex     = RRR.rgbToHex(z1.carPrimary);
                this.playerBuild.customSecondaryHex = RRR.rgbToHex(z0.carSecondary);
                this.playerBuild.customLivery1Hex   = RRR.rgbToHex(z0.carSecondary);
                this.playerBuild.customLivery2Hex   = RRR.rgbToHex(z0.carTrim);
                this.playerBuild.customFrontRimHex  = RRR.rgbToHex(z0.carTrim);
                this.playerBuild.customRearRimHex   = RRR.rgbToHex(z0.carTrim);
                this.playerBuild.customCageHex      = RRR.rgbToHex(z0.carEmissive);
                this.playerBuild.customGlowHex      = RRR.rgbToHex(z0.carEmissive);
                this.applyPlayerBuild(this.playerBuild);
            });
        }

        const btnMatchRims = document.getElementById('btn-match-rims');
        if (btnMatchRims) {
            btnMatchRims.addEventListener('click', () => {
                this.playerBuild.customRearRimHex = this.playerBuild.customFrontRimHex || '#ffffff';
                this.applyPlayerBuild(this.playerBuild);
            });
        }

        // 4. Stance, Camber, Sleepy-Eye, Sticker & Fluid Race Shift Sliders
        const bindSlider = (id, prop) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                this.playerBuild[prop] = parseFloat(el.value);
                this.applyPlayerBuild(this.playerBuild);
            });
        };
        bindSlider('slider-cust-popup', 'popupAngle');
        bindSlider('slider-cust-camber', 'camberDeg');
        bindSlider('slider-cust-height', 'rideHeight');
        bindSlider('slider-cust-stickers', 'stickerDensity');
        bindSlider('slider-cust-fluid-shift', 'fluidColorShift');

        // 5. Interactive 360° Drag-to-Orbit & Scroll-to-Zoom on Garage Turntable Canvas
        if (this.garageCanvas) {
            this.garageCanvas.addEventListener('pointerdown', (e) => {
                this.isGarageOrbitDragging = true;
                this.garageLastPointer = [e.clientX, e.clientY];
                this.garageCanvas.setPointerCapture(e.pointerId);
            });
            this.garageCanvas.addEventListener('pointermove', (e) => {
                if (!this.isGarageOrbitDragging || !this.renderer) return;
                const dx = e.clientX - this.garageLastPointer[0];
                const dy = e.clientY - this.garageLastPointer[1];
                this.garageLastPointer = [e.clientX, e.clientY];
                this.renderer.orbitYaw = RRR.wrapAngle(this.renderer.orbitYaw + dx * 0.010);
                this.renderer.orbitPitch = Math.max(0.06, Math.min(1.15, this.renderer.orbitPitch + dy * 0.007));
            });
            const endDrag = () => {
                this.isGarageOrbitDragging = false;
            };
            this.garageCanvas.addEventListener('pointerup', endDrag);
            this.garageCanvas.addEventListener('pointercancel', endDrag);
            this.garageCanvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (!this.renderer) return;
                this.renderer.orbitDist = Math.max(3.1, Math.min(9.5, this.renderer.orbitDist + e.deltaY * 0.004));
            }, { passive: false });
        }
    }

    randomizePlayerBuild() {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const archs = Object.keys(RRR.VEHICLE_ARCHETYPES);
        const wheels = ['chrome_vskf', 'deepdish_5spoke', 'rally_6spoke', 'watanabe_8spoke', 'touge_10spoke', 'asymmetric', 'turbofan'];
        const wings = ['swan_neck', 'high_mount_gt', 'rally_box', 'ducktail', 'none'];
        const roofs = ['none', 'none', 'cargo_box', 'yakima_rack'];
        const fronts = ['fmic', 'spider_quads', 'tekkamen_ducts', 'lbwk_canards', 'oil_cooler', 'fog_pods', 'none'];
        const popModes = ['both', 'both', 'wink_left', 'wink_right'];
        const exhausts = ['quad_titanium', 'dual_shotgun'];
        const vibes = Object.keys(RRR.VIBE_PALETTES);
        const raveHexPool = [
            '#4d12b8', '#ff1493', '#0f46d8', '#ffd800', '#39ff14', '#ff5e00',
            '#00f5d4', '#f8f9fc', '#5e0b1e', '#8c14ff', '#dfff00', '#ff1e6b',
            '#181820', '#eef4ff', '#d4af37', '#00b8ff', '#e6192e'
        ];
        const frontRim = pick(raveHexPool);
        const rearRim = Math.random() > 0.45 ? frontRim : pick(raveHexPool);

        this.playerBuild = {
            archetypeId: pick(archs),
            wheelStyle: pick(wheels),
            wingType: pick(wings),
            roofMod: pick(roofs),
            frontMod: pick(fronts),
            popupMode: pick(popModes),
            exhaustType: pick(exhausts),
            popupAngle: Math.random() > 0.35 ? Math.round(14 + Math.random() * 28) : 0,
            camberDeg: -Math.round(Math.random() * 14) * 0.5,
            rideHeight: Math.round((Math.random() * 0.08 - 0.05) * 200) / 200,
            mudflaps: Math.random() > 0.6,
            liveryId: pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
            stickerDensity: Math.round((0.35 + Math.random() * 0.65) * 20) / 20,
            vibeKey: pick(vibes),
            useCustomColors: true,
            fluidColorShift: Math.round((0.45 + Math.random() * 0.50) * 20) / 20,
            customPrimaryHex:   pick(raveHexPool),
            customShiftHex:     pick(raveHexPool),
            customSecondaryHex: pick(raveHexPool),
            customLivery1Hex:   pick(raveHexPool),
            customLivery2Hex:   pick(raveHexPool),
            customFrontRimHex:  frontRim,
            customRearRimHex:   rearRim,
            customCageHex:      pick(raveHexPool),
            customGlowHex:      pick(raveHexPool)
        };
        this.applyPlayerBuild(this.playerBuild);
    }

    applyPlayerBuild(buildConfig, activePresetKey = null) {
        this.playerBuild = Object.assign({}, RRR.DEFAULT_PLAYER_BUILD, buildConfig || {});
        const arch = RRR.VEHICLE_ARCHETYPES[this.playerBuild.archetypeId] || RRR.VEHICLE_ARCHETYPES.pocket_rocket;

        // 1. Rebuild 3D Low-Poly Player Car Mesh VAO in WebGL2
        let meshStats = { vertexCount: 1840, triangleCount: 1220 };
        if (this.renderer) {
            meshStats = this.renderer.rebuildPlayerCarMesh(this.playerBuild);
        }

        // 2. Apply Archetype + Part Modifiers to Live Physics Tuning
        if (arch.physics) {
            const wingDownforceBonus = (this.playerBuild.wingType === 'swan_neck' || this.playerBuild.wingType === 'high_mount_gt')
                ? 0.03
                : (this.playerBuild.wingType === 'rally_box' ? 0.02 : 0.0);
            const camberDriftBonus = Math.abs(this.playerBuild.camberDeg || 0) * 0.012;
            const coolerSpeedBonus = (this.playerBuild.frontMod === 'fmic' || this.playerBuild.frontMod === 'oil_cooler' || this.playerBuild.frontMod === 'tekkamen_ducts') ? 1.5 : 0.0;

            RRR.PHYSICS_TUNING.maxBaseSpeed = arch.physics.maxBaseSpeed + coolerSpeedBonus;
            RRR.PHYSICS_TUNING.accelLow = arch.physics.accelLow;
            RRR.PHYSICS_TUNING.accelHigh = arch.physics.accelHigh;
            RRR.PHYSICS_TUNING.maxSteerAngle = arch.physics.maxSteerAngle + wingDownforceBonus;
            RRR.PHYSICS_TUNING.driftSlipMax = arch.physics.driftSlipMax + camberDriftBonus;
            if (this.playerCar) {
                this.playerCar.maxBaseSpeed = RRR.PHYSICS_TUNING.maxBaseSpeed;
            }
        }

        // 3. Apply Vibe 2D LUT Palette
        if (this.playerBuild.vibeKey && this.vibeController) {
            this.selectVibe(this.playerBuild.vibeKey);
        }

        // 4. Sync Garage UI Controls, Telemetry Badges & Performance Bars
        this.syncGarageCustomizerUI(arch, meshStats, activePresetKey);
        this.syncRaceSetupUI();
    }

    syncGarageCustomizerUI(arch, meshStats, activePresetKey = null) {
        const cfg = this.playerBuild;

        // Preset & Archetype Chips
        document.querySelectorAll('[data-car-preset]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-car-preset') === activePresetKey);
        });
        document.querySelectorAll('[data-car-arch]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-car-arch') === cfg.archetypeId);
        });

        // Selects
        const setSel = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = String(val);
        };
        setSel('cust-wheel-style', cfg.wheelStyle);
        setSel('cust-wing-type', cfg.wingType);
        setSel('cust-roof-mod', cfg.roofMod);
        setSel('cust-front-mod', cfg.frontMod);
        setSel('cust-popup-mode', cfg.popupMode || 'both');
        setSel('cust-exhaust-type', cfg.exhaustType);
        setSel('cust-livery-id', cfg.liveryId);

        // Mudflaps Button
        const btnMud = document.getElementById('cust-mudflaps-btn');
        if (btnMud) {
            btnMud.classList.toggle('active', !!cfg.mudflaps);
            btnMud.textContent = cfg.mudflaps ? '🛡️ FLAPS: ON' : '🛡️ FLAPS: OFF';
        }

        // Individual Car Zone Color Pickers & Hex Readouts
        const setColorUI = (inputId, hexId, val) => {
            const inp = document.getElementById(inputId);
            const hEl = document.getElementById(hexId);
            const clean = (val || '#ffffff').toLowerCase();
            if (inp) inp.value = clean;
            if (hEl) hEl.textContent = clean.toUpperCase();
        };
        setColorUI('color-cust-primary',   'hex-cust-primary',   cfg.customPrimaryHex);
        setColorUI('color-cust-shift',     'hex-cust-shift',     cfg.customShiftHex);
        setColorUI('color-cust-secondary', 'hex-cust-secondary', cfg.customSecondaryHex);
        setColorUI('color-cust-livery1',   'hex-cust-livery1',   cfg.customLivery1Hex);
        setColorUI('color-cust-livery2',   'hex-cust-livery2',   cfg.customLivery2Hex);
        setColorUI('color-cust-front-rim', 'hex-cust-front-rim', cfg.customFrontRimHex);
        setColorUI('color-cust-rear-rim',  'hex-cust-rear-rim',  cfg.customRearRimHex);
        setColorUI('color-cust-cage',      'hex-cust-cage',      cfg.customCageHex);
        setColorUI('color-cust-glow',      'hex-cust-glow',      cfg.customGlowHex);

        const btnColorMode = document.getElementById('btn-cust-color-mode');
        const useCustom = cfg.useCustomColors !== false;
        if (btnColorMode) {
            btnColorMode.classList.toggle('active', useCustom);
            btnColorMode.textContent = useCustom ? 'CUSTOM COLORS: ON' : 'CUSTOM COLORS: OFF (PURE LUT)';
        }

        // Sliders & Labels
        const setSlider = (id, valId, val, text) => {
            const el = document.getElementById(id);
            const vEl = document.getElementById(valId);
            if (el) el.value = val;
            if (vEl) vEl.textContent = text;
        };
        setSlider('slider-cust-popup', 'val-cust-popup', cfg.popupAngle, `${Math.round(cfg.popupAngle)}°`);
        setSlider('slider-cust-camber', 'val-cust-camber', cfg.camberDeg, `${Number(cfg.camberDeg).toFixed(1)}°`);
        const mm = Math.round((cfg.rideHeight || 0) * 1000);
        setSlider('slider-cust-height', 'val-cust-height', cfg.rideHeight, `${mm >= 0 ? '+' : ''}${mm}mm`);
        setSlider('slider-cust-stickers', 'val-cust-stickers', cfg.stickerDensity, `${Math.round((cfg.stickerDensity || 0) * 100)}%`);
        const fluidPct = Math.round(Number(cfg.fluidColorShift ?? 0.72) * 100);
        setSlider('slider-cust-fluid-shift', 'val-cust-fluid-shift', cfg.fluidColorShift ?? 0.72, `${fluidPct}%`);
        const flLbl = document.getElementById('garage-fluid-status-lbl');
        if (flLbl) {
            flLbl.textContent = fluidPct > 0 ? `FLUID SHIFT: ${fluidPct}% ACTIVE` : 'STATIC LOCK (0% SHIFT)';
        }

        // Viewport Overlay Badges
        const setTxt = (id, t) => {
            const el = document.getElementById(id);
            if (el) el.textContent = t;
        };
        setTxt('garage-hud-code', `${arch.code} // LOD0`);
        setTxt('garage-hud-tris', `${Math.round(meshStats.triangleCount).toLocaleString()} TRIS • ${Math.round(meshStats.vertexCount).toLocaleString()} VERTS`);
        setTxt('garage-hud-title', arch.name);
        setTxt('garage-hud-subtitle', `${arch.chassisModel} — ${RRR.LIVERY_META[cfg.liveryId]?.name || ''}`);

        // Compute Modified Stat Bars
        const wingGrip = (cfg.wingType === 'swan_neck' || cfg.wingType === 'high_mount_gt') ? 5 : (cfg.wingType === 'rally_box' ? 3 : 0);
        const coolerSpd = (cfg.frontMod === 'fmic' || cfg.frontMod === 'oil_cooler' || cfg.frontMod === 'tekkamen_ducts') ? 3 : 0;
        const camberDrift = Math.round(Math.abs(cfg.camberDeg || 0) * 0.8);

        const spd = Math.min(100, arch.stats.speed + coolerSpd);
        const acc = Math.min(100, arch.stats.accel + (cfg.frontMod === 'fmic' ? 2 : 0));
        const drf = Math.min(100, arch.stats.drift + camberDrift);
        const grp = Math.min(100, arch.stats.grip + wingGrip + (cfg.frontMod === 'lbwk_canards' ? 3 : 0));

        const setStat = (barId, valId, val) => {
            const b = document.getElementById(barId);
            const v = document.getElementById(valId);
            if (b) b.style.width = `${val}%`;
            if (v) v.textContent = val;
        };
        setStat('stat-bar-speed', 'stat-val-speed', spd);
        setStat('stat-bar-accel', 'stat-val-accel', acc);
        setStat('stat-bar-drift', 'stat-val-drift', drf);
        setStat('stat-bar-grip',  'stat-val-grip',  grp);
    }

    renderGarageTurntablePreview() {
        if (!this.garageCtx || !this.garageCanvas || !this.glCanvas) return;
        const ctx = this.garageCtx;
        const w = this.garageCanvas.width;
        const h = this.garageCanvas.height;

        // Blit the live 3D WebGL Cel-Shaded Car Turntable directly into the Main Menu viewport
        ctx.drawImage(this.glCanvas, 0, 0, w, h);

        // Subtle Technical Blueprint Corner Crosshairs
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
        ctx.lineWidth = 1.5;
        const pad = 12, len = 14;
        ctx.beginPath();
        ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad);
        ctx.moveTo(w - pad - len, pad); ctx.lineTo(w - pad, pad); ctx.lineTo(w - pad, pad + len);
        ctx.stroke();

        // Update Live Fluid Race Color Swatch Telemetry Strip below the 3D turntable!
        if (this.renderer && this.renderer.lastPlayerFluidColors && this.vibeController) {
            const fc = this.renderer.lastPlayerFluidColors;
            const toCSS = (rgb) => this.vibeController.toCSS(rgb);
            const setSw = (id, rgb) => {
                const el = document.getElementById(id);
                if (el && rgb) el.style.backgroundColor = toCSS(rgb);
            };
            setSw('live-sw-primary',   fc.primary);
            setSw('live-sw-shift',     fc.shiftTarget);
            setSw('live-sw-secondary', fc.secondary);
            setSw('live-sw-livery1',   fc.livery1);
            setSw('live-sw-livery2',   fc.livery2);
            setSw('live-sw-frontrim',  fc.frontRim);
            setSw('live-sw-rearrim',   fc.rearRim);
            setSw('live-sw-cage',      fc.cage);
            setSw('live-sw-glow',      fc.glow);
        }
    }

    cycleCameraMode() {
        const modes = ['FOLLOW', 'HOOD', 'TOP_DOWN', 'ORBIT_CAR', 'TV_BROADCAST', 'JUMBOTRON_STAGE'];
        const currIdx = modes.indexOf(this.renderer.cameraMode);
        this.renderer.cameraMode = modes[(currIdx + 1) % modes.length];
        this.updateControlButtonStates();
        this.syncPauseModalQuickSettings();
    }

    updateControlButtonStates() {
        const elMode = document.getElementById('diag-active-mode');
        if (elMode) elMode.textContent = this.activeLabName;

        const elTrackTitle = document.getElementById('hud-track-title');
        if (elTrackTitle && this.trackSpline.activePreset) {
            elTrackTitle.textContent = this.trackSpline.activePreset.name;
        }

        const elZone = document.getElementById('hud-zone-name');
        if (elZone && this.trackSpline && this.playerCar) {
            const sample = this.trackSpline.getSampleAtNormalizedT(this.playerCar.splineT || 0);
            const zMeta = RRR.TRACK_ZONE_META && RRR.TRACK_ZONE_META[sample.zone];
            elZone.textContent = zMeta ? `SECTOR 0${sample.zone + 1} // ${zMeta.name}` : 'SECTOR 01 // EMERALD VIADUCT';
        }

        const btnCam = document.getElementById('btn-cam-cycle');
        if (btnCam) {
            const labels = {
                FOLLOW: '📷 CAM: CHASE (V)',
                HOOD: '📷 CAM: HOOD (V)',
                TOP_DOWN: '📷 CAM: TOP-DOWN (V)',
                ORBIT_CAR: '📷 CAM: 360° ORBIT (V)',
                TV_BROADCAST: '📷 CAM: TV ACTION (V)',
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
        // Attract Title Screen Buttons
        const btnAttractStart = document.getElementById('btn-attract-press-start');
        if (btnAttractStart) {
            btnAttractStart.addEventListener('click', () => this.exitAttractTitleMode('quick_race'));
        }
        const btnAttractGp = document.getElementById('btn-attract-gp');
        if (btnAttractGp) {
            btnAttractGp.addEventListener('click', () => this.exitAttractTitleMode('quick_race'));
        }
        const btnAttractGarage = document.getElementById('btn-attract-garage');
        if (btnAttractGarage) {
            btnAttractGarage.addEventListener('click', () => this.exitAttractTitleMode('garage'));
        }
        const btnAttractDj = document.getElementById('btn-attract-dj');
        if (btnAttractDj) {
            btnAttractDj.addEventListener('click', () => this.exitAttractTitleMode('dj_studio'));
        }
        const btnAttractMap = document.getElementById('btn-attract-map');
        if (btnAttractMap) {
            btnAttractMap.addEventListener('click', () => this.exitAttractTitleMode('world_map'));
        }

        // Dedicated In-Race Pause Modal Buttons
        const btnOpenPause = document.getElementById('btn-open-pause-modal');
        if (btnOpenPause) {
            btnOpenPause.addEventListener('click', () => this.togglePauseModal(true));
        }
        const btnPmResume = document.getElementById('btn-pm-resume');
        if (btnPmResume) {
            btnPmResume.addEventListener('click', () => this.togglePauseModal(false));
        }
        const btnPmRestart = document.getElementById('btn-pm-restart');
        if (btnPmRestart) {
            btnPmRestart.addEventListener('click', () => {
                this.togglePauseModal(false);
                if (this.raceState && this.raceState.isRaceMode) {
                    this.startOfficialRace();
                } else {
                    this.resetPlayerAndRivals();
                }
            });
        }
        const btnPmGarage = document.getElementById('btn-pm-garage');
        if (btnPmGarage) {
            btnPmGarage.addEventListener('click', () => {
                this.togglePauseModal(false);
                this.toggleDevMenu(true, true, 'garage');
            });
        }
        const btnPmSetup = document.getElementById('btn-pm-race-setup');
        if (btnPmSetup) {
            btnPmSetup.addEventListener('click', () => {
                this.togglePauseModal(false);
                this.toggleDevMenu(true, true, 'race');
            });
        }
        const btnPmDj = document.getElementById('btn-pm-dj-studio');
        if (btnPmDj) {
            btnPmDj.addEventListener('click', () => {
                this.togglePauseModal(false);
                this.toggleRekordboxPanel(true);
            });
        }
        const btnPmTitle = document.getElementById('btn-pm-title');
        if (btnPmTitle) {
            btnPmTitle.addEventListener('click', () => {
                this.togglePauseModal(false);
                this.enterAttractTitleMode();
            });
        }

        // Pause Modal Quick Settings
        const btnPmUnits = document.getElementById('btn-pm-units');
        if (btnPmUnits) {
            btnPmUnits.addEventListener('click', () => {
                this.speedUnits = this.speedUnits === 'KMH' ? 'MPH' : 'KMH';
                this.syncPauseModalQuickSettings();
            });
        }
        const btnPmTrans = document.getElementById('btn-pm-trans');
        if (btnPmTrans) {
            btnPmTrans.addEventListener('click', () => {
                const nextMode = RRR.PHYSICS_TUNING.transmissionMode === 'MT' ? 'AT' : 'MT';
                RRR.PHYSICS_TUNING.transmissionMode = nextMode;
                this.raceConfig.transmissionMode = nextMode;
                this.syncRaceSetupUI();
                this.syncPauseModalQuickSettings();
            });
        }
        const btnPmHud = document.getElementById('btn-pm-hud-mode');
        if (btnPmHud) {
            btnPmHud.addEventListener('click', () => {
                this.toggleStudioHudMode();
            });
        }
        const btnPmCam = document.getElementById('btn-pm-camera');
        if (btnPmCam) {
            btnPmCam.addEventListener('click', () => {
                this.cycleCameraMode();
            });
        }

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
            // Attract Title Screen: Space or Enter launches Quick Race, Escape opens Garage & Setup Hub
            if (this.mode === 'ATTRACT_TITLE') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    this.exitAttractTitleMode('quick_race');
                } else if (e.code === 'Escape' || e.code === 'KeyG') {
                    e.preventDefault();
                    this.exitAttractTitleMode('garage');
                } else if (e.code === 'KeyM') {
                    e.preventDefault();
                    this.exitAttractTitleMode('world_map');
                }
                return;
            }

            if (e.code === 'Escape') {
                if (this.mode === 'WORLD_MAP') {
                    this.toggleWorldMapModal(false);
                } else if (this.mode === 'PAUSED') {
                    this.togglePauseModal(false);
                } else if (this.mode === 'RACING') {
                    this.togglePauseModal(true);
                } else if (this.hasActiveSession) {
                    this.toggleDevMenu();
                }
                return;
            }

            if (e.code === 'Tab' && (this.mode === 'RACING' || this.mode === 'PAUSED')) {
                e.preventDefault();
                this.toggleStudioHudMode();
                return;
            }

            // Do not process driving inputs or in-race hotkeys while in menus/pause or before a session is loaded
            if (!this.hasActiveSession || this.mode !== 'RACING') return;

            if (this.audioEngine) {
                this.audioEngine.init();
                const badge = document.getElementById('audio-status-btn');
                if (badge) badge.textContent = this.audioEngine.isMuted ? '🔇 AUDIO MUTED' : '🔊 138 BPM AUDIO';
            }

            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            // When the AI DJ RLHF Trainer Studio is open, route 1-5, R, N, and Space to Trainer actions
            if (this.isDJTrainerOpen() && (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
                const rb = this.audioEngine && this.audioEngine.rekordbox;
                if (e.code >= 'Digit1' && e.code <= 'Digit5') {
                    e.preventDefault();
                    const stars = parseInt(e.code.replace('Digit', ''), 10);
                    this.submitTrainerRatingFromUI(stars);
                    return;
                } else if (e.code === 'KeyR') {
                    e.preventDefault();
                    if (rb && rb.trainer) rb.trainer.replayCurrentSnippet();
                    return;
                } else if (e.code === 'KeyN' || (e.code === 'Space' && this.playerCar.speed < 2.0)) {
                    e.preventDefault();
                    if (rb && rb.trainer) rb.trainer.auditionTransitionSnippet();
                    return;
                }
            }

            this.keys[e.code] = true;
            if (e.key) this.keys[e.key.toLowerCase()] = true;

            if (e.code === 'KeyE') {
                // Sequential Manual Shift Up (or auto-switch to MT if pressed)
                if (RRR.PHYSICS_TUNING.transmissionMode !== 'MT') {
                    RRR.PHYSICS_TUNING.transmissionMode = 'MT';
                    this.raceConfig.transmissionMode = 'MT';
                    this.showStyleCallout('⚙️ MT 6-SPEED SEQUENTIAL ENGAGED [Q / E]', 1.8);
                }
                const oldGear = this.playerCar.gear;
                const oldRpm = this.playerCar.rpm;
                if (this.playerCar.shiftUpManual() !== oldGear) {
                    if (oldRpm >= 7400 && oldRpm <= 8900) {
                        this.showStyleCallout(`⚡ PERFECT REDLINE SHIFT // GEAR ${this.playerCar.gear}!`, 1.4);
                    }
                    this.triggerBeatHaptics(0.35);
                }
            } else if (e.code === 'KeyQ') {
                // Sequential Manual Shift Down
                if (RRR.PHYSICS_TUNING.transmissionMode !== 'MT') {
                    RRR.PHYSICS_TUNING.transmissionMode = 'MT';
                    this.raceConfig.transmissionMode = 'MT';
                    this.showStyleCallout('⚙️ MT 6-SPEED SEQUENTIAL ENGAGED [Q / E]', 1.8);
                }
                if (this.playerCar.shiftDownManual()) {
                    this.triggerBeatHaptics(0.3);
                }
            } else if (e.code === 'KeyR') {
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
            } else if (e.code === 'KeyT') {
                this.toggleDJTrainerPanel();
            } else if (e.code === 'KeyG') {
                this.toggleDevMenu(true, true, 'garage');
            } else if (e.code === 'KeyM') {
                this.toggleWorldMapModal();
            } else if (e.code >= 'Digit1' && e.code <= 'Digit8') {
                const keys = [
                    'harigaya_flame_night',
                    'pink_style_d1gp',
                    'wild_horses_cobalt',
                    'gravel_raver_camo',
                    'cyber_flamingo',
                    'pacific_sunset',
                    'acid_warehouse',
                    'midnight_shibuya'
                ];
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

        const btnToggleStudioHud = document.getElementById('btn-toggle-studio-hud');
        if (btnToggleStudioHud) {
            btnToggleStudioHud.addEventListener('click', () => {
                unlockAudio();
                this.toggleStudioHudMode();
            });
        }

        const gearBoxEl = document.getElementById('hud-gear-box');
        if (gearBoxEl) {
            gearBoxEl.addEventListener('click', () => {
                unlockAudio();
                const nextMode = RRR.PHYSICS_TUNING.transmissionMode === 'MT' ? 'AT' : 'MT';
                RRR.PHYSICS_TUNING.transmissionMode = nextMode;
                this.raceConfig.transmissionMode = nextMode;
                this.syncRaceSetupUI();
                this.syncPauseModalQuickSettings();
                this.showStyleCallout(nextMode === 'MT' ? '⚙️ MT 6-SPEED SEQUENTIAL [Q / E]' : '⚙️ AT AUTOMATIC GEARBOX', 1.7);
            });
        }

        const speedUnitEl = document.getElementById('hud-speed-unit');
        if (speedUnitEl) {
            speedUnitEl.style.cursor = 'pointer';
            speedUnitEl.title = 'Click to toggle KM/H vs MPH';
            speedUnitEl.addEventListener('click', () => {
                this.speedUnits = this.speedUnits === 'KMH' ? 'MPH' : 'KMH';
                this.syncPauseModalQuickSettings();
            });
        }

        const btnOpenDev = document.getElementById('btn-open-dev-menu');
        if (btnOpenDev) btnOpenDev.addEventListener('click', () => this.toggleDevMenu());

        const btnHudStartRace = document.getElementById('btn-hud-start-race');
        if (btnHudStartRace) {
            btnHudStartRace.addEventListener('click', () => {
                unlockAudio();
                const currentTrack = this.trackSpline && this.trackSpline.activePresetKey
                    ? this.trackSpline.activePresetKey
                    : this.raceConfig.trackPresetKey;
                this.startOfficialRace({
                    trackPresetKey: currentTrack,
                    totalLaps: this.raceConfig.totalLaps || 3,
                    aiDifficulty: this.raceConfig.aiDifficulty || 'PRO'
                });
            });
        }

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
        bindShaderSlider('slider-jsr-dither', 'jsrPixelDither', 'val-jsr-dither');
        bindShaderSlider('slider-facet-ink', 'facetCreaseInk', 'val-facet-ink');
        bindShaderSlider('slider-speedlines', 'speedLinesIntensity', 'val-speedlines');
        bindShaderSlider('slider-taillight-trails', 'taillightTrailsIntensity', 'val-taillight-trails');
        bindShaderSlider('slider-drift-swing', 'cameraDriftSwing', 'val-drift-swing');

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

        const btnWfMode = document.getElementById('btn-rb-wf-mode');
        if (btnWfMode) {
            btnWfMode.addEventListener('click', () => {
                unlockAudio();
                rb.waveformColorMode = rb.waveformColorMode === '3BAND' ? 'RGB' : '3BAND';
                btnWfMode.textContent = rb.waveformColorMode === '3BAND' ? '🌊 WF: 3-BAND' : '🌈 WF: RGB';
                btnWfMode.classList.toggle('active', rb.waveformColorMode === '3BAND');
            });
        }

        const selAiStyle = document.getElementById('select-rb-ai-style');
        if (selAiStyle) {
            selAiStyle.addEventListener('change', () => {
                unlockAudio();
                rb.aiStyleMode = selAiStyle.value;
            });
        }

        const selTransLen = document.getElementById('select-rb-trans-length');
        if (selTransLen) {
            selTransLen.addEventListener('change', () => {
                unlockAudio();
                rb.transitionLengthMode = selTransLen.value;
            });
        }

        const btnCoachToggle = document.getElementById('btn-rb-coach-toggle');
        if (btnCoachToggle) {
            btnCoachToggle.addEventListener('click', () => {
                rb.djCoachEnabled = !rb.djCoachEnabled;
                btnCoachToggle.textContent = rb.djCoachEnabled ? '🎓 DJ COACH: ON' : '🎓 DJ COACH: OFF';
                btnCoachToggle.classList.toggle('active', rb.djCoachEnabled);
                const banner = document.getElementById('rb-coach-banner');
                if (banner) banner.classList.toggle('hidden', !rb.djCoachEnabled);
            });
        }

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
                this.djController.triggerReaction('DROP_HYPE', `CAMELOT ${rb.aiTransitionState.style || 'BASS-SWAP'} // D1 ↔ D2`, 3.0);
            });
        }

        const btnXfadeCurve = document.getElementById('btn-rb-xfade-curve');
        if (btnXfadeCurve) {
            btnXfadeCurve.addEventListener('click', () => {
                unlockAudio();
                rb.crossfaderCurve = rb.crossfaderCurve === 'SMOOTH' ? 'CUT' : 'SMOOTH';
                btnXfadeCurve.textContent = `CURVE: ${rb.crossfaderCurve}`;
                btnXfadeCurve.classList.toggle('active', rb.crossfaderCurve === 'CUT');
            });
        }

        const btnCueNext = document.getElementById('btn-rb-cue-next');
        if (btnCueNext) {
            btnCueNext.addEventListener('click', () => {
                unlockAudio();
                const standbyId = rb.crossfader <= 0 ? 2 : 1;
                rb.cueNextCamelotTrackToDeck(standbyId);
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

        // Deck 1 & Deck 2 Transport / Sync / Master / Backspin / Beat FX / Export Buttons
        const bindDeckTransport = (deckId, prefix) => {
            const btnPlay = document.getElementById(`${prefix}-play`);
            if (btnPlay) {
                btnPlay.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    const other = rb.getDeck(deckId === 1 ? 2 : 1);
                    if (d) d.togglePlay(other);
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
            const btnKeySync = document.getElementById(`${prefix}-keysync`);
            if (btnKeySync) {
                btnKeySync.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    const other = rb.getDeck(deckId === 1 ? 2 : 1);
                    if (d) {
                        const on = d.toggleKeySync(other);
                        btnKeySync.classList.toggle('active', on);
                        const shift = d.keyShiftSemitones || 0;
                        btnKeySync.textContent = on ? `🎹 ${shift >= 0 ? '+' : ''}${shift}st` : '🎹 KEY';
                        this.renderRekordboxCrateUI();
                    }
                });
            }
            const btnSlip = document.getElementById(`${prefix}-slip`);
            if (btnSlip) {
                btnSlip.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) {
                        const on = d.toggleSlipMode();
                        btnSlip.classList.toggle('active', on);
                    }
                });
            }
            const btnActiveLoop = document.getElementById(`${prefix}-activeloop`);
            if (btnActiveLoop) {
                btnActiveLoop.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) {
                        const on = d.toggleActiveLoop();
                        btnActiveLoop.classList.toggle('active', on);
                    }
                });
            }
            const btnBackspin = document.getElementById(`${prefix}-backspin`);
            if (btnBackspin) {
                btnBackspin.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) {
                        d.triggerBackspin();
                        this.djController.triggerReaction('OVERTAKE_SMIRK', `CDJ-3000 VINYL BACKSPIN // DECK ${deckId}`, 2.0);
                    }
                });
            }
            const btnExport = document.getElementById(`${prefix}-export`);
            if (btnExport) {
                btnExport.addEventListener('click', () => {
                    unlockAudio();
                    rb.exportAnalysisJson(deckId);
                });
            }
            const selCfx = document.getElementById(`select-d${deckId}-cfx`);
            if (selCfx) {
                selCfx.addEventListener('change', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (d) d.colorFxMode = selCfx.value;
                });
            }
            const btnBeatFx = document.getElementById(`${prefix}-beatfx`);
            if (btnBeatFx) {
                const fxCycle = ['OFF', 'ECHO', 'TRANS', 'FLANGER'];
                btnBeatFx.addEventListener('click', () => {
                    unlockAudio();
                    const d = rb.getDeck(deckId);
                    if (!d) return;
                    const curr = d.beatFxActive ? d.beatFxMode : 'OFF';
                    const next = fxCycle[(fxCycle.indexOf(curr) + 1) % fxCycle.length];
                    if (next === 'OFF') {
                        d.beatFxActive = false;
                        btnBeatFx.textContent = 'FX: OFF';
                        btnBeatFx.classList.remove('active');
                    } else {
                        d.beatFxActive = true;
                        d.beatFxMode = next;
                        btnBeatFx.textContent = `FX: ${next}`;
                        btnBeatFx.classList.add('active');
                    }
                });
            }
        };
        bindDeckTransport(1, 'btn-d1');
        bindDeckTransport(2, 'btn-d2');

        // 3-Stem Track Separation Pads (DRUMS / VOCAL / INST)
        document.querySelectorAll('.rb-stem-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const stemKey = btn.getAttribute('data-stem');
                const d = rb.getDeck(deckId);
                if (d) {
                    const isOn = d.toggleStem(stemKey);
                    btn.classList.toggle('active', isOn);
                }
            });
        });

        // 8 Hot Cue Pads A..H
        document.querySelectorAll('.rb-cue-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const cueIdx = parseInt(btn.getAttribute('data-cue'), 10);
                const d = rb.getDeck(deckId);
                const other = rb.getDeck(deckId === 1 ? 2 : 1);
                if (d) d.jumpToHotCue(cueIdx, other);
            });
        });

        // Beat-Loop Pads (4B, EXIT)
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

        // Loop Halve (1/2x) & Double (2x) Pads
        document.querySelectorAll('.rb-loop-scale-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const scale = parseFloat(btn.getAttribute('data-scale'));
                const d = rb.getDeck(deckId);
                if (!d) return;
                if (!d.loopActive) d.setBeatLoop(4, true);
                else if (scale < 1) d.halveLoop();
                else d.doubleLoop();
            });
        });

        // Quantized Beat Jump Pads (-4 / +4 Beats)
        document.querySelectorAll('.rb-jump-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const delta = parseFloat(btn.getAttribute('data-jump'));
                const d = rb.getDeck(deckId);
                const other = rb.getDeck(deckId === 1 ? 2 : 1);
                if (d) d.beatJump(delta, other);
            });
        });

        // Isolator EQ Kill Buttons (LOW / MID / HI)
        document.querySelectorAll('.rb-kill-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                unlockAudio();
                const deckId = parseInt(btn.getAttribute('data-deck'), 10);
                const band = btn.getAttribute('data-kill');
                const d = rb.getDeck(deckId);
                if (d) {
                    const killed = d.toggleEqKill(band);
                    btn.classList.toggle('killed', killed);
                }
            });
        });

        // Deck TRIM, EQ, Sound Color Filter & Channel Upfader Sliders
        const bindDeckEq = (deckId, prefix) => {
            const trimEl = document.getElementById(`${prefix}-trim`);
            if (trimEl) {
                trimEl.addEventListener('input', () => {
                    const d = rb.getDeck(deckId);
                    if (d) d.trimDb = parseFloat(trimEl.value);
                });
            }
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
            const volEl = document.getElementById(`${prefix}-vol`);
            if (volEl) {
                volEl.addEventListener('input', () => {
                    const d = rb.getDeck(deckId);
                    if (d) d.volumeFader = parseFloat(volEl.value);
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

        // Crate Search, Sort & Harmonic Filter Controls
        const searchIn = document.getElementById('input-rb-crate-search');
        if (searchIn) {
            searchIn.addEventListener('input', () => {
                rb.crateSearchQuery = searchIn.value.trim().toLowerCase();
                this.renderRekordboxCrateUI();
            });
        }
        const sortSel = document.getElementById('select-rb-crate-sort');
        if (sortSel) {
            sortSel.addEventListener('change', () => {
                rb.crateSortMode = sortSel.value;
                this.renderRekordboxCrateUI();
            });
        }
        const btnHarmFilter = document.getElementById('btn-rb-crate-harm-filter');
        if (btnHarmFilter) {
            btnHarmFilter.addEventListener('click', () => {
                rb.crateHarmonicFilterOnly = !rb.crateHarmonicFilterOnly;
                btnHarmFilter.classList.toggle('active', rb.crateHarmonicFilterOnly);
                this.renderRekordboxCrateUI();
            });
        }

        rb.onStateChange = () => {
            this.renderRekordboxCrateUI();
            this.renderDJTrainerUI();
        };
        if (rb.trainer) {
            rb.trainer.onUpdateUI = (lastEntry) => {
                this.renderDJTrainerUI(lastEntry);
                this.renderRekordboxCrateUI();
            };
        }
        this.bindDJTrainerEvents(unlockAudio);
        this.renderRekordboxCrateUI();
        this.renderDJTrainerUI();
    }

    isDJTrainerOpen() {
        const rbPanel = document.getElementById('rekordbox-studio-panel');
        const trPanel = document.getElementById('rb-rlhf-trainer-panel');
        return !!(rbPanel && !rbPanel.classList.contains('hidden') && trPanel && !trPanel.classList.contains('hidden'));
    }

    toggleDJTrainerPanel(forceShow) {
        const trPanel = document.getElementById('rb-rlhf-trainer-panel');
        if (!trPanel) return;
        const rbPanel = document.getElementById('rekordbox-studio-panel');
        const currentlyShown = rbPanel && !rbPanel.classList.contains('hidden') && !trPanel.classList.contains('hidden');
        const show = forceShow !== undefined ? forceShow : !currentlyShown;

        if (show) {
            this.toggleRekordboxPanel(true);
        }
        trPanel.classList.toggle('hidden', !show);

        const btnTop = document.getElementById('btn-top-dj-trainer');
        if (btnTop) btnTop.classList.toggle('active', show);
        const btnRb = document.getElementById('btn-rb-trainer-toggle');
        if (btnRb) btnRb.classList.toggle('active', show);

        const rb = this.audioEngine && this.audioEngine.rekordbox;
        if (rb && rb.trainer) {
            rb.trainer.auditionState.active = show;
            if (show) {
                this.renderDJTrainerUI();
            }
        }
    }

    bindDJTrainerEvents(unlockAudio) {
        const rb = this.audioEngine && this.audioEngine.rekordbox;
        if (!rb || !rb.trainer) return;
        const trainer = rb.trainer;

        const btnTopTrainer = document.getElementById('btn-top-dj-trainer');
        if (btnTopTrainer) {
            btnTopTrainer.addEventListener('click', () => {
                unlockAudio();
                const opening = !this.isDJTrainerOpen();
                this.toggleDJTrainerPanel(opening);
                if (opening && !rb.aiTransitionState.active) {
                    trainer.auditionTransitionSnippet();
                }
            });
        }

        const btnRbTrainer = document.getElementById('btn-rb-trainer-toggle');
        if (btnRbTrainer) {
            btnRbTrainer.addEventListener('click', () => {
                unlockAudio();
                const opening = !this.isDJTrainerOpen();
                this.toggleDJTrainerPanel(opening);
                if (opening && !rb.aiTransitionState.active) {
                    trainer.auditionTransitionSnippet();
                }
            });
        }

        // Populate Diagnostic Feedback Tag Buttons
        const tagsGrid = document.getElementById('rlhf-tags-grid');
        if (tagsGrid && RRR.DJTransitionTrainer && RRR.DJTransitionTrainer.FEEDBACK_TAGS) {
            tagsGrid.innerHTML = '';
            RRR.DJTransitionTrainer.FEEDBACK_TAGS.forEach((tag) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `rlhf-tag-btn ${tag.sentiment > 0 ? 'tag-pos' : 'tag-neg'}`;
                btn.setAttribute('data-rlhf-tag', tag.id);
                btn.title = tag.desc;
                btn.textContent = tag.label;
                btn.addEventListener('click', () => {
                    trainer.toggleTag(tag.id);
                    btn.classList.toggle('active', trainer.selectedTags.has(tag.id));
                });
                tagsGrid.appendChild(btn);
            });
        }

        // Queue Selection Mode
        const selQueue = document.getElementById('select-rlhf-queue-mode');
        if (selQueue) {
            selQueue.addEventListener('change', () => {
                trainer.auditionState.queueMode = selQueue.value;
            });
        }

        // Next 15s Snippet Button
        const btnNext = document.getElementById('btn-rlhf-next-pair');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                unlockAudio();
                trainer.auditionTransitionSnippet();
            });
        }

        // Replay Current Snippet Button
        const btnReplay = document.getElementById('btn-rlhf-replay');
        if (btnReplay) {
            btnReplay.addEventListener('click', () => {
                unlockAudio();
                trainer.replayCurrentSnippet();
            });
        }

        // Jump Immediately to Bass-Swap & Drop (2 bars before drop)
        const btnJumpSwap = document.getElementById('btn-rlhf-jump-swap');
        if (btnJumpSwap) {
            btnJumpSwap.addEventListener('click', () => {
                unlockAudio();
                const st = trainer.auditionState;
                if (!st.outgoingTrackId || !st.incomingTrackId) {
                    trainer.auditionTransitionSnippet({ preRollSec: 3.2 });
                } else {
                    trainer.auditionTransitionSnippet({
                        outId: st.outgoingTrackId,
                        inId: st.incomingTrackId,
                        style: st.selectedStyle,
                        bars: st.selectedBars,
                        preRollSec: 3.2
                    });
                }
            });
        }

        // Auto-Advance Checkbox
        const chkAuto = document.getElementById('chk-rlhf-auto-next');
        if (chkAuto) {
            chkAuto.addEventListener('change', () => {
                trainer.auditionState.autoAdvanceOnRate = chkAuto.checked;
            });
        }

        // Style Switcher Pills (re-auditions current pair with new style immediately)
        document.querySelectorAll('[data-rlhf-style]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const style = btn.getAttribute('data-rlhf-style');
                trainer.auditionState.selectedStyle = style;
                const st = trainer.auditionState;
                if (st.outgoingTrackId && st.incomingTrackId) {
                    trainer.auditionTransitionSnippet({
                        outId: st.outgoingTrackId,
                        inId: st.incomingTrackId,
                        style: style,
                        bars: st.selectedBars
                    });
                } else {
                    this.renderDJTrainerUI();
                }
            });
        });

        // Bar-Length Switcher Pills (re-auditions current pair with new phrase length)
        document.querySelectorAll('[data-rlhf-bars]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const bars = parseInt(btn.getAttribute('data-rlhf-bars'), 10) || 8;
                trainer.auditionState.selectedBars = bars;
                const st = trainer.auditionState;
                if (st.outgoingTrackId && st.incomingTrackId) {
                    trainer.auditionTransitionSnippet({
                        outId: st.outgoingTrackId,
                        inId: st.incomingTrackId,
                        style: st.selectedStyle,
                        bars: bars
                    });
                } else {
                    this.renderDJTrainerUI();
                }
            });
        });

        // 1-Click Ground-Truth Cue Fixers (Outgoing Mix-Out & Incoming Main Drop)
        document.querySelectorAll('[data-nudge-out]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const delta = parseInt(btn.getAttribute('data-nudge-out'), 10);
                if (delta === 0) {
                    const outItem = rb.crate.find((c) => c.id === trainer.auditionState.outgoingTrackId) || rb.getDeck(1);
                    if (outItem && outItem.analysis) {
                        const ov = trainer.getTrackOverride(outItem.analysis.title);
                        trainer.nudgeTrackCueBars('OUT_MIX', -ov.mixOutOffsetBars);
                    }
                } else {
                    trainer.nudgeTrackCueBars('OUT_MIX', delta);
                }
            });
        });

        document.querySelectorAll('[data-nudge-in]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const delta = parseInt(btn.getAttribute('data-nudge-in'), 10);
                if (delta === 0) {
                    const inItem = rb.crate.find((c) => c.id === trainer.auditionState.incomingTrackId) || rb.getDeck(2);
                    if (inItem && inItem.analysis) {
                        const ov = trainer.getTrackOverride(inItem.analysis.title);
                        trainer.nudgeTrackCueBars('IN_DROP', -ov.dropOffsetBars);
                    }
                } else {
                    trainer.nudgeTrackCueBars('IN_DROP', delta);
                }
            });
        });

        // 1-5 Star Rating Buttons
        document.querySelectorAll('[data-rlhf-rate]').forEach((btn) => {
            btn.addEventListener('click', () => {
                unlockAudio();
                const stars = parseInt(btn.getAttribute('data-rlhf-rate'), 10);
                this.submitTrainerRatingFromUI(stars);
            });
        });

        // Export / Import / Reset Model Profile
        const btnExport = document.getElementById('btn-rlhf-export');
        if (btnExport) {
            btnExport.addEventListener('click', () => trainer.exportProfileJSON());
        }
        const inImport = document.getElementById('input-rlhf-import');
        if (inImport) {
            inImport.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    trainer.importProfileJSON(e.target.files[0]);
                }
            });
        }
        const btnReset = document.getElementById('btn-rlhf-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                trainer.resetModelToDefaults();
                const toast = document.getElementById('rlhf-feedback-toast');
                if (toast) {
                    toast.innerHTML = `🔄 <strong>MODEL RESET:</strong> Restored default Camelot &amp; club mixing priors.`;
                }
            });
        }
    }

    submitTrainerRatingFromUI(stars) {
        const rb = this.audioEngine && this.audioEngine.rekordbox;
        if (!rb || !rb.trainer) return;
        const trainer = rb.trainer;

        const entry = trainer.submitHumanRating(stars);
        if (!entry) return;

        // Show rich feedback summary in the toast
        const toast = document.getElementById('rlhf-feedback-toast');
        if (toast) {
            const errSign = entry.error >= 0 ? '+' : '';
            const badge = stars >= 4 ? '🏆 GOLD PAIR LEARNED' : (stars <= 2 ? '⛔ PAIR VETOED' : '⚖️ WEIGHTS UPDATED');
            const tagsStr = entry.tags && entry.tags.length > 0 ? ` • TAGS: [${entry.tags.join(', ')}]` : '';
            toast.innerHTML = `<strong style="color:${stars >= 4 ? '#ffe600' : (stars <= 2 ? '#ff4d79' : '#00f5d4')}">${badge} (${stars}★ vs AI ${entry.predictedStars}★, Δ=${errSign}${entry.error}):</strong> Updated θ weights for <em>${entry.outgoingTitle} → ${entry.incomingTitle}</em> [${entry.style} / ${entry.bars}B]${tagsStr}.`;
        }

        if (this.djController) {
            const msg = stars >= 4
                ? `RLHF ${stars}★ GOLD // AI DJ WEIGHTS REINFORCED!`
                : (stars <= 2 ? `RLHF ${stars}★ VETO // PENALIZED BAD TRANSITION!` : `RLHF ${stars}★ LOGGED // POLICY UPDATED`);
            this.djController.triggerReaction(stars >= 4 ? 'DROP_HYPE' : 'OVERTAKE_SMIRK', msg, 2.5);
        }

        // Auto-advance to next snippet if enabled
        if (trainer.auditionState.autoAdvanceOnRate) {
            setTimeout(() => {
                if (this.isDJTrainerOpen()) {
                    trainer.auditionTransitionSnippet();
                }
            }, 320);
        }
    }

    renderDJTrainerUI(lastEntry = null) {
        const rb = this.audioEngine && this.audioEngine.rekordbox;
        if (!rb || !rb.trainer) return;
        const trainer = rb.trainer;
        const st = trainer.auditionState;
        const summary = trainer.getModelSummary();

        // 1. Top Stats Strip
        const statsEl = document.getElementById('rlhf-stats-strip');
        if (statsEl) {
            const avgStr = summary.totalRatings > 0 ? `${summary.avgStars.toFixed(2)}★` : '--★';
            statsEl.textContent = `${summary.totalRatings} RATED • AVG ${avgStr} • ${summary.goldPairs}🏆 GOLD • ${summary.vetoedPairs}⛔ VETO • ${summary.cueFixes}🎯 CUE FIXES`;
        }

        // 2. Active Pair Info & AI Predicted Stars
        const outItem = rb.crate.find((c) => c.id === st.outgoingTrackId) || rb.crate.find((c) => c.id === rb.deckCrateIds[1]);
        const inItem = rb.crate.find((c) => c.id === st.incomingTrackId) || rb.crate.find((c) => c.id === rb.deckCrateIds[2]);
        const outA = outItem?.analysis || rb.deck1?.analysis;
        const inA = inItem?.analysis || rb.deck2?.analysis;

        const predEl = document.getElementById('rlhf-pred-badge');
        const pairEl = document.getElementById('rlhf-pair-info');
        if (outA && inA) {
            const activeStyle = st.selectedStyle || rb.aiTransitionState.style || 'BASS_SWAP';
            const activeBars = st.selectedBars || rb.aiTransitionState.durationBars || 8;
            const pred = trainer.predictTransitionQuality(outA, inA, activeStyle, activeBars);
            if (predEl) {
                predEl.textContent = `AI PRED: ${pred.predictedStars.toFixed(1)}★ (${pred.bonusPoints >= 0 ? '+' : ''}${pred.bonusPoints.toFixed(0)} PT)`;
                predEl.style.borderColor = pred.predictedStars >= 4.0 ? '#ffe600' : (pred.predictedStars <= 2.3 ? '#ff1e56' : '#00f5d4');
                predEl.style.color = pred.predictedStars >= 4.0 ? '#ffe600' : (pred.predictedStars <= 2.3 ? '#ff85a2' : '#00f5d4');
            }
            if (pairEl) {
                const harm = RRR.CamelotWheel.getHarmonicRelation(outA.key, inA.key);
                const pairMem = trainer.getPairRecord(outA.title, inA.title);
                const memBadge = pairMem
                    ? ` <span class="rb-human-badge ${pairMem.avgStars >= 3.5 ? 'gold' : 'veto'}">HUMAN: ${pairMem.avgStars.toFixed(1)}★ (${pairMem.count}×)</span>`
                    : '';
                pairEl.innerHTML = `
                    <div><span style="color:#00f5d4;font-weight:800;">OUT [D1]:</span> <strong>${outA.title}</strong> (${outA.bpm.toFixed(1)} BPM • ${outA.key} • E${outA.energyRating || 7}★)</div>
                    <div><span style="color:#ff1e6b;font-weight:800;">IN [D2]:</span> <strong>${inA.title}</strong> (${inA.bpm.toFixed(1)} BPM • ${inA.key} • E${inA.energyRating || 7}★)</div>
                    <div style="color:#b8b0dc;margin-top:2px;">HARMONIC: <strong style="color:${harm.isHarmonic ? '#8ac926' : '#ff9f1c'}">${harm.badge}</strong> • ΔBPM: <strong>${Math.abs(outA.bpm - inA.bpm).toFixed(1)}</strong>${memBadge}</div>
                `;
            }

            // Update Cue Offset Labels
            const outOv = trainer.getTrackOverride(outA.title);
            const inOv = trainer.getTrackOverride(inA.title);
            const outLbl = document.getElementById('rlhf-out-offset-lbl');
            const inLbl = document.getElementById('rlhf-in-offset-lbl');
            if (outLbl) outLbl.textContent = `(${outOv.mixOutOffsetBars >= 0 ? '+' : ''}${outOv.mixOutOffsetBars}B)`;
            if (inLbl) inLbl.textContent = `(${inOv.dropOffsetBars >= 0 ? '+' : ''}${inOv.dropOffsetBars}B)`;
        }

        // 3. Highlight Selected Style & Bar-Length Pills
        const curStyle = st.selectedStyle || rb.aiTransitionState.style || 'BASS_SWAP';
        const curBars = Number(st.selectedBars || rb.aiTransitionState.durationBars || 8);
        document.querySelectorAll('[data-rlhf-style]').forEach((btn) => {
            btn.classList.toggle('active', btn.getAttribute('data-rlhf-style') === curStyle);
        });
        document.querySelectorAll('[data-rlhf-bars]').forEach((btn) => {
            btn.classList.toggle('active', parseInt(btn.getAttribute('data-rlhf-bars'), 10) === curBars);
        });

        // 4. Highlight Selected Diagnostic Tags
        document.querySelectorAll('[data-rlhf-tag]').forEach((btn) => {
            const tagId = btn.getAttribute('data-rlhf-tag');
            btn.classList.toggle('active', trainer.selectedTags.has(tagId));
        });

        // 5. Render Learned Feature Weights Bar List
        const weightsEl = document.getElementById('rlhf-weights-list');
        if (weightsEl) {
            weightsEl.innerHTML = '';
            // Show top 8 most shifted or highest-magnitude features so the user sees live learning
            const sortedFeatures = summary.featureList.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || Math.abs(b.weight) - Math.abs(a.weight));
            sortedFeatures.slice(0, 8).forEach((f) => {
                const row = document.createElement('div');
                row.className = 'rlhf-weight-row';
                const pct = Math.min(100, Math.round((Math.abs(f.weight) / 35) * 100));
                const color = f.weight >= 0 ? '#00f5d4' : '#ff1e6b';
                const deltaStr = Math.abs(f.delta) >= 0.05 ? `${f.delta >= 0 ? '+' : ''}${f.delta.toFixed(1)}` : '0.0';
                row.title = `${f.desc} (Base Prior: ${f.prior >= 0 ? '+' : ''}${f.prior.toFixed(1)}, Learned Shift: ${deltaStr})`;
                row.innerHTML = `
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${f.label}</span>
                    <div class="rlhf-weight-bar-bg">
                        <div class="rlhf-weight-bar-fill" style="width:${pct}%;background:${color};"></div>
                    </div>
                    <span style="text-align:right;font-family:monospace;color:${Math.abs(f.delta) >= 0.1 ? '#ffe600' : '#9e96c4'};">${f.weight >= 0 ? '+' : ''}${f.weight.toFixed(1)}</span>
                `;
                weightsEl.appendChild(row);
            });
        }

        // 6. Render Recent Rating History
        const histEl = document.getElementById('rlhf-history-list');
        if (histEl) {
            histEl.innerHTML = '';
            const recent = (trainer.model.history || []).slice(0, 5);
            if (recent.length === 0) {
                histEl.innerHTML = `<div style="color:#777199;font-style:italic;">No transitions rated yet — rate mixes 1★–5★ to train DJ Kinetix!</div>`;
            } else {
                recent.forEach((h) => {
                    const div = document.createElement('div');
                    div.className = 'rlhf-hist-item';
                    div.style.borderLeftColor = h.stars >= 4 ? '#ffe600' : (h.stars <= 2 ? '#ff1e56' : '#00f5d4');
                    div.innerHTML = `
                        <span style="overflow:hidden;text-overflow:ellipsis;"><strong>${h.stars}★</strong> ${h.outgoingTitle} → ${h.incomingTitle}</span>
                        <span style="color:#9e96c4;margin-left:4px;">${h.style.replace('_', ' ')} (${h.bars}B)</span>
                    `;
                    histEl.appendChild(div);
                });
            }
        }
    }

    renderRekordboxCrateUI() {
        const rb = this.audioEngine.rekordbox;
        const listEl = document.getElementById('rb-crate-list');
        const countEl = document.getElementById('rb-crate-count');
        if (!rb || !listEl) return;

        const masterDeck = rb.getMasterDeck();
        const masterAnalysis = masterDeck?.analysis || rb.crate[0]?.analysis;
        const masterKey = masterDeck ? masterDeck.getEffectiveCamelot().code : (masterAnalysis?.camelot || masterAnalysis?.key || '8A');
        const d1Id = rb.deckCrateIds[1];
        const d2Id = rb.deckCrateIds[2];

        const query = (rb.crateSearchQuery || '').toLowerCase();
        const sortMode = rb.crateSortMode || 'HARMONIC';
        const harmOnly = !!rb.crateHarmonicFilterOnly;

        // Score & filter crate items
        const minPlayCount = typeof rb.getMinPlayCount === 'function' ? rb.getMinPlayCount() : 0;
        const rotCtx = typeof rb.getRotationContext === 'function' ? rb.getRotationContext() : null;
        let items = rb.crate
            .filter((item) => !!item.analysis)
            .map((item) => {
                const harm = RRR.CamelotWheel.getHarmonicRelation(masterKey, item.analysis.camelot || item.analysis.key);
                const matchScore = RRR.CamelotWheel.scoreCandidateTrack(
                    masterAnalysis,
                    item,
                    minPlayCount,
                    rb.lastRaceParams,
                    masterDeck ? masterDeck.masterTempoEnabled : true,
                    rotCtx
                );
                return { item, harm, matchScore };
            });

        if (query) {
            items = items.filter(({ item }) => {
                const hay = `${item.title} ${item.artist || ''} ${item.analysis.key} ${item.analysis.bpm.toFixed(1)}`.toLowerCase();
                return hay.includes(query);
            });
        }
        if (harmOnly) {
            items = items.filter(({ harm }) => harm.isHarmonic);
        }

        if (sortMode === 'HARMONIC') {
            items.sort((a, b) => b.matchScore - a.matchScore);
        } else if (sortMode === 'ENERGY') {
            items.sort((a, b) => (b.item.analysis.energyRating || 5) - (a.item.analysis.energyRating || 5) || b.matchScore - a.matchScore);
        } else if (sortMode === 'BPM') {
            items.sort((a, b) => a.item.analysis.bpm - b.item.analysis.bpm);
        } else if (sortMode === 'KEY') {
            items.sort((a, b) => {
                const ca = RRR.CamelotWheel.parseCamelotCode(a.item.analysis.key) || { number: 99, letter: 'Z' };
                const cb = RRR.CamelotWheel.parseCamelotCode(b.item.analysis.key) || { number: 99, letter: 'Z' };
                return ca.number !== cb.number ? ca.number - cb.number : ca.letter.localeCompare(cb.letter);
            });
        } else if (sortMode === 'TITLE') {
            items.sort((a, b) => (a.item.title || '').localeCompare(b.item.title || ''));
        }

        if (countEl) {
            countEl.textContent = `${items.length} / ${rb.crate.length} TRACKS`;
        }

        listEl.innerHTML = '';
        items.forEach(({ item, harm }, idx) => {
            const analysis = item.analysis;
            const isD1 = item.id === d1Id;
            const isD2 = item.id === d2Id;

            const row = document.createElement('div');
            row.className = `rb-crate-row${isD1 ? ' active-d1' : ''}${isD2 ? ' active-d2' : ''}`;
            const statusTag = isD1 ? '<strong style="color:#00f5d4;">[D1]</strong> ' : (isD2 ? '<strong style="color:#ff1e6b;">[D2]</strong> ' : '');
            const vocalTag = analysis.hasVocalPhrases ? '<span title="Vocal Formant Activity Detected">🎤 </span>' : '';
            const artistPrefix = analysis.artist && analysis.artist !== 'RAVE RACER ARTIST' && !analysis.title.includes(analysis.artist)
                ? `<span style="color:#b8b2d8;">${analysis.artist} — </span>`
                : '';
            const trimDb = typeof analysis.autoTrimDb === 'number' ? analysis.autoTrimDb : 0.0;
            const trimStr = `${trimDb >= 0 ? '+' : ''}${trimDb.toFixed(1)}dB`;

            let humanBadgeHtml = '';
            if (rb.trainer && masterAnalysis) {
                const pairRec = rb.trainer.getPairRecord(masterAnalysis.title, analysis.title);
                if (pairRec && pairRec.count > 0) {
                    if (pairRec.avgStars >= 4.0) {
                        humanBadgeHtml += `<span class="rb-human-badge gold" title="Human RLHF Gold Pair with ${masterAnalysis.title} (${pairRec.avgStars.toFixed(1)}★)">🏆 ${pairRec.avgStars.toFixed(1)}★</span>`;
                    } else if (pairRec.avgStars <= 2.2) {
                        humanBadgeHtml += `<span class="rb-human-badge veto" title="Human RLHF Vetoed Pair with ${masterAnalysis.title} (${pairRec.avgStars.toFixed(1)}★)">⛔ ${pairRec.avgStars.toFixed(1)}★</span>`;
                    } else {
                        humanBadgeHtml += `<span class="rb-human-badge" style="border:1px solid #00f5d4;color:#00f5d4;" title="Human Rated ${pairRec.avgStars.toFixed(1)}★">${pairRec.avgStars.toFixed(1)}★</span>`;
                    }
                }
                const ov = rb.trainer.getTrackOverride(analysis.title);
                if (ov && (ov.mixOutOffsetBars || ov.dropOffsetBars)) {
                    humanBadgeHtml += `<span class="rb-human-badge gold" title="Human Cue Offset Saved (Out: ${ov.mixOutOffsetBars}B, Drop: ${ov.dropOffsetBars}B)">🎯 CUE</span>`;
                }
            }

            row.innerHTML = `
                <span style="color:#9e96c4;">${idx + 1}.</span>
                <span class="rb-crate-title" title="${analysis.artist ? analysis.artist + ' - ' : ''}${analysis.title} (Auto-Trim: ${trimStr})">${statusTag}${vocalTag}${artistPrefix}${analysis.title}${humanBadgeHtml}</span>
                <span><strong>${analysis.bpm.toFixed(1)}</strong> BPM</span>
                <span class="rb-key-pill" style="background:${analysis.camelot?.color || '#00f5d4'}">${analysis.key}</span>
                <span class="rb-energy-badge" title="Club Energy Rating (${analysis.energyRating || 7}/10) • Auto-Trim ${trimStr}">${analysis.energyRating || 7}★ <span style="color:#9e96c4;font-weight:600;">${trimStr}</span></span>
                <span class="rb-harm-badge" style="color:${harm.isHarmonic ? '#8ac926' : '#ff9f1c'}">${harm.badge}</span>
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
        if (this.playerBuild) {
            this.playerBuild.vibeKey = vibeKey;
        }
        this.updateLUTPreview();

        document.querySelectorAll('[data-vibe]').forEach((b) => {
            b.classList.toggle('active', b.getAttribute('data-vibe') === vibeKey);
        });
        const label = document.getElementById('active-vibe-name');
        if (label) label.textContent = RRR.VIBE_PALETTES[vibeKey].name;
        this.syncRaceSetupUI();
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
        if (this.raceState && this.raceState.isRaceMode && this.raceState.phase === 'RACING') {
            if (evt.attacker && evt.attacker.isPlayer) {
                this.raceState.stats.ramAttackCount++;
                if (evt.egoShattered) this.raceState.stats.egoShatterCount++;
            } else if (evt.victim && evt.victim.isPlayer) {
                this.raceState.stats.ramVictimCount++;
            }
        }
        if (evt.egoShattered) {
            this.showStyleCallout(`💥 EGO SHATTER // ${evt.victim.shortName} CRUSHED!! (+600 PTS)`, 2.5);
        } else if (evt.attacker && evt.attacker.isPlayer) {
            this.showStyleCallout(`🔥 SIDESWIPE SLAM // ${evt.victim.shortName} HIT! (+280 PTS)`, 2.0);
        } else if (evt.victim && evt.victim.isPlayer) {
            this.showStyleCallout(`⚠️ SLAMMED BY ${evt.attacker.shortName}!!`, 1.8);
        }
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

        const venues = [
            'venue_emerald_coast',
            'venue_wangan_port',
            'venue_hakone_canyon',
            'venue_odaiba_megaplex',
            'venue_boiler_tunnel',
            'venue_shibuya_skyway'
        ];
        if (!this.selectedWorldMapVenueId) {
            this.selectedWorldMapVenueId = 'venue_emerald_coast';
        }

        venues.forEach((vId) => {
            const node = RRR.WORLD_MAP_GRAPH.nodes[vId];
            const route = RRR.WORLD_MAP_GRAPH.solveRoute('home_base', vId);
            const landmarkNames = route.landmarks.map((l) => l.title).join(' → ');

            const card = document.createElement('div');
            card.className = `venue-card${this.selectedWorldMapVenueId === vId ? ' selected-venue' : ''}`;
            card.setAttribute('data-venue-id', vId);
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
            card.addEventListener('mouseenter', () => {
                this.selectWorldMapVenue(vId);
            });
            card.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('venue-launch-btn')) return;
                this.selectWorldMapVenue(vId);
            });
            card.querySelector('.venue-launch-btn').addEventListener('click', () => {
                this.selectWorldMapVenue(vId);
                this.startLandmarkDriveOver(node, route);
            });
            listEl.appendChild(card);
        });

        // Interactive click & hover on the 2D Tokyo Bayshore Highway Network Canvas
        if (this.worldMapCanvas && !this._worldMapCanvasBound) {
            this._worldMapCanvasBound = true;
            const getHoveredVenue = (e) => {
                const rect = this.worldMapCanvas.getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * this.worldMapCanvas.width;
                const my = ((e.clientY - rect.top) / Math.max(1, rect.height)) * this.worldMapCanvas.height;
                const padX = 56, padY = 34;
                const drawW = this.worldMapCanvas.width - padX * 2;
                const drawH = this.worldMapCanvas.height - padY * 2;
                let closestId = null;
                let bestDist = 26;
                for (const [nId, n] of Object.entries(RRR.WORLD_MAP_GRAPH.nodes)) {
                    const cx = (n.coords ? n.coords[0] * 0.01 : 0.5);
                    const cy = (n.coords ? n.coords[1] * 0.01 : 0.5);
                    const nx = padX + cx * drawW;
                    const ny = padY + cy * drawH;
                    const d = Math.hypot(mx - nx, my - ny);
                    if (d < bestDist && n.type === 'VENUE') {
                        bestDist = d;
                        closestId = nId;
                    }
                }
                return closestId;
            };
            this.worldMapCanvas.addEventListener('pointermove', (e) => {
                const vId = getHoveredVenue(e);
                this.worldMapCanvas.style.cursor = vId ? 'pointer' : 'default';
            });
            this.worldMapCanvas.addEventListener('click', (e) => {
                const vId = getHoveredVenue(e);
                if (vId) {
                    if (this.selectedWorldMapVenueId === vId) {
                        const node = RRR.WORLD_MAP_GRAPH.nodes[vId];
                        const route = RRR.WORLD_MAP_GRAPH.solveRoute('home_base', vId);
                        this.startLandmarkDriveOver(node, route);
                    } else {
                        this.selectWorldMapVenue(vId);
                    }
                }
            });
        }

        this.selectWorldMapVenue(this.selectedWorldMapVenueId);
    }

    selectWorldMapVenue(vId) {
        if (!RRR.WORLD_MAP_GRAPH.nodes[vId]) return;
        this.selectedWorldMapVenueId = vId;
        document.querySelectorAll('.venue-card[data-venue-id]').forEach((c) => {
            c.classList.toggle('selected-venue', c.getAttribute('data-venue-id') === vId);
        });
        const node = RRR.WORLD_MAP_GRAPH.nodes[vId];
        const route = RRR.WORLD_MAP_GRAPH.solveRoute('home_base', vId);
        const lmStr = route.landmarks.map((l) => l.title).join(' → ');
        const previewBar = document.getElementById('wm-route-preview-bar');
        if (previewBar && node) {
            previewBar.innerHTML = `ACTIVE DIJKSTRA ROUTE: <strong>HARIGAYA GARAGE → ${lmStr} → ${node.name} (${route.totalKm} KM)</strong> <span style="color:#b8b0dc;margin-left:6px;">[CLICK NODE AGAIN OR CARD TO DRIVE OVER]</span>`;
        }
        this.renderWorldMapNetwork(0.016);
    }

    renderWorldMapNetwork(dt = 0.016) {
        if (!this.worldMapCtx || !this.worldMapCanvas) return;
        const ctx = this.worldMapCtx;
        const w = this.worldMapCanvas.width;
        const h = this.worldMapCanvas.height;
        this.worldMapPulseTime = (this.worldMapPulseTime || 0) + dt;

        ctx.clearRect(0, 0, w, h);

        // 1. Cybernetic Tokyo Bay Blueprint Grid Background
        ctx.fillStyle = '#070414';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 245, 212, 0.07)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 36) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 36) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Stylized Bay Coastline Polygon
        ctx.fillStyle = 'rgba(12, 58, 98, 0.25)';
        ctx.beginPath();
        ctx.moveTo(w * 0.25, h);
        ctx.lineTo(w * 0.34, h * 0.58);
        ctx.lineTo(w * 0.62, h * 0.42);
        ctx.lineTo(w, h * 0.48);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        const padX = 56, padY = 34;
        const drawW = w - padX * 2;
        const drawH = h - padY * 2;
        const toXY = (node) => {
            const cx = node && node.coords ? node.coords[0] * 0.01 : 0.5;
            const cy = node && node.coords ? node.coords[1] * 0.01 : 0.5;
            return [padX + cx * drawW, padY + cy * drawH];
        };

        const graph = RRR.WORLD_MAP_GRAPH;
        const activeVenueId = this.selectedWorldMapVenueId || 'venue_emerald_coast';
        const activeRoute = graph.solveRoute('home_base', activeVenueId);
        const routeNodeIds = (activeRoute && activeRoute.nodes) ? activeRoute.nodes.map((n) => n.id) : [];
        const activePathSet = new Set();
        for (let i = 0; i < routeNodeIds.length - 1; i++) {
            const a = routeNodeIds[i];
            const b = routeNodeIds[i + 1];
            activePathSet.add(`${a}__${b}`);
            activePathSet.add(`${b}__${a}`);
        }

        // 2. Render Highway Edges
        for (const edge of graph.edges) {
            const nA = graph.nodes[edge.from];
            const nB = graph.nodes[edge.to];
            if (!nA || !nB) continue;
            const [x1, y1] = toXY(nA);
            const [x2, y2] = toXY(nB);
            const isRouteEdge = activePathSet.has(`${edge.from}__${edge.to}`);

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            if (isRouteEdge) {
                ctx.strokeStyle = '#00f5d4';
                ctx.lineWidth = 4.5;
                ctx.shadowColor = '#00f5d4';
                ctx.shadowBlur = 12;
                ctx.stroke();

                // Animated pulse packet along active highway edge
                const pulseT = (this.worldMapPulseTime * 0.85) % 1.0;
                const px = x1 + (x2 - x1) * pulseT;
                const py = y1 + (y2 - y1) * pulseT;
                ctx.fillStyle = '#ffe600';
                ctx.beginPath();
                ctx.arc(px, py, 4.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.strokeStyle = 'rgba(158, 148, 208, 0.32)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
            }
            ctx.restore();

            // Distance label at midpoint
            const mx = (x1 + x2) * 0.5;
            const my = (y1 + y2) * 0.5;
            ctx.fillStyle = isRouteEdge ? '#ffe600' : 'rgba(184, 176, 220, 0.6)';
            ctx.font = '700 9px "JetBrains Mono", monospace';
            ctx.fillText(`${edge.weight}KM`, mx + 4, my - 4);
        }

        // 3. Render Nodes (Home Base, Junctions, Rave Venues)
        for (const [nId, node] of Object.entries(graph.nodes)) {
            const [nx, ny] = toXY(node);
            const isSelected = nId === activeVenueId;
            const isInRoute = routeNodeIds.includes(nId);

            ctx.save();
            if (node.type === 'BASE') {
                ctx.fillStyle = '#1aff66';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(nx, ny, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (node.type === 'JUNCTION') {
                ctx.fillStyle = isInRoute ? '#00f5d4' : '#4a3f78';
                ctx.strokeStyle = isInRoute ? '#ffffff' : '#9e94d0';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.rect(nx - 5, ny - 5, 10, 10);
                ctx.fill();
                ctx.stroke();
            } else {
                // VENUE Node
                const r = isSelected ? 10 + Math.sin(this.worldMapPulseTime * 6) * 1.5 : 7.5;
                ctx.fillStyle = isSelected ? '#ffe600' : '#ff1e6b';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = isSelected ? 2.5 : 1.5;
                if (isSelected) {
                    ctx.shadowColor = '#ffe600';
                    ctx.shadowBlur = 14;
                }
                ctx.beginPath();
                ctx.arc(nx, ny, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();

            // Node Title Label
            ctx.font = node.type === 'VENUE' ? '800 10px "Chakra Petch", sans-serif' : '700 9px "Chakra Petch", sans-serif';
            ctx.fillStyle = isSelected ? '#ffe600' : (node.type === 'VENUE' ? '#ffffff' : (isInRoute ? '#00f5d4' : '#9e94d0'));
            const cy = node.coords ? node.coords[1] * 0.01 : 0.5;
            const labelOffsetY = cy < 0.35 ? 18 : -11;
            ctx.fillText(node.name, Math.max(8, Math.min(w - 145, nx - 28)), ny + labelOffsetY);
        }
    }

    toggleWorldMapModal(forceState) {
        const modal = document.getElementById('world-map-modal');
        if (!modal) return;
        const show = forceState !== undefined ? forceState : modal.classList.contains('hidden');
        modal.classList.toggle('hidden', !show);
        if (show) {
            this.keys = {};
            const titleEl = document.getElementById('arcade-title-overlay');
            if (titleEl) titleEl.classList.add('hidden');
            const pauseEl = document.getElementById('race-pause-modal');
            if (pauseEl) pauseEl.classList.add('hidden');
            this.mode = 'WORLD_MAP';
            this.renderWorldMapNetwork(0.016);
        } else if (this.hasActiveSession) {
            const hudEl = document.getElementById('hud-root');
            if (hudEl) hudEl.classList.remove('hidden');
            this.mode = 'RACING';
        } else {
            this.toggleDevMenu(true, true);
        }
    }

    startLandmarkDriveOver(venueNode, route) {
        const targetPreset = (venueNode && venueNode.trackPreset) || 'nagai_bayshore';
        this.ensureEngineInitialized(targetPreset);
        this.hasActiveSession = true;
        const btnResume = document.getElementById('btn-resume-from-menu');
        if (btnResume) btnResume.classList.remove('hidden');

        const hudEl = document.getElementById('hud-root');
        if (hudEl) hudEl.classList.remove('hidden');
        this.setStudioHudMode(false);

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

        const titleEl = this.getEl('landmark-title');
        const subEl = this.getEl('landmark-subtitle');
        const barEl = this.getEl('landmark-progress-fill');
        if (titleEl) titleEl.textContent = lm.title;
        if (subEl) subEl.textContent = `${lm.subtitle} // WARMING SHADERS ${Math.min(100, Math.round(st.progress * 100))}%`;
        if (barEl) barEl.style.width = `${Math.min(100, Math.round(st.progress * 100))}%`;

        if (this.landmarkCtx && this.landmarkCanvas) {
            const ctx = this.landmarkCtx;
            if (this.landmarkCanvas.width !== window.innerWidth || this.landmarkCanvas.height !== window.innerHeight) {
                this.landmarkCanvas.width = window.innerWidth;
                this.landmarkCanvas.height = window.innerHeight;
            }
            const w = this.landmarkCanvas.width;
            const h = this.landmarkCanvas.height;
            ctx.clearRect(0, 0, w, h);

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
            } else if (lm.type === 'CRANES') {
                for (let i = 0; i < 4; i++) {
                    const cx = (i * 420 + parallaxX + w) % (w + 420) - 120;
                    ctx.fillStyle = '#0d0822';
                    ctx.fillRect(cx - 26, h * 0.22, 16, h * 0.44);
                    ctx.fillRect(cx + 22, h * 0.22, 16, h * 0.44);
                    ctx.fillRect(cx - 75, h * 0.25, 220, 12);
                    ctx.fillStyle = '#ff9900';
                    ctx.fillRect(cx + 85, h * 0.26, 8, 70);
                    ctx.fillRect(cx + 68, h * 0.26 + 70, 42, 22);
                }
            } else if (lm.type === 'LASER_PYRAMID') {
                for (let i = 0; i < 3; i++) {
                    const px = (i * 520 + parallaxX + w) % (w + 520) - 140;
                    const baseY = h * 0.64;
                    ctx.strokeStyle = '#00f5d4';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(px - 110, baseY);
                    ctx.lineTo(px, h * 0.20);
                    ctx.lineTo(px + 110, baseY);
                    ctx.closePath();
                    ctx.stroke();
                    ctx.fillStyle = '#ff2a85';
                    ctx.fillRect(px - 3, 0, 6, h * 0.20);
                }
            } else if (lm.type === 'MEGASPHERE') {
                for (let i = 0; i < 3; i++) {
                    const sx = (i * 540 + parallaxX + w) % (w + 540) - 140;
                    ctx.fillStyle = '#0d0822';
                    ctx.fillRect(sx - 44, h * 0.28, 22, h * 0.36);
                    ctx.fillRect(sx + 22, h * 0.28, 22, h * 0.36);
                    ctx.fillStyle = '#00f5d4';
                    ctx.beginPath();
                    ctx.arc(sx, h * 0.36, 46, 0, Math.PI * 2);
                    ctx.fill();
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
            const targetPreset = (st.targetVenue && st.targetVenue.trackPreset) || 'nagai_bayshore';
            this.switchTrackPreset(targetPreset);
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
            this.updateControlButtonStates();
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

    pollGlobalGamepadButtons() {
        if (!navigator.getGamepads) return;
        const pads = navigator.getGamepads();
        let activePad = null;
        for (const pad of pads) {
            if (pad && pad.connected) {
                activePad = pad;
                break;
            }
        }
        const gpBadge = this.getEl('hud-gamepad-badge');
        if (gpBadge) {
            gpBadge.classList.toggle('gp-connected', !!activePad);
            gpBadge.textContent = activePad ? '🎮 PAD LIVE' : '⌨️ KEY / PAD';
        }
        if (!activePad) return;

        const isPressed = (idx) => !!(activePad.buttons[idx] && activePad.buttons[idx].pressed);
        const justPressed = (idx) => isPressed(idx) && !this.prevGamepadButtons[idx];

        // Button 9 (Start / Options): Toggle Pause or Start Quick Race from Title
        if (justPressed(9)) {
            if (this.mode === 'ATTRACT_TITLE') {
                this.exitAttractTitleMode('quick_race');
            } else if (this.mode === 'RACING') {
                this.togglePauseModal(true);
            } else if (this.mode === 'PAUSED') {
                this.togglePauseModal(false);
            }
        }

        // Button 3 (Y / Triangle): Cycle Camera Mode while Racing
        if (justPressed(3) && this.mode === 'RACING') {
            this.cycleCameraMode();
        }

        // Button 5 (RB / R1) & Button 4 (LB / L1): Manual Gear Shift Up / Down
        if (justPressed(5) && this.mode === 'RACING') {
            if (RRR.PHYSICS_TUNING.transmissionMode !== 'MT') {
                RRR.PHYSICS_TUNING.transmissionMode = 'MT';
                this.raceConfig.transmissionMode = 'MT';
            }
            this.playerCar.shiftUpManual();
        }
        if (justPressed(4) && this.mode === 'RACING') {
            if (RRR.PHYSICS_TUNING.transmissionMode !== 'MT') {
                RRR.PHYSICS_TUNING.transmissionMode = 'MT';
                this.raceConfig.transmissionMode = 'MT';
            }
            this.playerCar.shiftDownManual();
        }

        // Store button states for next frame edge detection
        for (let i = 0; i < activePad.buttons.length; i++) {
            this.prevGamepadButtons[i] = isPressed(i);
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
            if (this.renderer) this.renderer.lookBackActive = false;
            return;
        }

        let throttle = (this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp'] || this.keys['arrowup']) ? 1.0 : 0.0;
        let brake = (this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown'] || this.keys['arrowdown']) ? 1.0 : 0.0;
        let steer = 0.0;
        if (this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft'] || this.keys['arrowleft']) steer -= 1.0;
        if (this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight'] || this.keys['arrowright']) steer += 1.0;
        let drift = !!(this.keys['Space'] || this.keys[' '] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['shift']);
        let lookBack = !!(this.keys['KeyX'] || this.keys['x']);

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
                if (pad.buttons[11] && pad.buttons[11].pressed) {
                    lookBack = true;
                }
            }
        }

        if (this.renderer) {
            this.renderer.lookBackActive = lookBack;
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
            const el = this.getEl(id);
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
            const el = this.getEl(id);
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

        // Rotated Car Chassis Rectangle
        ctx.fillStyle = 'rgba(0, 245, 212, 0.28)';
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.fillRect(-8, -15, 16, 30);
        ctx.strokeRect(-8, -15, 16, 30);

        // Articulated Front Wheel Steer / Counter-Steer Ticks (Gold)
        const wSteer = p.wheelSteerAngle || 0.0;
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2.2;
        for (const wx of [-9, 9]) {
            ctx.save();
            ctx.translate(wx, -10);
            ctx.rotate(wSteer);
            ctx.beginPath();
            ctx.moveTo(0, -4.5);
            ctx.lineTo(0,  4.5);
            ctx.stroke();
            ctx.restore();
        }
        // Rear Wheels
        for (const wx of [-9, 9]) {
            ctx.beginPath();
            ctx.moveTo(wx, 6.5);
            ctx.lineTo(wx, 13.5);
            ctx.stroke();
        }

        // Visual Nose Vector (Cyan)
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
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

    /**
     * Renders the Dedicated Bottom-Left Arcade Course Radar Minimap (#arcade-minimap-canvas):
     * - Full circuit outline with 4 sector ticks & checkered Start/Finish line
     * - Color-coded rival dots (#ff1e6b Kai, #ffe600 Mira, #bfff00 Rex)
     * - Player directional arrow (#00f5d4)
     */
    renderArcadeMinimap() {
        if (!this.arcadeMinimapCtx || !this.arcadeMinimapCanvas || !this.trackSpline) return;
        const ctx = this.arcadeMinimapCtx;
        const w = this.arcadeMinimapCanvas.width;
        const h = this.arcadeMinimapCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const b = this.trackSpline.bounds;
        const spanX = Math.max(100, b.maxX - b.minX);
        const spanZ = Math.max(100, b.maxZ - b.minZ);
        const pad = 16;
        const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);
        const midX = (b.minX + b.maxX) * 0.5;
        const midZ = (b.minZ + b.maxZ) * 0.5;

        const toMapX = (wx) => w * 0.5 - (wx - midX) * scale;
        const toMapY = (wz) => h * 0.5 - (wz - midZ) * scale;

        // Subtle radar rings
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, w * 0.38, 0, Math.PI * 2);
        ctx.stroke();

        // Track circuit outer glow + asphalt line
        const samples = this.trackSpline.samples;
        ctx.strokeStyle = 'rgba(0, 245, 212, 0.22)';
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let i = 0; i < samples.length; i += 4) {
            const sp = samples[i].pos;
            const mx = toMapX(sp[0]);
            const my = toMapY(sp[2]);
            if (i === 0) ctx.moveTo(mx, my);
            else ctx.lineTo(mx, my);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#251d4d';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 4 Sector Divider Ticks (t = 0.0, 0.25, 0.50, 0.75)
        for (const tSec of [0.25, 0.50, 0.75]) {
            const sSample = this.trackSpline.getSampleAtNormalizedT(tSec);
            const sx = toMapX(sSample.pos[0]);
            const sy = toMapY(sSample.pos[2]);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Start / Finish Line Marker at t = 0.0
        const sf = this.trackSpline.getSampleAtNormalizedT(0.0);
        const sfx = toMapX(sf.pos[0]);
        const sfy = toMapY(sf.pos[2]);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sfx - sf.right[0] * 6, sfy - sf.right[2] * 6);
        ctx.lineTo(sfx + sf.right[0] * 6, sfy + sf.right[2] * 6);
        ctx.stroke();

        // Draw AI Rivals with distinct driver colors
        if (this.aiRivalsEnabled) {
            const rivalColors = ['#ff1e6b', '#ffe600', '#bfff00'];
            this.rivals.forEach((r, idx) => {
                const rx = toMapX(r.pos[0]);
                const ry = toMapY(r.pos[2]);
                ctx.fillStyle = rivalColors[idx % rivalColors.length];
                ctx.strokeStyle = '#090518';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
        }

        // Draw Player Directional Arrow (#00f5d4)
        const p = this.playerCar;
        const progEl = this.getEl('minimap-prog-lbl');
        if (progEl) progEl.textContent = `${Math.round((p.splineT || 0) * 100)}% LAP`;

        const px = toMapX(p.pos[0]);
        const py = toMapY(p.pos[2]);
        const fx = -p.visualForward[0];
        const fy = -p.visualForward[2];
        const angle = Math.atan2(fy, fx);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(angle);
        ctx.fillStyle = '#00f5d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(7.5, 0);
        ctx.lineTo(-5.5, -4.8);
        ctx.lineTo(-3.2, 0);
        ctx.lineTo(-5.5, 4.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Renders the Top-Center Namco Virtual Rear-View Radar Mirror (#rear-mirror-canvas)
     * & updates the Rival Proximity / Incoming Slam Alert (#rival-proximity-bar).
     */
    renderRearViewMirror() {
        const p = this.playerCar;
        const statusEl = this.getEl('rear-threat-status');
        const proxBar = this.getEl('rival-proximity-bar');
        const proxC = this.getEl('rival-prox-center');
        const proxL = this.getEl('rival-prox-left');
        const proxR = this.getEl('rival-prox-right');

        // Find closest rival behind or alongside player
        let closestBehind = null;
        let closestBehindMeters = Infinity;
        let closestAny = null;
        let closestAnyMeters = Infinity;
        const trackLen = (this.trackSpline && this.trackSpline.totalLength) || 1200;

        const behindRivals = [];
        if (this.aiRivalsEnabled) {
            this.rivals.forEach((r, idx) => {
                let dSpline = p.splineT - r.splineT;
                if (dSpline < -0.5) dSpline += 1.0;
                if (dSpline > 0.5) dSpline -= 1.0;
                const longMeters = dSpline * trackLen; // Positive = Rival is behind player
                const latDiff = r.lateralOffset - p.lateralOffset; // Positive = Rival is to player's right
                const absDist = Math.hypot(longMeters, latDiff);

                if (absDist < closestAnyMeters) {
                    closestAnyMeters = absDist;
                    closestAny = { car: r, longMeters, latDiff, absDist, idx };
                }
                if (longMeters > -6.0 && longMeters < 85.0) {
                    behindRivals.push({ car: r, longMeters, latDiff, absDist, idx });
                    if (absDist < closestBehindMeters) {
                        closestBehindMeters = absDist;
                        closestBehind = { car: r, longMeters, latDiff, absDist, idx };
                    }
                }
            });
        }

        // Update Top-Center Threat Status Text & Incoming Slam Proximity Bar
        if (statusEl) {
            if (closestBehind && closestBehind.absDist < 22) {
                statusEl.textContent = `⚠️ ${closestBehind.car.shortName} CLOSING (${Math.round(closestBehind.absDist)}M)`;
                statusEl.classList.add('threat-active');
            } else if (closestBehind && closestBehind.absDist < 55) {
                statusEl.textContent = `${closestBehind.car.shortName} -${Math.round(closestBehind.absDist)}M`;
                statusEl.classList.remove('threat-active');
            } else {
                statusEl.textContent = 'CLEAR BEHIND';
                statusEl.classList.remove('threat-active');
            }
        }

        if (proxBar) {
            const isClosingFast = closestAny && closestAny.absDist < 15.0 && this.hasRaceStarted && this.mode === 'RACING';
            proxBar.classList.toggle('hidden', !isClosingFast);
            if (isClosingFast) {
                const distM = Math.round(closestAny.absDist);
                const onLeft = closestAny.latDiff < -1.0;
                const onRight = closestAny.latDiff > 1.0;
                if (proxL) {
                    proxL.classList.toggle('hidden', !onLeft);
                    proxL.textContent = `◀◀ ${closestAny.car.shortName} (${distM}m)`;
                }
                if (proxR) {
                    proxR.classList.toggle('hidden', !onRight);
                    proxR.textContent = `${closestAny.car.shortName} (${distM}m) ▶▶`;
                }
                if (proxC) {
                    proxC.classList.toggle('hidden', onLeft || onRight);
                    proxC.textContent = `⚠️ ${closestAny.car.shortName} SLAM INCOMING BEHIND (${distM}m)! ⚠️`;
                }
            }
        }

        if (!this.rearMirrorCtx || !this.rearMirrorCanvas) return;
        const ctx = this.rearMirrorCtx;
        const w = this.rearMirrorCanvas.width;
        const h = this.rearMirrorCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // 1. Stylized Rear Horizon Sky & Perspective Road Lines
        const vPal = this.vibeController ? this.vibeController.activeState : null;
        const skyCss = (vPal && vPal.skyHorizon) ? this.vibeController.toCSS(vPal.skyHorizon) : '#281458';
        const roadCss = (vPal && vPal.roadShadow) ? this.vibeController.toCSS(vPal.roadShadow) : '#120b29';
        const neonCss = (vPal && vPal.curbA) ? this.vibeController.toCSS(vPal.curbA) : '#00f5d4';

        const horizonY = h * 0.44;
        ctx.fillStyle = skyCss;
        ctx.fillRect(0, 0, w, horizonY);
        ctx.fillStyle = roadCss;
        ctx.fillRect(0, horizonY, w, h - horizonY);

        // Perspective road edges converging toward center horizon
        ctx.strokeStyle = neonCss;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.36, horizonY);
        ctx.lineTo(6, h);
        ctx.moveTo(w * 0.64, horizonY);
        ctx.lineTo(w - 6, h);
        ctx.stroke();

        // Center dashed lane line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, horizonY);
        ctx.lineTo(w * 0.5, h);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Render Rivals in Rear-View Perspective (Sorted farthest to closest)
        const rivalColors = ['#ff1e6b', '#ffe600', '#bfff00'];
        behindRivals.sort((a, b) => b.longMeters - a.longMeters);
        for (const item of behindRivals) {
            const depthNorm = Math.max(0.0, Math.min(1.0, 1.0 - item.longMeters / 75.0));
            // In a rear-view mirror, a car to the player's right (+latDiff) appears on the right side
            const roadHalfW = 18 + depthNorm * (w * 0.42);
            const cx = w * 0.5 + (item.latDiff / 10.5) * roadHalfW;
            const cy = horizonY + 4 + depthNorm * (h - horizonY - 8);
            const carW = 10 + depthNorm * 28;
            const carH = 5 + depthNorm * 13;
            const col = rivalColors[item.idx % rivalColors.length];

            // Car silhouette + aggressive twin headlights
            ctx.fillStyle = '#0c0820';
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.fillRect(cx - carW * 0.5, cy - carH, carW, carH);
            ctx.strokeRect(cx - carW * 0.5, cy - carH, carW, carH);

            // Headlight beams
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - carW * 0.40, cy - carH * 0.55, carW * 0.22, carH * 0.32);
            ctx.fillRect(cx + carW * 0.18, cy - carH * 0.55, carW * 0.22, carH * 0.32);
        }
    }

    updateHUDTelemetry(dt = 0.016) {
        const p = this.playerCar;
        const isMph = this.speedUnits === 'MPH';
        const speedVal = Math.round(Math.abs(p.speed) * (isMph ? 2.23694 : 3.6));

        const elSpeed = this.getEl('hud-speed-val');
        if (elSpeed) elSpeed.textContent = speedVal;
        const elSpeedUnit = this.getEl('hud-speed-unit');
        if (elSpeedUnit) elSpeedUnit.textContent = isMph ? 'MPH' : 'KM/H';

        const elSpeedBar = this.getEl('hud-speed-bar');
        if (elSpeedBar) elSpeedBar.style.width = `${Math.min(100, Math.round(p.normalizedSpeed * 85))}%`;

        // 1. Authentic R4 Persistent Gear Readout & 16-Segment Tachometer
        const gearNum = p.gear || 1;
        const rpm = Math.round(p.rpm || 1200);
        const isRedline = rpm >= 8200;

        const elGear = this.getEl('hud-gear-val');
        if (elGear) elGear.textContent = p.speed < -1.0 ? 'R' : gearNum;
        const elTrans = this.getEl('hud-trans-mode');
        if (elTrans) elTrans.textContent = RRR.PHYSICS_TUNING.transmissionMode === 'MT' ? 'MT' : 'AT';
        const elGearBox = this.getEl('hud-gear-box');
        if (elGearBox) elGearBox.classList.toggle('redline-flash', isRedline);

        const elRpm = this.getEl('hud-rpm-val');
        if (elRpm) {
            elRpm.textContent = `${rpm.toLocaleString()} RPM`;
            elRpm.style.color = isRedline ? '#ff1e6b' : (rpm >= 6500 ? '#ffe600' : '#00f5d4');
        }

        if (!this._tachSegs) {
            const tachContainer = this.getEl('hud-tach-segments');
            if (tachContainer) this._tachSegs = Array.from(tachContainer.querySelectorAll('.tach-seg'));
        }
        if (this._tachSegs && this._tachSegs.length > 0) {
            const rpmRatio = Math.max(0, Math.min(1, (rpm - 1000) / (9500 - 1000)));
            const litCount = Math.max(1, Math.round(rpmRatio * this._tachSegs.length));
            for (let i = 0; i < this._tachSegs.length; i++) {
                const seg = this._tachSegs[i];
                const isLit = i < litCount;
                seg.className = 'tach-seg';
                if (isLit) {
                    if (i >= 13) seg.classList.add('lit-red');
                    else if (i >= 9) seg.classList.add('lit-mid');
                    else seg.classList.add('lit-low');
                }
            }
        }

        // 2. Dedicated 3-Tier Drift Charge & Slip Angle Gauge
        const elDriftFill = this.getEl('hud-drift-charge-fill');
        const elDriftLbl = this.getEl('hud-drift-gauge-lbl');
        const elSlipVal = this.getEl('hud-slip-angle-val');
        const slipDeg = Math.abs((p.visualSlipAngle * 180) / Math.PI);
        if (elSlipVal) {
            elSlipVal.textContent = `SLIP ${slipDeg.toFixed(0)}°`;
        }
        if (elDriftFill) {
            const pct = p.boostTimer > 0
                ? Math.min(100, Math.round((p.boostTimer / 2.2) * 100))
                : Math.min(100, Math.round((p.driftCharge || 0) * 100));
            elDriftFill.style.width = `${pct}%`;
            elDriftFill.classList.toggle('tier3-ready', p.driftCharge >= 0.95 || p.boostTier >= 3);
        }
        if (elDriftLbl) {
            if (p.boostTimer > 0) {
                elDriftLbl.textContent = `⚡ TIER ${p.boostTier || 1} OVERDRIVE ACTIVE`;
                elDriftLbl.style.color = '#ffe600';
            } else if (p.driftCharge >= 0.95) {
                elDriftLbl.textContent = '🔥 TIER 3 MAX CHARGE — RELEASE!';
                elDriftLbl.style.color = '#ff1e6b';
            } else if (p.driftCharge >= 0.65) {
                elDriftLbl.textContent = '⚡ TIER 2 FLAME CHARGE READY';
                elDriftLbl.style.color = '#ffe600';
            } else if (p.driftCharge >= 0.35) {
                elDriftLbl.textContent = '✨ TIER 1 SPARK CHARGE READY';
                elDriftLbl.style.color = '#00f5d4';
            } else {
                elDriftLbl.textContent = 'R4 DRIFT CHARGE';
                elDriftLbl.style.color = '#b8b0dc';
            }
        }

        const elDriftState = this.getEl('hud-drift-badge');
        if (elDriftState) {
            const rpmFormatted = rpm.toLocaleString();
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

        // 3. Dynamic Track Sector Transition Banner & Wrong-Way Detection
        const sample = this.trackSpline.getSampleAtNormalizedT(p.splineT);
        if (sample && sample.zone !== this.lastDisplayedSector) {
            this.lastDisplayedSector = sample.zone;
            const zMeta = RRR.TRACK_ZONE_META && RRR.TRACK_ZONE_META[sample.zone];
            const elZone = this.getEl('hud-zone-name');
            const elTrackTitle = this.getEl('hud-track-title');
            if (elTrackTitle && this.trackSpline.activePreset) {
                elTrackTitle.textContent = this.trackSpline.activePreset.name;
            }
            if (elZone && zMeta) {
                elZone.textContent = `SECTOR 0${sample.zone + 1} // ${zMeta.name}`;
            }
            const bannerBox = this.getEl('sector-banner-box');
            if (bannerBox && this.hasRaceStarted) {
                bannerBox.classList.add('sector-flash');
                this.sectorFlashTimer = 1.3;
            }
        }
        if (this.sectorFlashTimer > 0) {
            this.sectorFlashTimer -= dt;
            if (this.sectorFlashTimer <= 0) {
                const bannerBox = this.getEl('sector-banner-box');
                if (bannerBox) bannerBox.classList.remove('sector-flash');
            }
        }

        if (this.styleCalloutTimer > 0) {
            this.styleCalloutTimer -= dt;
            if (this.styleCalloutTimer <= 0) {
                const calloutEl = this.getEl('arcade-style-callout');
                if (calloutEl) calloutEl.classList.add('hidden');
            }
        }

        // Wrong-Way / Off-Course Spinout Warning
        const isWrongWay = Math.abs(p.headingOffset) > 1.85 || p.speed < -2.5;
        if (isWrongWay && this.mode === 'RACING' && this.hasRaceStarted) {
            this.wrongWayTimer += dt;
        } else {
            this.wrongWayTimer = 0.0;
        }
        const wrongWayEl = this.getEl('wrong-way-overlay');
        if (wrongWayEl) {
            wrongWayEl.classList.toggle('hidden', this.wrongWayTimer < 0.45);
        }

        const rageFill = this.getEl('player-rage-fill');
        const rageVal = this.getEl('player-rage-val');
        if (rageFill) rageFill.style.width = `${Math.round(p.rage)}%`;
        if (rageVal) {
            rageVal.textContent = p.isBoiling ? `BOILING (${Math.round(p.rage)}%)` : `${Math.round(p.rage)}%`;
            rageVal.classList.toggle('text-boiling', p.isBoiling);
        }

        const egoFill = this.getEl('player-ego-fill');
        const egoVal = this.getEl('player-ego-val');
        if (egoFill) egoFill.style.width = `${Math.round(p.cockiness)}%`;
        if (egoVal) {
            egoVal.textContent = p.isUntouchable ? `UNTOUCHABLE (${Math.round(p.cockiness)}%)` : `${Math.round(p.cockiness)}%`;
            egoVal.classList.toggle('text-untouchable', p.isUntouchable);
        }

        const elRank = this.getEl('hud-race-rank');
        if (elRank) elRank.textContent = `${p.raceRank}${['ST', 'ND', 'RD', 'TH'][p.raceRank - 1] || 'TH'}`;

        const elLap = this.getEl('hud-lap-val');
        const rs = this.raceState;
        if (elLap) {
            if (rs && rs.isRaceMode) {
                const totalLaps = rs.totalLaps || 3;
                if (rs.phase === 'FINISHED') {
                    elLap.textContent = '🏁 FINISHED';
                } else if (p.lap >= totalLaps && totalLaps > 1) {
                    elLap.textContent = `FINAL LAP ${totalLaps}/${totalLaps}`;
                } else {
                    elLap.textContent = `LAP ${Math.min(p.lap, totalLaps)} / ${totalLaps}`;
                }
            } else {
                elLap.textContent = `LAP ${p.lap} / 3`;
            }
        }

        const elRaceTime = this.getEl('hud-race-time');
        const elLapTime = this.getEl('hud-lap-time');
        const elBestLap = this.getEl('hud-best-lap');
        if (rs && rs.isRaceMode) {
            if (elRaceTime) elRaceTime.textContent = this.formatRaceTime(rs.elapsedTime);
            const currLapElapsed = (rs.phase === 'FINISHED' && rs.lapTimes.length > 0)
                ? rs.lapTimes[rs.lapTimes.length - 1]
                : Math.max(0, rs.elapsedTime - rs.currentLapStartTime);
            if (elLapTime) elLapTime.textContent = this.formatRaceTime(currLapElapsed);
            if (elBestLap) elBestLap.textContent = Number.isFinite(rs.bestLapTime) ? this.formatRaceTime(rs.bestLapTime) : '--:--.---';
        } else {
            if (elRaceTime) elRaceTime.textContent = '00:00.000';
            if (elLapTime) elLapTime.textContent = '00:00.000';
            if (elBestLap) elBestLap.textContent = '--:--.---';
        }

        if (this.djHudCtx && this.djHudCanvas) {
            this.djHudCtx.drawImage(this.djController.canvas, 0, 0, this.djHudCanvas.width, this.djHudCanvas.height);
        }

        const stems = this.audioEngine.state.stems;
        const setBar = (id, v) => {
            const el = this.getEl(id);
            if (el) el.style.height = `${Math.round(Math.max(8, v * 100))}%`;
        };
        setBar('stem-kick', stems.kickSub * (0.6 + this.audioEngine.state.subBass * 0.4));
        setBar('stem-tops', stems.percTops);
        setBar('stem-chords', stems.synthChords);
        setBar('stem-acid', stems.leadAcid);
        setBar('stem-riser', stems.fxRisers);

        // Render Dedicated Arcade Course Minimap & Top-Center Rear-View Radar Mirror
        this.renderArcadeMinimap();
        this.renderRearViewMirror();

        // Sync Rekordbox Studio UI Sliders, Stems, Kills, DJ Coach & Status Message only when panel is open
        const rb = this.audioEngine.rekordbox;
        const rbPanel = this.getEl('rekordbox-studio-panel');
        if (rb && rb.deck1 && rb.deck2 && rbPanel && !rbPanel.classList.contains('hidden')) {
            const rbMsg = this.getEl('rb-status-msg');
            if (rbMsg) rbMsg.textContent = rb.statusMessage;

            const coachBanner = this.getEl('rb-coach-banner');
            if (coachBanner && rb.djCoachEnabled && rb.djCoachText) {
                coachBanner.textContent = rb.djCoachText;
            }

            const m1 = this.getEl('btn-d1-master');
            const m2 = this.getEl('btn-d2-master');
            if (m1) m1.classList.toggle('active', rb.masterDeckId === 1);
            if (m2) m2.classList.toggle('active', rb.masterDeckId === 2);

            const s1 = this.getEl('btn-d1-sync');
            const s2 = this.getEl('btn-d2-sync');
            if (s1) s1.classList.toggle('active', rb.deck1.syncEnabled);
            if (s2) s2.classList.toggle('active', rb.deck2.syncEnabled);

            const sl1 = this.getEl('btn-d1-slip');
            const sl2 = this.getEl('btn-d2-slip');
            if (sl1) sl1.classList.toggle('active', !!rb.deck1.slipModeEnabled);
            if (sl2) sl2.classList.toggle('active', !!rb.deck2.slipModeEnabled);

            const al1 = this.getEl('btn-d1-activeloop');
            const al2 = this.getEl('btn-d2-activeloop');
            if (al1) al1.classList.toggle('active', !!rb.deck1.activeLoopEnabled);
            if (al2) al2.classList.toggle('active', !!rb.deck2.activeLoopEnabled);

            const syncVal = (id, v) => {
                const el = this.getEl(id);
                if (el && document.activeElement !== el) el.value = Number(v).toFixed(2);
            };
            syncVal('slider-d1-trim', rb.deck1.trimDb || 0.0);
            syncVal('slider-d2-trim', rb.deck2.trimDb || 0.0);

            if (rb.aiDjEnabled) {
                syncVal('slider-d1-low', rb.deck1.eq.low);
                syncVal('slider-d1-mid', rb.deck1.eq.mid);
                syncVal('slider-d1-hi', rb.deck1.eq.high);
                syncVal('slider-d1-fltr', rb.deck1.colorFilter);
                syncVal('slider-d1-vol', rb.deck1.volumeFader ?? 1.0);
                syncVal('slider-d2-low', rb.deck2.eq.low);
                syncVal('slider-d2-mid', rb.deck2.eq.mid);
                syncVal('slider-d2-hi', rb.deck2.eq.high);
                syncVal('slider-d2-fltr', rb.deck2.colorFilter);
                syncVal('slider-d2-vol', rb.deck2.volumeFader ?? 1.0);
                syncVal('slider-rb-crossfader', rb.crossfader);

                const cfx1 = this.getEl('select-d1-cfx');
                const cfx2 = this.getEl('select-d2-cfx');
                if (cfx1 && document.activeElement !== cfx1) cfx1.value = rb.deck1.colorFxMode;
                if (cfx2 && document.activeElement !== cfx2) cfx2.value = rb.deck2.colorFxMode;

                if (!this._rbKillBtns) this._rbKillBtns = Array.from(document.querySelectorAll('.rb-kill-btn'));
                for (let i = 0; i < this._rbKillBtns.length; i++) {
                    const btn = this._rbKillBtns[i];
                    const d = rb.getDeck(parseInt(btn.getAttribute('data-deck'), 10));
                    const band = btn.getAttribute('data-kill');
                    if (d && band) btn.classList.toggle('killed', !!d.eqKill[band]);
                }

                if (!this._rbStemBtns) this._rbStemBtns = Array.from(document.querySelectorAll('.rb-stem-btn'));
                for (let i = 0; i < this._rbStemBtns.length; i++) {
                    const btn = this._rbStemBtns[i];
                    const d = rb.getDeck(parseInt(btn.getAttribute('data-deck'), 10));
                    const stem = btn.getAttribute('data-stem');
                    if (d && stem) btn.classList.toggle('active', !!d.stems[stem]);
                }
            }
        }

        if (this.studioHudEnabled) {
            this.renderDiagnosticsTelemetry();
        }
    }

    loop(now) {
        const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) * 0.001));
        this.lastTime = now;

        this.pollGlobalGamepadButtons();

        if (!this.isEngineInitialized) {
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (this.mode === 'WORLD_MAP') {
            this.renderWorldMapNetwork(dt);
        }

        if (this.mode === 'DEV_MENU') {
            // Render Live 3D WebGL Turntable Preview inside Main Menu Garage Customizer
            this.renderer.cameraMode = 'ORBIT_CAR';
            this.renderer.orbitAutoRotate = !this.isGarageOrbitDragging;
            if (!this.renderer.orbitDist || this.renderer.orbitDist > 8.5) {
                this.renderer.orbitDist = 4.65;
            }
            this.vibeController.update(dt, this.audioEngine.state, {
                rage: this.playerCar.rage,
                cockiness: this.playerCar.cockiness
            });
            this.djController.updateAndRender(
                dt,
                this.audioEngine.state,
                this.vibeController.activeState,
                this.audioEngine.rekordboxMode ? this.audioEngine.rekordbox : null
            );
            this.renderer.updateCameraAndParticles(dt, this.playerCar, [this.playerCar], this.audioEngine.state);
            this.renderer.render(
                [this.playerCar],
                this.playerCar,
                this.vibeController,
                this.audioEngine.state,
                this.djController
            );
            this.renderGarageTurntablePreview();
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (this.mode === 'LANDMARK_LOADING') {
            this.updateLandmarkLoading(dt);
        }

        if (this.mode === 'ATTRACT_TITLE') {
            this.updateAttractTitleMode(dt);
            this.readPlayerInputs(dt);
            const activeVehicles = this.getActiveVehicles();
            for (const r of this.rivals) {
                r.updateAIBrain(dt, this.trackSpline, this.playerCar, activeVehicles);
            }
            for (const v of activeVehicles) {
                v.update(dt, this.trackSpline, activeVehicles, {});
            }
            const playerSample = this.trackSpline.getSampleAtNormalizedT(this.playerCar.splineT);
            this.vibeController.setTrackZone(playerSample.zone);
            this.vibeController.update(dt, this.audioEngine.state, {
                rage: this.playerCar.rage,
                cockiness: this.playerCar.cockiness
            });
            this.audioEngine.update(dt, {
                normalizedSpeed: this.playerCar.normalizedSpeed,
                isDrifting: this.playerCar.driftState === 'DRIFTING',
                driftCharge: this.playerCar.driftCharge,
                cockiness: this.playerCar.cockiness,
                rage: this.playerCar.rage,
                isFirstPlace: true,
                isFinalLap: false,
                isLoadingMuffled: false
            });
            this.djController.updateAndRender(
                dt,
                this.audioEngine.state,
                this.vibeController.activeState,
                this.audioEngine.rekordboxMode ? this.audioEngine.rekordbox : null
            );
            this.renderer.updateCameraAndParticles(dt, this.playerCar, activeVehicles, this.audioEngine.state);
            this.renderer.render(
                activeVehicles,
                this.playerCar,
                this.vibeController,
                this.audioEngine.state,
                this.djController
            );
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (this.mode === 'RACING') {
            const rs = this.raceState;

            // Update transient HUD banners (GO!! overlay & Lap Split banner)
            if (rs && rs.isRaceMode) {
                if (rs.goBannerTimer > 0) {
                    rs.goBannerTimer -= dt;
                    if (rs.goBannerTimer <= 0 && rs.phase !== 'COUNTDOWN') {
                        const cdOverlay = document.getElementById('race-countdown-overlay');
                        if (cdOverlay) cdOverlay.classList.add('hidden');
                    }
                }
                if (rs.splitBannerTimer > 0) {
                    rs.splitBannerTimer -= dt;
                    if (rs.splitBannerTimer <= 0) {
                        const splitBanner = document.getElementById('race-split-banner');
                        if (splitBanner) splitBanner.classList.add('hidden');
                    }
                }
            }

            if (rs && rs.isRaceMode && rs.phase === 'COUNTDOWN') {
                // Hold 4-car grid during 3-2-1-GO countdown & allow R4 Rev-Matching
                this.updateRaceCountdown(dt);
            } else {
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
                    onDriftBoost: (car, charge, boostTier) => {
                        if (car.isPlayer) {
                            if (rs && rs.isRaceMode && rs.phase === 'RACING') {
                                rs.stats.driftBoostCount++;
                                if (boostTier >= 3) rs.stats.tier3BoostCount++;
                            }
                            if (boostTier >= 3) {
                                this.showStyleCallout('🔥 TIER-3 REDLINE OVERDRIVE!! (+800 PTS)', 2.2);
                            } else if (boostTier === 2) {
                                this.showStyleCallout('⚡ TIER-2 FLAME DRIFT BOOST! (+350 PTS)', 1.9);
                            }
                            this.audioEngine.triggerDriftBoostSFX(boostTier || 1);
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
                            if (rs && rs.isRaceMode && rs.phase === 'RACING') {
                                rs.stats.wallScrapeCount++;
                                rs.stats.currentLapScrapes++;
                            }
                            this.renderer.triggerCollisionVFX(car.pos);
                        }
                    },
                    onLapComplete: (car, newLap) => {
                        this.handleRaceLapComplete(car, newLap);
                    }
                };

                for (const v of activeVehicles) {
                    v.update(dt, this.trackSpline, activeVehicles, callbacks);
                }

                // Sample live race telemetry while racing
                if (rs && rs.isRaceMode && rs.phase === 'RACING') {
                    rs.elapsedTime += dt;
                    const st = rs.stats;
                    const kmh = Math.abs(this.playerCar.speed) * 3.6;
                    if (kmh > st.topSpeedKmh) st.topSpeedKmh = kmh;
                    st.speedSampleSum += kmh;
                    st.speedSampleCount++;

                    const slipDeg = Math.abs((this.playerCar.visualSlipAngle * 180) / Math.PI);
                    if (slipDeg > st.peakSlipAngleDeg) st.peakSlipAngleDeg = slipDeg;
                    if (this.playerCar.rage > st.peakRage) st.peakRage = this.playerCar.rage;
                    if (this.playerCar.cockiness > st.peakCockiness) st.peakCockiness = this.playerCar.cockiness;

                    if (this.playerCar.driftState === 'DRIFTING' || this.playerCar.driftState === 'INITIATING') {
                        const dMeters = Math.abs(this.playerCar.speed) * dt;
                        st.driftDistanceMeters += dMeters;
                        st.driftTimeSeconds += dt;
                        st.currentDriftDistanceMeters += dMeters;
                        if (st.currentDriftDistanceMeters > st.longestDriftMeters) {
                            st.longestDriftMeters = st.currentDriftDistanceMeters;
                        }
                    } else {
                        st.currentDriftDistanceMeters = 0;
                    }
                } else if (rs && rs.isRaceMode && rs.phase === 'FINISHED') {
                    if (!rs.resultsShown) {
                        rs.finishDelayTimer -= dt;
                        if (rs.finishDelayTimer <= 0) {
                            rs.resultsShown = true;
                            this.populateAndShowRaceResultsModal();
                        }
                    }
                }

                const sorted = [...activeVehicles].sort((a, b) => b.totalProgress - a.totalProgress);
                sorted.forEach((v, idx) => {
                    if (rs && rs.isRaceMode && rs.phase === 'FINISHED' && rs.finishedOrder.includes(v)) {
                        v.raceRank = rs.finishedOrder.indexOf(v) + 1;
                        return;
                    }
                    if (v.isPlayer && v.raceRank > 1 && idx === 0) {
                        this.djController.triggerReaction('OVERTAKE_SMIRK', 'NEW RACE LEADER // P1!!', 2.5);
                        this.showStyleCallout('👑 P1 OVERTAKE // NEW RACE LEADER!!', 2.1);
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
                            if (rs && rs.isRaceMode && rs.phase === 'RACING') {
                                rs.stats.nearMissCount++;
                            }
                            this.showStyleCallout('⚡ NEAR-MISS SLIPSTREAM!! (+220 PTS)', 1.8);
                            this.expressionHUD.spawnBanterRibbon(
                                this.expressionHUD.boxes.player,
                                RRR.DIALOGUE_BARKS.ON_NEAR_MISS,
                                this.audioEngine
                            );
                        }
                    );
                }
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
            isFinalLap: this.playerCar.lap >= (this.raceState && this.raceState.isRaceMode ? this.raceState.totalLaps : 3),
            isLoadingMuffled: this.mode === 'LANDMARK_LOADING' || this.mode === 'PAUSED'
        });

        // 5. Update Track DJ Boiler Room Broadcast Canvas
        this.djController.updateAndRender(
            dt,
            this.audioEngine.state,
            this.vibeController.activeState,
            this.audioEngine.rekordboxMode ? this.audioEngine.rekordbox : null
        );

        // 6. Update 2D Physics Character Portrait Boxes & HUD
        if (this.mode !== 'PAUSED') {
            this.expressionHUD.update(dt, this.audioEngine.state);
        }
        this.updateHUDTelemetry(dt);

        // 7. Update Sense-of-Speed Camera & Render Multi-Pass WebGL2 Scene + Paint Smudge
        if (this.mode === 'RACING') {
            this.renderer.updateCameraAndParticles(dt, this.playerCar, activeVehicles, this.audioEngine.state);
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
