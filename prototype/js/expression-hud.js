/**
 * RAVE RACER REMIX — Pillar 4.1, 4.2 & 4.3:
 * 2D Spring-Physics Anime Character Portrait Boxes, Rage/Cockiness Meters, and Kinetic Banter Queue
 */
window.RRR = window.RRR || {};

RRR.DRIVER_PROFILES = {
    player: {
        id: 'player',
        name: 'REN "PHASE"',
        role: 'PLAYER // APEX DRIFTER',
        hairColor: '#19e6ff',
        jacketColor: '#ff2a7a',
        visorColor: '#ffe642',
        skinColor: '#ffe3d1',
        hairStyle: 'SPIKY_CYAN'
    },
    rival_kai: {
        id: 'rival_kai',
        name: 'KAI "REDLINE"',
        machine: '03 SHAKOTAN S13',
        role: 'RIVAL // BRUISER',
        hairColor: '#ff2244',
        jacketColor: '#1a162b',
        visorColor: '#ff4d00',
        skinColor: '#f7d3ba',
        hairStyle: 'POMPADOUR_RED',
        dotColor: '#ff1e6b'
    },
    rival_mira: {
        id: 'rival_mira',
        name: 'MIRA "VAPOR"',
        machine: '01 WILD HORSES',
        role: 'RIVAL // STYLE QUEEN',
        hairColor: '#c74bff',
        jacketColor: '#00f5d4',
        visorColor: '#ff2a95',
        skinColor: '#ffe7d9',
        hairStyle: 'TWIN_NEON',
        dotColor: '#ffe600'
    },
    rival_rex: {
        id: 'rival_rex',
        name: 'REX "303"',
        machine: '02 GRAVEL GC8',
        role: 'RIVAL // TECH SPEC',
        hairColor: '#bfff00',
        jacketColor: '#142238',
        visorColor: '#bfff00',
        skinColor: '#ecc1a1',
        hairStyle: 'SLICK_VOLT',
        dotColor: '#bfff00'
    }
};

RRR.DIALOGUE_BARKS = {
    ON_RAM_ATTACK: [
        { text: 'OUT OF MY LANE, TOURIST!', style: 'RAGE' },
        { text: 'TASTE THAT ACETONE PAINTWORK!', style: 'COCKY' },
        { text: 'FEEL THE BASS DROP IN YOUR BUMPER!', style: 'RAGE' },
        { text: 'TOO SLOW FOR THE BOILER ROOM!', style: 'COCKY' }
    ],
    ON_RAM_VICTIM: [
        { text: 'TCH—WATCH THE CHASSIS!!', style: 'RAGE' },
        { text: 'YOU JUST MARKED YOURSELF FOR A VENDETTA!', style: 'RAGE' },
        { text: 'MY LINE! YOU BROKE MY RHYTHM!', style: 'RAGE' },
        { text: 'KEEP RAMMING—SEE WHAT HAPPENS NEXT CORNER!', style: 'RAGE' }
    ],
    ON_EGO_SHATTER: [
        { text: 'EGO SHATTERED!! NOBODY SCRATCHES MY RIDE!!', style: 'RAGE' },
        { text: 'UNFORGIVABLE!! BOILING POINT REACHED!', style: 'RAGE' }
    ],
    ON_DRIFT_BOOST: [
        { text: 'CLEAN SLIP ANGLE // SMEAR THE HORIZON!', style: 'COCKY' },
        { text: 'UNTOUCHABLE FLOW—CATCH MY PAINT TRAIL!', style: 'COCKY' },
        { text: 'R4 RAIL LOCKED // SEE YA AT THE DROP!', style: 'COCKY' }
    ],
    ON_NEAR_MISS: [
        { text: 'MILLIMETER CLEARANCE! DID YOU FEEL THAT WIND?', style: 'COCKY' },
        { text: 'SHAVED THE PAINT RIGHT OFF YOUR MIRROR!', style: 'COCKY' }
    ]
};

