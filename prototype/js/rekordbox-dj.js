/**
 * RAVE RACER REMIX — Pillar 3.1, 3.2 & 3.3 Upgrade:
 * Simplified Pioneer rekordbox Track Analyzer (3-Band RGB Waveform, BPM & Beatgrid Autocorrelation,
 * Phrase Structure & Auto Hot Cues A/B/C/D) + Dual-Deck Web Audio DSP Mixer & AI DJ Controller.
 */
window.RRR = window.RRR || {};

/**
 * 0. CAMELOT WHEEL HARMONIC MIXING & DSP CHROMA KEY DETECTOR (1A..12A Minor, 1B..12B Major)
 */
RRR.CamelotWheel = class CamelotWheel {
    // Pitch class 0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B
    static MINOR_TO_CAMELOT = [
        { code: '5A', num: 5, let: 'A', name: 'Cm', color: '#ff6b6b' },
        { code: '12A', num: 12, let: 'A', name: 'C#m', color: '#00f5d4' },
        { code: '7A', num: 7, let: 'A', name: 'Dm', color: '#ffbe0b' },
        { code: '2A', num: 2, let: 'A', name: 'D#m', color: '#8ac926' },
        { code: '9A', num: 9, let: 'A', name: 'Em', color: '#a855f7' },
        { code: '4A', num: 4, let: 'A', name: 'Fm', color: '#ff9900' },
        { code: '11A', num: 11, let: 'A', name: 'F#m', color: '#3b82f6' },
        { code: '6A', num: 6, let: 'A', name: 'Gm', color: '#ff0055' },
        { code: '1A', num: 1, let: 'A', name: 'G#m', color: '#00bbf9' },
        { code: '8A', num: 8, let: 'A', name: 'Am', color: '#00f5d4' },
        { code: '3A', num: 3, let: 'A', name: 'A#m', color: '#f15bb5' },
        { code: '10A', num: 10, let: 'A', name: 'Bm', color: '#6366f1' }
    ];

    static MAJOR_TO_CAMELOT = [
        { code: '8B', num: 8, let: 'B', name: 'C', color: '#00f5d4' },
        { code: '3B', num: 3, let: 'B', name: 'C#', color: '#f15bb5' },
        { code: '10B', num: 10, let: 'B', name: 'D', color: '#6366f1' },
        { code: '5B', num: 5, let: 'B', name: 'Eb', color: '#ff6b6b' },
        { code: '12B', num: 12, let: 'B', name: 'E', color: '#00f5d4' },
        { code: '7B', num: 7, let: 'B', name: 'F', color: '#ffbe0b' },
        { code: '2B', num: 2, let: 'B', name: 'F#', color: '#8ac926' },
        { code: '9B', num: 9, let: 'B', name: 'G', color: '#a855f7' },
        { code: '4B', num: 4, let: 'B', name: 'Ab', color: '#ff9900' },
        { code: '11B', num: 11, let: 'B', name: 'A', color: '#3b82f6' },
        { code: '6B', num: 6, let: 'B', name: 'Bb', color: '#ff0055' },
        { code: '1B', num: 1, let: 'B', name: 'B', color: '#00bbf9' }
    ];

    // Krumhansl-Kessler Key Profiles
    static PROFILE_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    static PROFILE_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];

    /**
     * Extracts 12-semitone Pitch-Class Chroma energy from audio samples and correlates
     * against Krumhansl-Kessler profiles to determine the exact Camelot Key (1A..12B).
     */
    static detectCamelotKey(channelData, sampleRate) {
        const chroma = new Float32Array(12);
        const len = channelData.length;
        const numWindows = 12;
        const windowSamples = Math.min(4096, Math.floor(len / numWindows));

        if (windowSamples >= 512) {
            // Evaluate 12 pitch classes across 3 harmonic mid octaves (C3..B5: MIDI 48..83, 130Hz..988Hz)
            // Above the unpitched sub-kick sweep so chords, bass harmonics & leads determine the key
            for (let pc = 0; pc < 12; pc++) {
                let pcEnergy = 0.0;
                for (let oct = 0; oct < 3; oct++) {
                    const midi = 48 + oct * 12 + pc;
                    const freq = 440.0 * Math.pow(2, (midi - 69) / 12.0);
                    const omega2 = (4.0 * Math.PI * freq) / sampleRate;
                    const cosStep = Math.cos(omega2);
                    const sinStep = Math.sin(omega2);

                    for (let w = 1; w < numWindows - 1; w++) {
                        const offset = Math.floor((w / numWindows) * (len - windowSamples));
                        let re = 0.0;
                        let im = 0.0;
                        let c = 1.0;
                        let s = 0.0;
                        for (let i = 0; i < windowSamples; i += 2) {
                            const x = channelData[offset + i];
                            re += x * c;
                            im += x * s;
                            const nextC = c * cosStep - s * sinStep;
                            const nextS = s * cosStep + c * sinStep;
                            c = nextC;
                            s = nextS;
                        }
                        pcEnergy += Math.sqrt(re * re + im * im);
                    }
                }
                chroma[pc] = pcEnergy;
            }
        }

        let bestEntry = this.MINOR_TO_CAMELOT[9]; // Default 8A (Am)
        let bestCorr = -Infinity;

        for (let root = 0; root < 12; root++) {
            let corrMin = 0.0;
            let corrMaj = 0.0;
            for (let i = 0; i < 12; i++) {
                const val = chroma[(root + i) % 12];
                corrMin += val * this.PROFILE_MINOR[i];
                corrMaj += val * this.PROFILE_MAJOR[i];
            }
            // Electronic/Rave tracks slightly favor minor harmonic profiles
            corrMin *= 1.04;
            if (corrMin > bestCorr) {
                bestCorr = corrMin;
                bestEntry = this.MINOR_TO_CAMELOT[root];
            }
            if (corrMaj > bestCorr) {
                bestCorr = corrMaj;
                bestEntry = this.MAJOR_TO_CAMELOT[root];
            }
        }

        return {
            code: bestEntry.code,
            number: bestEntry.num,
            letter: bestEntry.let,
            keyName: bestEntry.name,
            display: `${bestEntry.code} (${bestEntry.name})`,
            color: bestEntry.color
        };
    }

    static parseCamelotCode(codeOrDisplay = '8A') {
        const m = String(codeOrDisplay).match(/(\d{1,2})([AB])/i);
        if (!m) return { number: 8, letter: 'A', code: '8A' };
        const num = Math.max(1, Math.min(12, parseInt(m[1], 10)));
        const letChar = m[2].toUpperCase();
        return { number: num, letter: letChar, code: `${num}${letChar}` };
    }

    /**
     * Computes Camelot Wheel Harmonic Compatibility between two tracks:
     * - 0 steps same letter (8A -> 8A): UNISON KEY (100)
     * - ±1 step same letter (8A -> 7A / 9A): FIFTH / FOURTH STEP (95)
     * - 0 steps opposite letter (8A <-> 8B): RELATIVE MAJOR/MINOR (90)
     * - ±1 step opposite letter (8A -> 9B / 7B): DIAGONAL MODULATION (72)
     * - ±2 steps same letter (8A -> 10A / 6A): ENERGY BOOST +2 (68)
     */
    static getHarmonicRelation(fromKey, toKey) {
        const k1 = typeof fromKey === 'object' && fromKey.number ? fromKey : this.parseCamelotCode(fromKey);
        const k2 = typeof toKey === 'object' && toKey.number ? toKey : this.parseCamelotCode(toKey);

        const rawDiff = Math.abs(k1.number - k2.number);
        const wheelDist = Math.min(rawDiff, 12 - rawDiff);
        const sameLetter = k1.letter === k2.letter;

        if (wheelDist === 0 && sameLetter) {
            return { score: 100, badge: `★ UNISON ${k2.code}`, isHarmonic: true, wheelDist: 0 };
        }
        if (wheelDist === 1 && sameLetter) {
            return { score: 95, badge: `★ HARMONIC ${k2.code}`, isHarmonic: true, wheelDist: 1 };
        }
        if (wheelDist === 0 && !sameLetter) {
            return { score: 90, badge: `★ RELATIVE ${k2.code}`, isHarmonic: true, wheelDist: 0 };
        }
        if (wheelDist === 1 && !sameLetter) {
            return { score: 74, badge: `◆ DIAG ${k2.code}`, isHarmonic: true, wheelDist: 1 };
        }
        if (wheelDist === 2 && sameLetter) {
            return { score: 68, badge: `▲ ENERGY ${k2.code}`, isHarmonic: true, wheelDist: 2 };
        }
        return {
            score: Math.max(10, 48 - wheelDist * 8),
            badge: `• ${k2.code}`,
            isHarmonic: false,
            wheelDist
        };
    }

    /**
     * Scores a candidate track in the crate for the AI DJ's next transition based on:
     * 1. Rotation Freshness (unplayed tracks in the current cycle are prioritized first)
     * 2. Camelot Wheel Harmonic Key Compatibility
     * 3. BPM Proximity (smooth tempo transition without extreme time-stretching)
     */
    static scoreCandidateTrack(masterAnalysis, candidateItem, minPlayCount = 0) {
        if (!masterAnalysis || !candidateItem || !candidateItem.analysis) return -9999;
        const cand = candidateItem.analysis;

        // 1. Freshness / Rotation Score (ensures DJ rotates through all songs before repeating)
        const playsAboveMin = Math.max(0, (candidateItem.playCount || 0) - minPlayCount);
        const rotationBonus = playsAboveMin === 0 ? 250 : -playsAboveMin * 180;

        // 2. Camelot Wheel Harmonic Score (0..100)
        const harm = this.getHarmonicRelation(
            masterAnalysis.camelot || masterAnalysis.key,
            cand.camelot || cand.key
        );

        // 3. BPM Proximity Score (supports standard 1:1 as well as 2:1 / 1:2 half/double time)
        const mBpm = masterAnalysis.bpm || 138;
        const cBpm = cand.bpm || 138;
        const diff1 = Math.abs(cBpm - mBpm);
        const diffHalf = Math.abs(cBpm * 2.0 - mBpm);
        const diffDouble = Math.abs(cBpm * 0.5 - mBpm);
        const bestBpmDiff = Math.min(diff1, diffHalf, diffDouble);
        const bpmPct = (bestBpmDiff / mBpm) * 100;

        let bpmScore = 0;
        if (bpmPct <= 4.0) {
            bpmScore = 70 - bpmPct * 3.0;
        } else if (bpmPct <= 8.5) {
            bpmScore = 58 - (bpmPct - 4.0) * 8.0;
        } else {
            bpmScore = Math.max(-60, 22 - (bpmPct - 8.5) * 6.0);
        }

        return rotationBonus + harm.score + bpmScore;
    }
};

/**
 * 1. OFFLINE / ON-LOAD MP3 TRACK ANALYZER (rekordbox RGB Waveform + Beatgrid + Phrase Detector)
 */
