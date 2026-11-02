/**
 * RAVE RACER REMIX — Pillar 3.1 & 3.2: Interactive 5-Stem Rave Synthesizer & FFT Beat Bus
 * Real-time 138 BPM Web Audio 5-stem rave generator + FFT spectrum extraction + race-to-music DSP.
 */
window.RRR = window.RRR || {};

RRR.AudioEngine = class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isStarted = false;
        this.isMuted = false;

        this.bpm = 138;
        this.stepIndex = 0; // 16th-note counter
        this.barIndex = 0;
        this.nextNoteTime = 0;
        this.scheduleTimer = null;

        // Exposed Triad Audio State (mirrors Unity BeatBroadcastSystem)
        this.state = {
            subBass: 0.0,
            lowMid: 0.0,
            highMid: 0.0,
            treble: 0.0,
            beatPulse: 0.0,
            bpm: 138,
            section: 'GROOVE', // 'GROOVE' | 'PRE_DROP' | 'DROP' | 'BREAKDOWN'
            step16: 0,
            stems: {
                kickSub: 1.0,
                percTops: 0.4,
                synthChords: 0.85,
                leadAcid: 0.0,
                fxRisers: 0.0
            }
        };

        // Race-driven inputs
        this.raceParams = {
            normalizedSpeed: 0.0,
            isDrifting: false,
            driftCharge: 0.0,
            cockiness: 0.0,
            rage: 0.0,
            isFirstPlace: false,
            isFinalLap: false,
            isLoadingMuffled: false
        };

        this.collisionDuckTimer = 0;
        this.onBeatCallback = null;
        this.onMarkerCallback = null;

        // Pioneer Rekordbox Dual-Deck MP3 Analyzer & AI DJ Controller (Default active mode)
        this.rekordboxMode = true;
        this.rekordbox = RRR.RekordboxController ? new RRR.RekordboxController(this) : null;
    }

    init() {
        if (this.isStarted) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.72;

        // Master interactive Lowpass/Highpass filter (for Collision Ducking & Landmark Drive-Over muffle)
        this.masterFilter = this.ctx.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = 18500;
        this.masterFilter.Q.value = 1.6;

        // Drift Phaser / Notch sweep filter
        this.driftFilter = this.ctx.createBiquadFilter();
        this.driftFilter.type = 'peaking';
        this.driftFilter.frequency.value = 900;
        this.driftFilter.Q.value = 2.5;
        this.driftFilter.gain.value = 0;

        // Master Compressor for rave punch
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 8;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.12;

        // FFT AnalyserNode
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.72;
        this.fftData = new Uint8Array(this.analyser.frequencyBinCount);

        // Stem Gain Buses
        this.stemBuses = {
            kickSub: this.ctx.createGain(),
            percTops: this.ctx.createGain(),
            synthChords: this.ctx.createGain(),
            leadAcid: this.ctx.createGain(),
            fxRisers: this.ctx.createGain()
        };

        this.synthMasterBus = this.ctx.createGain();
        this.synthMasterBus.gain.value = this.rekordboxMode ? 0.0 : 1.0;

        for (const k in this.stemBuses) {
            this.stemBuses[k].connect(this.synthMasterBus);
        }
        this.synthMasterBus.connect(this.driftFilter);

        // Rekordbox Dual-Deck Master Bus (feeds into masterFilter -> compressor -> FFT analyser!)
        this.rekordboxBus = this.ctx.createGain();
        this.rekordboxBus.gain.value = this.rekordboxMode ? 1.0 : 0.0;
        this.rekordboxBus.connect(this.masterFilter);

        if (this.rekordbox) {
            this.rekordbox.init(this.ctx, this.rekordboxBus);
        }

        this.driftFilter.connect(this.masterFilter);
        this.masterFilter.connect(this.compressor);
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        // Continuous Engine + Drift Screech Synth
        this.setupEngineAndTireSynth();

        this.isStarted = true;
        this.nextNoteTime = this.ctx.currentTime + 0.05;
        this.scheduleTimer = setInterval(() => this.scheduler(), 25);
    }

    setRekordboxMode(enabled) {
        this.rekordboxMode = !!enabled;
        if (this.ctx && this.synthMasterBus && this.rekordboxBus) {
            const now = this.ctx.currentTime;
            this.rekordboxBus.gain.setTargetAtTime(this.rekordboxMode ? 1.0 : 0.0, now, 0.04);
            this.synthMasterBus.gain.setTargetAtTime(this.rekordboxMode ? 0.0 : 1.0, now, 0.04);
        }
    }

    setupEngineAndTireSynth() {
        // Subtle sporty arcade engine hum
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'bandpass';
        this.engineFilter.frequency.value = 240;
        this.engineFilter.Q.value = 2.2;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.masterGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0 : 0.72, this.ctx.currentTime, 0.05);
        }
        return this.isMuted;
    }

    scheduler() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        if (this.rekordboxMode && this.rekordbox) {
            this.nextNoteTime = this.ctx.currentTime + 0.05;
            return;
        }
        const lookahead = 0.10;
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.scheduleStep(this.stepIndex, this.nextNoteTime);
            this.advanceStep();
        }
    }

    advanceStep() {
        const effectiveBpm = this.raceParams.isFinalLap ? 142 : this.bpm;
        this.state.bpm = effectiveBpm;
        const secondsPerBeat = 60.0 / effectiveBpm;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th note
        this.stepIndex = (this.stepIndex + 1) % 16;
        if (this.stepIndex === 0) {
            this.barIndex = (this.barIndex + 1) % 16;
            this.updateSongSection(this.barIndex);
        }
    }

    updateSongSection(bar) {
        let newSec = 'GROOVE';
        if (bar >= 0 && bar < 6) newSec = 'GROOVE';
        else if (bar >= 6 && bar < 8) newSec = 'PRE_DROP';
        else if (bar >= 8 && bar < 14) newSec = 'DROP';
        else newSec = 'BREAKDOWN';

        if (newSec !== this.state.section) {
            this.state.section = newSec;
            if (this.onMarkerCallback) {
                this.onMarkerCallback(newSec);
            }
        }
    }

    scheduleStep(step, time) {
        this.state.step16 = step;
        const section = this.state.section;

        // Quarter note beat trigger (0, 4, 8, 12)
        if (step % 4 === 0) {
            this.state.beatPulse = 1.0;
            if (this.onBeatCallback) {
                this.onBeatCallback(step / 4, section);
            }
        }

        // 1. STEM: KICK & SUB-BASS
        if (section !== 'PRE_DROP' || step < 8) {
            if (step % 4 === 0) {
                this.play909Kick(time, section === 'DROP' ? 1.0 : 0.85);
            }
        } else if (section === 'PRE_DROP') {
            // Snare/Kick roll on pre-drop
            this.play909Kick(time, 0.55);
        }

        // Rolling Rave Sub-Bass on off-beats (steps 2, 3, 6, 7, 10, 11, 14, 15)
        const bassNotes = [55.0, 55.0, 65.41, 55.0, 73.42, 65.41, 55.0, 82.41]; // A1 minor rave progression
        if (step % 4 === 2 || (section === 'DROP' && step % 4 === 3)) {
            const noteFreq = bassNotes[(this.barIndex + Math.floor(step / 2)) % bassNotes.length];
            this.playSubBass(time, noteFreq, step % 4 === 2 ? 0.85 : 0.55);
        }

        // 2. STEM: PERCUSSION TOPS (Hi-hats & Breakbeat Snares — scales with speed)
        if (step % 4 === 2) {
            // Classic 909 Open Hat on the off-beat
            this.playHiHat(time, true, 0.45);
        } else if (this.raceParams.normalizedSpeed > 0.45) {
            // 16th-note closed hats unlocked at speed
            this.playHiHat(time, false, 0.18 + this.raceParams.normalizedSpeed * 0.18);
        }
        if (step === 4 || step === 12 || (section === 'PRE_DROP' && step % 2 === 0)) {
            this.playRaveSnare(time, section === 'PRE_DROP' ? 0.55 : 0.38);
        }

        // 3. STEM: SYNTH CHORDS (R4 / Nagai Minor 9th Stabs)
        const chordHits = [0, 3, 6, 10, 14];
        if (chordHits.includes(step)) {
            const rootOffset = (this.barIndex % 4 === 2) ? 1.189 : (this.barIndex % 4 === 3 ? 1.334 : 1.0);
            this.playR4ChordStab(time, 220 * rootOffset, step === 0 ? 0.35 : 0.22);
        }

        // 4. STEM: ACID 303 LEAD (Unlocks on High Cockiness, 1st Place, or DROP)
        const acidSequence = [220, 220, 440, 220, 261.63, 293.66, 440, 329.63, 220, 392.00, 329.63, 261.63, 220, 440, 523.25, 392.00];
        const accentSteps = [0, 3, 6, 9, 12, 14];
        this.playAcid303(time, acidSequence[step], accentSteps.includes(step));
    }

    play909Kick(time, velocity) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(148, time);
        osc.frequency.exponentialRampToValueAtTime(46, time + 0.075);
        osc.frequency.exponentialRampToValueAtTime(34, time + 0.24);

        gain.gain.setValueAtTime(velocity * 0.95, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        osc.connect(gain);
        gain.connect(this.stemBuses.kickSub);
        osc.start(time);
        osc.stop(time + 0.26);
    }

    playSubBass(time, freq, velocity) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, time);
        filter.frequency.exponentialRampToValueAtTime(95, time + 0.16);
        filter.Q.value = 3.5;

        gain.gain.setValueAtTime(velocity * 0.55, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.stemBuses.kickSub);
        osc.start(time);
        osc.stop(time + 0.19);
    }

    playHiHat(time, isOpen, velocity) {
        const bufferSize = this.ctx.sampleRate * (isOpen ? 0.16 : 0.045);
        if (!this.noiseBuffer || this.noiseBuffer.length < bufferSize) {
            this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7200;

        const gain = this.ctx.createGain();
        const dur = isOpen ? 0.14 : 0.038;
        gain.gain.setValueAtTime(velocity * 0.42, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.stemBuses.percTops);
        noise.start(time);
        noise.stop(time + dur + 0.01);
    }

    playRaveSnare(time, velocity) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2100;
        filter.Q.value = 1.2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(velocity * 0.45, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.stemBuses.percTops);
        noise.start(time);
        noise.stop(time + 0.13);
    }

    playR4ChordStab(time, rootFreq, dur) {
        // Minor 9th chord intervals: Root, m3 (1.189), 5th (1.498), m7 (1.782), 9th (2.245)
        const ratios = [1.0, 1.1892, 1.4983, 1.7818];
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const speedBright = 900 + this.raceParams.normalizedSpeed * 2800;
        filter.frequency.setValueAtTime(speedBright, time);
        filter.frequency.exponentialRampToValueAtTime(420, time + dur);
        filter.Q.value = 2.4;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.14, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        filter.connect(gain);
        gain.connect(this.stemBuses.synthChords);

        for (let i = 0; i < ratios.length; i++) {
            const osc = this.ctx.createOscillator();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(rootFreq * ratios[i], time);
            osc.detune.value = (i - 1.5) * 7;
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + dur + 0.01);
        }
    }

    playAcid303(time, freq, isAccent) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        const peakCutoff = isAccent ? 3800 : 1650;
        filter.frequency.setValueAtTime(peakCutoff, time);
        filter.frequency.exponentialRampToValueAtTime(280, time + 0.11);
        filter.Q.value = isAccent ? 12.5 : 7.5; // Classic squelchy 303 resonance

        gain.gain.setValueAtTime(isAccent ? 0.24 : 0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.stemBuses.leadAcid);
        osc.start(time);
        osc.stop(time + 0.13);
    }

    /**
     * Triggered when two cars collide: 150ms vinyl-scratch / low-pass duck (250Hz) + impact crunch
     */
    triggerCollisionSFX(normalizedForce = 0.8) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.collisionDuckTimer = 0.22;

        // Low-pass filter slam to 250Hz then recover
        this.masterFilter.frequency.cancelScheduledValues(now);
        this.masterFilter.frequency.setValueAtTime(250, now);
        this.masterFilter.frequency.exponentialRampToValueAtTime(18500, now + 0.32);

        if (this.rekordboxMode && this.rekordbox) {
            this.rekordbox.triggerVinylScratch(normalizedForce);
        }

        // Vinyl scratch / metallic impact synth
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520 * (0.8 + normalizedForce * 0.5), now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.16);

        gain.gain.setValueAtTime(0.42 * normalizedForce, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.19);
    }

    /**
     * Triggered when exiting a drift with a charged Drift Boost
     */
    triggerDriftBoostSFX() {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.18);
        osc.frequency.exponentialRampToValueAtTime(85, now + 0.42);

        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    /**
     * Triggered when anime character boxes exchange mid-race banter
     */
    triggerBanterBlip(isRage = false) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isRage ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(isRage ? 280 : 620, now);
        osc.frequency.setValueAtTime(isRage ? 210 : 840, now + 0.04);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.10);
    }

    update(dt, raceParams) {
        Object.assign(this.raceParams, raceParams);

        // Decay beat pulse envelope smoothly
        this.state.beatPulse = Math.max(0.0, this.state.beatPulse - dt * 4.2);

        if (!this.isStarted || !this.ctx) {
            // Provide simulated pulse if audio not yet unlocked by user gesture
            const t = performance.now() * 0.001;
            const beatPhase = (t * (138 / 60)) % 1.0;
            this.state.beatPulse = Math.pow(1.0 - beatPhase, 3.0);
            this.state.subBass = 0.35 + 0.45 * this.state.beatPulse;
            this.state.lowMid = 0.3 + 0.25 * Math.sin(t * 4.0);
            this.state.highMid = 0.25 + 0.35 * this.raceParams.normalizedSpeed;
            this.state.treble = 0.2 + 0.4 * this.raceParams.normalizedSpeed;
            return;
        }

        const now = this.ctx.currentTime;

        // Update Rekordbox Dual-Deck Controller & AI DJ if in Rekordbox Mode
        if (this.rekordboxMode && this.rekordbox) {
            this.rekordbox.update(dt, this.raceParams, this.state);
        }

        // Update 5 Stem Volumes dynamically from Race & Emotion State
        const speed = Math.max(0, Math.min(1.2, this.raceParams.normalizedSpeed));
        const cockiness = this.raceParams.cockiness || 0;

        if (!this.rekordboxMode) {
            this.state.stems.kickSub = 1.0;
            this.state.stems.percTops = Math.min(1.0, 0.28 + speed * 0.72);
            this.state.stems.synthChords = 0.85;
            // Acid 303 Lead unlocks during high Cockiness (>45%), 1st place, or DROP section
            const acidTarget = (cockiness > 45 || this.raceParams.isFirstPlace || this.state.section === 'DROP')
                ? Math.min(1.0, 0.35 + (cockiness / 100) * 0.65)
                : 0.08;
            this.state.stems.leadAcid += (acidTarget - this.state.stems.leadAcid) * Math.min(1, dt * 4);
            this.state.stems.fxRisers = this.raceParams.isDrifting ? Math.min(1.0, this.raceParams.driftCharge) : 0.0;
        }

        this.stemBuses.kickSub.gain.setTargetAtTime(this.state.stems.kickSub, now, 0.05);
        this.stemBuses.percTops.gain.setTargetAtTime(this.state.stems.percTops, now, 0.05);
        this.stemBuses.synthChords.gain.setTargetAtTime(this.state.stems.synthChords, now, 0.05);
        this.stemBuses.leadAcid.gain.setTargetAtTime(this.state.stems.leadAcid, now, 0.08);

        // Drift stereo resonant filter sweep
        if (this.raceParams.isDrifting) {
            const sweepFreq = 500 + Math.min(1.0, this.raceParams.driftCharge) * 2800;
            this.driftFilter.frequency.setTargetAtTime(sweepFreq, now, 0.04);
            this.driftFilter.gain.setTargetAtTime(9.0, now, 0.04);
        } else {
            this.driftFilter.gain.setTargetAtTime(0.0, now, 0.08);
        }

        // Diegetic Landmark Loading Screen low-pass filter (muffled bass from across the bay)
        if (this.collisionDuckTimer > 0) {
            this.collisionDuckTimer -= dt;
        } else {
            const targetCutoff = this.raceParams.isLoadingMuffled ? 420 : (3500 + speed * 15000);
            this.masterFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
        }

        // Engine RPM + Drift pitch
        if (this.engineOsc1 && this.engineGain) {
            const rpmFreq = 58 + speed * 165 + (this.raceParams.isDrifting ? 28 : 0);
            this.engineOsc1.frequency.setTargetAtTime(rpmFreq, now, 0.03);
            this.engineOsc2.frequency.setTargetAtTime(rpmFreq * 1.5, now, 0.03);
            this.engineFilter.frequency.setTargetAtTime(rpmFreq * 2.5, now, 0.03);
            const engVol = this.raceParams.isLoadingMuffled ? 0.03 : (0.04 + speed * 0.07);
            this.engineGain.gain.setTargetAtTime(engVol, now, 0.05);
        }

        // Extract 4 smoothed FFT frequency bands (SubBass, LowMid, HighMid, Treble)
        this.analyser.getByteFrequencyData(this.fftData);
        let sub = 0, low = 0, high = 0, treb = 0;
        for (let i = 0; i < 6; i++) sub += this.fftData[i];
        for (let i = 6; i < 20; i++) low += this.fftData[i];
        for (let i = 20; i < 56; i++) high += this.fftData[i];
        for (let i = 56; i < 110; i++) treb += this.fftData[i];

        this.state.subBass = Math.min(1.0, (sub / (6 * 255)) * 1.35);
        this.state.lowMid = Math.min(1.0, (low / (14 * 255)) * 1.3);
        this.state.highMid = Math.min(1.0, (high / (36 * 255)) * 1.5);
        this.state.treble = Math.min(1.0, (treb / (54 * 255)) * 1.8);
    }
};
