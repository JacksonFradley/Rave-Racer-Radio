/**
 * RAVE RACER REMIX — Pillar 3.3: Track DJ Controller & Single-RenderTexture Jumbotron Pipeline
 * Renders "DJ KINETIX" in a Boiler Room booth to a shared 512x256 canvas texture that is
 * broadcast onto all 3D trackside LED jumbotrons and the HUD monitor with zero draw-call overhead.
 */
window.RRR = window.RRR || {};

RRR.TrackDJController = class TrackDJController {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d');

        this.djName = 'DJ KINETIX // LIVE BOILER ROOM SET';
        this.reactionState = 'GROOVE'; // 'GROOVE' | 'PRE_DROP' | 'DROP_HYPE' | 'SHOCK_CRASH' | 'OVERTAKE_SMIRK'
        this.reactionTimer = 0;
        this.reactionText = 'LOCKED IN // 138 BPM';
        this.beatCount = 0;
        this.time = 0;
    }

    triggerReaction(type, bannerText, duration = 2.4) {
        this.reactionState = type;
        this.reactionTimer = duration;
        if (bannerText) {
            this.reactionText = bannerText;
        }
    }

    onSongMarker(section) {
        if (this.reactionTimer > 0 && (this.reactionState === 'SHOCK_CRASH' || this.reactionState === 'OVERTAKE_SMIRK')) {
            return; // Keep active race event reaction briefly
        }
        if (section === 'PRE_DROP') {
            this.reactionState = 'PRE_DROP';
            this.reactionText = 'HANDS UP // DROP INCOMING';
        } else if (section === 'DROP') {
            this.reactionState = 'DROP_HYPE';
            this.reactionText = 'CROSSFADER SLAM // MAXIMUM BASS';
        } else if (section === 'BREAKDOWN') {
            this.reactionState = 'GROOVE';
            this.reactionText = 'ACID 303 FILTER SWEEP';
        } else {
            this.reactionState = 'GROOVE';
            this.reactionText = 'BOILER ROOM LIVE // 138 BPM';
        }
    }

    updateAndRender(dt, audioState, vibeState) {
        this.time += dt;
        if (this.reactionTimer > 0) {
            this.reactionTimer -= dt;
            if (this.reactionTimer <= 0) {
                this.onSongMarker(audioState.section);
            }
        }

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const beat = audioState.beatPulse || 0;
        const bass = audioState.subBass || 0;
        const bpmPhase = (this.time * (audioState.bpm / 60)) * Math.PI * 2;
        const headBob = Math.sin(bpmPhase) * (6 + bass * 8);

        const cPrimary = vibeState.carPrimary;
        const cSecondary = vibeState.carSecondary;
        const cEmissive = vibeState.carEmissive;
        const cShadow = vibeState.shadowCool;

        // 1. Background Boiler Room Club Wall + Strobe Lasers
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, this.rgb(cShadow, 1.0));
        bgGrad.addColorStop(1, '#070412');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Drop Strobe Flash
        if (this.reactionState === 'DROP_HYPE' && beat > 0.65) {
            ctx.fillStyle = this.rgb(cEmissive, 0.32);
            ctx.fillRect(0, 0, w, h);
        }

        // Background Equalizer Bars behind the DJ
        const numBars = 24;
        const barW = (w - 40) / numBars;
        for (let i = 0; i < numBars; i++) {
            const wave = Math.abs(Math.sin(this.time * 5 + i * 0.45)) * 0.6 + bass * 0.65;
            const bh = Math.min(h * 0.72, wave * h * 0.68);
            ctx.fillStyle = i % 2 === 0 ? this.rgb(cPrimary, 0.35) : this.rgb(cSecondary, 0.35);
            ctx.fillRect(20 + i * barW, h - 48 - bh, barW - 4, bh);
        }

        // Laser beams from booth ceiling
        ctx.save();
        ctx.strokeStyle = this.rgb(cEmissive, 0.5 + beat * 0.4);
        ctx.lineWidth = 3;
        for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(w * 0.5, 0);
            const sway = Math.sin(this.time * 2.5 + i) * 65;
            ctx.lineTo(w * 0.5 + i * 85 + sway, h);
            ctx.stroke();
        }
        ctx.restore();

        // 2. Boiler Room Crowd Silhouettes right behind the DJ!
        ctx.fillStyle = '#090618';
        for (let i = 0; i < 10; i++) {
            if (i === 4 || i === 5) continue; // Center gap for DJ
            const cx = 42 + i * 48;
            const crowdBob = Math.abs(Math.sin(bpmPhase * 0.5 + i * 1.1)) * (10 + beat * 12);
            const cy = 152 - crowdBob;
            ctx.beginPath();
            ctx.arc(cx, cy, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(cx - 18, cy + 14, 36, 60);

            // Crowd hands up on PRE_DROP or DROP
            if (this.reactionState === 'PRE_DROP' || this.reactionState === 'DROP_HYPE') {
                ctx.strokeStyle = '#090618';
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(cx - 12, cy + 16);
                ctx.lineTo(cx - 20, cy - 22 - crowdBob * 0.4);
                ctx.moveTo(cx + 12, cy + 16);
                ctx.lineTo(cx + 20, cy - 22 - crowdBob * 0.4);
                ctx.stroke();
            }
        }

        // 3. Anime Track DJ Character ("DJ KINETIX")
        const djX = w * 0.5;
        const djY = 122 + headBob;

        ctx.save();
        // Shoulders / Cyberpunk Jacket
        ctx.fillStyle = this.rgb(cSecondary, 1.0);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(djX - 68, h - 42);
        ctx.lineTo(djX - 50, djY + 24);
        ctx.lineTo(djX + 50, djY + 24);
        ctx.lineTo(djX + 68, h - 42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jacket Collar stripes
        ctx.strokeStyle = this.rgb(cEmissive, 1.0);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(djX - 32, djY + 26);
        ctx.lineTo(djX - 18, h - 42);
        ctx.moveTo(djX + 32, djY + 26);
        ctx.lineTo(djX + 18, h - 42);
        ctx.stroke();

        // DJ Arms (Right hand raised on PRE_DROP, slamming crossfader on DROP)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        if (this.reactionState === 'PRE_DROP') {
            // Right arm raised high pumping to the build
            const pump = Math.sin(bpmPhase) * 14;
            ctx.beginPath();
            ctx.moveTo(djX + 46, djY + 34);
            ctx.lineTo(djX + 78, djY - 48 + pump);
            ctx.stroke();
            ctx.strokeStyle = this.rgb(cPrimary, 1.0);
            ctx.lineWidth = 7;
            ctx.stroke();
        } else if (this.reactionState === 'SHOCK_CRASH') {
            // Both hands on headphones in shock!
            ctx.beginPath();
            ctx.moveTo(djX - 48, djY + 36);
            ctx.lineTo(djX - 42, djY - 4);
            ctx.moveTo(djX + 48, djY + 36);
            ctx.lineTo(djX + 42, djY - 4);
            ctx.stroke();
        }

        // Anime Spiky Hair Back
        ctx.fillStyle = this.rgb(cPrimary, 1.0);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(djX - 46, djY + 6);
        ctx.lineTo(djX - 64, djY - 26);
        ctx.lineTo(djX - 34, djY - 32);
        ctx.lineTo(djX - 40, djY - 62);
        ctx.lineTo(djX - 8, djY - 46);
        ctx.lineTo(djX + 12, djY - 68);
        ctx.lineTo(djX + 28, djY - 44);
        ctx.lineTo(djX + 60, djY - 54);
        ctx.lineTo(djX + 44, djY - 22);
        ctx.lineTo(djX + 64, djY - 8);
        ctx.lineTo(djX + 42, djY + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Oversized DJ Headphones
        ctx.fillStyle = '#141222';
        ctx.strokeStyle = this.rgb(cEmissive, 1.0);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(djX, djY - 6, 44, Math.PI, 0);
        ctx.stroke();
        // Ear cups
        ctx.fillRect(djX - 48, djY - 16, 16, 28);
        ctx.strokeRect(djX - 48, djY - 16, 16, 28);
        ctx.fillRect(djX + 32, djY - 16, 16, 28);
        ctx.strokeRect(djX + 32, djY - 16, 16, 28);

        // Anime Face Contour
        ctx.fillStyle = '#ffe2cf';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(djX - 34, djY - 20);
        ctx.lineTo(djX + 34, djY - 20);
        ctx.lineTo(djX + 28, djY + 14);
        ctx.lineTo(djX, djY + 28);
        ctx.lineTo(djX - 28, djY + 14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Facial Expression based on Music Marker & Race Events!
        if (this.reactionState === 'SHOCK_CRASH') {
            // Shocked Anime Eyes + Open Jagged Mouth
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(djX - 14, djY - 4, 9, 0, Math.PI * 2);
            ctx.arc(djX + 14, djY - 4, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(djX - 14, djY - 4, 3, 0, Math.PI * 2);
            ctx.arc(djX + 14, djY - 4, 3, 0, Math.PI * 2);
            ctx.fill();

            // Shocked mouth
            ctx.fillStyle = '#ff1e56';
            ctx.beginPath();
            ctx.ellipse(djX, djY + 14, 11, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else {
            // Futuristic Visor Sunglasses (Auto Modellista / R4 style)
            ctx.fillStyle = '#080614';
            ctx.strokeStyle = this.rgb(cEmissive, 1.0);
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(djX - 32, djY - 12);
            ctx.lineTo(djX + 32, djY - 12);
            ctx.lineTo(djX + 24, djY + 2);
            ctx.lineTo(djX + 4, djY - 2);
            ctx.lineTo(djX - 4, djY - 2);
            ctx.lineTo(djX - 24, djY + 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // White anime visor reflection streak
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(djX - 20, djY - 10);
            ctx.lineTo(djX - 8, djY - 10);
            ctx.lineTo(djX - 14, djY);
            ctx.lineTo(djX - 24, djY);
            ctx.closePath();
            ctx.fill();

            // Mouth (Hyped grin on DROP / OVERTAKE, cool smirk on GROOVE)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            if (this.reactionState === 'DROP_HYPE' || this.reactionState === 'OVERTAKE_SMIRK') {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(djX - 14, djY + 9);
                ctx.lineTo(djX + 14, djY + 7);
                ctx.lineTo(djX + 10, djY + 19);
                ctx.lineTo(djX - 10, djY + 18);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(djX - 10, djY + 13);
                ctx.quadraticCurveTo(djX + 2, djY + 18, djX + 12, djY + 10);
                ctx.stroke();
            }
        }
        ctx.restore();

        // 4. Foreground DJ Turntables & Pioneer-style Mixer Console
        ctx.fillStyle = '#120e24';
        ctx.strokeStyle = this.rgb(cPrimary, 1.0);
        ctx.lineWidth = 3;
        ctx.fillRect(36, h - 50, w - 72, 46);
        ctx.strokeRect(36, h - 50, w - 72, 46);

        // Spinning CDJ Jog Wheels
        for (const side of [-1, 1]) {
            const jx = w * 0.5 + side * 125;
            const jy = h - 27;
            ctx.save();
            ctx.translate(jx, jy);
            ctx.rotate(this.time * 6 * side);
            ctx.strokeStyle = this.rgb(cEmissive, 0.9);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 16, 0, Math.PI * 1.6);
            ctx.stroke();
            ctx.restore();
        }

        // Animated Crossfader in center
        const faderPos = Math.sin(bpmPhase * 0.5) * 28;
        ctx.fillStyle = this.rgb(cEmissive, 1.0);
        ctx.fillRect(w * 0.5 + faderPos - 8, h - 35, 16, 18);

        // 5. Jumbotron Broadcast Overlay Telemetry & Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
        ctx.fillRect(0, 0, w, 30);
        ctx.fillStyle = this.rgb(cEmissive, 1.0);
        ctx.font = 'bold 14px "Chakra Petch", monospace';
        ctx.fillText(`● LIVE // ${this.djName}`, 12, 20);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(this.reactionText, w - 12, 20);
        ctx.textAlign = 'left';

        // Horizontal CRT scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 2);
        }
    }

    rgb(arr, alpha = 1.0) {
        const r = Math.round(Math.max(0, Math.min(1, arr[0])) * 255);
        const g = Math.round(Math.max(0, Math.min(1, arr[1])) * 255);
        const b = Math.round(Math.max(0, Math.min(1, arr[2])) * 255);
        return `rgba(${r},${g},${b},${alpha})`;
    }
};