RRR.RekordboxAnalyzer = class RekordboxAnalyzer {
    static analyzeAudioBuffer(audioBuffer, fileName = 'Track.mp3') {
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        const length = audioBuffer.length;
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

        // Clean display title & artist from filename
        const cleanName = fileName.replace(/\.(mp3|wav|ogg|flac|m4a)$/i, '');
        let artist = 'LICENSED TRACK';
        let title = cleanName;
        if (cleanName.includes(' - ')) {
            const parts = cleanName.split(' - ');
            artist = parts[0].trim().toUpperCase();
            title = parts.slice(1).join(' - ').trim().toUpperCase();
        } else {
            title = cleanName.toUpperCase();
        }

        // 1. Extract 3-Band RGB Waveform Buckets (60 slices/sec for zoomed scrolling view)
        // Low (Red: Sub/Kick), Mid (Green: Vocals/Synths), High (Blue: Hats/Air)
        const slicesPerSec = 50;
        const totalSlices = Math.max(60, Math.min(36000, Math.floor(duration * slicesPerSec)));
        const samplesPerSlice = Math.max(1, Math.floor(length / totalSlices));

        const rgbSlices = new Array(totalSlices);
        const lowEnergyEnvelope = new Float32Array(totalSlices);

        // One-pole filter states for fast 3-band splitting
        const alphaLow = Math.min(0.99, (2 * Math.PI * 165) / sampleRate);
        const alphaMid = Math.min(0.99, (2 * Math.PI * 2800) / sampleRate);
        let lpLow = 0.0;
        let lpMid = 0.0;
        let maxLow = 1e-5;
        let maxMid = 1e-5;
        let maxHigh = 1e-5;

        // Stride inside each slice for ultra-fast analysis (< 45ms for a 4-minute MP3)
        const step = Math.max(1, Math.floor(samplesPerSlice / 64));

        for (let s = 0; s < totalSlices; s++) {
            const startIdx = s * samplesPerSlice;
            const endIdx = Math.min(length, startIdx + samplesPerSlice);
            let sumLow = 0.0;
            let sumMid = 0.0;
            let sumHigh = 0.0;
            let count = 0;

            for (let i = startIdx; i < endIdx; i += step) {
                const mono = (ch0[i] + ch1[i]) * 0.5;
                lpLow += alphaLow * (mono - lpLow);
                lpMid += alphaMid * (mono - lpMid);

                const lowSample = lpLow;
                const midSample = lpMid - lpLow;
                const highSample = mono - lpMid;

                sumLow += lowSample * lowSample;
                sumMid += midSample * midSample;
                sumHigh += highSample * highSample;
                count++;
            }

            const inv = count > 0 ? 1.0 / count : 1.0;
            const rmsLow = Math.sqrt(sumLow * inv);
            const rmsMid = Math.sqrt(sumMid * inv);
            const rmsHigh = Math.sqrt(sumHigh * inv);

            if (rmsLow > maxLow) maxLow = rmsLow;
            if (rmsMid > maxMid) maxMid = rmsMid;
            if (rmsHigh > maxHigh) maxHigh = rmsHigh;

            lowEnergyEnvelope[s] = rmsLow;
            rgbSlices[s] = { r: rmsLow, g: rmsMid, b: rmsHigh, peak: 0 };
        }

        // Normalize RGB slices & build 400-column overview waveform strip
        for (let s = 0; s < totalSlices; s++) {
            const sl = rgbSlices[s];
            sl.r = Math.min(1.0, Math.pow(sl.r / maxLow, 0.78));
            sl.g = Math.min(1.0, Math.pow(sl.g / maxMid, 0.78));
            sl.b = Math.min(1.0, Math.pow(sl.b / maxHigh, 0.72));
            sl.peak = Math.min(1.0, Math.max(sl.r * 0.95, sl.g * 0.85, sl.b * 0.75));
        }

        const overviewCols = 360;
        const overviewWaveform = new Array(overviewCols);
        for (let c = 0; c < overviewCols; c++) {
            const s0 = Math.floor((c / overviewCols) * totalSlices);
            const s1 = Math.max(s0 + 1, Math.floor(((c + 1) / overviewCols) * totalSlices));
            let r = 0, g = 0, b = 0, pk = 0;
            for (let s = s0; s < s1 && s < totalSlices; s++) {
                r += rgbSlices[s].r;
                g += rgbSlices[s].g;
                b += rgbSlices[s].b;
                if (rgbSlices[s].peak > pk) pk = rgbSlices[s].peak;
            }
            const cnt = Math.max(1, s1 - s0);
            overviewWaveform[c] = { r: r / cnt, g: g / cnt, b: b / cnt, peak: pk };
        }

        // 2. Half-Wave Rectified Onset Flux + Autocorrelation BPM & Downbeat Phase Detection
        const onsetFlux = new Float32Array(totalSlices);
        for (let s = 1; s < totalSlices; s++) {
            const diff = (rgbSlices[s].r - rgbSlices[s - 1].r) + (rgbSlices[s].g - rgbSlices[s - 1].g) * 0.35;
            onsetFlux[s] = diff > 0 ? diff : 0;
        }

        // Evaluate candidate BPMs from 95 to 175 BPM
        let bestBpm = 128.0;
        let bestScore = -1;
        const analysisStartSlice = Math.floor(totalSlices * 0.10);
        const analysisEndSlice = Math.floor(totalSlices * 0.85);

        for (let bpmCandidate = 96.0; bpmCandidate <= 174.0; bpmCandidate += 0.5) {
            const lagSlices = (60.0 / bpmCandidate) * slicesPerSec;
            const lag1 = Math.round(lagSlices);
            const lag2 = Math.round(lagSlices * 2);
            const lag4 = Math.round(lagSlices * 4);
            if (lag4 >= totalSlices * 0.5) continue;

            let corr = 0.0;
            for (let s = analysisStartSlice; s < analysisEndSlice - lag4; s += 2) {
                const v = onsetFlux[s];
                if (v > 0.05) {
                    corr += v * (onsetFlux[s + lag1] * 1.0 + onsetFlux[s + lag2] * 0.6 + onsetFlux[s + lag4] * 0.8);
                }
            }

            // Perceptual weighting favoring standard dance/electronic/rave tempo range (120-148 BPM)
            const tempoWeight = (bpmCandidate >= 118 && bpmCandidate <= 150) ? 1.12 : 1.0;
            const weighted = corr * tempoWeight;
            if (weighted > bestScore) {
                bestScore = weighted;
                bestBpm = bpmCandidate;
            }
        }

        const beatIntervalSec = 60.0 / bestBpm;
        const barIntervalSec = beatIntervalSec * 4.0;

        // Find downbeat phase offset (firstBeatSec) maximizing 4-beat bar alignment
        const phaseSteps = 40;
        let bestPhaseSec = 0.0;
        let bestPhaseEnergy = -1;
        for (let p = 0; p < phaseSteps; p++) {
            const candidateOffsetSec = (p / phaseSteps) * beatIntervalSec;
            let sum = 0.0;
            for (let t = candidateOffsetSec; t < duration * 0.85; t += beatIntervalSec) {
                const idx = Math.floor(t * slicesPerSec);
                if (idx >= 0 && idx < totalSlices) {
                    sum += onsetFlux[idx] + rgbSlices[idx].r * 0.5;
                }
            }
            if (sum > bestPhaseEnergy) {
                bestPhaseEnergy = sum;
                bestPhaseSec = candidateOffsetSec;
            }
        }

        // 3. Structural Phrase Analysis (8-Bar Phrases: INTRO / BUILD / DROP / BREAKDOWN / OUTRO)
        const phraseDurationSec = barIntervalSec * 8.0;
        const numPhrases = Math.max(1, Math.ceil(duration / phraseDurationSec));
        const phrases = [];
        let maxPhraseEnergy = 1e-5;
        const rawPhraseStats = [];

        for (let p = 0; p < numPhrases; p++) {
            const startSec = p * phraseDurationSec;
            const endSec = Math.min(duration, (p + 1) * phraseDurationSec);
            const s0 = Math.floor(startSec * slicesPerSec);
            const s1 = Math.min(totalSlices, Math.ceil(endSec * slicesPerSec));
            let lowSum = 0, midSum = 0, highSum = 0;
            for (let s = s0; s < s1; s++) {
                lowSum += rgbSlices[s].r;
                midSum += rgbSlices[s].g;
                highSum += rgbSlices[s].b;
            }
            const cnt = Math.max(1, s1 - s0);
            const avgLow = lowSum / cnt;
            const avgMid = midSum / cnt;
            const avgHigh = highSum / cnt;
            const totalE = avgLow * 1.4 + avgMid + avgHigh * 0.9;
            if (totalE > maxPhraseEnergy) maxPhraseEnergy = totalE;
            rawPhraseStats.push({ startSec, endSec, avgLow, avgMid, avgHigh, totalE });
        }

        for (let p = 0; p < numPhrases; p++) {
            const st = rawPhraseStats[p];
            const normE = st.totalE / maxPhraseEnergy;
            const nextE = p + 1 < numPhrases ? rawPhraseStats[p + 1].totalE / maxPhraseEnergy : normE;
            let type = 'GROOVE';
            let color = '#00f5d4';

            if (p === 0 && normE < 0.72) {
                type = 'INTRO';
                color = '#3b82f6';
            } else if (p === numPhrases - 1 && normE < 0.65) {
                type = 'OUTRO';
                color = '#6366f1';
            } else if (normE >= 0.78 && st.avgLow >= 0.36) {
                type = 'DROP';
                color = '#ff0055';
            } else if (nextE >= 0.78 && normE < 0.78) {
                type = 'PRE_DROP';
                color = '#ff9900';
            } else if (normE < 0.55) {
                type = 'BREAKDOWN';
                color = '#a855f7';
            }

            phrases.push({
                index: p,
                startSec: st.startSec,
                endSec: st.endSec,
                type: type,
                color: color,
                energy: normE
            });
        }

        // 4. Auto-Place Quantized rekordbox Hot Cues (A: Entry Phrase, B: Build, C: Drop, D: Exit Phrase)
        const quantizeToBeat = (sec) => {
            const beats = Math.round((sec - bestPhaseSec) / beatIntervalSec);
            return Math.max(0, Math.min(duration - 0.5, bestPhaseSec + beats * beatIntervalSec));
        };

        const entryPhrase = phrases[0] || { startSec: bestPhaseSec };
        const firstBuild = phrases.find((ph) => ph.type === 'PRE_DROP') || phrases[Math.min(1, phrases.length - 1)];
        const firstDrop = phrases.find((ph) => ph.type === 'DROP') || phrases[Math.min(2, phrases.length - 1)];
        const exitPhraseIdx = Math.max(0, phrases.length - 3);
        const exitPhrase = phrases[exitPhraseIdx] || phrases[phrases.length - 1];

        const hotCues = [
            { id: 'A', label: 'A // INTRO MIX-IN', timeSec: quantizeToBeat(entryPhrase.startSec), color: '#00f5d4', section: 'INTRO' },
            { id: 'B', label: 'B // BUILD', timeSec: quantizeToBeat(firstBuild.startSec), color: '#ff9900', section: 'PRE_DROP' },
            { id: 'C', label: 'C // DROP', timeSec: quantizeToBeat(firstDrop.startSec), color: '#ff0055', section: 'DROP' },
            { id: 'D', label: 'D // OUTRO MIX-OUT', timeSec: quantizeToBeat(exitPhrase.startSec), color: '#a855f7', section: 'OUTRO' }
        ];

        // 5. DSP Pitch-Class Chroma Key Detection mapped to 24-Key Camelot Wheel
        const camelotObj = RRR.CamelotWheel.detectCamelotKey(ch0, sampleRate);

        // Build explicit quantized BeatGrid array
        const beatGrid = [];
        let beatNum = 0;
        for (let t = bestPhaseSec; t < duration; t += beatIntervalSec) {
            beatGrid.push({
                timeSec: Number(t.toFixed(4)),
                beatInBar: (beatNum % 4) + 1,
                barIndex: Math.floor(beatNum / 4) + 1
            });
            beatNum++;
        }

        return {
            fileName: fileName,
            title: title,
            artist: artist,
            key: camelotObj.display,
            camelotCode: camelotObj.code,
            camelot: camelotObj,
            duration: duration,
            bpm: bestBpm,
            firstBeatSec: bestPhaseSec,
            beatIntervalSec: beatIntervalSec,
            barIntervalSec: barIntervalSec,
            beatGrid: beatGrid,
            slicesPerSec: slicesPerSec,
            rgbSlices: rgbSlices,
            overviewWaveform: overviewWaveform,
            phrases: phrases,
            hotCues: hotCues
        };
    }

    /**
     * Generates a pre-analyzed 64-bar (8 phrases) procedural rave AudioBuffer so both decks work out-of-the-box
     * even before the user selects a song folder.
     */
    static createProceduralTrackBuffer(ctx, configOrBpm = 138.0, keyMode = 'A_MINOR') {
        const keyFreqMap = {
            A_MINOR: 55.0,    // 8A (Am)
            E_MINOR: 41.20,   // 9A (Em)
            D_MINOR: 36.71,   // 7A (Dm)
            F_MINOR: 43.65,   // 4A (Fm)
            C_MAJOR: 65.41    // 8B (C)
        };
        const config = typeof configOrBpm === 'object' && configOrBpm !== null
            ? configOrBpm
            : {
                bpm: Number(configOrBpm) || 138.0,
                rootFreq: keyFreqMap[keyMode] || 55.0,
                isAcid: keyMode === 'E_MINOR' || keyMode === 'F_MINOR'
            };
        const bpm = config.bpm || 138.0;
        const bars = 64; // 8 full 8-bar phrases (Phrases 0,1,2 = Entry; Phrases 3,4 = Body; Phrases 5,6,7 = Exit)
        const beatSec = 60.0 / bpm;
        const duration = bars * 4 * beatSec;
        const sampleRate = ctx.sampleRate;
        const length = Math.floor(duration * sampleRate);
        const buffer = ctx.createBuffer(2, length, sampleRate);
        const L = buffer.getChannelData(0);
        const R = buffer.getChannelData(1);

        const rootFreq = config.rootFreq || 55.0; // A1
        const isAcid = !!config.isAcid;

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const totalBeats = t / beatSec;
            const bar = Math.floor(totalBeats / 4) % bars;
            const beatInBar = totalBeats % 4;
            const beatFrac = totalBeats % 1.0;
            const step16 = Math.floor((totalBeats * 4) % 16);
            const stepFrac = (totalBeats * 4) % 1.0;

            const isBuild = (bar >= 6 && bar < 8) || (bar >= 22 && bar < 24);
            const isDrop = (bar >= 8 && bar < 16) || (bar >= 24 && bar < 30);
            const isBreak = (bar >= 16 && bar < 22);

            let sigL = 0.0;
            let sigR = 0.0;

            // 1. 909 Kick on every beat (except breakdown & build rolls)
            if (!isBreak) {
                const kickPhase = isBuild ? ((totalBeats * 2) % 1.0) : beatFrac;
                const kickEnv = Math.exp(-kickPhase * 11.0);
                const kickFreq = 46.0 + 110.0 * Math.exp(-kickPhase * 28.0);
                const kick = Math.sin(2 * Math.PI * kickFreq * kickPhase * beatSec) * kickEnv * (isDrop ? 0.68 : 0.55);
                sigL += kick;
                sigR += kick;
            }

            // 2. Off-beat Rolling Sub-Bass
            if (!isBreak && (step16 % 4 === 2 || (isDrop && step16 % 4 === 3))) {
                const bassEnv = Math.exp(-stepFrac * 6.5);
                const noteMult = (step16 === 6 || step16 === 14) ? 1.1892 : ((step16 === 10) ? 1.3348 : 1.0);
                const saw = (((t * rootFreq * noteMult) % 1.0) * 2.0 - 1.0) * 0.32 * bassEnv;
                sigL += saw;
                sigR += saw;
            }

            // 3. 909 Open Hi-Hat & Top Percussion
            if (step16 % 4 === 2 || isDrop || isBuild) {
                const hatEnv = Math.exp(-stepFrac * (step16 % 4 === 2 ? 9.0 : 22.0));
                const noise = (Math.sin(i * 12.9898) * 43758.5453 % 1.0) * 0.22 * hatEnv;
                sigL += noise * 0.9;
                sigR += -noise * 0.9;
            }

            // 4. R4 Chord Pads / Acid 303 Lead
            if (isDrop || isBreak || isAcid) {
                const acidNotes = [2.0, 2.0, 4.0, 2.0, 2.378, 2.669, 4.0, 3.0, 2.0, 3.56, 3.0, 2.378, 2.0, 4.0, 4.756, 3.56];
                const noteFreq = rootFreq * acidNotes[step16];
                const acidEnv = Math.exp(-stepFrac * (isDrop ? 4.5 : 7.5));
                const leadL = Math.sin(2 * Math.PI * noteFreq * t + Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.6) * 0.24 * acidEnv;
                const leadR = Math.sin(2 * Math.PI * (noteFreq * 1.003) * t + Math.cos(2 * Math.PI * noteFreq * 2 * t) * 0.6) * 0.24 * acidEnv;
                sigL += leadL;
                sigR += leadR;
            }

            // 5. Pre-drop pitch riser
            if (isBuild) {
                const buildProg = ((bar % 2) * 4 + beatInBar) / 8.0;
                const riserFreq = 220.0 * Math.pow(2.0, buildProg * 2.5);
                const riser = Math.sin(2 * Math.PI * riserFreq * t) * 0.18 * buildProg;
                sigL += riser;
                sigR += riser;
            }

            L[i] = Math.max(-0.98, Math.min(0.98, sigL));
            R[i] = Math.max(-0.98, Math.min(0.98, sigR));
        }

        return buffer;
    }
};