RRR.ExpressionHUD = class ExpressionHUD {
    constructor(containerEl, banterContainerEl, impactCanvasEl) {
        this.containerEl = containerEl;
        this.banterContainerEl = banterContainerEl;
        this.impactCanvas = impactCanvasEl;
        this.impactCtx = impactCanvasEl ? impactCanvasEl.getContext('2d') : null;

        this.boxes = {};
        this.impactParticles = [];
        this.impactCanvasDirty = false;
        this.hitstopFrames = 0;
        this.banterCooldown = 0;
        this.time = 0;
    }

    initBoxes(vehicles) {
        this.containerEl.innerHTML = '';
        this.boxes = {};

        vehicles.forEach((v, idx) => {
            const profile = RRR.DRIVER_PROFILES[v.id] || RRR.DRIVER_PROFILES.player;
            const el = document.createElement('div');
            el.className = `char-box ${v.isPlayer ? 'char-box-player' : 'char-box-rival'}`;
            el.innerHTML = `
                <div class="char-box-header">
                    <span class="char-rank-badge" id="rank-${v.id}">P${idx + 1}</span>
                    <span class="char-name">${profile.name}</span>
                </div>
                <div class="char-portrait-wrap">
                    <canvas class="char-portrait-canvas" width="128" height="112"></canvas>
                    <div class="char-state-pill" id="pill-${v.id}">FLOW</div>
                </div>
                <div class="char-mini-meters">
                    <div class="mini-meter-row">
                        <span class="m-lbl">RAGE</span>
                        <div class="m-bar"><div class="m-fill m-rage" id="rage-bar-${v.id}" style="width:20%"></div></div>
                    </div>
                    <div class="mini-meter-row">
                        <span class="m-lbl">EGO</span>
                        <div class="m-bar"><div class="m-fill m-ego" id="ego-bar-${v.id}" style="width:35%"></div></div>
                    </div>
                </div>
            `;
            this.containerEl.appendChild(el);

            const canvas = el.querySelector('.char-portrait-canvas');
            // 2D Hooke's Law Spring-Damper Physics State (Pillar 4.1)
            this.boxes[v.id] = {
                id: v.id,
                vehicle: v,
                profile: profile,
                el: el,
                canvas: canvas,
                ctx: canvas.getContext('2d'),
                rankEl: el.querySelector(`#rank-${v.id}`),
                pillEl: el.querySelector(`#pill-${v.id}`),
                rageBarEl: el.querySelector(`#rage-bar-${v.id}`),
                egoBarEl: el.querySelector(`#ego-bar-${v.id}`),
                // 2D Spring-Damper displacement from anchor slot
                offsetX: 0,
                offsetY: 0,
                velX: 0,
                velY: 0,
                rotation: 0,
                angVel: 0,
                expression: 'NEUTRAL', // 'NEUTRAL' | 'SMIRK' | 'ENRAGED' | 'IMPACT'
                expressionTimer: 0,
                impactPushDir: 0
            };
        });
    }

    /**
     * Pillar 4.1: Car Ramming -> Character Box Ramming Synchronization!
     */
    triggerBoxRam(collisionEvent, audioEngine) {
        const atkBox = this.boxes[collisionEvent.attacker.id];
        const vicBox = this.boxes[collisionEvent.victim.id];
        if (!atkBox || !vicBox) return;

        // Calculate direction from attacker box to victim box in DOM space
        const atkRect = atkBox.el.getBoundingClientRect();
        const vicRect = vicBox.el.getBoundingClientRect();
        const dirX = Math.sign((vicRect.left - atkRect.left) || 1);
        const distancePx = Math.abs(vicRect.left - atkRect.left);

        // Launch Attacker's 2D Rigidbody box directly into Victim's box!
        atkBox.offsetX = dirX * Math.min(180, distancePx * 0.65);
        atkBox.velX = dirX * 920 * collisionEvent.normalizedForce;
        atkBox.velY = -140;
        atkBox.angVel = dirX * 16;
        atkBox.expression = atkBox.vehicle.isBoiling ? 'ENRAGED' : 'SMIRK';
        atkBox.expressionTimer = 1.6;

        // Victim box gets slammed hard in the impact direction!
        vicBox.velX = dirX * 1180 * collisionEvent.normalizedForce;
        vicBox.velY = 180;
        vicBox.angVel = dirX * 26;
        vicBox.expression = 'IMPACT';
        vicBox.expressionTimer = 1.4;
        vicBox.impactPushDir = dirX;

        // 2-Frame Hitstop on portraits (Pillar 4.1 spec)
        this.hitstopFrames = 3;

        // Spawn 2D Anime Impact Star & Shatter VFX at contact midpoint
        const contactX = (atkRect.left + vicRect.left) * 0.5 + 68;
        const contactY = (atkRect.top + vicRect.top) * 0.5 + 65;
        this.spawnImpactStarVFX(contactX, contactY, collisionEvent.egoShattered ? '#ffe600' : '#ff1e56');

        // Trigger Mid-Race Kinetic Banter Speech Ribbon (Pillar 4.3)
        if (collisionEvent.egoShattered) {
            this.spawnBanterRibbon(vicBox, RRR.DIALOGUE_BARKS.ON_EGO_SHATTER, audioEngine);
        } else {
            this.spawnBanterRibbon(atkBox, RRR.DIALOGUE_BARKS.ON_RAM_ATTACK, audioEngine);
            setTimeout(() => {
                this.spawnBanterRibbon(vicBox, RRR.DIALOGUE_BARKS.ON_RAM_VICTIM, audioEngine);
            }, 320);
        }
    }

    spawnImpactStarVFX(x, y, color) {
        this.impactCanvasDirty = true;
        this.impactParticles.push({
            x: x,
            y: y,
            color: color,
            life: 1.0,
            maxLife: 0.45,
            scale: 1.0
        });
    }

    /**
     * Pillar 4.3: Contextual Mid-Race Dialogue & Kinetic Speech Ribbons
     */
    spawnBanterRibbon(box, barkPool, audioEngine) {
        if (!this.banterContainerEl || !barkPool || barkPool.length === 0) return;
        const bark = barkPool[Math.floor(Math.random() * barkPool.length)];
        if (audioEngine) {
            audioEngine.triggerBanterBlip(bark.style === 'RAGE');
        }

        const ribbon = document.createElement('div');
        ribbon.className = `banter-ribbon ${bark.style === 'RAGE' ? 'banter-rage' : 'banter-cocky'}`;

        // Apply kinetic per-character shaky or wavy spans
        const chars = bark.text.split('').map((ch, idx) => {
            if (ch === ' ') return '&nbsp;';
            return `<span style="animation-delay:${(idx * 0.03).toFixed(2)}s">${ch}</span>`;
        }).join('');

        ribbon.innerHTML = `
            <div class="banter-speaker">${box.profile.name}</div>
            <div class="banter-text">${chars}</div>
        `;

        this.banterContainerEl.appendChild(ribbon);
        // Keep max 2 ribbons visible
        while (this.banterContainerEl.children.length > 2) {
            this.banterContainerEl.removeChild(this.banterContainerEl.firstChild);
        }

        setTimeout(() => {
            ribbon.classList.add('banter-exit');
            setTimeout(() => {
                if (ribbon.parentNode) ribbon.parentNode.removeChild(ribbon);
            }, 280);
        }, 2300);
    }

    update(dt, audioState) {
        this.time += dt;
        if (this.banterCooldown > 0) this.banterCooldown -= dt;

        if (this.hitstopFrames > 0) {
            this.hitstopFrames--;
        }

        // Hooke's Law Spring-Damper parameters (Pillar 4.1: F = -k*x - c*v)
        const springStiffness = 185.0;
        const damping = 14.5;

        for (const id in this.boxes) {
            const b = this.boxes[id];
            const v = b.vehicle;

            // Update expression timer & automatic emotion thresholds
            if (b.expressionTimer > 0) {
                b.expressionTimer -= dt;
            } else {
                if (v.isBoiling) b.expression = 'ENRAGED';
                else if (v.isUntouchable) b.expression = 'SMIRK';
                else b.expression = 'NEUTRAL';
                b.impactPushDir = 0;
            }

            // Integrate 2D Hooke's Law Spring Force toward anchor (0, 0)
            const forceX = (-b.offsetX * springStiffness) - (b.velX * damping);
            const forceY = (-b.offsetY * springStiffness) - (b.velY * damping);
            b.velX += forceX * dt;
            b.velY += forceY * dt;
            b.offsetX += b.velX * dt;
            b.offsetY += b.velY * dt;

            // Rotational spring
            const torque = (-b.rotation * 190.0) - (b.angVel * 14.0);
            b.angVel += torque * dt;
            b.rotation += b.angVel * dt;

            // Continuous jitter when in High Rage ("BOILING" > 75%)
            let rageJitterX = 0;
            let rageJitterY = 0;
            if (v.isBoiling) {
                rageJitterX = (Math.random() - 0.5) * 5.0;
                rageJitterY = (Math.random() - 0.5) * 5.0;
            }

            // Beat bounce on sub-bass pulse
            const beatBounceY = -(audioState.beatPulse || 0) * 4.5;

            const tx = b.offsetX + rageJitterX;
            const ty = b.offsetY + rageJitterY + beatBounceY;
            b.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) rotate(${b.rotation.toFixed(1)}deg) skewX(-6deg)`;

            // Toggle BOILING / UNTOUCHABLE border classes
            b.el.classList.toggle('is-boiling', v.isBoiling);
            b.el.classList.toggle('is-untouchable', v.isUntouchable);
            b.el.classList.toggle('is-impact', b.expression === 'IMPACT');

            // Update rank & mini bars
            b.rankEl.textContent = `P${v.raceRank}`;
            b.rageBarEl.style.width = `${Math.round(v.rage)}%`;
            b.egoBarEl.style.width = `${Math.round(v.cockiness)}%`;

            if (b.expression === 'IMPACT') {
                b.pillEl.textContent = 'SLAMMED!';
                b.pillEl.className = 'char-state-pill pill-impact';
            } else if (v.isBoiling) {
                b.pillEl.textContent = 'BOILING // +35% RAM';
                b.pillEl.className = 'char-state-pill pill-boiling';
            } else if (v.isUntouchable) {
                b.pillEl.textContent = 'UNTOUCHABLE // 303';
                b.pillEl.className = 'char-state-pill pill-untouchable';
            } else if (v.driftState === 'DRIFTING') {
                b.pillEl.textContent = 'DRIFTING';
                b.pillEl.className = 'char-state-pill pill-drift';
            } else {
                b.pillEl.textContent = 'FLOW';
                b.pillEl.className = 'char-state-pill';
            }

            // Render custom anime driver portrait (unless frozen by 2-frame hitstop)
            if (this.hitstopFrames <= 0) {
                this.renderAnimePortrait(b, audioState);
            }
        }

        this.renderImpactOverlay(dt);
    }

    renderAnimePortrait(box, audioState) {
        const ctx = box.ctx;
        const w = box.canvas.width;
        const h = box.canvas.height;
        const p = box.profile;
        const expr = box.expression;
        const v = box.vehicle;

        ctx.clearRect(0, 0, w, h);

        // 1. Dynamic Stylized Anime Speed-Line / Halftone Background
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        if (expr === 'IMPACT') {
            bgGrad.addColorStop(0, '#ff0044');
            bgGrad.addColorStop(1, '#3b0014');
        } else if (v.isBoiling) {
            bgGrad.addColorStop(0, '#80051d');
            bgGrad.addColorStop(1, '#1a0208');
        } else if (v.isUntouchable) {
            bgGrad.addColorStop(0, '#705200');
            bgGrad.addColorStop(1, '#142838');
        } else {
            bgGrad.addColorStop(0, '#161233');
            bgGrad.addColorStop(1, '#090718');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Diagonal anime action lines behind portrait
        ctx.strokeStyle = v.isBoiling
            ? 'rgba(255, 45, 85, 0.35)'
            : (v.isUntouchable ? 'rgba(255, 225, 65, 0.35)' : 'rgba(25, 230, 255, 0.16)');
        ctx.lineWidth = 2;
        const scroll = (this.time * 60) % 16;
        for (let i = -4; i < 12; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 16 + scroll, 0);
            ctx.lineTo(i * 16 - 24 + scroll, h);
            ctx.stroke();
        }

        // Portrait Center + Impact Squash against Frame Edge!
        const pushX = expr === 'IMPACT' ? (box.impactPushDir * 14) : 0;
        const headBob = Math.sin(this.time * 14) * (1.5 + (audioState.beatPulse || 0) * 2.5);
        const cx = w * 0.5 + pushX;
        const cy = h * 0.56 + headBob;

        ctx.save();
        if (expr === 'IMPACT') {
            // Squash face against the glass border when rammed!
            ctx.translate(cx, cy);
            ctx.scale(0.86, 1.08);
            ctx.translate(-cx, -cy);
        }

        // 2. Racing Suit / High Collar Jacket
        ctx.fillStyle = p.jacketColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 44, h + 4);
        ctx.lineTo(cx - 32, cy + 16);
        ctx.lineTo(cx + 32, cy + 16);
        ctx.lineTo(cx + 44, h + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Collar Racing Stripes
        ctx.fillStyle = p.visorColor;
        ctx.fillRect(cx - 24, cy + 20, 8, 28);
        ctx.fillRect(cx + 16, cy + 20, 8, 28);

        // 3. Anime Hair Back / Silhouette
        ctx.fillStyle = p.hairColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (p.hairStyle === 'POMPADOUR_RED') {
            // Kai's Redline Pompadour
            ctx.moveTo(cx - 30, cy + 4);
            ctx.lineTo(cx - 36, cy - 26);
            ctx.lineTo(cx - 12, cy - 52);
            ctx.lineTo(cx + 38, cy - 48);
            ctx.lineTo(cx + 30, cy + 4);
        } else if (p.hairStyle === 'TWIN_NEON') {
            // Mira's Cyberpunk Bob + Twin Peaks
            ctx.moveTo(cx - 38, cy + 12);
            ctx.lineTo(cx - 44, cy - 34);
            ctx.lineTo(cx - 18, cy - 42);
            ctx.lineTo(cx + 18, cy - 42);
            ctx.lineTo(cx + 44, cy - 34);
            ctx.lineTo(cx + 38, cy + 12);
        } else {
            // Sharp Spiky Anime Hair
            ctx.moveTo(cx - 32, cy + 4);
            ctx.lineTo(cx - 46, cy - 16);
            ctx.lineTo(cx - 28, cy - 26);
            ctx.lineTo(cx - 32, cy - 48);
            ctx.lineTo(cx - 6, cy - 36);
            ctx.lineTo(cx + 10, cy - 52);
            ctx.lineTo(cx + 26, cy - 34);
            ctx.lineTo(cx + 46, cy - 38);
            ctx.lineTo(cx + 32, cy + 4);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Anime Face Jawline
        ctx.fillStyle = p.skinColor;
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy - 18);
        ctx.lineTo(cx + 25, cy - 18);
        ctx.lineTo(cx + 21, cy + 8);
        ctx.lineTo(cx, cy + 22);
        ctx.lineTo(cx - 21, cy + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Enraged Crimson Forehead Shadow Lines ("BOILING")
        if (expr === 'ENRAGED') {
            ctx.fillStyle = 'rgba(180, 0, 35, 0.55)';
            ctx.fillRect(cx - 23, cy - 17, 46, 13);
            ctx.strokeStyle = '#ff003c';
            ctx.lineWidth = 1.5;
            for (let lx = -18; lx <= 18; lx += 6) {
                ctx.beginPath();
                ctx.moveTo(cx + lx, cy - 17);
                ctx.lineTo(cx + lx - 3, cy - 2);
                ctx.stroke();
            }
        }

        // 5. Eyes & Brow Expression
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        if (expr === 'IMPACT') {
            // Wincing > < Impact Eyes!
            ctx.beginPath();
            ctx.moveTo(cx - 18, cy - 9);
            ctx.lineTo(cx - 8, cy - 4);
            ctx.lineTo(cx - 18, cy + 1);
            ctx.moveTo(cx + 18, cy - 9);
            ctx.lineTo(cx + 8, cy - 4);
            ctx.lineTo(cx + 18, cy + 1);
            ctx.stroke();
        } else if (expr === 'SMIRK') {
            // Cool Untouchable Sunglasses / Visor Glint
            ctx.fillStyle = '#0a0814';
            ctx.strokeStyle = p.visorColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - 24, cy - 10);
            ctx.lineTo(cx + 24, cy - 10);
            ctx.lineTo(cx + 19, cy + 1);
            ctx.lineTo(cx - 19, cy + 1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // White diagonal anime lens shine
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 14, cy - 8, 6, 7);
            ctx.fillRect(cx + 6, cy - 8, 4, 7);
        } else {
            // Fierce Anime Eyes
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 19, cy - 8, 12, 7);
            ctx.fillRect(cx + 7, cy - 8, 12, 7);
            ctx.strokeRect(cx - 19, cy - 8, 12, 7);
            ctx.strokeRect(cx + 7, cy - 8, 12, 7);

            // Iris
            ctx.fillStyle = expr === 'ENRAGED' ? '#ff003c' : p.hairColor;
            ctx.fillRect(cx - 14, cy - 7, 5, 5);
            ctx.fillRect(cx + 11, cy - 7, 5, 5);

            // Angled eyebrows
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 21, cy - 12);
            ctx.lineTo(cx - 6, cy - 9);
            ctx.moveTo(cx + 21, cy - 12);
            ctx.lineTo(cx + 6, cy - 9);
            ctx.stroke();
        }

        // 6. Mouth Expression
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        if (expr === 'IMPACT' || expr === 'ENRAGED') {
            // Gritted teeth!
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.rect(cx - 11, cy + 7, 22, 8);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - 11, cy + 11);
            ctx.lineTo(cx + 11, cy + 11);
            ctx.stroke();
        } else if (expr === 'SMIRK') {
            // Confident cocky smirk
            ctx.beginPath();
            ctx.moveTo(cx - 8, cy + 10);
            ctx.quadraticCurveTo(cx + 3, cy + 14, cx + 11, cy + 6);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(cx - 7, cy + 10);
            ctx.lineTo(cx + 7, cy + 9);
            ctx.stroke();
        }

        // Front hair bangs
        ctx.fillStyle = p.hairColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 25, cy - 18);
        ctx.lineTo(cx - 12, cy - 6);
        ctx.lineTo(cx - 4, cy - 18);
        ctx.lineTo(cx + 8, cy - 5);
        ctx.lineTo(cx + 25, cy - 18);
        ctx.stroke();

        ctx.restore();
    }

    renderImpactOverlay(dt) {
        if (!this.impactCtx || !this.impactCanvas) return;
        if (this.impactParticles.length === 0 && !this.impactCanvasDirty) return;

        const ctx = this.impactCtx;
        if (this.impactCanvas.width !== window.innerWidth || this.impactCanvas.height !== window.innerHeight) {
            this.impactCanvas.width = window.innerWidth;
            this.impactCanvas.height = window.innerHeight;
        }
        ctx.clearRect(0, 0, this.impactCanvas.width, this.impactCanvas.height);

        if (this.impactParticles.length === 0) {
            this.impactCanvasDirty = false;
            return;
        }

        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const p = this.impactParticles[i];
            p.life -= dt / p.maxLife;
            if (p.life <= 0) {
                this.impactParticles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            const s = (1.3 - p.life * 0.5) * 68;
            ctx.fillStyle = p.color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;

            // 12-Point Anime Impact Star Burst
            ctx.beginPath();
            const spikes = 12;
            for (let k = 0; k < spikes * 2; k++) {
                const rad = (k % 2 === 0) ? s : s * 0.42;
                const ang = (k / (spikes * 2)) * Math.PI * 2 + p.life * 1.5;
                const px = Math.cos(ang) * rad;
                const py = Math.sin(ang) * rad;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic 900 18px "Chakra Petch", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('SLAM!!', 0, 6);
            ctx.restore();
        }
    }
};
