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
            kickPulse: 0.0,
            snarePulse: 0.0,
            energy: 0.0,
            dropIntensity: 0.4,
            beatPhase: 0.0,
            barPhase: 0.0,
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
        this._prevSubBass = 0.0;
        this._prevHighMid = 0.0;

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

        // Master Lowpass filter (wide-open 20kHz butterworth during racing; gentle warm muffle only on loading screen)
        this.masterFilter = this.ctx.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = 20000;
        this.masterFilter.Q.value = 0.707;

        // Subtle synth bus warmth filter
        this.driftFilter = this.ctx.createBiquadFilter();
        this.driftFilter.type = 'peaking';
        this.driftFilter.frequency.value = 900;
        this.driftFilter.Q.value = 0.8;
        this.driftFilter.gain.value = 0;

        // Transparent Master Glue Compressor (prevents harsh pumping on mastered club tracks)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -5;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 2.0;
        this.compressor.attack.value = 0.012;
        this.compressor.release.value = 0.16;

        // FFT AnalyserNode (snappy smoothing for high-reactivity visuals)
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.62;
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
        if (!this.rekordboxMode) {
            this.scheduleTimer = setInterval(() => this.scheduler(), 25);
        }
    }

    setRekordboxMode(enabled) {
        this.rekordboxMode = !!enabled;
        if (this.ctx && this.synthMasterBus && this.rekordboxBus) {
            const now = this.ctx.currentTime;
            this.rekordboxBus.gain.setTargetAtTime(this.rekordboxMode ? 1.0 : 0.0, now, 0.04);
            this.synthMasterBus.gain.setTargetAtTime(this.rekordboxMode ? 0.0 : 1.0, now, 0.04);
            if (this.rekordboxMode && this.scheduleTimer) {
                clearInterval(this.scheduleTimer);
                this.scheduleTimer = null;
            } else if (!this.rekordboxMode && !this.scheduleTimer) {
                this.nextNoteTime = this.ctx.currentTime + 0.05;
                this.scheduleTimer = setInterval(() => this.scheduler(), 25);
            }
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
     * Triggered when two cars collide: subtle, clean low-end bump SFX that never ducks, filters, or detunes the music
     */
    triggerCollisionSFX(normalizedForce = 0.8) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Soft, unobtrusive chassis thud underneath the music
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(135 * (0.85 + normalizedForce * 0.25), now);
        osc.frequency.exponentialRampToValueAtTime(46, now + 0.11);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);

        gain.gain.setValueAtTime(0.11 * normalizedForce, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    /**
     * Triggered when exiting a drift with a charged Drift Boost (scales pitch & punch by R4 Tier 1..3)
     */
    triggerDriftBoostSFX(boostTier = 1) {
        if (!this.isStarted || !this.ctx) return;
        const tier = Math.max(1, Math.min(3, Number(boostTier) || 1));
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const startFreq = 140 + tier * 25;
        const peakFreq = 330 + tier * 105;
        const endFreq = 95 + tier * 15;
        const dur = 0.26 + tier * 0.07;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(peakFreq, now + dur * 0.45);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

        gain.gain.setValueAtTime(0.08 + tier * 0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.02);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + dur + 0.03);
    }

    /**
     * Triggered when anime character boxes exchange mid-race banter
     */
    triggerBanterBlip(isRage = false) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isRage ? 310 : 580, now);
        osc.frequency.setValueAtTime(isRage ? 240 : 740, now + 0.04);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * Triggered on 3-2-1-GO starting grid countdown ticks
     */
    triggerCountdownSFX(stage = 'TICK') {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.state.beatPulse = stage === 'GO' ? 1.0 : 0.75;

        if (stage === 'GO') {
            // Explosive R4 / Arcade Launch Synth Chord Stab + Sub Drop
            const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5 Major 7 / Rave Stab
            freqs.forEach((f, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(f * 0.98, now);
                osc.frequency.exponentialRampToValueAtTime(f, now + 0.04);

                gain.gain.setValueAtTime(0.09, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.56);
            });
            return;
        }

        // Crisp 3..2..1 Arcade Beep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const baseFreq = stage === 1 ? 587.33 : 440.0; // D5 on '1', A4 on '3' & '2'
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    /**
     * Triggered when completing a lap at the Start/Finish line
     */
    triggerLapCompleteSFX(isFinalLap = false) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = isFinalLap ? [523.25, 659.25, 783.99, 1046.50] : [440.0, 554.37, 659.25];
        notes.forEach((freq, i) => {
            const t = now + i * 0.065;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.25);
        });
    }

    /**
     * Triggered when crossing the Checkered Flag at the end of the race
     */
    triggerRaceFinishSFX(rank = 1) {
        if (!this.isStarted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = rank === 1
            ? [523.25, 659.25, 783.99, 1046.50, 1318.51]
            : [440.0, 523.25, 659.25, 880.0];
        notes.forEach((freq, i) => {
            const t = now + i * 0.085;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = i === notes.length - 1 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            const dur = i === notes.length - 1 ? 0.65 : 0.26;
            gain.gain.setValueAtTime(0.13, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        });
    }

    update(dt, raceParams) {
        Object.assign(this.raceParams, raceParams);

        // Decay transient envelopes smoothly
        this.state.beatPulse = Math.max(0.0, this.state.beatPulse - dt * 3.8);
        this.state.kickPulse = Math.max(0.0, (this.state.kickPulse || 0.0) - dt * 4.5);
        this.state.snarePulse = Math.max(0.0, (this.state.snarePulse || 0.0) - dt * 5.2);

        const tSec = performance.now() * 0.001;
        const activeBpm = Math.max(60, this.state.bpm || 138);
        this.state.beatPhase = (tSec * (activeBpm / 60.0)) % 1.0;
        this.state.barPhase = (tSec * (activeBpm / 240.0)) % 1.0;

        if (!this.isStarted || !this.ctx) {
            // Provide simulated musical pulse if audio not yet unlocked by user gesture
            this.state.beatPulse = Math.pow(1.0 - this.state.beatPhase, 2.6);
            this.state.kickPulse = this.state.beatPulse;
            this.state.snarePulse = Math.pow(1.0 - ((this.state.beatPhase + 0.5) % 1.0), 3.2) * 0.8;
            this.state.subBass = 0.42 + 0.52 * this.state.beatPulse;
            this.state.lowMid = 0.38 + 0.32 * Math.sin(tSec * 4.2);
            this.state.highMid = 0.32 + 0.42 * (0.5 + 0.5 * Math.sin(tSec * 7.5));
            this.state.treble = 0.28 + 0.45 * this.state.snarePulse;
            this.state.energy = 0.55 + 0.35 * this.state.beatPulse;
            this.state.dropIntensity = 0.65;
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
            this.state.stems.percTops = Math.min(1.0, 0.45 + speed * 0.55);
            this.state.stems.synthChords = 0.88;
            // Acid 303 Lead unlocks during high Cockiness (>45%), 1st place, or DROP section
            const acidTarget = (cockiness > 45 || this.raceParams.isFirstPlace || this.state.section === 'DROP')
                ? Math.min(1.0, 0.35 + (cockiness / 100) * 0.65)
                : 0.12;
            this.state.stems.leadAcid += (acidTarget - this.state.stems.leadAcid) * Math.min(1, dt * 4);
            this.state.stems.fxRisers = this.raceParams.isDrifting ? Math.min(1.0, this.raceParams.driftCharge) : 0.0;
        }

        this.stemBuses.kickSub.gain.setTargetAtTime(this.state.stems.kickSub, now, 0.05);
        this.stemBuses.percTops.gain.setTargetAtTime(this.state.stems.percTops, now, 0.05);
        this.stemBuses.synthChords.gain.setTargetAtTime(this.state.stems.synthChords, now, 0.05);
        this.stemBuses.leadAcid.gain.setTargetAtTime(this.state.stems.leadAcid, now, 0.08);

        // Keep synth bus filter flat/transparent so driving interactions never color the music harshly
        this.driftFilter.gain.setTargetAtTime(0.0, now, 0.08);

        // Keep Master Filter wide open (20kHz) during all racing; only gently muffle during Landmark loading overlay
        const targetCutoff = this.raceParams.isLoadingMuffled ? 950 : 20000;
        this.masterFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);
        this.masterFilter.Q.setTargetAtTime(0.707, now, 0.08);

        // Subtle Engine RPM hum (kept well underneath the music mix)
        if (this.engineOsc1 && this.engineGain) {
            const rpmFreq = 58 + speed * 155 + (this.raceParams.isDrifting ? 18 : 0);
            this.engineOsc1.frequency.setTargetAtTime(rpmFreq, now, 0.03);
            this.engineOsc2.frequency.setTargetAtTime(rpmFreq * 1.5, now, 0.03);
            this.engineFilter.frequency.setTargetAtTime(rpmFreq * 2.2, now, 0.03);
            const engVol = this.raceParams.isLoadingMuffled ? 0.015 : (0.02 + speed * 0.035);
            this.engineGain.gain.setTargetAtTime(engVol, now, 0.05);
        }

        // Extract 4 smoothed FFT frequency bands (SubBass, LowMid, HighMid, Treble) + Real-Time Transient Detectors
        this.analyser.getByteFrequencyData(this.fftData);
        let sub = 0, low = 0, high = 0, treb = 0;
        for (let i = 0; i < 6; i++) sub += this.fftData[i];
        for (let i = 6; i < 20; i++) low += this.fftData[i];
        for (let i = 20; i < 56; i++) high += this.fftData[i];
        for (let i = 56; i < 110; i++) treb += this.fftData[i];

        // Use an expressive power curve so quiet/mid sections don't saturate at 1.0 all the time
        const rawSub = Math.min(1.0, Math.pow(sub / (6 * 255), 1.28) * 1.25);
        const rawLow = Math.min(1.0, Math.pow(low / (14 * 255), 1.25) * 1.20);
        const rawHigh = Math.min(1.0, Math.pow(high / (36 * 255), 1.25) * 1.32);
        const rawTreb = Math.min(1.0, Math.pow(treb / (54 * 255), 1.22) * 1.50);

        const instantEnergy = Math.min(1.0, rawSub * 0.38 + rawLow * 0.24 + rawHigh * 0.22 + rawTreb * 0.16);
        this.state.energy = (this.state.energy || 0.0) * 0.84 + instantEnergy * 0.16;

        // Compute overall Song Position / Section Intensity (0.08 in Intro/Breakdown -> 0.42 in Groove -> 0.85+ in Drop)
        let targetDrop = this.state.targetSongIntensity;
        if (targetDrop === undefined) {
            targetDrop = this.state.section === 'DROP' ? 0.95
                : (this.state.section === 'PRE_DROP' ? 0.62
                    : (this.state.section === 'BREAKDOWN' ? 0.15 : 0.40));
            targetDrop = targetDrop * 0.75 + this.state.energy * 0.25;
        }
        const curDrop = this.state.dropIntensity ?? 0.35;
        const interpRate = targetDrop > curDrop ? 4.8 : 2.0; // Fast punch into Drops, smooth release into Breakdowns
        this.state.dropIntensity = curDrop + (targetDrop - curDrop) * Math.min(1.0, dt * interpRate);

        const sectionScale = 0.22 + this.state.dropIntensity * 0.78;

        // Detect real-time kick / bass and snare / synth transients scaled by current song section intensity
        const subDelta = rawSub - this._prevSubBass;
        const highDelta = rawHigh - this._prevHighMid;
        this._prevSubBass = rawSub;
        this._prevHighMid = rawHigh;

        if (subDelta > 0.075 || (rawSub > 0.76 && subDelta > 0.03)) {
            const kickStrength = Math.min(1.0, (0.55 + subDelta * 3.2) * sectionScale);
            this.state.kickPulse = Math.max(this.state.kickPulse, kickStrength);
            this.state.beatPulse = Math.max(this.state.beatPulse, kickStrength * 0.90);
        }
        if (highDelta > 0.065 || (rawTreb > 0.70 && highDelta > 0.025)) {
            this.state.snarePulse = Math.max(this.state.snarePulse, Math.min(1.0, (0.55 + highDelta * 3.4) * sectionScale));
        }

        // Modulate exposed visual spectrum bands by song section intensity so calm sections stay composed and Drops explode!
        this.state.subBass = rawSub * (0.30 + this.state.dropIntensity * 0.70);
        this.state.lowMid = rawLow * (0.32 + this.state.dropIntensity * 0.68);
        this.state.highMid = rawHigh * (0.30 + this.state.dropIntensity * 0.70);
        this.state.treble = rawTreb * (0.28 + this.state.dropIntensity * 0.72);

        // In Rekordbox Dual-Deck Mode, drive the 5 HUD stem visualizer channels from live FFT & active deck stem pads
        if (this.rekordboxMode) {
            const masterDeck = this.rekordbox && typeof this.rekordbox.getMasterDeck === 'function'
                ? this.rekordbox.getMasterDeck()
                : null;
            const drumGate = (!masterDeck || !masterDeck.stems || masterDeck.stems.drums !== false) ? 1.0 : 0.15;
            const vocalGate = (!masterDeck || !masterDeck.stems || masterDeck.stems.vocal !== false) ? 1.0 : 0.15;
            const instGate = (!masterDeck || !masterDeck.stems || masterDeck.stems.inst !== false) ? 1.0 : 0.15;

            this.state.stems.kickSub = Math.min(1.0, (0.22 + this.state.subBass * 0.65 + this.state.kickPulse * 0.35) * drumGate);
            this.state.stems.percTops = Math.min(1.0, (0.20 + this.state.treble * 0.68 + this.state.snarePulse * 0.32) * instGate);
            this.state.stems.synthChords = Math.min(1.0, (0.24 + this.state.lowMid * 0.66 + this.state.beatPulse * 0.22) * vocalGate);
            const acidDrive = (cockiness > 45 || this.raceParams.isFirstPlace) ? 0.25 : 0.08;
            this.state.stems.leadAcid = Math.min(1.0, (acidDrive + this.state.highMid * 0.72) * instGate);
            const driftRiser = this.raceParams.isDrifting ? Math.min(0.65, (this.raceParams.driftCharge || 0) * 0.65) : 0.0;
            this.state.stems.fxRisers = Math.min(1.0, 0.10 + this.state.dropIntensity * 0.45 + driftRiser + this.state.snarePulse * 0.25);
        }
    }
};