/**
 * 2. SINGLE REKORDBOX DECK CHANNEL (Web Audio Buffer Player + 3-Band Isolator EQ + Color Filter + Beat Loop)
 */
RRR.RekordboxDeck = class RekordboxDeck {
    constructor(id, ctx, destinationNode) {
        this.id = id; // 1 or 2
        this.ctx = ctx;
        this.destinationNode = destinationNode;

        this.buffer = null;
        this.analysis = null;
        this.isPlaying = false;
        this.playStartCtxTime = 0.0;
        this.playHeadOffsetSec = 0.0;
        this.currentTimeSec = 0.0;

        // Tempo & Sync controls
        this.tempoSliderPct = 0.0;      // -16% to +16%
        this.tempoRatio = 1.0;          // Effective playbackRate multiplier
        this.vinylBrakeFactor = 1.0;    // Dips toward 0.15 during collision vinyl scratch/brake
        this.syncEnabled = true;

        // 3-Band EQ Isolator (-1.0 = -26dB Kill, 0.0 = 0dB Flat, +1.0 = +6dB Boost)
        this.eq = { low: 0.0, mid: 0.0, high: 0.0 };
        // Sound Color FX Filter (-1.0 = Low-Pass 140Hz, 0.0 = Bypass, +1.0 = High-Pass 2200Hz)
        this.colorFilter = 0.0;
        this.volumeFader = 1.0;

        // Quantized Beat Loop State
        this.loopActive = false;
        this.loopBeats = 0;             // 0.25, 0.5, 1, 2, 4, 8
        this.loopStartSec = 0.0;
        this.loopEndSec = 0.0;

        this.sourceNode = null;
        this.buildAudioChain();
    }

    buildAudioChain() {
        if (!this.ctx) return;

        // 3-Band Isolator EQ
        this.lowEQ = this.ctx.createBiquadFilter();
        this.lowEQ.type = 'lowshelf';
        this.lowEQ.frequency.value = 135;

        this.midEQ = this.ctx.createBiquadFilter();
        this.midEQ.type = 'peaking';
        this.midEQ.frequency.value = 1100;
        this.midEQ.Q.value = 0.9;

        this.highEQ = this.ctx.createBiquadFilter();
        this.highEQ.type = 'highshelf';
        this.highEQ.frequency.value = 4200;

        // Pioneer DJM Sound Color Filter (Biquad LP/HP with resonant Q peak)
        this.colorFilterNode = this.ctx.createBiquadFilter();
        this.colorFilterNode.type = 'lowpass';
        this.colorFilterNode.frequency.value = 20000;
        this.colorFilterNode.Q.value = 0.707;

        this.channelGain = this.ctx.createGain();
        this.channelGain.gain.value = 1.0;

        this.lowEQ.connect(this.midEQ);
        this.midEQ.connect(this.highEQ);
        this.highEQ.connect(this.colorFilterNode);
        this.colorFilterNode.connect(this.channelGain);
        this.channelGain.connect(this.destinationNode);
    }

    loadTrack(buffer, analysis, autoPlay = false) {
        const wasPlaying = this.isPlaying;
        this.stopSource();
        this.buffer = buffer;
        this.analysis = analysis;
        this.playHeadOffsetSec = analysis.firstBeatSec || 0.0;
        this.currentTimeSec = this.playHeadOffsetSec;
        this.loopActive = false;
        this.loopBeats = 0;

        if (autoPlay || wasPlaying) {
            this.play(this.playHeadOffsetSec);
        }
    }

    play(fromSec = null) {
        if (!this.ctx || !this.buffer) return;
        this.stopSource();

        if (fromSec !== null) {
            this.playHeadOffsetSec = Math.max(0, Math.min(this.buffer.duration - 0.05, fromSec));
        }

        const src = this.ctx.createBufferSource();
        src.buffer = this.buffer;
        const rate = Math.max(0.1, this.tempoRatio * this.vinylBrakeFactor);
        src.playbackRate.value = rate;

        if (this.loopActive && this.loopEndSec > this.loopStartSec + 0.02) {
            src.loop = true;
            src.loopStart = this.loopStartSec;
            src.loopEnd = this.loopEndSec;
        } else {
            src.loop = true;
            src.loopStart = 0;
            src.loopEnd = this.buffer.duration;
        }

        src.connect(this.lowEQ);
        src.start(0, this.playHeadOffsetSec);

        this.sourceNode = src;
        this.playStartCtxTime = this.ctx.currentTime;
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying) return;
        this.updatePlayhead(0);
        this.playHeadOffsetSec = this.currentTimeSec;
        this.stopSource();
        this.isPlaying = false;
    }

    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play(this.currentTimeSec);
    }

    stopSource() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {}
            this.sourceNode = null;
        }
    }

    jumpToHotCue(cueIndex) {
        if (!this.analysis || !this.analysis.hotCues[cueIndex]) return;
        const cue = this.analysis.hotCues[cueIndex];
        this.loopActive = false;
        this.loopBeats = 0;
        this.play(cue.timeSec);
    }

    setBeatLoop(beats) {
        if (!this.analysis || !this.buffer) return;
        if (this.loopActive && this.loopBeats === beats) {
            this.clearLoop();
            return;
        }

        const beatSec = this.analysis.beatIntervalSec;
        const firstBeat = this.analysis.firstBeatSec;
        const nearestBeatIdx = Math.floor((this.currentTimeSec - firstBeat) / beatSec);
        const startSec = Math.max(0, firstBeat + nearestBeatIdx * beatSec);
        const endSec = Math.min(this.buffer.duration - 0.02, startSec + beats * beatSec);

        if (endSec <= startSec + 0.04) return;
        this.loopActive = true;
        this.loopBeats = beats;
        this.loopStartSec = startSec;
        this.loopEndSec = endSec;

        if (this.sourceNode) {
            this.sourceNode.loop = true;
            this.sourceNode.loopStart = this.loopStartSec;
            this.sourceNode.loopEnd = this.loopEndSec;
        }
    }

    clearLoop() {
        if (!this.loopActive) return;
        this.loopActive = false;
        this.loopBeats = 0;
        if (this.sourceNode && this.buffer) {
            this.sourceNode.loopStart = 0;
            this.sourceNode.loopEnd = this.buffer.duration;
        }
    }

    get effectiveBpm() {
        const base = this.analysis ? this.analysis.bpm : 138.0;
        return base * this.tempoRatio;
    }

    getCurrentPhrase() {
        if (!this.analysis || !this.analysis.phrases) return { index: 0, type: 'GROOVE', color: '#00f5d4' };
        const t = this.currentTimeSec;
        for (const ph of this.analysis.phrases) {
            if (t >= ph.startSec && t <= ph.endSec) return ph;
        }
        return this.analysis.phrases[0] || { index: 0, type: 'GROOVE', color: '#00f5d4' };
    }

    /**
     * True only when playhead is inside the FIRST 3 phrases of the song (Phrase indices 0, 1, 2)
     */
    isInFirstThreePhrases() {
        if (!this.analysis || !this.analysis.phrases || this.analysis.phrases.length === 0) return false;
        const ph = this.getCurrentPhrase();
        return (ph.index || 0) < 3;
    }

    /**
     * True only when playhead is inside the LAST 3 phrases of the song
     */
    isInLastThreePhrases() {
        if (!this.analysis || !this.analysis.phrases || this.analysis.phrases.length === 0) return false;
        const total = this.analysis.phrases.length;
        const ph = this.getCurrentPhrase();
        if (total <= 3) {
            return this.currentTimeSec >= this.analysis.duration * 0.72;
        }
        return (ph.index || 0) >= total - 3;
    }

    /**
     * Engages a quantized 4-beat Entry Loop inside the song's first 3 phrases (used strictly when mixing INTO a song)
     */
    engageEntryLoop(beats = 4) {
        if (!this.analysis || !this.buffer) return;
        if (!this.isInFirstThreePhrases()) {
            const entrySec = this.analysis.hotCues?.[0]?.timeSec ?? this.analysis.firstBeatSec;
            this.play(entrySec);
        }
        if (!this.loopActive || this.loopBeats !== beats) {
            this.setBeatLoop(beats);
        }
    }

    /**
     * Engages a quantized 4-beat Exit Loop inside the song's last 3 phrases (used strictly when mixing OUT OF a song)
     */
    engageExitLoop(beats = 4) {
        if (!this.analysis || !this.buffer) return;
        if (!this.isInLastThreePhrases()) {
            const phrases = this.analysis.phrases;
            const exitPhrase = phrases[Math.max(0, phrases.length - 3)];
            if (exitPhrase) {
                this.play(exitPhrase.startSec);
            }
        }
        if (!this.loopActive || this.loopBeats !== beats) {
            this.setBeatLoop(beats);
        }
    }

    getCurrentRGBSlice() {
        if (!this.analysis || !this.analysis.rgbSlices) return { r: 0.5, g: 0.4, b: 0.3, peak: 0.5 };
        const idx = Math.min(
            this.analysis.rgbSlices.length - 1,
            Math.max(0, Math.floor(this.currentTimeSec * this.analysis.slicesPerSec))
        );
        return this.analysis.rgbSlices[idx];
    }

    updatePlayhead(dt, crossfaderWeight = 1.0) {
        if (!this.ctx || !this.buffer) return;

        // Recover vinyl brake factor smoothly
        if (this.vinylBrakeFactor < 1.0) {
            this.vinylBrakeFactor = Math.min(1.0, this.vinylBrakeFactor + dt * 3.8);
        }

        const effectiveRate = Math.max(0.08, this.tempoRatio * this.vinylBrakeFactor);
        if (this.sourceNode) {
            this.sourceNode.playbackRate.setTargetAtTime(effectiveRate, this.ctx.currentTime, 0.02);
        }

        if (this.isPlaying) {
            this.currentTimeSec += dt * effectiveRate;
            if (this.loopActive && this.loopEndSec > this.loopStartSec) {
                if (this.currentTimeSec >= this.loopEndSec) {
                    const span = this.loopEndSec - this.loopStartSec;
                    this.currentTimeSec = this.loopStartSec + ((this.currentTimeSec - this.loopStartSec) % span);
                }
            } else if (this.currentTimeSec >= this.buffer.duration) {
                this.currentTimeSec = this.currentTimeSec % this.buffer.duration;
            }
        }

        // Apply 3-Band EQ Isolator (-26dB cut to +6dB boost)
        const now = this.ctx.currentTime;
        const mapEqDb = (val) => (val < 0 ? val * 26.0 : val * 6.0);
        this.lowEQ.gain.setTargetAtTime(mapEqDb(this.eq.low), now, 0.03);
        this.midEQ.gain.setTargetAtTime(mapEqDb(this.eq.mid), now, 0.03);
        this.highEQ.gain.setTargetAtTime(mapEqDb(this.eq.high), now, 0.03);

        // Apply Sound Color Filter (-1 = LP, 0 = Bypass, +1 = HP)
        if (Math.abs(this.colorFilter) < 0.04) {
            this.colorFilterNode.type = 'lowpass';
            this.colorFilterNode.frequency.setTargetAtTime(20000, now, 0.03);
            this.colorFilterNode.Q.setTargetAtTime(0.707, now, 0.03);
        } else if (this.colorFilter < 0) {
            this.colorFilterNode.type = 'lowpass';
            const lpNorm = 1.0 + this.colorFilter; // 0..1
            const freq = 140 * Math.pow(135, lpNorm);
            this.colorFilterNode.frequency.setTargetAtTime(freq, now, 0.03);
            this.colorFilterNode.Q.setTargetAtTime(2.8, now, 0.03);
        } else {
            this.colorFilterNode.type = 'highpass';
            const freq = 25 * Math.pow(95, this.colorFilter);
            this.colorFilterNode.frequency.setTargetAtTime(freq, now, 0.03);
            this.colorFilterNode.Q.setTargetAtTime(3.2, now, 0.03);
        }

        // Apply Channel Fader * Crossfader power curve
        this.channelGain.gain.setTargetAtTime(this.volumeFader * crossfaderWeight, now, 0.03);
    }
};


