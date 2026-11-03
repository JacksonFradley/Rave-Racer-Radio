/**
 * RAVE RACER REMIX — Human-in-the-Loop AI DJ Transition Trainer & RLHF Studio
 *
 * Trains "DJ KINETIX" directly on human opinion via:
 * 1. 18-Dimensional Acoustic & Musical Feature Vector + Online Regularized Preference Learner (θ)
 * 2. Contextual Style & Phrase-Length Policy Learner (BASS_SWAP, UKG_DUB_SPIN, STEM_VOCAL, LOOP_ROLL, ECHO_FREEZE_CUT × 4/8/16/32B)
 * 3. Per-Track Ground-Truth Cue & Vocal Overrides (1-click ±4B / ±8B Drop & Mix-Out phrase nudges, Trim & Vocal Guard overrides)
 * 4. Explicit Pairwise Human Affinity Memory (Gold-listing 4–5★ transitions & vetoing 1–2★ trainwrecks)
 * 5. "15-Second Sweet-Spot" Snippet Audition Engine with Instant Replay, Style A/B Switching, and Active-Learning Queue
 */
window.RRR = window.RRR || {};

RRR.DJTransitionTrainer = class DJTransitionTrainer {
    static STORAGE_KEY = 'rrr_dj_rlhf_model_v1';

    static STYLES = [
        { id: 'BASS_SWAP',       label: '🔊 BASS SWAP',       short: 'BASS SWAP' },
        { id: 'UKG_DUB_SPIN',    label: '🌀 UKG DUB SPIN',    short: 'UKG SPIN' },
        { id: 'STEM_VOCAL',      label: '🎤 STEM VOCAL',      short: 'STEM VOCAL' },
        { id: 'LOOP_ROLL',       label: '🔁 LOOP ROLL',       short: 'LOOP ROLL' },
        { id: 'ECHO_FREEZE_CUT', label: '❄️ ECHO FREEZE',     short: 'ECHO CUT' }
    ];

    static BAR_LENGTHS = [4, 8, 16, 32];

    static DIAGNOSTIC_TAGS = [
        { id: 'drop_spot_on',  label: '🎯 Drop Spot-On',     type: 'pos', desc: 'Incoming drop landed on the exact right phrase downbeat' },
        { id: 'harmonic_fire', label: '🎹 Harmonic Bliss',   type: 'pos', desc: 'Keys & basslines blended melodically' },
        { id: 'clean_bass',    label: '🔊 Clean Bass Swap',  type: 'pos', desc: 'Low-end handoff felt punchy and seamless' },
        { id: 'style_fits',    label: '🔥 Style Fits Vibe',  type: 'pos', desc: 'Transition technique & bar length matched the tracks' },
        { id: 'drop_off',      label: '⏱️ Drop Early/Late',  type: 'neg', desc: 'Incoming track landed on a fake-out, build, or wrong phrase' },
        { id: 'vocal_clash',   label: '🗣️ Vocal Clash',      type: 'neg', desc: 'Competing vocals or busy midrange collided during build' },
        { id: 'muddy_bass',    label: '💥 Muddy / Weak Bass', type: 'neg', desc: 'Sub-bass clashed or volume dipped at the swap point' },
        { id: 'wrong_style',   label: '🎛️ Wrong Style/Len',  type: 'neg', desc: 'Transition FX or bar length felt unnatural for this pair' }
    ];

    static FEATURE_META = [
        { key: 'bpmSweetSpot',       label: 'BPM Pocket (±3.5%)',      prior: 18.0 },
        { key: 'bpmStretchPenalty',  label: 'Wide BPM Stretch (>6.5%)', prior: -26.0 },
        { key: 'harmUnison',         label: 'Unison Key (0)',          prior: 22.0 },
        { key: 'harmFifth',          label: 'Fifth Step (±1)',         prior: 21.0 },
        { key: 'harmRelative',       label: 'Relative / Tonic Maj↔Min', prior: 19.0 },
        { key: 'harmBoostOrDiag',    label: 'Energy Boost (+2 / Diag)', prior: 14.0 },
        { key: 'harmClash',          label: 'Dissonant Key Jump',      prior: -32.0 },
        { key: 'energyMomentum',     label: 'Energy Step-Up Arc',      prior: 12.0 },
        { key: 'dropImpactPunch',    label: 'Incoming Drop Punch',     prior: 24.0 },
        { key: 'subBassPocketMatch', label: 'Sub-Bass Timbre Match',   prior: 16.0 },
        { key: 'vocalClashRisk',     label: 'Dual-Vocal Clash Risk',   prior: -28.0 },
        { key: 'highHatPercMatch',   label: 'Hi-Hat / Groove Match',   prior: 14.0 },
        { key: 'styleUkgFit',        label: 'UKG Style × Fast Tempo',  prior: 15.0 },
        { key: 'styleBassSwapFit',   label: 'Bass-Swap × House Groove', prior: 15.0 },
        { key: 'styleStemVocalFit',  label: 'Stem-Float × Vocal Pocket', prior: 14.0 },
        { key: 'styleLoopRollFit',   label: 'Loop-Roll × Peak Drop',   prior: 12.0 },
        { key: 'runwayLengthFit',    label: 'Pre-Drop Runway Fit',     prior: 16.0 },
        { key: 'bias',               label: 'Baseline Calibration',    prior: 52.0 }
    ];

    constructor(rekordboxController) {
        this.rb = rekordboxController;
        RRR.DJTransitionTrainer.instance = this;

        this.isOpen = false;
        this.snippetModeEnabled = true;
        this.samplingMode = 'SMART'; // 'SMART' | 'EXPLOIT' | 'EXPLORE' | 'LOCK_D1'
        this.preRollBars = 2;        // 2 bars of outgoing track alone before transition starts
        this.postDropHoldBars = 4;   // 4 bars of incoming drop before prompting/holding
        this.selectedTags = new Set();

        // Active Audition Session State
        this.auditionState = {
            active: false,
            phase: 'IDLE', // 'IDLE' | 'PRE_ROLL' | 'TRANSITIONING' | 'POST_DROP' | 'AWAITING_RATING'
            preRollTimerSec: 0.0,
            preRollTotalSec: 0.0,
            postDropTimerSec: 0.0,
            postDropTotalSec: 0.0,
            fromCrateId: null,
            toCrateId: null,
            fromSongSig: '',
            toSongSig: '',
            fromTitle: '',
            toTitle: '',
            style: 'BASS_SWAP',
            buildBars: 8,
            outStartSec: 0.0,
            inDropTargetSec: 0.0,
            predictedScore: 75,
            predictedStars: 3.8,
            featureVector: null,
            ratedInCurrentRun: false
        };

        this.model = this.loadModel();
        this.applyAllTrackOverridesToCrate();
    }

    createDefaultModel() {
        const weights = {};
        for (const f of RRR.DJTransitionTrainer.FEATURE_META) {
            weights[f.key] = f.prior;
        }
        return {
            version: 1,
            totalRatings: 0,
            ratingSum: 0,
            learningRate: 2.6,
            weights,
            styleBiases: {
                BASS_SWAP: 2.0,
                UKG_DUB_SPIN: 1.5,
                STEM_VOCAL: 1.0,
                LOOP_ROLL: 1.0,
                ECHO_FREEZE_CUT: 1.5
            },
            barBiases: {
                4: -1.0,
                8: 3.0,
                16: 3.5,
                32: 0.5
            },
            trackOverrides: {}, // songSig -> { dropOffsetBars, mixOutOffsetBars, trimOffsetDb, forceVocalGuard, preferredStyles, preferredBars }
            pairMemory: {},     // "sigA::sigB" -> { rating, count, bestStyle, bestBars, tags, updatedAt, titleA, titleB }
            history: []         // Last 150 ratings with prediction vs actual
        };
    }

    loadModel() {
        const def = this.createDefaultModel();
        try {
            const raw = window.localStorage ? window.localStorage.getItem(RRR.DJTransitionTrainer.STORAGE_KEY) : null;
            if (!raw) return def;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return def;
            return {
                ...def,
                ...parsed,
                weights: { ...def.weights, ...(parsed.weights || {}) },
                styleBiases: { ...def.styleBiases, ...(parsed.styleBiases || {}) },
                barBiases: { ...def.barBiases, ...(parsed.barBiases || {}) },
                trackOverrides: parsed.trackOverrides || {},
                pairMemory: parsed.pairMemory || {},
                history: Array.isArray(parsed.history) ? parsed.history.slice(0, 150) : []
            };
        } catch (e) {
            return def;
        }
    }

    saveModel() {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(RRR.DJTransitionTrainer.STORAGE_KEY, JSON.stringify(this.model));
            }
        } catch (e) {}
    }

    resetModelToDefaults() {
        this.model = this.createDefaultModel();
        this.saveModel();
        this.applyAllTrackOverridesToCrate();
        if (this.onUIUpdate) this.onUIUpdate();
    }

    /**
     * Applies any human-saved cue offsets (Drop ±Bars, Mix-Out ±Bars, Trim dB, Vocal Guard)
     * to a track's analysis object so both Trainer Mode and Race Mode use corrected landmarks!
     */
    applyTrackOverrideToAnalysis(analysis) {
        if (!analysis) return;
        const sig = RRR.CamelotWheel.getSongSignature(analysis);
        if (!sig) return;

        // Preserve original auto-detected landmarks before applying bar offsets
        if (typeof analysis._origDropTargetSec !== 'number') {
            analysis._origDropTargetSec = analysis.dropTargetSec ?? analysis.firstBeatSec ?? 0.0;
        }
        if (typeof analysis._origMixOutSec !== 'number') {
            analysis._origMixOutSec = analysis.mixOutSec ?? Math.max(0, (analysis.duration || 180) - (analysis.barIntervalSec || 1.8) * 16);
        }
        if (typeof analysis._origAutoTrimDb !== 'number') {
            analysis._origAutoTrimDb = analysis.autoTrimDb ?? 0.0;
        }

        const ov = this.model?.trackOverrides?.[sig];
        const barSec = analysis.barIntervalSec || (240.0 / Math.max(60, analysis.bpm || 132));
        const minSec = analysis.firstBeatSec || 0.0;
        const maxSec = Math.max(minSec + barSec * 4, (analysis.duration || 180) - barSec * 4);

        if (ov) {
            const dropDeltaSec = (ov.dropOffsetBars || 0) * barSec;
            const mixOutDeltaSec = (ov.mixOutOffsetBars || 0) * barSec;

            analysis.dropTargetSec = Math.max(minSec + barSec * 4, Math.min(maxSec, analysis._origDropTargetSec + dropDeltaSec));
            analysis.preDropMixInSec = Math.max(minSec, analysis.dropTargetSec - barSec * 8);
            analysis.mixInSec = analysis.preDropMixInSec;
            analysis.mixOutSec = Math.max(minSec + barSec * 8, Math.min(maxSec, analysis._origMixOutSec + mixOutDeltaSec));
            analysis.autoTrimDb = Number(Math.max(-9.0, Math.min(9.0, analysis._origAutoTrimDb + (ov.trimOffsetDb || 0))).toFixed(1));
            analysis.humanForceVocalGuard = !!ov.forceVocalGuard;

            // Keep Hot Cue D (Main Drop 1) and Hot Cue H (Mix-Out Link) synced with human nudges
            if (Array.isArray(analysis.hotCues)) {
                if (analysis.hotCues[2]) analysis.hotCues[2].timeSec = analysis.preDropMixInSec;
                if (analysis.hotCues[3]) analysis.hotCues[3].timeSec = analysis.dropTargetSec;
                if (analysis.hotCues[7]) analysis.hotCues[7].timeSec = analysis.mixOutSec;
            }
        } else {
            analysis.dropTargetSec = analysis._origDropTargetSec;
            analysis.preDropMixInSec = Math.max(minSec, analysis._origDropTargetSec - barSec * 8);
            analysis.mixInSec = analysis.preDropMixInSec;
            analysis.mixOutSec = analysis._origMixOutSec;
            analysis.autoTrimDb = analysis._origAutoTrimDb;
            analysis.humanForceVocalGuard = false;
        }
    }

    applyAllTrackOverridesToCrate() {
        if (!this.rb || !Array.isArray(this.rb.crate)) return;
        for (const item of this.rb.crate) {
            if (item && item.analysis) {
                this.applyTrackOverrideToAnalysis(item.analysis);
            }
        }
    }

    /**
     * Helper to sample average 3-band [r, g, b, peak] energy from `overviewWaveform` in a time window [t0, t1].
     */
    sampleWaveformWindow(analysis, t0, t1) {
        if (!analysis || !Array.isArray(analysis.overviewWaveform) || analysis.overviewWaveform.length === 0) {
            return { r: 0.42, g: 0.32, b: 0.28, peak: 0.75, crest: 0.30 };
        }
        const ov = analysis.overviewWaveform;
        const dur = Math.max(1.0, analysis.duration || 180.0);
        const i0 = Math.max(0, Math.min(ov.length - 1, Math.floor((t0 / dur) * ov.length)));
        const i1 = Math.max(i0 + 1, Math.min(ov.length, Math.ceil((t1 / dur) * ov.length)));

        let rSum = 0, gSum = 0, bSum = 0, pkSum = 0, rSq = 0;
        const cnt = Math.max(1, i1 - i0);
        for (let i = i0; i < i1; i++) {
            const col = ov[i] || {};
            const r = col.r ?? 0.4;
            const g = col.g ?? 0.3;
            const b = col.b ?? 0.3;
            const pk = col.peak ?? Math.max(r, g, b);
            rSum += r;
            gSum += g;
            bSum += b;
            pkSum += pk;
            rSq += r * r;
        }
        const rMean = rSum / cnt;
        const rVar = Math.max(0, rSq / cnt - rMean * rMean);
        return {
            r: rMean,
            g: gSum / cnt,
            b: bSum / cnt,
            peak: pkSum / cnt,
            crest: Math.min(1.0, Math.sqrt(rVar) * 3.2)
        };
    }

    /**
     * Extracts the 18-dimensional normalized feature vector x(outAnalysis, inAnalysis, style, buildBars)
     * used to predict transition quality (0..100 score / 1..5★) and update RLHF weights!
     */
    extractTransitionFeatures(outAnalysis, inAnalysis, style = 'BASS_SWAP', buildBars = 8, masterTempoEnabled = true) {
        if (!outAnalysis || !inAnalysis) return null;

        const mBpm = outAnalysis.bpm || 132.0;
        const cBpm = inAnalysis.bpm || 132.0;
        const bestBpmDiff = Math.min(
            Math.abs(cBpm - mBpm),
            Math.abs(cBpm * 2.0 - mBpm),
            Math.abs(cBpm * 0.5 - mBpm)
        );
        const bpmPct = (bestBpmDiff / Math.max(60, mBpm)) * 100.0;
        const impliedRatio = mBpm / Math.max(60, cBpm);

        const bpmSweetSpot = Math.max(0.0, 1.0 - bpmPct / 5.0);
        const bpmStretchPenalty = bpmPct > 6.0 ? Math.min(1.0, (bpmPct - 6.0) / 8.0) : 0.0;

        const outKey = outAnalysis.camelot || outAnalysis.camelotCode || outAnalysis.key || '8A';
        const inEffKey = RRR.CamelotWheel.getEffectivePitchedCamelot(
            inAnalysis.camelot || inAnalysis.camelotCode || inAnalysis.key || '8A',
            impliedRatio,
            0,
            masterTempoEnabled
        );
        const harm = RRR.CamelotWheel.getHarmonicRelation(outKey, inEffKey);

        const harmUnison = harm.type === 'UNISON' ? 1.0 : 0.0;
        const harmFifth = harm.type === 'FIFTH' ? 1.0 : 0.0;
        const harmRelative = (harm.type === 'RELATIVE' || harm.type === 'PARALLEL_TONIC') ? 1.0 : 0.0;
        const harmBoostOrDiag = (harm.type === 'ENERGY_BOOST' || harm.type === 'DIAGONAL') ? 1.0 : 0.0;
        const harmClash = !harm.isHarmonic ? Math.min(1.0, Math.max(0.3, (harm.wheelDist || 3) / 6.0)) : 0.0;

        // Acoustic window analysis around Mix-Out and Incoming Pre-Drop / Main Drop
        const outBarSec = outAnalysis.barIntervalSec || 1.818;
        const inBarSec = inAnalysis.barIntervalSec || 1.818;
        const outMixSec = outAnalysis.mixOutSec || (outAnalysis.duration * 0.72);
        const inDropSec = inAnalysis.dropTargetSec || (inBarSec * 8);
        const spanBars = Math.max(4, buildBars || 8);

        const outBuildWin = this.sampleWaveformWindow(outAnalysis, outMixSec, outMixSec + spanBars * outBarSec);
        const inPreDropWin = this.sampleWaveformWindow(inAnalysis, Math.max(0, inDropSec - spanBars * inBarSec), inDropSec);
        const inDropWin = this.sampleWaveformWindow(inAnalysis, inDropSec, inDropSec + 8 * inBarSec);

        // Energy momentum
        const eDiff = ((inAnalysis.energyRating || 7) - (outAnalysis.energyRating || 7)) / 5.0;
        const energyMomentum = Math.max(-0.6, Math.min(1.0, 0.5 + eDiff * 0.5));

        // How hard the incoming Main Drop punches relative to its Pre-Drop build
        const dropContrast = (inDropWin.r * 1.35 + inDropWin.peak * 0.65) - (inPreDropWin.r * 0.85 + inPreDropWin.peak * 0.35);
        const dropImpactPunch = Math.max(0.0, Math.min(1.0, dropContrast * 1.25 + inDropWin.r * 0.45));

        // Sub-bass compatibility between outgoing groove and incoming drop
        const subBassPocketMatch = Math.max(0.0, 1.0 - Math.abs(outBuildWin.r - inDropWin.r) * 2.2);

        // Mid-range / vocal formant collision risk during the layered build
        const rawVocalOverlap = (outBuildWin.g * 1.4) * (inPreDropWin.g * 1.4);
        const vocalMitigated = style === 'STEM_VOCAL' || outAnalysis.humanForceVocalGuard || inAnalysis.humanForceVocalGuard;
        const vocalClashRisk = Math.max(0.0, Math.min(1.0, (rawVocalOverlap - 0.12) * (vocalMitigated ? 0.45 : 1.6)));

        // High-frequency hi-hat & groove similarity
        const highHatPercMatch = Math.max(0.0, 1.0 - Math.abs(outBuildWin.b - inDropWin.b) * 2.0);

        // Style × Track Context interactions
        const avgBpm = (mBpm + cBpm) * 0.5;
        const isFastUkg = avgBpm >= 134.0 ? 1.0 : Math.max(0.0, (avgBpm - 129.0) / 5.0);
        const isHousePocket = (avgBpm >= 122.0 && avgBpm <= 133.5) ? 1.0 : 0.3;

        const styleUkgFit = (style === 'UKG_DUB_SPIN' || style === 'ECHO_FREEZE_CUT') ? isFastUkg : 0.0;
        const styleBassSwapFit = style === 'BASS_SWAP' ? (isHousePocket * 0.65 + subBassPocketMatch * 0.35) : 0.0;
        const styleStemVocalFit = style === 'STEM_VOCAL'
            ? ((outAnalysis.hasVocalPhrases || inAnalysis.hasVocalPhrases) ? 0.9 : 0.25)
            : 0.0;
        const styleLoopRollFit = style === 'LOOP_ROLL' ? Math.min(1.0, dropImpactPunch * 1.1) : 0.0;

        // Pre-drop runway fit for chosen buildBars
        const availRunwayBars = Math.max(0, (inDropSec - (inAnalysis.firstBeatSec || 0)) / inBarSec);
        const runwayDiff = Math.abs(availRunwayBars - spanBars);
        const runwayLengthFit = availRunwayBars >= spanBars * 0.75
            ? Math.max(0.25, 1.0 - Math.max(0, spanBars - availRunwayBars) * 0.15)
            : Math.max(0.0, 1.0 - runwayDiff / 16.0);

        return {
            bpmSweetSpot,
            bpmStretchPenalty,
            harmUnison,
            harmFifth,
            harmRelative,
            harmBoostOrDiag,
            harmClash,
            energyMomentum,
            dropImpactPunch,
            subBassPocketMatch,
            vocalClashRisk,
            highHatPercMatch,
            styleUkgFit,
            styleBassSwapFit,
            styleStemVocalFit,
            styleLoopRollFit,
            runwayLengthFit,
            bias: 1.0
        };
    }

    /**
     * Predicts transition quality (0..100 score and 1.0..5.0★) using the learned RLHF model!
     */
    predictTransitionQuality(outAnalysis, inAnalysis, style = 'BASS_SWAP', buildBars = 8, masterTempoEnabled = true) {
        const feats = this.extractTransitionFeatures(outAnalysis, inAnalysis, style, buildBars, masterTempoEnabled);
        if (!feats) return { score: 50, stars: 3.0, feats: null, pairRecord: null };

        const w = this.model.weights;
        let rawScore = 0.0;
        for (const f of RRR.DJTransitionTrainer.FEATURE_META) {
            rawScore += (w[f.key] ?? f.prior) * (feats[f.key] ?? 0.0);
        }

        // Add global style & bar-length biases
        rawScore += (this.model.styleBiases?.[style] || 0.0);
        rawScore += (this.model.barBiases?.[buildBars] || 0.0);

        // Add per-track style/bar preferences
        const outSig = RRR.CamelotWheel.getSongSignature(outAnalysis);
        const inSig = RRR.CamelotWheel.getSongSignature(inAnalysis);
        const inOv = this.model.trackOverrides?.[inSig];
        const outOv = this.model.trackOverrides?.[outSig];
        if (inOv?.preferredStyles?.[style]) rawScore += inOv.preferredStyles[style];
        if (outOv?.preferredStyles?.[style]) rawScore += outOv.preferredStyles[style] * 0.6;
        if (inOv?.preferredBars?.[buildBars]) rawScore += inOv.preferredBars[buildBars];

        // Check explicit pairwise memory
        const pairKey = `${outSig}::${inSig}`;
        const pairRecord = this.model.pairMemory?.[pairKey] || null;
        if (pairRecord) {
            const pairDelta = (pairRecord.rating - 3.0) * 14.0;
            rawScore += pairDelta;
            if (pairRecord.bestStyle === style && pairRecord.rating >= 4) rawScore += 5.0;
            if (pairRecord.bestBars === buildBars && pairRecord.rating >= 4) rawScore += 3.5;
        }

        const clampedScore = Math.max(5.0, Math.min(99.0, rawScore));
        const stars = Number(Math.max(1.0, Math.min(5.0, 1.0 + (clampedScore / 100.0) * 4.0)).toFixed(1));
        return {
            score: clampedScore,
            stars,
            feats,
            pairRecord
        };
    }

    /**
     * Evaluates the learned RLHF bonus/penalty for `RRR.CamelotWheel.scoreCandidateTrack`
     * so live races and auto-mixing immediately benefit from all human training!
     */
    evaluateCandidateBonus(masterAnalysis, candidateItem, masterTempoEnabled = true) {
        if (!masterAnalysis || !candidateItem || !candidateItem.analysis) return 0;
        const candAnalysis = candidateItem.analysis;
        const bestRec = this.recommendStyleAndBars(masterAnalysis, candAnalysis, masterTempoEnabled);
        const pred = bestRec.prediction;

        // Convert learned model score (centered around 68) into a candidate ranking modifier
        let rlhfBonus = (pred.score - 68.0) * 1.45;

        // Explicit pairwise human rating memory (Gold-list 4–5★, strongly veto 1–2★)
        if (pred.pairRecord) {
            const r = pred.pairRecord.rating;
            if (r >= 4.5) rlhfBonus += 145;
            else if (r >= 3.8) rlhfBonus += 85;
            else if (r <= 1.5) rlhfBonus -= 650; // Hard human veto on 1★ trainwrecks
            else if (r <= 2.4) rlhfBonus -= 380; // Strong penalty on 2★ clashes
        }

        return rlhfBonus;
    }

    /**
     * Recommends the highest-scoring (Style, BuildBars) combination for a track pair using the learned model!
     */
    recommendStyleAndBars(outAnalysis, inAnalysis, masterTempoEnabled = true, exploreStochastic = false) {
        const candidates = [];
        const styles = RRR.DJTransitionTrainer.STYLES.map((s) => s.id);
        const barsList = [8, 16, 4, 32];

        for (const st of styles) {
            for (const b of barsList) {
                // Skip 32-bar loops on cut-oriented styles unless explicitly selected
                if (b === 32 && (st === 'ECHO_FREEZE_CUT' || st === 'UKG_DUB_SPIN')) continue;
                const prediction = this.predictTransitionQuality(outAnalysis, inAnalysis, st, b, masterTempoEnabled);
                candidates.push({ style: st, buildBars: b, prediction });
            }
        }

        candidates.sort((a, b) => b.prediction.score - a.prediction.score);
        if (!exploreStochastic || candidates.length <= 1) {
            return candidates[0] || { style: 'BASS_SWAP', buildBars: 8, prediction: { score: 70, stars: 3.8 } };
        }

        // Softmax exploration over top 5 style/bar combinations during training
        const topSlice = candidates.slice(0, 5);
        const maxSc = topSlice[0].prediction.score;
        const temp = 6.5;
        let wSum = 0;
        const weights = topSlice.map((c) => {
            const w = Math.exp((c.prediction.score - maxSc) / temp);
            wSum += w;
            return w;
        });
        let r = Math.random() * wSum;
        for (let i = 0; i < topSlice.length; i++) {
            r -= weights[i];
            if (r <= 0) return topSlice[i];
        }
        return topSlice[0];
    }

    /**
     * Records a Human Rating (1..5★) + Diagnostic Tags for the currently auditioned transition,
     * performs online gradient descent on θ, updates style/bar policies, and updates track/pair memory!
     */
    submitHumanRating(starRating, tagsArray = null) {
        const stars = Math.max(1, Math.min(5, Number(starRating) || 3));
        const tags = Array.isArray(tagsArray) ? tagsArray : Array.from(this.selectedTags);

        const d1 = this.rb?.getDeck(this.auditionState.fromDeckId || 1) || this.rb?.getMasterDeck();
        const d2 = this.rb?.getDeck(this.auditionState.toDeckId || 2) || this.rb?.getSlaveDeck();
        const outAnalysis = d1?.analysis;
        const inAnalysis = d2?.analysis;
        if (!outAnalysis || !inAnalysis) return null;

        const style = this.auditionState.style || this.rb?.aiTransitionState?.style || 'BASS_SWAP';
        const buildBars = this.auditionState.buildBars || this.rb?.aiTransitionState?.buildBars || 8;
        const masterTempo = d1 ? d1.masterTempoEnabled : true;

        const pred = this.predictTransitionQuality(outAnalysis, inAnalysis, style, buildBars, masterTempo);
        const feats = pred.feats;
        const targetScore = ((stars - 1.0) / 4.0) * 88.0 + 8.0; // Maps 1★->8, 3★->52, 5★->96
        const error = targetScore - pred.score;

        // 1. Online Regularized Gradient Update on Feature Weights θ
        const lr = this.model.learningRate || 2.6;
        const l2Decay = 0.015;
        if (feats) {
            for (const f of RRR.DJTransitionTrainer.FEATURE_META) {
                const k = f.key;
                if (k === 'bias') {
                    this.model.weights.bias = Math.max(20, Math.min(80, this.model.weights.bias + 0.12 * error));
                    continue;
                }
                const x = feats[k] ?? 0.0;
                const curW = this.model.weights[k] ?? f.prior;
                const grad = error * x * 0.18 - l2Decay * (curW - f.prior);
                this.model.weights[k] = Number(Math.max(-65.0, Math.min(65.0, curW + lr * grad)).toFixed(3));
            }
        }

        // 2. Targeted Diagnostic Tag Updates (Teaches the AI WHY the transition succeeded or failed!)
        const rewardSign = (stars - 3.0) / 2.0; // -1.0 .. +1.0
        const outSig = RRR.CamelotWheel.getSongSignature(outAnalysis);
        const inSig = RRR.CamelotWheel.getSongSignature(inAnalysis);

        if (!this.model.trackOverrides[inSig]) this.model.trackOverrides[inSig] = {};
        if (!this.model.trackOverrides[outSig]) this.model.trackOverrides[outSig] = {};
        const inOv = this.model.trackOverrides[inSig];
        const outOv = this.model.trackOverrides[outSig];
        inOv.preferredStyles = inOv.preferredStyles || {};
        inOv.preferredBars = inOv.preferredBars || {};
        outOv.preferredStyles = outOv.preferredStyles || {};

        // Update style & bar biases
        const styleDelta = tags.includes('style_fits') ? 2.4 : (tags.includes('wrong_style') ? -3.0 : rewardSign * 1.1);
        this.model.styleBiases[style] = Number(
            Math.max(-18.0, Math.min(18.0, (this.model.styleBiases[style] || 0) + styleDelta * 0.35)).toFixed(2)
        );
        this.model.barBiases[buildBars] = Number(
            Math.max(-12.0, Math.min(15.0, (this.model.barBiases[buildBars] || 0) + styleDelta * 0.25)).toFixed(2)
        );

        inOv.preferredStyles[style] = Number(
            Math.max(-16.0, Math.min(16.0, (inOv.preferredStyles[style] || 0) + styleDelta * 1.4)).toFixed(2)
        );
        inOv.preferredBars[buildBars] = Number(
            Math.max(-12.0, Math.min(12.0, (inOv.preferredBars[buildBars] || 0) + styleDelta * 1.1)).toFixed(2)
        );

        if (tags.includes('vocal_clash')) {
            this.model.weights.vocalClashRisk = Math.max(-65.0, (this.model.weights.vocalClashRisk || -28.0) - 3.5);
            inOv.forceVocalGuard = true;
            outOv.forceVocalGuard = true;
            inOv.preferredStyles.STEM_VOCAL = (inOv.preferredStyles.STEM_VOCAL || 0) + 4.0;
        }
        if (tags.includes('muddy_bass')) {
            this.model.weights.subBassPocketMatch = Math.min(60.0, (this.model.weights.subBassPocketMatch || 16.0) + 2.5);
            inOv.trimOffsetDb = Number(Math.max(-4.0, Math.min(4.0, (inOv.trimOffsetDb || 0) - 0.6)).toFixed(1));
        }
        if (tags.includes('clean_bass')) {
            this.model.weights.subBassPocketMatch = Math.min(60.0, (this.model.weights.subBassPocketMatch || 16.0) + 1.5);
            this.model.weights.dropImpactPunch = Math.min(60.0, (this.model.weights.dropImpactPunch || 24.0) + 1.5);
        }
        if (tags.includes('harmonic_fire')) {
            if (feats?.harmUnison) this.model.weights.harmUnison += 1.5;
            if (feats?.harmFifth) this.model.weights.harmFifth += 1.5;
            if (feats?.harmRelative) this.model.weights.harmRelative += 1.8;
            if (feats?.harmBoostOrDiag) this.model.weights.harmBoostOrDiag += 2.2;
        }
        if (tags.includes('drop_spot_on')) {
            this.model.weights.dropImpactPunch = Math.min(60.0, (this.model.weights.dropImpactPunch || 24.0) + 2.0);
            this.model.weights.runwayLengthFit = Math.min(60.0, (this.model.weights.runwayLengthFit || 16.0) + 1.5);
        }

        this.applyTrackOverrideToAnalysis(outAnalysis);
        this.applyTrackOverrideToAnalysis(inAnalysis);

        // 3. Update Explicit Pairwise Affinity Memory
        const pairKey = `${outSig}::${inSig}`;
        const prevPair = this.model.pairMemory[pairKey];
        const newCount = (prevPair?.count || 0) + 1;
        const blendedRating = prevPair
            ? Number((prevPair.rating * 0.35 + stars * 0.65).toFixed(2))
            : stars;

        this.model.pairMemory[pairKey] = {
            rating: blendedRating,
            lastStars: stars,
            count: newCount,
            bestStyle: stars >= (prevPair?.rating || 0) ? style : (prevPair?.bestStyle || style),
            bestBars: stars >= (prevPair?.rating || 0) ? buildBars : (prevPair?.bestBars || buildBars),
            tags,
            updatedAt: Date.now(),
            titleA: outAnalysis.title,
            titleB: inAnalysis.title,
            fromCrateId: this.auditionState.fromCrateId,
            toCrateId: this.auditionState.toCrateId
        };

        // 4. Append to Session History Log
        this.model.totalRatings = (this.model.totalRatings || 0) + 1;
        this.model.ratingSum = (this.model.ratingSum || 0) + stars;
        const historyEntry = {
            id: `rt_${Date.now()}`,
            timestamp: Date.now(),
            fromCrateId: this.auditionState.fromCrateId,
            toCrateId: this.auditionState.toCrateId,
            fromTitle: outAnalysis.title,
            toTitle: inAnalysis.title,
            fromKey: outAnalysis.camelotCode || outAnalysis.key,
            toKey: inAnalysis.camelotCode || inAnalysis.key,
            fromBpm: outAnalysis.bpm,
            toBpm: inAnalysis.bpm,
            style,
            buildBars,
            stars,
            predictedStars: pred.stars,
            predictedScore: Math.round(pred.score),
            tags
        };
        this.model.history.unshift(historyEntry);
        if (this.model.history.length > 150) this.model.history.length = 150;

        this.auditionState.ratedInCurrentRun = true;
        this.selectedTags.clear();
        this.saveModel();

        if (this.onUIUpdate) this.onUIUpdate(historyEntry);
        return historyEntry;
    }

    /**
     * Nudges a track's Mix-Out or Main Drop target by `deltaBars` (e.g. -8, -4, +4, +8 bars),
     * saves the ground-truth override permanently, and optionally replays the snippet immediately!
     */
    nudgeTrackCueBars(role = 'IN_DROP', deltaBars = 4, autoReplay = true) {
        const d1 = this.rb?.getDeck(this.auditionState.fromDeckId || 1) || this.rb?.deck1;
        const d2 = this.rb?.getDeck(this.auditionState.toDeckId || 2) || this.rb?.deck2;
        const targetDeck = role === 'OUT_MIX' ? d1 : d2;
        if (!targetDeck || !targetDeck.analysis) return;

        const sig = RRR.CamelotWheel.getSongSignature(targetDeck.analysis);
        if (!sig) return;

        if (!this.model.trackOverrides[sig]) {
            this.model.trackOverrides[sig] = {};
        }
        const ov = this.model.trackOverrides[sig];

        if (role === 'OUT_MIX') {
            if (deltaBars === 0) ov.mixOutOffsetBars = 0;
            else ov.mixOutOffsetBars = Math.max(-32, Math.min(32, (ov.mixOutOffsetBars || 0) + deltaBars));
        } else {
            if (deltaBars === 0) ov.dropOffsetBars = 0;
            else ov.dropOffsetBars = Math.max(-32, Math.min(48, (ov.dropOffsetBars || 0) + deltaBars));
        }

        this.applyTrackOverrideToAnalysis(targetDeck.analysis);
        this.saveModel();

        if (autoReplay && this.auditionState.fromCrateId && this.auditionState.toCrateId) {
            this.replayCurrentSnippet();
        } else if (this.onUIUpdate) {
            this.onUIUpdate();
        }
    }

    getTrackCueOffsets(analysis) {
        if (!analysis) return { dropOffsetBars: 0, mixOutOffsetBars: 0 };
        const sig = RRR.CamelotWheel.getSongSignature(analysis);
        const ov = this.model.trackOverrides?.[sig] || {};
        return {
            dropOffsetBars: ov.dropOffsetBars || 0,
            mixOutOffsetBars: ov.mixOutOffsetBars || 0,
            trimOffsetDb: ov.trimOffsetDb || 0,
            forceVocalGuard: !!ov.forceVocalGuard
        };
    }

    /**
     * Active Learning Candidate Pair Selector for the Trainer Queue!
     * Modes:
     * - 'SMART': 50% top unrated pairs, 30% uncertainty/boundary exploration, 20% style variation
     * - 'EXPLOIT': Top AI-scored transitions
     * - 'EXPLORE': Unrated or borderline harmonic/tempo pairs where the model has highest uncertainty
     * - 'LOCK_D1': Keeps current Deck 1 track fixed and tests candidate Deck 2 tracks
     */
    selectNextTrainingPair() {
        const pool = (this.rb?.crate || []).filter((c) => !c.isBuiltin && !c.isClip && !c.fetchFailed && c.analysis);
        const usable = pool.length >= 2 ? pool : (this.rb?.crate || []).filter((c) => c.analysis && !c.fetchFailed);
        if (usable.length < 2) return null;

        let trackA = null;
        if (this.samplingMode === 'LOCK_D1' && this.auditionState.fromCrateId) {
            trackA = usable.find((c) => c.id === this.auditionState.fromCrateId) || null;
        }
        if (!trackA && this.auditionState.toCrateId && Math.random() < 0.55) {
            // Chain naturally: make the previous incoming track the new outgoing track 55% of the time!
            trackA = usable.find((c) => c.id === this.auditionState.toCrateId) || null;
        }
        if (!trackA) {
            trackA = usable[Math.floor(Math.random() * usable.length)];
        }

        const sigA = RRR.CamelotWheel.getSongSignature(trackA);
        const candidatesB = usable.filter((c) => c.id !== trackA.id && RRR.CamelotWheel.getSongSignature(c) !== sigA);
        const bPool = candidatesB.length > 0 ? candidatesB : usable.filter((c) => c.id !== trackA.id);

        // Score a sample of up to 32 candidates
        const sampleB = bPool.length <= 32 ? bPool : this.rb.shuffleArray(bPool).slice(0, 32);
        const scored = sampleB.map((candB) => {
            const sigB = RRR.CamelotWheel.getSongSignature(candB);
            const pairKey = `${sigA}::${sigB}`;
            const pairMem = this.model.pairMemory?.[pairKey];
            const isUnrated = !pairMem;
            const exploreStyle = this.samplingMode === 'EXPLORE' || (this.samplingMode === 'SMART' && Math.random() < 0.35);
            const rec = this.recommendStyleAndBars(trackA.analysis, candB.analysis, true, exploreStyle);

            // Uncertainty is highest when predicted score is in the 58..82 decision boundary and unrated
            const distFromBoundary = Math.abs(rec.prediction.score - 70.0);
            const uncertaintyBonus = isUnrated ? Math.max(0, 26.0 - distFromBoundary * 0.8) : -18.0;

            let modeRank = rec.prediction.score;
            if (this.samplingMode === 'EXPLORE') {
                modeRank = uncertaintyBonus * 2.2 + (isUnrated ? 35 : -30) + Math.random() * 18;
            } else if (this.samplingMode === 'SMART') {
                modeRank = rec.prediction.score * 0.78 + uncertaintyBonus + (isUnrated ? 18 : -15) + Math.random() * 9;
            } else {
                // EXPLOIT / LOCK_D1
                modeRank = rec.prediction.score + (isUnrated ? 6 : 0) + Math.random() * 4;
            }

            return {
                trackA,
                trackB: candB,
                style: rec.style,
                buildBars: rec.buildBars,
                prediction: rec.prediction,
                modeRank
            };
        });

        scored.sort((a, b) => b.modeRank - a.modeRank);
        return scored[0] || null;
    }

    /**
     * Launches a 15-Second Sweet-Spot Transition Snippet Audition on Deck 1 -> Deck 2!
     */
    async auditionTransitionSnippet(options = {}) {
        if (!this.rb) return;
        if (this.rb.audioEngine && !this.rb.audioEngine.isStarted) {
            this.rb.audioEngine.init();
        }
        if (!this.rb.ctx) return;

        // Ensure Rekordbox Decks source mode is active
        if (this.rb.audioEngine && !this.rb.audioEngine.rekordboxMode) {
            this.rb.audioEngine.setRekordboxMode(true);
        }

        let trackA = options.trackA || null;
        let trackB = options.trackB || null;
        let style = options.style || null;
        let buildBars = options.buildBars || null;

        if (!trackA || !trackB) {
            const picked = this.selectNextTrainingPair();
            if (!picked) return;
            trackA = trackA || picked.trackA;
            trackB = trackB || picked.trackB;
            style = style || picked.style;
            buildBars = buildBars || picked.buildBars;
        }

        this.rb.statusMessage = `AUDITION LOADING: "${trackA.title}" → "${trackB.title}"...`;
        if (this.onUIUpdate) this.onUIUpdate();

        const bufA = await this.rb.fetchAndDecodeCrateItem(trackA);
        const bufB = await this.rb.fetchAndDecodeCrateItem(trackB);
        if (!bufA || !bufB) {
            if (!bufA) trackA.fetchFailed = true;
            if (!bufB) trackB.fetchFailed = true;
            this.rb.statusMessage = `SKIPPING UNREADABLE FILE — PICKING NEXT TRAINING PAIR...`;
            return this.auditionTransitionSnippet();
        }

        this.applyTrackOverrideToAnalysis(trackA.analysis);
        this.applyTrackOverrideToAnalysis(trackB.analysis);

        if (!style || !buildBars) {
            const rec = this.recommendStyleAndBars(trackA.analysis, trackB.analysis, true, false);
            style = style || rec.style;
            buildBars = buildBars || rec.buildBars;
        }

        // Always stage Outgoing on Deck 1 and Incoming on Deck 2 for crystal-clear visual comparison in Trainer Mode
        const d1 = this.rb.deck1;
        const d2 = this.rb.deck2;
        this.rb.aiTransitionState.active = false;
        this.rb.masterDeckId = 1;
        this.rb.crossfader = -0.92;
        this.rb.deckCrateIds[1] = trackA.id;
        this.rb.deckCrateIds[2] = trackB.id;

        d1.loadTrack(bufA, trackA.analysis, false, null, false);
        d2.loadTrack(bufB, trackB.analysis, false, d1, false);
        d1.tempoRatio = 1.0;
        d1.pllCorrectionFactor = 1.0;
        d2.syncEnabled = true;

        // Calculate exact Sweet-Spot Pre-Roll launch point on Deck 1 (e.g., 2 bars before mixOutSec)
        const outBarSec = trackA.analysis.barIntervalSec || 1.818;
        const mixOutSec = trackA.analysis.mixOutSec
            || trackA.analysis.phrases?.[Math.max(0, (trackA.analysis.phrases?.length || 3) - 3)]?.startSec
            || Math.max(outBarSec * 4, trackA.analysis.duration * 0.70);

        const preRollBars = options.immediate ? 0 : this.preRollBars;
        const preRollSec = preRollBars * outBarSec;
        const outStartSec = Math.max(trackA.analysis.firstBeatSec || 0, mixOutSec - preRollSec);

        // Start Deck 1 cleanly at `outStartSec`
        d1.clearLoop();
        d1.volumeFader = 1.0;
        d1.eq = { low: 0.0, mid: 0.0, high: 0.0 };
        d1.eqKill = { low: false, mid: false, high: false };
        d1.colorFilter = 0.0;
        d1.beatFxActive = false;
        d1.stems = { drums: true, vocal: true, inst: true };
        d1.play(outStartSec, null);

        // Pre-cue Deck 2 at its pre-drop entry loop during pre-roll
        d2.engageEntryLoop(4, d1);
        d2.volumeFader = 0.0;

        const pred = this.predictTransitionQuality(trackA.analysis, trackB.analysis, style, buildBars, d1.masterTempoEnabled);

        this.auditionState = {
            active: true,
            phase: preRollBars > 0 ? 'PRE_ROLL' : 'TRANSITIONING',
            preRollTimerSec: 0.0,
            preRollTotalSec: preRollSec,
            postDropTimerSec: 0.0,
            postDropTotalSec: (this.postDropHoldBars || 4) * outBarSec,
            fromDeckId: 1,
            toDeckId: 2,
            fromCrateId: trackA.id,
            toCrateId: trackB.id,
            fromSongSig: RRR.CamelotWheel.getSongSignature(trackA),
            toSongSig: RRR.CamelotWheel.getSongSignature(trackB),
            fromTitle: trackA.analysis.title,
            toTitle: trackB.analysis.title,
            style,
            buildBars,
            outStartSec,
            inDropTargetSec: trackB.analysis.dropTargetSec || 0.0,
            predictedScore: Math.round(pred.score),
            predictedStars: pred.stars,
            featureVector: pred.feats,
            pairRecord: pred.pairRecord,
            ratedInCurrentRun: false
        };

        if (preRollBars <= 0) {
            this.launchTrainedTransitionNow();
        } else {
            this.rb.aiActionText = `🧪 TRAINER PRE-ROLL (${preRollBars}B): LISTENING TO D1 GROOVE BEFORE ${style} (${buildBars}B)...`;
            this.rb.djCoachText = `🎓 RLHF TRAINER: Auditioning ${preRollBars} bars of "${trackA.analysis.title}" before launching ${buildBars}-bar ${style} into "${trackB.analysis.title}" (AI Pred: ${pred.stars}★)`;
        }

        if (this.rb.onStateChange) this.rb.onStateChange();
        if (this.onUIUpdate) this.onUIUpdate();
    }

    /**
     * Replays the exact same track pair with the current (or newly selected) Style, Bar Length, and Cue Nudges!
     */
    async replayCurrentSnippet(overrideStyle = null, overrideBars = null, immediate = false) {
        if (!this.rb) return;
        const idA = this.auditionState.fromCrateId || this.rb.deckCrateIds[1];
        const idB = this.auditionState.toCrateId || this.rb.deckCrateIds[2];
        const trackA = this.rb.crate.find((c) => c.id === idA) || this.rb.crate[0];
        const trackB = this.rb.crate.find((c) => c.id === idB) || this.rb.crate[1];
        if (!trackA || !trackB) return;

        const style = overrideStyle || this.auditionState.style || 'BASS_SWAP';
        const buildBars = overrideBars || this.auditionState.buildBars || 8;
        await this.auditionTransitionSnippet({
            trackA,
            trackB,
            style,
            buildBars,
            immediate
        });
    }

    /**
     * Fires the actual dual-deck transition once the 2-bar Trainer Pre-Roll completes.
     */
    launchTrainedTransitionNow() {
        if (!this.rb) return;
        const st = this.auditionState;
        st.phase = 'TRANSITIONING';

        const prevStyleMode = this.rb.aiStyleMode;
        const prevLenMode = this.rb.transitionLengthMode;
        this.rb.aiStyleMode = st.style || 'BASS_SWAP';
        this.rb.transitionLengthMode = String(st.buildBars || 8);

        this.rb.triggerAutoTransition(`RLHF TRAINER AUDITION // ${st.style} (${st.buildBars}B)`, st.style);

        // Restore global selectors if user had them on AUTO
        this.rb.aiStyleMode = prevStyleMode;
        this.rb.transitionLengthMode = prevLenMode;

        // Update actual drop target sec from transition state
        if (this.rb.aiTransitionState && this.rb.aiTransitionState.dropTargetSec) {
            st.inDropTargetSec = this.rb.aiTransitionState.dropTargetSec;
        }
        if (this.onUIUpdate) this.onUIUpdate();
    }

    /**
     * Called each frame from `RRR.RekordboxController.update` to drive the Snippet Audition state machine.
     */
    update(dt) {
        if (!this.auditionState.active || !this.rb) return;
        const st = this.auditionState;

        if (st.phase === 'PRE_ROLL') {
            st.preRollTimerSec += dt;
            if (st.preRollTimerSec >= st.preRollTotalSec) {
                this.launchTrainedTransitionNow();
            }
        } else if (st.phase === 'TRANSITIONING') {
            if (!this.rb.aiTransitionState.active) {
                st.phase = 'POST_DROP';
                st.postDropTimerSec = 0.0;
                this.rb.aiActionText = `🧪 DROP LANDED! AUDITIONING POST-DROP GROOVE — RATE [1–5★] BELOW!`;
                if (this.onUIUpdate) this.onUIUpdate();
            }
        } else if (st.phase === 'POST_DROP') {
            st.postDropTimerSec += dt;
            if (st.postDropTimerSec >= st.postDropTotalSec) {
                st.phase = 'AWAITING_RATING';
                this.rb.aiActionText = `⭐ RATE TRANSITION [1–5★] • [R] REPLAY • [SPACE] NEXT PAIR`;
                if (this.onUIUpdate) this.onUIUpdate();
            }
        }
    }

    exportModelJson() {
        const payload = JSON.stringify(this.model, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rave_racer_dj_kinetix_rlhf_brain_${this.model.totalRatings || 0}ratings.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importModelJson(file) {
        if (!file) return false;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (!parsed || typeof parsed !== 'object' || !parsed.weights) return false;
            const def = this.createDefaultModel();
            this.model = {
                ...def,
                ...parsed,
                weights: { ...def.weights, ...(parsed.weights || {}) },
                styleBiases: { ...def.styleBiases, ...(parsed.styleBiases || {}) },
                barBiases: { ...def.barBiases, ...(parsed.barBiases || {}) },
                trackOverrides: parsed.trackOverrides || {},
                pairMemory: parsed.pairMemory || {},
                history: Array.isArray(parsed.history) ? parsed.history : []
            };
            this.saveModel();
            this.applyAllTrackOverridesToCrate();
            if (this.onUIUpdate) this.onUIUpdate();
            return true;
        } catch (e) {
            return false;
        }
    }

    getSummaryStats() {
        const total = this.model.totalRatings || 0;
        const avgStars = total > 0 ? (this.model.ratingSum / total).toFixed(2) : '—';
        const pairs = Object.values(this.model.pairMemory || {});
        const goldPairs = pairs.filter((p) => p.rating >= 4.0).length;
        const vetoPairs = pairs.filter((p) => p.rating <= 2.2).length;
        const cueFixes = Object.values(this.model.trackOverrides || {}).filter(
            (ov) => (ov.dropOffsetBars || 0) !== 0 || (ov.mixOutOffsetBars || 0) !== 0 || ov.forceVocalGuard
        ).length;

        // Calculate recent prediction accuracy (MAE over last 20 ratings)
        const recent = (this.model.history || []).slice(0, 20);
        let maeSum = 0;
        for (const h of recent) {
            maeSum += Math.abs((h.stars || 3) - (h.predictedStars || 3));
        }
        const recentAccuracyPct = recent.length > 0
            ? Math.round(Math.max(0, 100 - (maeSum / recent.length) * 25))
            : null;

        return {
            total,
            avgStars,
            goldPairs,
            vetoPairs,
            cueFixes,
            recentAccuracyPct
        };
    }
};