/**
 * 3. RRR.RekordboxController
 * Dual-Deck Rekordbox Replica + Autonomous AI DJ ("DJ KINETIX") Controller.
 * Connects analyzed MP3s (or procedural fallback tracks) to the Rave Racer Remix FFT & Beat Bus.
 */
RRR.RekordboxController = class RekordboxController {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        this.ctx = null;
        this.outputNode = null;

        this.deck1 = null;
        this.deck2 = null;
        this.masterDeckId = 1;

        // Crossfader: -1.0 = Full Deck 1, 0.0 = Center Both, +1.0 = Full Deck 2
        this.crossfader = -0.92;

        // AI DJ ("DJ KINETIX") Autonomous Deck Control
        this.aiDjEnabled = true;
        this.aiActionText = 'AI DJ: LOCKED IN // CAMELOT HARMONIC SYNC';
        this.aiTransitionState = {
            active: false,
            fromDeck: 1,
            toDeck: 2,
            progress: 0.0,
            durationSec: 7.5,
            entryLoopReleased: false
        };

        // Song Folder Crate & Camelot Wheel Rotation Queue
        this.crate = [];
        this.deckCrateIds = { 1: null, 2: null };

        // Beatgrid tracking for driving game visuals & haptics from real MP3s
        this.lastBeatIndex = -1;
        this.lastStep16Index = -1;
        this.lastPhraseType = 'GROOVE';
        this.lastZoneIndex = -1;
        this.wasFinalLap = false;
        this.wasDrifting = false;
        this.isAnalyzing = false;
        this.statusMessage = 'READY — CLICK "📁 LOAD FOLDER" OR DRAG & DROP SONGS';

        // Offscreen or bound UI canvas for the Rekordbox Dual-Deck Studio
        this.studioCanvas = null;
        this.onStateChange = null;
    }

    init(audioCtx, destinationNode) {
        if (this.ctx) return;
        this.ctx = audioCtx;
        this.outputNode = destinationNode;

        this.deck1 = new RRR.RekordboxDeck(1, this.ctx, this.outputNode);
        this.deck2 = new RRR.RekordboxDeck(2, this.ctx, this.outputNode);

        // Seed default 4-track harmonic crate out-of-the-box (8A -> 9A -> 7A -> 4A)
        const defaultConfigs = [
            { title: 'NAGAI BAYSHORE ANTHEM (ORIGINAL MIX)', bpm: 138, mode: 'A_MINOR' },
            { title: 'WANGAN MIDNIGHT RUNNER (CLUB VIP)', bpm: 139, mode: 'E_MINOR' },
            { title: 'C1 INNER LOOP BREAKBEAT (DUB)', bpm: 136, mode: 'D_MINOR' },
            { title: 'SHIBUYA ACID 303 VIP (KINETIX EDIT)', bpm: 140, mode: 'F_MINOR' }
        ];

        defaultConfigs.forEach((cfg, idx) => {
            const buf = RRR.RekordboxAnalyzer.createProceduralTrackBuffer(this.ctx, cfg.bpm, cfg.mode);
            const analysis = RRR.RekordboxAnalyzer.analyzeAudioBuffer(buf, cfg.title);
            this.crate.push({
                id: `builtin_${idx + 1}`,
                title: analysis.title,
                artist: analysis.artist,
                analysis: analysis,
                audioBuffer: buf,
                file: null,
                playCount: idx === 0 ? 1 : 0,
                isBuiltin: true
            });
        });

        // Load Track 1 onto Deck 1 and start playing from its body/entry
        const firstTrack = this.crate[0];
        this.deckCrateIds[1] = firstTrack.id;
        this.deck1.loadTrack(firstTrack.audioBuffer, firstTrack.analysis, true);

        // Automatically cue the best Camelot + BPM match onto Deck 2 with an Entry Loop ready!
        this.cueNextCamelotTrackToDeck(2);

        // Also check if user placed tracks in prototype/tracks/playlist.json
        this.tryLoadTracksFolderPlaylist();
    }

    /**
     * Selects the next track from this.crate using the Camelot Wheel + BPM compatibility scorer,
     * loads it onto targetDeckId, and locks a 4-beat Entry Loop in its first 3 phrases.
     */
    async cueNextCamelotTrackToDeck(targetDeckId = 2) {
        if (!this.crate || this.crate.length === 0) return null;
        const otherDeckId = targetDeckId === 1 ? 2 : 1;
        const masterDeck = this.getDeck(otherDeckId);
        const targetDeck = this.getDeck(targetDeckId);
        if (!targetDeck) return null;

        const currentMasterCrateId = this.deckCrateIds[otherDeckId];
        const candidates = this.crate.filter((item) => item.id !== currentMasterCrateId);
        const pool = candidates.length > 0 ? candidates : this.crate;

        let minPlayCount = Infinity;
        for (const item of pool) {
            if ((item.playCount || 0) < minPlayCount) minPlayCount = item.playCount || 0;
        }

        let bestItem = pool[0];
        let bestScore = -Infinity;
        const masterAnalysis = masterDeck && masterDeck.analysis ? masterDeck.analysis : pool[0].analysis;

        for (const item of pool) {
            const score = RRR.CamelotWheel.scoreCandidateTrack(masterAnalysis, item, minPlayCount);
            if (score > bestScore) {
                bestScore = score;
                bestItem = item;
            }
        }

        // Decode audioBuffer on-demand if it was deferred from a large folder
        if (!bestItem.audioBuffer && bestItem.file && this.ctx) {
            const ab = await bestItem.file.arrayBuffer();
            bestItem.audioBuffer = await this.ctx.decodeAudioData(ab);
        }

        if (bestItem && bestItem.audioBuffer) {
            this.deckCrateIds[targetDeckId] = bestItem.id;
            targetDeck.loadTrack(bestItem.audioBuffer, bestItem.analysis, true);
            targetDeck.syncEnabled = true;
            // Lock a 4-beat Entry Loop inside the first 3 phrases so Deck is ready to mix in cleanly!
            targetDeck.engageEntryLoop(4);
            if (this.onStateChange) this.onStateChange();
        }
        return bestItem;
    }

    /**
     * Loads an entire folder (or multi-file selection) of songs, analyzes BPM, Beatgrid, RGB Waveform & Camelot Key,
     * populates the DJ Crate, and begins Camelot harmonic rotation.
     */
    async loadFolderFiles(fileList) {
        if (!fileList || fileList.length === 0) return;
        if (this.audioEngine && !this.audioEngine.isStarted) {
            this.audioEngine.init();
        }
        if (!this.ctx) return;

        const audioRegex = /\.(mp3|wav|ogg|flac|m4a|aac)$/i;
        const audioFiles = Array.from(fileList).filter(
            (f) => audioRegex.test(f.name) || (f.type && f.type.startsWith('audio/'))
        );

        if (audioFiles.length === 0) {
            this.statusMessage = 'NO SUPPORTED AUDIO FILES (.MP3/.WAV/.OGG/.FLAC) FOUND IN SELECTION';
            if (this.onStateChange) this.onStateChange();
            return;
        }

        this.isAnalyzing = true;
        const newCrate = [];

        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
            this.statusMessage = `ANALYZING FOLDER (${i + 1}/${audioFiles.length}): "${cleanTitle.toUpperCase()}"...`;
            this.aiActionText = `REKORDBOX FOLDER SCAN ${i + 1}/${audioFiles.length}`;
            if (this.onStateChange) this.onStateChange();

            try {
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                const analysis = this.getOrComputeAnalysis(audioBuffer, cleanTitle, file.size);

                newCrate.push({
                    id: `folder_${Date.now()}_${i}`,
                    title: analysis.title,
                    artist: analysis.artist,
                    analysis: analysis,
                    // Keep decoded buffer for up to 16 tracks in RAM; larger crates decode on-demand when cued
                    audioBuffer: i < 16 ? audioBuffer : null,
                    file: file,
                    playCount: 0,
                    isBuiltin: false
                });
            } catch (err) {
                console.warn(`Skipping unreadable audio file ${file.name}:`, err);
            }
        }

        this.isAnalyzing = false;
        if (newCrate.length === 0) {
            this.statusMessage = 'COULD NOT DECODE AUDIO FILES IN FOLDER';
            if (this.onStateChange) this.onStateChange();
            return;
        }

        // Replace crate with the user's loaded song folder
        this.crate = newCrate;

        // Sort initial starting track by energy/BPM or pick index 0, load to active Master Deck
        const masterId = this.crossfader <= 0 ? 1 : 2;
        const slaveId = masterId === 1 ? 2 : 1;
        const masterDeck = this.getDeck(masterId);

        const starter = this.crate[0];
        starter.playCount = 1;
        this.deckCrateIds[masterId] = starter.id;
        this.masterDeckId = masterId;
        masterDeck.loadTrack(starter.audioBuffer, starter.analysis, true);
        masterDeck.clearLoop(); // Let starter play cleanly from beginning

        // Cue the best Camelot + BPM harmonic match onto the Slave Deck (with Entry Loop in first 3 phrases)
        const nextMatch = await this.cueNextCamelotTrackToDeck(slaveId);
        const rel = nextMatch
            ? RRR.CamelotWheel.getHarmonicRelation(starter.analysis.camelot, nextMatch.analysis.camelot)
            : { badge: '' };

        this.statusMessage = `LOADED ${this.crate.length} SONGS // D${masterId}: ${starter.analysis.key} (${starter.analysis.bpm.toFixed(1)} BPM) → NEXT D${slaveId}: ${rel.badge}`;
        this.aiActionText = `CRATE READY (${this.crate.length} TRACKS) // CAMELOT ROTATION ON`;
        if (this.onStateChange) this.onStateChange();
    }

    getOrComputeAnalysis(audioBuffer, title, fileSize = 0) {
        const cacheKey = `rrr_rb_v2_${title}_${fileSize || audioBuffer.length}`;
        try {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const parsed = JSON.parse(cachedRaw);
                if (parsed && parsed.bpm && parsed.rgbSlices && parsed.beatGrid && parsed.camelot) {
                    return parsed;
                }
            }
        } catch (e) {}

        const analysis = RRR.RekordboxAnalyzer.analyzeAudioBuffer(audioBuffer, title);
        try {
            localStorage.setItem(cacheKey, JSON.stringify(analysis));
        } catch (e) {}
        return analysis;
    }

    async loadCrateTrackToDeck(crateId, deckId = 1) {
        const item = this.crate.find((c) => c.id === crateId);
        if (!item || !this.ctx) return;
        if (!item.audioBuffer && item.file) {
            const ab = await item.file.arrayBuffer();
            item.audioBuffer = await this.ctx.decodeAudioData(ab);
        }
        const deck = this.getDeck(deckId);
        if (!deck || !item.audioBuffer) return;

        this.deckCrateIds[deckId] = item.id;
        const isCurrentlyAudible = (deckId === 1 && this.crossfader < 0.2) || (deckId === 2 && this.crossfader > -0.2);
        deck.loadTrack(item.audioBuffer, item.analysis, true);
        if (isCurrentlyAudible) {
            item.playCount = (item.playCount || 0) + 1;
            deck.clearLoop();
        } else {
            // Cued on inactive deck: lock Entry Loop inside first 3 phrases
            deck.engageEntryLoop(4);
        }
        this.statusMessage = `DECK ${deckId} LOADED: "${item.analysis.title}" [${item.analysis.key} • ${item.analysis.bpm.toFixed(1)} BPM]`;
        if (this.onStateChange) this.onStateChange();
    }

    async tryLoadTracksFolderPlaylist() {
        try {
            const resp = await fetch('tracks/playlist.json', { cache: 'no-store' });
            if (!resp.ok) return;
            const playlist = await resp.json();
            if (!playlist || !Array.isArray(playlist.tracks) || playlist.tracks.length === 0) return;

            for (let i = 0; i < Math.min(2, playlist.tracks.length); i++) {
                const item = playlist.tracks[i];
                if (!item || !item.url) continue;
                const audioResp = await fetch(item.url);
                if (!audioResp.ok) continue;
                const arrayBuf = await audioResp.arrayBuffer();
                await this.decodeAndAnalyzeToDeck(arrayBuf, item.title || item.url.split('/').pop(), i + 1);
            }
        } catch (err) {
            // Optional local folder playlist; silently ignore if not present
        }
    }

    getMasterDeck() {
        return this.masterDeckId === 1 ? this.deck1 : this.deck2;
    }

    getSlaveDeck() {
        return this.masterDeckId === 1 ? this.deck2 : this.deck1;
    }

    getDeck(deckId) {
        return deckId === 1 ? this.deck1 : this.deck2;
    }

    setMasterDeck(deckId) {
        this.masterDeckId = deckId === 2 ? 2 : 1;
        this.aiActionText = `MASTER CLOCK → DECK ${this.masterDeckId}`;
        if (this.onStateChange) this.onStateChange();
    }

    /**
     * Loads a user-selected or dragged-and-dropped MP3/WAV/OGG/FLAC file into Deck 1 or Deck 2
     * and runs the full Rekordbox BPM, Beatgrid, RGB Waveform & Phrase analysis.
     */
    async loadAudioFileToDeck(file, deckId = 1) {
        if (!file) return;
        if (this.audioEngine && !this.audioEngine.isStarted) {
            this.audioEngine.init();
        }
        if (!this.ctx) return;

        this.isAnalyzing = true;
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        this.statusMessage = `ANALYZING "${cleanTitle.toUpperCase()}" (BPM, BEATGRID & RGB WAVEFORM)...`;
        this.aiActionText = `REKORDBOX ANALYZING DECK ${deckId}...`;
        if (this.onStateChange) this.onStateChange();

        try {
            const arrayBuffer = await file.arrayBuffer();
            await this.decodeAndAnalyzeToDeck(arrayBuffer, cleanTitle, deckId, file.size);
        } catch (err) {
            console.error('Rekordbox MP3 decode error:', err);
            this.statusMessage = `ERROR DECODING ${file.name}: ${err.message || 'UNSUPPORTED AUDIO'}`;
        } finally {
            this.isAnalyzing = false;
            if (this.onStateChange) this.onStateChange();
        }
    }

    async decodeAndAnalyzeToDeck(arrayBuffer, title, deckId = 1, fileSize = 0) {
        if (!this.ctx) return;
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        const analysis = this.getOrComputeAnalysis(audioBuffer, title, fileSize);

        // Add or update in crate so single-file drops also participate in Camelot rotation
        let crateItem = this.crate.find((c) => c.title === analysis.title);
        if (!crateItem) {
            crateItem = {
                id: `track_${Date.now()}_${deckId}`,
                title: analysis.title,
                artist: analysis.artist,
                analysis: analysis,
                audioBuffer: audioBuffer,
                file: null,
                playCount: 0,
                isBuiltin: false
            };
            this.crate.push(crateItem);
        } else {
            crateItem.audioBuffer = audioBuffer;
            crateItem.analysis = analysis;
        }

        this.deckCrateIds[deckId] = crateItem.id;
        const targetDeck = this.getDeck(deckId);
        if (targetDeck) {
            const isAudible = (deckId === 1 && this.crossfader < 0.2) || (deckId === 2 && this.crossfader > -0.2);
            targetDeck.loadTrack(audioBuffer, analysis, true);
            if (isAudible) {
                crateItem.playCount = (crateItem.playCount || 0) + 1;
                targetDeck.clearLoop();
            } else {
                // Cued on inactive deck: lock 4-beat Entry Loop in first 3 phrases
                targetDeck.engageEntryLoop(4);
            }
            this.statusMessage = `LOADED D${deckId}: "${analysis.title}" // ${analysis.key} • ${analysis.bpm.toFixed(1)} BPM`;
            this.aiActionText = `DECK ${deckId} READY // ${analysis.key} @ ${analysis.bpm.toFixed(1)} BPM`;
        }
        if (this.onStateChange) this.onStateChange();
        return analysis;
    }

    /**
     * Exports a Deck's Rekordbox Analysis (BPM, Beatgrid, Phrases, Hot Cues, RGB Slices) to a .rekordbox.json file
     */
    exportAnalysisJson(deckId = 1) {
        const deck = this.getDeck(deckId);
        if (!deck || !deck.analysis) return;

        const payload = JSON.stringify(deck.analysis, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (deck.analysis.title || `deck_${deckId}`).replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        a.href = url;
        a.download = `${safeName}.rekordbox.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.statusMessage = `EXPORTED ANALYSIS JSON FOR DECK ${deckId}`;
    }

    /**
     * Imports a previously saved .rekordbox.json analysis onto a Deck's currently loaded audio buffer
     */
    async importAnalysisJson(file, deckId = 1) {
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const deck = this.getDeck(deckId);
            if (deck && parsed && parsed.bpm && parsed.beatGrid) {
                deck.analysis = parsed;
                this.statusMessage = `IMPORTED REKORDBOX ANALYSIS FOR DECK ${deckId} (${parsed.bpm.toFixed(1)} BPM)`;
                if (this.onStateChange) this.onStateChange();
            }
        } catch (err) {
            this.statusMessage = `INVALID REKORDBOX JSON FILE`;
        }
    }

    /**
     * Triggers a beat-matched AI DJ Camelot crossfade transition from the active Master Deck to the other Deck.
     * Uses loops strictly for EXITING the outgoing song (last 3 phrases) and ENTERING the incoming song (first 3 phrases).
     */
    triggerAutoTransition(reasonText = 'CAMELOT HARMONIC TRANSITION') {
        if (!this.deck1 || !this.deck2) return;
        const fromId = this.crossfader <= 0 ? 1 : 2;
        const toId = fromId === 1 ? 2 : 1;
        const incomingDeck = this.getDeck(toId);
        const outgoingDeck = this.getDeck(fromId);

        if (!incomingDeck || !outgoingDeck || !incomingDeck.buffer) return;

        // 1. Outgoing Deck: Lock a 4-beat EXIT LOOP if in its last 3 phrases so it never runs out of track during mix-out
        if (outgoingDeck.isInLastThreePhrases() && !outgoingDeck.loopActive) {
            outgoingDeck.setBeatLoop(4);
        }

        // 2. Incoming Deck: Enable Beat Sync and lock a 4-beat ENTRY LOOP inside its first 3 phrases!
        incomingDeck.syncEnabled = true;
        if (!incomingDeck.isPlaying) {
            const entrySec = incomingDeck.analysis?.hotCues?.[0]?.timeSec ?? (incomingDeck.analysis ? incomingDeck.analysis.firstBeatSec : 0);
            incomingDeck.play(entrySec);
        }
        incomingDeck.engageEntryLoop(4);

        // Cut incoming deck's LOW EQ initially so bass doesn't clash during blend
        incomingDeck.eq.low = -0.82;

        const harm = RRR.CamelotWheel.getHarmonicRelation(
            outgoingDeck.analysis?.camelot || outgoingDeck.analysis?.key,
            incomingDeck.analysis?.camelot || incomingDeck.analysis?.key
        );

        this.aiTransitionState = {
            active: true,
            fromDeck: fromId,
            toDeck: toId,
            progress: 0.0,
            durationSec: 7.5,
            entryLoopReleased: false,
            reason: `${reasonText} [${harm.badge}]`
        };
        this.aiActionText = `AI DJ: ${reasonText} (D${fromId} → D${toId} • ${harm.badge})`;
    }

    /**
     * Real-Time Beat-Matching (Syncs slave deck tempo & beatgrid phase to master deck)
     */
    syncDecks(dt) {
        const master = this.getMasterDeck();
        const slave = this.getSlaveDeck();
        if (!master || !slave || !master.analysis || !slave.analysis) return;

        if (slave.syncEnabled) {
            // 1. Match Effective BPM
            const targetRatio = master.effectiveBpm / Math.max(60, slave.analysis.bpm);
            slave.tempoRatio += (targetRatio - slave.tempoRatio) * Math.min(1.0, dt * 8.0);

            // 2. Align Beatgrid Phase (0..1 within current beat)
            const masterBeatSec = master.analysis.beatIntervalSec;
            const slaveBeatSec = slave.analysis.beatIntervalSec;
            const masterPhase = (((master.currentTimeSec - master.analysis.firstBeatSec) / masterBeatSec) % 1.0 + 1.0) % 1.0;
            const slavePhase = (((slave.currentTimeSec - slave.analysis.firstBeatSec) / slaveBeatSec) % 1.0 + 1.0) % 1.0;

            let phaseDiff = masterPhase - slavePhase;
            if (phaseDiff > 0.5) phaseDiff -= 1.0;
            if (phaseDiff < -0.5) phaseDiff += 1.0;

            // Gentle CDJ jog-wheel phase nudge when out of phase by > 3%
            if (Math.abs(phaseDiff) > 0.03 && slave.isPlaying) {
                slave.currentTimeSec = Math.max(0, slave.currentTimeSec + phaseDiff * slaveBeatSec * Math.min(1.0, dt * 4.5));
            }
        }
    }

    /**
     * Triggered when cars collide: applies a CDJ Vinyl Brake / Scratch dip on the active deck
     */
    triggerVinylScratch(normalizedForce = 0.8) {
        const activeDeck = this.crossfader <= 0 ? this.deck1 : this.deck2;
        if (!activeDeck) return;
        activeDeck.vinylBrakeFactor = Math.max(0.12, 1.0 - normalizedForce * 0.82);
        this.aiActionText = 'AI DJ: VINYL BRAKE SCRATCH // COLLISION DUCK';
    }

    /**
     * Per-frame update: advances playheads, synchronizes beatgrids, executes AI DJ EQ/Filter/Loop/Crossfade moves,
     * and broadcasts beat pulses & phrase markers to the game's AudioEngine state.
     */
    update(dt, raceParams, audioState) {
        if (!this.ctx || !this.deck1 || !this.deck2) return;

        // 1. Execute Autonomous AI DJ Manipulation if enabled
        if (this.aiDjEnabled) {
            this.updateAIController(dt, raceParams);
        }

        // 2. Real-Time Beat-Matching between Master and Slave Deck
        this.syncDecks(dt);

        // 3. Compute Equal-Power Crossfader Weights (-1 = Deck 1, +1 = Deck 2)
        const normFade = (this.crossfader + 1.0) * 0.5; // 0.0 -> 1.0
        const weight1 = Math.cos(normFade * Math.PI * 0.5);
        const weight2 = Math.sin(normFade * Math.PI * 0.5);

        this.deck1.updatePlayhead(dt, weight1);
        this.deck2.updatePlayhead(dt, weight2);

        // 4. Drive AudioEngine's BPM, BeatPulse, Step16, and Section from the dominant deck's analyzed Beatgrid!
        const dominantDeck = weight1 >= weight2 ? this.deck1 : this.deck2;
        if (dominantDeck && dominantDeck.analysis) {
            const analysis = dominantDeck.analysis;
            audioState.bpm = Math.round(dominantDeck.effectiveBpm * 10) / 10;

            const relSec = Math.max(0, dominantDeck.currentTimeSec - analysis.firstBeatSec);
            const beatFloat = relSec / analysis.beatIntervalSec;
            const currentBeatIdx = Math.floor(beatFloat);
            const currentStep16 = Math.floor((beatFloat * 4) % 16);

            audioState.step16 = currentStep16;

            if (currentBeatIdx !== this.lastBeatIndex) {
                this.lastBeatIndex = currentBeatIdx;
                audioState.beatPulse = 1.0;
                if (this.audioEngine && this.audioEngine.onBeatCallback) {
                    this.audioEngine.onBeatCallback(currentBeatIdx % 4, audioState.section);
                }
            }

            const phraseObj = dominantDeck.getCurrentPhrase();
            const mappedSection = phraseObj.type === 'INTRO' || phraseObj.type === 'OUTRO' ? 'GROOVE' : phraseObj.type;
            if (mappedSection !== this.lastPhraseType) {
                this.lastPhraseType = mappedSection;
                audioState.section = mappedSection;
                if (this.audioEngine && this.audioEngine.onMarkerCallback) {
                    this.audioEngine.onMarkerCallback(mappedSection);
                }
            }

            // Map live Rekordbox EQ & RGB energy onto the 5 HUD stem meters so HUD visualizer dances to MP3s
            const rgb = dominantDeck.getCurrentRGBSlice();
            audioState.stems.kickSub = Math.min(1.0, Math.max(0.1, rgb.r * (1.0 + dominantDeck.eq.low * 0.5)));
            audioState.stems.percTops = Math.min(1.0, Math.max(0.1, rgb.b * (1.0 + dominantDeck.eq.high * 0.5)));
            audioState.stems.synthChords = Math.min(1.0, Math.max(0.1, rgb.g * (1.0 + dominantDeck.eq.mid * 0.5)));
            audioState.stems.leadAcid = Math.min(1.0, Math.max(0.1, (rgb.g + rgb.b) * 0.6));
            audioState.stems.fxRisers = dominantDeck.loopActive ? 0.95 : Math.min(1.0, Math.abs(dominantDeck.colorFilter));
        }

        // 5. Render Rekordbox Studio Canvas if visible
        if (this.studioCanvas && !this.studioCanvas.closest('.hidden')) {
            this.renderRekordboxUI(this.studioCanvas);
        }
    }

    /**
     * Autonomous AI DJ ("DJ KINETIX") Brain:
     * - Rotates through the song folder crate using the Camelot Wheel & BPM proximity.
     * - Uses Beat-Loops STRICTLY when ENTERING a song (first 3 phrases) or EXITING a song (last 3 phrases).
     * - Operates 3-Band EQs and Sound Color Filter in response to song phrases & R4 drifting.
     */
    updateAIController(dt, raceParams) {
        const activeDeck = this.crossfader <= 0 ? this.deck1 : this.deck2;
        if (!activeDeck || !activeDeck.analysis) return;

        const speed = Math.max(0, Math.min(1.2, raceParams.normalizedSpeed || 0));
        const isDrifting = !!raceParams.isDrifting;
        const driftCharge = Math.max(0, Math.min(1.0, raceParams.driftCharge || 0));
        const phrase = activeDeck.getCurrentPhrase();
        const totalPhrases = activeDeck.analysis.phrases ? activeDeck.analysis.phrases.length : 1;

        // A. Subtle Tempo Adjustment (+2% on Final Lap, otherwise steady native/synced groove)
        const targetTempo = raceParams.isFinalLap ? 1.022 : 1.0;
        activeDeck.tempoRatio += (targetTempo - activeDeck.tempoRatio) * Math.min(1.0, dt * 2.0);

        // B. Automatic Exit Loop + Camelot Transition when active song reaches its LAST 3 PHRASES!
        if (!this.aiTransitionState.active && activeDeck.isInLastThreePhrases()) {
            const exitStartIdx = Math.max(0, totalPhrases - 3);
            const exitStartSec = activeDeck.analysis.phrases[exitStartIdx]?.startSec || (activeDeck.analysis.duration * 0.75);
            // Wait ~1 bar into the exit window, then lock a 4-beat Exit Loop and trigger Camelot Mix-Out!
            if (activeDeck.currentTimeSec >= exitStartSec + activeDeck.analysis.barIntervalSec) {
                activeDeck.engageExitLoop(4);
                this.triggerAutoTransition('OUTRO EXIT-LOOP → CAMELOT MIX');
            }
        }

        // C. Handle Active Crossfader Transition (Exit Loop on Outgoing Deck -> Entry Loop on Incoming Deck)
        if (this.aiTransitionState.active) {
            const tr = this.aiTransitionState;
            tr.progress += dt / tr.durationSec;
            const fromDeck = this.getDeck(tr.fromDeck);
            const toDeck = this.getDeck(tr.toDeck);

            const startFade = tr.fromDeck === 1 ? -0.92 : 0.92;
            const endFade = tr.toDeck === 2 ? 0.92 : -0.92;
            const smoothT = tr.progress < 0.5
                ? 2 * tr.progress * tr.progress
                : 1 - Math.pow(-2 * tr.progress + 2, 2) / 2;

            this.crossfader = startFade + (endFade - startFade) * Math.min(1.0, smoothT);

            // Classic Boiler Room Bass Swap at 50% crossfade mark!
            if (tr.progress < 0.5) {
                toDeck.eq.low = -0.78;
                fromDeck.eq.low = 0.08;
                this.aiActionText = `AI DJ: INTRO 4B ENTRY-LOOP MIX-IN (${Math.round(tr.progress * 100)}%)`;
            } else {
                toDeck.eq.low = 0.22; // Drop incoming bass in!
                fromDeck.eq.low = -0.82; // Cut outgoing bass!
                this.aiActionText = `AI DJ: CAMELOT BASS-SWAP → DECK ${tr.toDeck} (${Math.round(tr.progress * 100)}%)`;
            }

            // Release the Incoming Deck's ENTRY LOOP at 82% of transition so the song flows into its body!
            if (tr.progress >= 0.82 && !tr.entryLoopReleased) {
                tr.entryLoopReleased = true;
                toDeck.clearLoop();
            }

            if (tr.progress >= 1.0) {
                tr.active = false;
                this.masterDeckId = tr.toDeck;
                toDeck.clearLoop();
                fromDeck.clearLoop();
                fromDeck.eq.low = 0.0;

                // Increment playCount on the newly active track
                const newMasterCrateId = this.deckCrateIds[tr.toDeck];
                const playedItem = this.crate.find((c) => c.id === newMasterCrateId);
                if (playedItem) {
                    playedItem.playCount = (playedItem.playCount || 0) + 1;
                }

                // Automatically cue the NEXT Camelot + BPM compatible song from the folder onto the now-idle deck!
                this.cueNextCamelotTrackToDeck(tr.fromDeck);

                this.aiActionText = `AI DJ: DECK ${tr.toDeck} LIVE [${toDeck.analysis?.key || '8A'} • ${toDeck.effectiveBpm.toFixed(1)} BPM]`;
            }
            return;
        }

        // Ensure NO Beat-Loops remain active during the main body of a song (Phrases 3 .. N-4)!
        if (activeDeck.loopActive && !activeDeck.isInFirstThreePhrases() && !activeDeck.isInLastThreePhrases()) {
            activeDeck.clearLoop();
        }
        // Also if activeDeck finished entering and is past phrase 0 without a transition active, release any lingering entry loop
        if (activeDeck.loopActive && activeDeck.isInFirstThreePhrases() && (phrase.index || 0) >= 1) {
            activeDeck.clearLoop();
        }

        // D. R4 Drift Sound Color Filter Sweep & Drift Boost Drop (No Mid-Song Loops!)
        if (isDrifting) {
            const targetHPF = 0.22 + driftCharge * 0.46;
            activeDeck.colorFilter += (targetHPF - activeDeck.colorFilter) * Math.min(1.0, dt * 6.0);
            activeDeck.eq.low += (-0.35 - activeDeck.eq.low) * Math.min(1.0, dt * 5.0);
            activeDeck.eq.high += (0.35 - activeDeck.eq.high) * Math.min(1.0, dt * 5.0);
            this.aiActionText = `AI DJ: DRIFT HPF SWEEP (${Math.round(driftCharge * 100)}%) + LOW CUT`;
        } else {
            if (this.wasDrifting && driftCharge > 0.35) {
                activeDeck.colorFilter = 0.0;
                activeDeck.eq.low = 0.55;
                this.aiActionText = 'AI DJ: DRIFT BOOST BASS SLAM (+3.3dB LOW)';
            } else {
                // Phrase-based EQ & Filter shaping (without mid-song looping)
                let targetLow = 0.08;
                let targetMid = 0.05;
                let targetHigh = Math.min(0.35, speed * 0.30);
                let targetFilter = 0.0;

                if (phrase.type === 'PRE_DROP') {
                    const phraseProgress = (activeDeck.currentTimeSec - phrase.startSec) / Math.max(0.1, phrase.endSec - phrase.startSec);
                    targetLow = -0.45 * phraseProgress;
                    targetHigh = 0.32;
                    targetFilter = 0.30 * phraseProgress;
                    this.aiActionText = `AI DJ: PRE-DROP HPF RISER // ${activeDeck.analysis.key}`;
                } else if (phrase.type === 'DROP') {
                    targetLow = 0.42;
                    targetMid = 0.18;
                    targetHigh = 0.32;
                    targetFilter = 0.0;
                    this.aiActionText = `AI DJ: DROP BASS BOOST // ${activeDeck.analysis.key} @ ${activeDeck.effectiveBpm.toFixed(1)} BPM`;
                } else if (phrase.type === 'BREAKDOWN') {
                    targetLow = -0.22;
                    targetMid = 0.25;
                    targetFilter = -0.18;
                    this.aiActionText = `AI DJ: BREAKDOWN LPF CONTOUR // ${activeDeck.analysis.key}`;
                } else {
                    const zoneTag = activeDeck.isInFirstThreePhrases()
                        ? 'INTRO PHRASE'
                        : (activeDeck.isInLastThreePhrases() ? 'OUTRO PHRASE' : 'BODY GROOVE');
                    this.aiActionText = `AI DJ: ${zoneTag} (${(phrase.index || 0) + 1}/${totalPhrases}) // ${activeDeck.analysis.key}`;
                }

                activeDeck.eq.low += (targetLow - activeDeck.eq.low) * Math.min(1.0, dt * 4.0);
                activeDeck.eq.mid += (targetMid - activeDeck.eq.mid) * Math.min(1.0, dt * 4.0);
                activeDeck.eq.high += (targetHigh - activeDeck.eq.high) * Math.min(1.0, dt * 4.0);
                activeDeck.colorFilter += (targetFilter - activeDeck.colorFilter) * Math.min(1.0, dt * 5.0);
            }
        }
        this.wasDrifting = isDrifting;
    }

    /**
     * Renders a compact live Rekordbox Dual-Waveform + CDJ Telemetry strip directly onto the 3D Jumbotron Canvas!
     */
    renderJumbotronRekordboxOverlay(ctx, w, h) {
        if (!this.deck1 || !this.deck2) return;
        const activeDeck = this.crossfader <= 0 ? this.deck1 : this.deck2;
        if (!activeDeck || !activeDeck.analysis) return;

        const stripY = h - 62;
        const stripH = 26;

        // Dark Pioneer Waveform Strip Box
        ctx.fillStyle = 'rgba(5, 4, 14, 0.88)';
        ctx.fillRect(10, stripY, w - 20, stripH);
        ctx.strokeStyle = activeDeck.id === 1 ? '#00f5d4' : '#ff1e6b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(10, stripY, w - 20, stripH);

        this.drawScrollingRGBWaveform(ctx, activeDeck, 12, stripY + 2, w - 24, stripH - 4, 5.0);

        // Deck Badge & BPM readout
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(14, stripY + 3, 195, 13);
        ctx.fillStyle = activeDeck.id === 1 ? '#00f5d4' : '#ff1e6b';
        ctx.font = 'bold 9px "Chakra Petch", monospace';
        const titleShort = (activeDeck.analysis.title || 'TRACK').substring(0, 18);
        ctx.fillText(`D${activeDeck.id}: ${titleShort} [${activeDeck.effectiveBpm.toFixed(1)} BPM]`, 18, stripY + 12);
    }

    /**
     * Draws a Pioneer Rekordbox Scrolling 3-Band RGB Waveform + Beatgrid + Hot Cues + Active Loop Region
     */
    drawScrollingRGBWaveform(ctx, deck, x, y, w, h, windowSeconds = 7.0) {
        if (!deck || !deck.analysis) return;
        const analysis = deck.analysis;
        const slices = analysis.rgbSlices;
        const sps = analysis.slicesPerSec;
        const currSec = deck.currentTimeSec;
        const centerX = x + w * 0.35; // Playhead at 35% from left so user sees incoming beats clearly
        const pxPerSec = w / windowSeconds;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        // 1. Phrase Structure Color Bar along bottom of waveform
        const startVisibleSec = currSec - (centerX - x) / pxPerSec;
        const endVisibleSec = currSec + (x + w - centerX) / pxPerSec;

        if (analysis.phrases) {
            for (const ph of analysis.phrases) {
                if (ph.endSec < startVisibleSec || ph.startSec > endVisibleSec) continue;
                const px1 = Math.max(x, centerX + (ph.startSec - currSec) * pxPerSec);
                const px2 = Math.min(x + w, centerX + (ph.endSec - currSec) * pxPerSec);
                ctx.fillStyle = ph.color;
                ctx.globalAlpha = 0.25;
                ctx.fillRect(px1, y + h - 5, Math.max(1, px2 - px1), 5);
                ctx.globalAlpha = 1.0;
            }
        }

        // 2. Active Beat-Loop Highlight Region
        if (deck.loopActive && deck.loopEndSec > deck.loopStartSec) {
            const lx1 = centerX + (deck.loopStartSec - currSec) * pxPerSec;
            const lx2 = centerX + (deck.loopEndSec - currSec) * pxPerSec;
            ctx.fillStyle = 'rgba(255, 230, 0, 0.24)';
            ctx.fillRect(lx1, y, Math.max(2, lx2 - lx1), h);
            ctx.strokeStyle = '#ffe600';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(lx1, y, Math.max(2, lx2 - lx1), h);
        }

        // 3. 3-Band RGB Waveform Vertical Bars (Red=Low, Green=Mid, Blue=High)
        const midY = y + h * 0.5;
        const maxHalfH = h * 0.44;
        const stepPx = 2;

        for (let px = x; px < x + w; px += stepPx) {
            const tSec = currSec + (px - centerX) / pxPerSec;
            if (tSec < 0 || tSec >= analysis.duration) continue;
            const sIdx = Math.floor(tSec * sps);
            const slice = slices[sIdx];
            if (!slice) continue;

            const amp = Math.max(0.06, slice.peak) * maxHalfH;
            const r = Math.min(255, Math.round(slice.r * 265));
            const g = Math.min(255, Math.round(slice.g * 255));
            const b = Math.min(255, Math.round(slice.b * 285));

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(px, midY - amp, stepPx - 0.5, amp * 2);
        }

        // 4. Quantized Beatgrid Tick Lines (Red = Bar Downbeat 1/4, White = Beats 2,3,4)
        const firstBeatIdx = Math.max(0, Math.floor((startVisibleSec - analysis.firstBeatSec) / analysis.beatIntervalSec));
        const lastBeatIdx = Math.ceil((endVisibleSec - analysis.firstBeatSec) / analysis.beatIntervalSec);

        for (let bIdx = firstBeatIdx; bIdx <= lastBeatIdx; bIdx++) {
            const beatSec = analysis.firstBeatSec + bIdx * analysis.beatIntervalSec;
            if (beatSec < 0 || beatSec > analysis.duration) continue;
            const bx = centerX + (beatSec - currSec) * pxPerSec;
            if (bx < x || bx > x + w) continue;

            const isDownbeat = bIdx % 4 === 0;
            ctx.strokeStyle = isDownbeat ? '#ff1e56' : 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = isDownbeat ? 1.5 : 1;
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx, y + (isDownbeat ? h : 6));
            ctx.stroke();
        }

        // 5. Hot Cue Markers (A, B, C, D)
        if (analysis.hotCues) {
            for (const cue of analysis.hotCues) {
                const cx = centerX + (cue.timeSec - currSec) * pxPerSec;
                if (cx < x - 10 || cx > x + w + 10) continue;
                ctx.fillStyle = cue.color;
                ctx.fillRect(cx - 1, y, 2, h);
                ctx.fillRect(cx - 6, y, 13, 11);
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 8px "Chakra Petch", sans-serif';
                ctx.fillText(cue.id, cx - 3, y + 8);
            }
        }

        // 6. Fixed Center Playhead Marker (Pioneer Red/White needle)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(centerX, y + h);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Renders the Full Rekordbox Dual-Deck Performance Canvas inside the Rekordbox Studio Drawer
     */
    renderRekordboxUI(canvas) {
        if (!canvas || !this.deck1 || !this.deck2) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.fillStyle = '#070512';
        ctx.fillRect(0, 0, w, h);

        // 1. Top Parallel Scrolling Waveforms (Deck 1 Cyan border, Deck 2 Magenta border)
        const wfH = 54;
        // Deck 1 Waveform
        ctx.fillStyle = '#0b081c';
        ctx.fillRect(8, 6, w - 16, wfH);
        this.drawScrollingRGBWaveform(ctx, this.deck1, 8, 6, w - 16, wfH, 8.0);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(8, 6, w - 16, wfH);

        // Deck 2 Waveform
        ctx.fillStyle = '#0b081c';
        ctx.fillRect(8, 64, w - 16, wfH);
        this.drawScrollingRGBWaveform(ctx, this.deck2, 8, 64, w - 16, wfH, 8.0);
        ctx.strokeStyle = '#ff1e6b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(8, 64, w - 16, wfH);

        // Deck Labels on Waveforms
        ctx.fillStyle = 'rgba(5, 3, 14, 0.85)';
        ctx.fillRect(12, 10, 230, 16);
        ctx.fillStyle = '#00f5d4';
        ctx.font = 'bold 10px "Chakra Petch", sans-serif';
        const d1Phrase = this.deck1.getCurrentPhrase().type;
        ctx.fillText(`DECK 1 // ${(this.deck1.analysis?.title || 'TRACK 1').substring(0, 22)} [${d1Phrase}]`, 16, 21);

        ctx.fillStyle = 'rgba(5, 3, 14, 0.85)';
        ctx.fillRect(12, 68, 230, 16);
        ctx.fillStyle = '#ff1e6b';
        const d2Phrase = this.deck2.getCurrentPhrase().type;
        ctx.fillText(`DECK 2 // ${(this.deck2.analysis?.title || 'TRACK 2').substring(0, 22)} [${d2Phrase}]`, 16, 79);

        // 2. Bottom Half: Left Deck 1 Jog & Overview | Center Mixer Knobs | Right Deck 2 Jog & Overview
        const bottomY = 126;
        const bottomH = h - bottomY - 6;

        // Draw Deck 1 Platter & Full-Track Overview (Left)
        this.drawDeckPlatterUnit(ctx, this.deck1, 8, bottomY, 270, bottomH, '#00f5d4');

        // Draw Center 2-Channel Pioneer DJM Mixer & AI DJ Status (Center)
        this.drawCenterMixerUnit(ctx, 286, bottomY, w - 572, bottomH);

        // Draw Deck 2 Platter & Full-Track Overview (Right)
        this.drawDeckPlatterUnit(ctx, this.deck2, w - 278, bottomY, 270, bottomH, '#ff1e6b');
    }

    drawDeckPlatterUnit(ctx, deck, x, y, w, h, accentColor) {
        ctx.fillStyle = '#0d0922';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        if (!deck || !deck.analysis) return;

        // Spinning CDJ Jog Wheel
        const jx = x + 46;
        const jy = y + 44;
        const jr = 34;

        ctx.save();
        ctx.translate(jx, jy);
        const rotAngle = (deck.currentTimeSec * 1.8) % (Math.PI * 2);
        ctx.rotate(rotAngle);

        ctx.fillStyle = '#060410';
        ctx.beginPath();
        ctx.arc(0, 0, jr, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, jr - 3, 0, Math.PI * 1.65);
        ctx.stroke();

        // Inner position marker line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -jr + 5);
        ctx.stroke();
        ctx.restore();

        // Center CDJ Jog LCD Readout
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Chakra Petch", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`D${deck.id}`, jx, jy + 4);
        ctx.textAlign = 'left';

        // Track Telemetry (BPM, Camelot Key Badge, Pitch %, Elapsed/Total Time, Master/Sync Badges)
        const tx = x + 92;
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 15px "Fugaz One", monospace';
        ctx.fillText(`${deck.effectiveBpm.toFixed(1)} BPM`, tx, y + 23);

        // Camelot Wheel Key Pill on CDJ Display
        const camelotKey = deck.analysis.key || '8A (Am)';
        ctx.fillStyle = deck.analysis.camelot?.color || '#00f5d4';
        ctx.fillRect(tx + 96, y + 10, 68, 15);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px "Chakra Petch", sans-serif';
        ctx.fillText(camelotKey, tx + 101, y + 21);

        const pitchPct = (deck.tempoRatio - 1.0) * 100;
        ctx.fillStyle = '#cfc9ec';
        ctx.font = 'bold 10px "Chakra Petch", monospace';
        const phNum = (deck.getCurrentPhrase().index || 0) + 1;
        const phTot = deck.analysis.phrases ? deck.analysis.phrases.length : 1;
        ctx.fillText(`PITCH: ${pitchPct >= 0 ? '+' : ''}${pitchPct.toFixed(1)}% | PHRASE ${phNum}/${phTot}`, tx, y + 39);

        const fmtTime = (sec) => {
            const m = Math.floor(sec / 60);
            const s = Math.floor(sec % 60);
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        };
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`TIME: ${fmtTime(deck.currentTimeSec)} / ${fmtTime(deck.analysis.duration)}`, tx, y + 55);

        // Master / Sync / Loop Status Pills
        const isMaster = this.masterDeckId === deck.id;
        ctx.fillStyle = isMaster ? '#ffe600' : '#1b1438';
        ctx.fillRect(tx, y + 62, 52, 14);
        ctx.fillStyle = isMaster ? '#000000' : '#9e96c4';
        ctx.font = 'bold 9px "Chakra Petch", sans-serif';
        ctx.fillText('MASTER', tx + 7, y + 72);

        ctx.fillStyle = deck.syncEnabled ? '#00f5d4' : '#1b1438';
        ctx.fillRect(tx + 56, y + 62, 42, 14);
        ctx.fillStyle = deck.syncEnabled ? '#000000' : '#9e96c4';
        ctx.fillText('SYNC', tx + 65, y + 72);

        if (deck.loopActive) {
            ctx.fillStyle = '#ff1e6b';
            ctx.fillRect(tx + 102, y + 62, 62, 14);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`LOOP ${deck.loopBeats}B`, tx + 108, y + 72);
        }

        // Full-Track Overview RGB Bar + Phrase Blocks at Bottom of Deck Unit
        const ovX = x + 8;
        const ovY = y + h - 22;
        const ovW = w - 16;
        const ovH = 15;
        ctx.fillStyle = '#05030d';
        ctx.fillRect(ovX, ovY, ovW, ovH);

        const slices = deck.analysis.rgbSlices;
        if (slices && slices.length > 0) {
            for (let i = 0; i < ovW; i += 2) {
                const sIdx = Math.floor((i / ovW) * slices.length);
                const sl = slices[sIdx];
                if (!sl) continue;
                const bh = Math.max(2, sl.peak * (ovH - 4));
                const r = Math.min(255, Math.round(sl.r * 255));
                const g = Math.min(255, Math.round(sl.g * 255));
                const b = Math.min(255, Math.round(sl.b * 255));
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(ovX + i, ovY + ovH - 3 - bh, 1.5, bh);
            }
        }

        // Phrase colored underline
        if (deck.analysis.phrases) {
            for (const ph of deck.analysis.phrases) {
                const px1 = ovX + (ph.startSec / deck.analysis.duration) * ovW;
                const px2 = ovX + (ph.endSec / deck.analysis.duration) * ovW;
                ctx.fillStyle = ph.color;
                ctx.fillRect(px1, ovY + ovH - 3, Math.max(1, px2 - px1), 3);
            }
        }

        // Playhead Needle on Overview Bar
        const playheadX = ovX + (deck.currentTimeSec / Math.max(1, deck.analysis.duration)) * ovW;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playheadX - 1, ovY - 2, 2.5, ovH + 4);
    }

    drawCenterMixerUnit(ctx, x, y, w, h) {
        ctx.fillStyle = '#110c29';
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);

        // AI DJ Action Banner at top of mixer
        ctx.fillStyle = '#060412';
        ctx.fillRect(x + 6, y + 5, w - 12, 18);
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 10px "Chakra Petch", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.aiActionText, x + w * 0.5, y + 17);

        // Draw 4 Rotary Knobs per Deck (HI, MID, LOW, FILTER)
        const drawKnob = (kx, ky, label, val, color) => {
            const r = 11;
            ctx.fillStyle = '#070512';
            ctx.beginPath();
            ctx.arc(kx, ky, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.28)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Value arc (-135 deg to +135 deg)
            const ang = -Math.PI * 0.5 + Math.max(-1, Math.min(1, val)) * (Math.PI * 0.75);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(kx, ky);
            ctx.lineTo(kx + Math.cos(ang) * r, ky + Math.sin(ang) * r);
            ctx.stroke();

            ctx.fillStyle = '#b8b2d8';
            ctx.font = 'bold 8px "Chakra Petch", sans-serif';
            ctx.fillText(label, kx, ky + r + 9);
        };

        const rowY = y + 42;
        const d1Start = x + 24;
        const stepX = 32;
        drawKnob(d1Start, rowY, 'LOW', this.deck1.eq.low, '#ff1e56');
        drawKnob(d1Start + stepX, rowY, 'MID', this.deck1.eq.mid, '#00f5d4');
        drawKnob(d1Start + stepX * 2, rowY, 'HI', this.deck1.eq.high, '#4ea8de');
        drawKnob(d1Start + stepX * 3, rowY, 'FLTR', this.deck1.colorFilter, '#ffe600');

        const d2Start = x + w - 24 - stepX * 3;
        drawKnob(d2Start, rowY, 'LOW', this.deck2.eq.low, '#ff1e56');
        drawKnob(d2Start + stepX, rowY, 'MID', this.deck2.eq.mid, '#00f5d4');
        drawKnob(d2Start + stepX * 2, rowY, 'HI', this.deck2.eq.high, '#4ea8de');
        drawKnob(d2Start + stepX * 3, rowY, 'FLTR', this.deck2.colorFilter, '#ffe600');

        // Crossfader Bar at Bottom of Center Mixer
        const cfW = Math.min(180, w - 40);
        const cfX = x + (w - cfW) * 0.5;
        const cfY = y + h - 18;

        ctx.fillStyle = '#05030d';
        ctx.fillRect(cfX, cfY - 3, cfW, 6);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.strokeRect(cfX, cfY - 3, cfW, 6);

        const thumbX = cfX + ((this.crossfader + 1.0) * 0.5) * cfW;
        ctx.fillStyle = '#ffe600';
        ctx.fillRect(thumbX - 7, cfY - 9, 14, 18);
        ctx.textAlign = 'left';
    }
};
