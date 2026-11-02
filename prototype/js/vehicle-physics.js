/**
 * RAVE RACER REMIX — Pillar 1.1, 1.2, 1.3 & 5.2:
 * Arcade Vehicle Controller (Curvilinear 3D Track Frame + R4 Drift State Machine),
 * Live Tunable Physics Parameters, Car-to-Car Combat, and Personality AI Rivals.
 */
window.RRR = window.RRR || {};

RRR.PHYSICS_TUNING = {
    maxBaseSpeed: 88.0,          // 88 m/s = 316.8 KM/H
    accelLow: 60.0,              // Launch torque (< 45 m/s)
    accelHigh: 42.0,             // High-speed pull
    brakeDecel: 64.0,            // Braking power
    coastDrag: 16.0,             // Rolling/aero drag when W released
    maxSteerAngle: 0.36,         // Max steering heading offset in GRIP (radians ~21 deg)
    maxDriftSteerAngle: 0.48,    // Max steering heading offset in DRIFT (radians ~27.5 deg)
    casterSelfCenter: 11.0,      // Speed at which headingOffset self-centers when A/D released
    cornerCentrifugalPush: 0.22, // Outward corner push on curves (set to 0.0 to disable completely!)
    driftSlipMax: 0.58,          // Visual chassis drift yaw angle (~33 deg)
    stationaryTurntable: false   // When true in Car Lab, car revs/steers/drifts in place on the turntable!
};

RRR.ArcadeVehicle = class ArcadeVehicle {
    constructor(config, trackSpline) {
        this.id = config.id || 'player';
        this.name = config.name || 'REN // PLAYER';
        this.shortName = config.shortName || 'REN';
        this.isPlayer = !!config.isPlayer;
        this.vibeKey = config.vibeKey || 'pacific_sunset';
        this.personality = config.personality || { aggression: 0.5, driftSkill: 0.7, baseSpeedScalar: 1.0 };

        // Track curvilinear coordinates:
        // splineT: [0..1) normalized lap distance
        // lateralOffset: meters from centerline (+ = Right, - = Left)
        // headingOffset: radians relative to road tangent (+ = turned Right, - = turned Left)
        this.splineT = config.startT || 0.0;
        this.lateralOffset = config.startLateral || 0.0;
        this.headingOffset = 0.0;
        this.lateralVelocity = 0.0;
        this.knockbackLatVel = 0.0;
        this.lap = 1;
        this.totalProgress = this.splineT;
        this.raceRank = 1;

        // 3D World Position & Orthonormal Basis Vectors
        this.pos = [0, 0, 0];
        this.headingYaw = 0.0;
        this.visualYaw = 0.0;
        this.forward = [0, 0, 1];       // Travel direction in 3D world space
        this.right = [-1, 0, 0];        // Right direction in 3D world space
        this.up = [0, 1, 0];            // Surface normal in 3D world space

        // Visual Chassis Orthonormal Basis Vectors (includes R4 drift slip angle & roll)
        this.visualForward = [0, 0, 1];
        this.visualRight = [-1, 0, 0];
        this.visualUp = [0, 1, 0];

        // Visual Chassis Rig
        this.visualSlipAngle = 0.0;     // Radians (+ = nose kicked Right, - = nose kicked Left)
        this.visualRoll = 0.0;
        this.visualPitch = 0.0;
        this.wheelSpin = 0.0;
        this.steerSmoothed = 0.0;

        // Speed & R4 Drift State Machine ('GRIP' | 'DRIFTING')
        this.speed = config.startSpeed !== undefined ? config.startSpeed : 0.0;
        this.maxBaseSpeed = RRR.PHYSICS_TUNING.maxBaseSpeed;
        this.normalizedSpeed = 0.0;
        this.driftState = 'GRIP';
        this.driftDirection = 0;        // -1 (Left) or +1 (Right)
        this.driftCharge = 0.0;
        this.boostTimer = 0.0;
        this.boostIntensity = 0.0;
        this.wallScrapeCooldown = 0.0;
        this.collisionCooldown = 0.0;

        // Dual-Axis Emotion Meters (Pillar 4.2: Rage & Cockiness 0..100)
        this.rage = config.initialRage || 18;
        this.cockiness = config.initialCockiness || 32;
        this.vendettaTargetId = null;
        this.nearMissCooldown = 0.0;

        // AI Brain state
        this.aiTargetLateral = config.startLateral || 0.0;
        this.aiDecisionTimer = 0.0;

        // Control inputs (-1 = Left / A, +1 = Right / D)
        this.input = {
            throttle: 0,
            brake: 0,
            steer: 0,
            drift: false,
            boost: false
        };

        if (trackSpline) {
            this.placeOnTrack(trackSpline, this.splineT, this.lateralOffset);
        }
    }

    placeOnTrack(trackSpline, splineT, lateralOffset = 0.0) {
        this.splineT = ((splineT % 1.0) + 1.0) % 1.0;
        this.lateralOffset = lateralOffset;
        this.headingOffset = 0.0;
        this.visualSlipAngle = 0.0;
        this.knockbackLatVel = 0.0;
        this.steerSmoothed = 0.0;

        const s = trackSpline.getSampleAtNormalizedT(this.splineT);
        this.syncWorldTransform(s);
    }

    syncWorldTransform(s) {
        this.pos[0] = s.pos[0] + s.right[0] * this.lateralOffset;
        this.pos[1] = s.pos[1] + s.right[1] * this.lateralOffset;
        this.pos[2] = s.pos[2] + s.right[2] * this.lateralOffset;

        const T = s.forward;
        const R = s.right;
        const U = s.up;

        // 1. Travel basis (rotated by headingOffset in the road plane)
        const ch = Math.cos(this.headingOffset);
        const sh = Math.sin(this.headingOffset);
        this.forward = [
            T[0] * ch + R[0] * sh,
            T[1] * ch + R[1] * sh,
            T[2] * ch + R[2] * sh
        ];
        this.right = [
            -T[0] * sh + R[0] * ch,
            -T[1] * sh + R[1] * ch,
            -T[2] * sh + R[2] * ch
        ];
        this.up = [U[0], U[1], U[2]];

        // 2. Visual chassis basis (rotated by headingOffset + visualSlipAngle)
        const totalYawOffset = this.headingOffset + this.visualSlipAngle;
        const cv = Math.cos(totalYawOffset);
        const sv = Math.sin(totalYawOffset);

        const VF = [
            T[0] * cv + R[0] * sv,
            T[1] * cv + R[1] * sv - this.visualPitch,
            T[2] * cv + R[2] * sv
        ];
        const vfLen = Math.hypot(VF[0], VF[1], VF[2]) || 1;
        VF[0] /= vfLen; VF[1] /= vfLen; VF[2] /= vfLen;

        const VR_flat = [
            -T[0] * sv + R[0] * cv,
            -T[1] * sv + R[1] * cv,
            -T[2] * sv + R[2] * cv
        ];

        // Apply chassis body roll around VF
        const cr = Math.cos(this.visualRoll);
        const sr = Math.sin(this.visualRoll);
        const VR = [
            VR_flat[0] * cr + U[0] * sr,
            VR_flat[1] * cr + U[1] * sr,
            VR_flat[2] * cr + U[2] * sr
        ];
        const vrLen = Math.hypot(VR[0], VR[1], VR[2]) || 1;
        VR[0] /= vrLen; VR[1] /= vrLen; VR[2] /= vrLen;

        // Visual Up = VR x VF (orthonormal right-handed frame)
        const VU = [
            VR[1] * VF[2] - VR[2] * VF[1],
            VR[2] * VF[0] - VR[0] * VF[2],
            VR[0] * VF[1] - VR[1] * VF[0]
        ];

        this.visualForward = VF;
        this.visualRight = VR;
        this.visualUp = VU;

        this.headingYaw = Math.atan2(-this.forward[0], this.forward[2]);
        this.visualYaw = Math.atan2(-this.visualForward[0], this.visualForward[2]);
    }

    get isBoiling() {
        return this.rage >= 75;
    }

    get isUntouchable() {
        return this.cockiness >= 75;
    }

    addEmotion(rageDelta, cockinessDelta, reason) {
        const wasUntouchable = this.isUntouchable;
        this.rage = Math.max(0, Math.min(100, this.rage + rageDelta));
        this.cockiness = Math.max(0, Math.min(100, this.cockiness + cockinessDelta));

        if (wasUntouchable && cockinessDelta <= -15 && reason === 'SLAMMED') {
            this.cockiness = 0;
            this.rage = Math.min(100, this.rage + 50);
            return 'EGO_SHATTER';
        }
        return null;
    }

    update(dt, trackSpline, allVehicles, callbacks) {
        const tune = RRR.PHYSICS_TUNING;
        this.maxBaseSpeed = tune.maxBaseSpeed;

        if (this.wallScrapeCooldown > 0) this.wallScrapeCooldown -= dt;
        if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
        if (this.nearMissCooldown > 0) this.nearMissCooldown -= dt;

        // Passive emotion decay & 1st place bonus
        if (this.raceRank === 1 && this.speed > 40) {
            this.rage = Math.max(0, this.rage - 4.0 * dt);
            this.cockiness = Math.min(100, this.cockiness + 6.5 * dt);
        } else {
            this.rage = Math.max(0, this.rage - 1.5 * dt);
            this.cockiness = Math.max(0, this.cockiness - 1.2 * dt);
        }

        const currSample = trackSpline.getSampleAtNormalizedT(this.splineT);

        // Smooth steering input (-1 = Left / A, +1 = Right / D)
        this.steerSmoothed += (this.input.steer - this.steerSmoothed) * Math.min(1.0, dt * 15.0);

        // 1. Top Speed & Acceleration
        let topSpeed = this.maxBaseSpeed * (this.personality.baseSpeedScalar || 1.0);

        if (this.isBoiling) {
            for (const other of allVehicles) {
                if (other !== this && other.totalProgress > this.totalProgress && (other.totalProgress - this.totalProgress) < 0.06) {
                    topSpeed *= 1.12;
                    break;
                }
            }
        }

        if (this.boostTimer > 0) {
            this.boostTimer -= dt;
            this.boostIntensity = Math.min(1.0, this.boostTimer / 1.2);
            topSpeed *= 1.24;
        } else {
            this.boostIntensity = Math.max(0.0, this.boostIntensity - dt * 3.0);
        }

        if (this.input.throttle > 0) {
            const lowEndTorque = this.speed < 45.0 ? tune.accelLow : tune.accelHigh;
            const accelRate = this.boostTimer > 0 ? (tune.accelLow * 1.25) : lowEndTorque;
            this.speed += this.input.throttle * accelRate * dt;
        } else if (this.input.brake > 0) {
            if (this.speed > 1.0) {
                this.speed = Math.max(0.0, this.speed - this.input.brake * tune.brakeDecel * dt);
            } else {
                this.speed = Math.max(-22.0, this.speed - this.input.brake * 25.0 * dt);
            }
        } else {
            if (Math.abs(this.speed) < 0.4) {
                this.speed = 0.0;
            } else {
                this.speed -= Math.sign(this.speed) * tune.coastDrag * dt;
            }
        }

        this.speed = Math.max(-22.0, Math.min(topSpeed, this.speed));
        this.normalizedSpeed = Math.max(0.0, this.speed / this.maxBaseSpeed);

        // 2. R4-Style Drift State Machine ('GRIP' -> 'DRIFTING')
        const minDriftSpeed = this.maxBaseSpeed * 0.35;
        const effectiveSpeedForDrift = (this.isPlayer && tune.stationaryTurntable) ? Math.max(this.speed, 65.0) : this.speed;
        if (this.driftState === 'GRIP') {
            if (this.input.drift && Math.abs(this.steerSmoothed) > 0.15 && effectiveSpeedForDrift > minDriftSpeed) {
                this.driftState = 'DRIFTING';
                this.driftDirection = Math.sign(this.steerSmoothed);
                this.driftCharge = 0.08;
            }
        } else if (this.driftState === 'DRIFTING') {
            if (!this.input.drift || effectiveSpeedForDrift < minDriftSpeed * 0.75) {
                const sweetSpotThreshold = this.isUntouchable ? 0.35 : 0.45;
                if (this.driftCharge >= sweetSpotThreshold) {
                    const boostDur = (1.35 + this.driftCharge * 0.65) * (this.isUntouchable ? 1.20 : 1.0);
                    this.boostTimer = boostDur;
                    this.boostIntensity = 1.0;
                    this.speed = Math.min(this.maxBaseSpeed * 1.24, this.speed + 20.0);
                    if (callbacks && callbacks.onDriftBoost) {
                        callbacks.onDriftBoost(this, this.driftCharge);
                    }
                }
                this.driftState = 'GRIP';
                this.driftCharge = 0.0;
                this.driftDirection = 0;
            } else {
                const slipIntensity = 0.6 + Math.abs(this.steerSmoothed) * 0.4;
                const normSpd = Math.max(0.5, this.normalizedSpeed);
                this.driftCharge = Math.min(1.25, this.driftCharge + slipIntensity * normSpd * dt * 0.62);
                this.addEmotion(-5.0 * dt, 15.0 * dt, 'CLEAN_DRIFT');
            }
        }

        // 3. Steering & Self-Centering Heading Offset relative to Track Tangent
        const maxSteerAngle = this.driftState === 'DRIFTING' ? tune.maxDriftSteerAngle : tune.maxSteerAngle;
        const cornerPush = Math.abs(currSample.curvature) > 0.07
            ? -currSample.curvature * this.normalizedSpeed * (this.driftState === 'DRIFTING' ? tune.cornerCentrifugalPush * 0.45 : tune.cornerCentrifugalPush)
            : 0.0;
        const targetHeadingOffset = this.steerSmoothed * maxSteerAngle + cornerPush;
        this.headingOffset += (targetHeadingOffset - this.headingOffset) * Math.min(1.0, dt * tune.casterSelfCenter);

        // 4. Advance Lateral & Forward Coordinates along the 3D Spline (unless locked on Turntable!)
        if (!(this.isPlayer && tune.stationaryTurntable)) {
            const forwardSpeed = this.speed * Math.cos(this.headingOffset);
            this.lateralVelocity = this.speed * Math.sin(this.headingOffset) + this.knockbackLatVel;
            this.lateralOffset += this.lateralVelocity * dt;
            this.knockbackLatVel *= Math.max(0.0, 1.0 - dt * 7.0);

            // 5. Guardrail Boundary Check
            const maxLat = trackSpline.roadHalfWidth - 1.35;
            if (Math.abs(this.lateralOffset) > maxLat) {
                const wallSide = Math.sign(this.lateralOffset);
                this.lateralOffset = wallSide * maxLat;
                this.knockbackLatVel = -wallSide * 2.5;

                if ((wallSide > 0 && this.headingOffset > 0) || (wallSide < 0 && this.headingOffset < 0)) {
                    this.headingOffset *= Math.max(0.0, 1.0 - dt * 15.0);
                }

                this.speed *= (1.0 - 0.08 * dt);

                if (this.wallScrapeCooldown <= 0 && this.speed > 40) {
                    this.wallScrapeCooldown = 0.75;
                    this.addEmotion(15, -25, 'WALL_GRIND');
                    if (callbacks && callbacks.onWallScrape) {
                        callbacks.onWallScrape(this);
                    }
                }
            }

            const ds = forwardSpeed * dt;
            const dT = ds / trackSpline.totalLength;
            const prevT = this.splineT;
            this.splineT = ((this.splineT + dT) % 1.0 + 1.0) % 1.0;

            if (this.splineT < 0.15 && prevT > 0.85 && forwardSpeed > 0) {
                this.lap++;
                if (callbacks && callbacks.onLapComplete) {
                    callbacks.onLapComplete(this, this.lap);
                }
            } else if (this.splineT > 0.85 && prevT < 0.15 && forwardSpeed < 0) {
                this.lap = Math.max(1, this.lap - 1);
            }
            this.totalProgress = (this.lap - 1) + this.splineT;
        }

        // 6. Visual Chassis Slip Angle, Roll & Pitch
        let targetSlip = 0.0;
        if (this.driftState === 'DRIFTING') {
            targetSlip = this.driftDirection * (tune.driftSlipMax * 0.65 + Math.abs(this.steerSmoothed) * (tune.driftSlipMax * 0.35) + this.driftCharge * 0.08);
        } else {
            const spdFactor = (this.isPlayer && tune.stationaryTurntable) ? 1.0 : Math.min(1.0, Math.abs(this.speed) / 20.0);
            targetSlip = this.steerSmoothed * 0.06 * spdFactor;
        }
        this.visualSlipAngle += (targetSlip - this.visualSlipAngle) * Math.min(1.0, dt * 10.0);

        const rollSpdFactor = (this.isPlayer && tune.stationaryTurntable) ? 1.0 : Math.min(1.0, Math.abs(this.speed) / 30.0);
        const targetRoll = this.steerSmoothed * 0.08 * rollSpdFactor;
        this.visualRoll += (targetRoll - this.visualRoll) * Math.min(1.0, dt * 9.0);

        const targetPitch = this.boostTimer > 0 ? -0.045 : (this.input.brake > 0 ? 0.04 : -this.input.throttle * 0.02);
        this.visualPitch += (targetPitch - this.visualPitch) * Math.min(1.0, dt * 8.0);
        this.wheelSpin += this.speed * dt * 1.8;

        // 7. Compute Exact 3D World Position & Orthonormal Basis Vectors
        const newSample = trackSpline.getSampleAtNormalizedT(this.splineT);
        this.syncWorldTransform(newSample);
    }

    /**
     * Pillar 5.2: Personality-Driven AI Rival Brain
     */
    updateAIBrain(dt, trackSpline, playerCar, allVehicles) {
        if (this.isPlayer) return;

        this.aiDecisionTimer -= dt;
        const lookAheadT = (this.splineT + 0.025) % 1.0;
        const lookSample = trackSpline.getSampleAtNormalizedT(lookAheadT);

        const progressDiff = playerCar.totalProgress - this.totalProgress;
        let rubberBand = 1.0;
        if (progressDiff > 0.04) {
            rubberBand = 1.0 + Math.min(0.08, progressDiff * 0.75);
        } else if (progressDiff < -0.05) {
            rubberBand = 0.92;
        }
        this.personality.baseSpeedScalar = rubberBand;

        const distToPlayerT = Math.abs(playerCar.totalProgress - this.totalProgress);
        if (this.isBoiling && distToPlayerT < 0.03) {
            this.aiTargetLateral = playerCar.lateralOffset + (this.lateralOffset > playerCar.lateralOffset ? 1.2 : -1.2);
        } else if (this.aiDecisionTimer <= 0) {
            this.aiDecisionTimer = 0.6 + Math.random() * 0.8;
            const apexSign = Math.sign(lookSample.curvature);
            const apexOffset = Math.abs(lookSample.curvature) > 0.08
                ? apexSign * (this.isUntouchable ? 4.5 : 6.5)
                : (Math.random() - 0.5) * 9.0;
            this.aiTargetLateral = Math.max(-8.5, Math.min(8.5, apexOffset));
        }

        for (const other of allVehicles) {
            if (other === this || (other === playerCar && this.isBoiling)) continue;
            const dProg = Math.abs(other.totalProgress - this.totalProgress);
            const dLat = this.lateralOffset - other.lateralOffset;
            if (dProg < 0.012 && Math.abs(dLat) < 2.8) {
                this.aiTargetLateral += Math.sign(dLat || 1) * 3.5;
            }
        }

        const latError = this.aiTargetLateral - this.lateralOffset;
        this.input.steer = Math.max(-1.0, Math.min(1.0, latError * 0.22 + lookSample.curvature * 1.1));
        this.input.throttle = 1.0;
        this.input.brake = 0.0;

        const cornerSharpness = Math.abs(lookSample.curvature);
        const driftThreshold = this.isUntouchable ? 0.11 : 0.16;
        this.input.drift = (cornerSharpness > driftThreshold && this.speed > 55);
    }
};

/**
 * Pillar 1.2: Car-to-Car Combat & Collision Classifier
 */
RRR.CarCombatSystem = class CarCombatSystem {
    static checkCollisions(vehicles, trackSpline, onCarCollision, onNearMiss) {
        const n = vehicles.length;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = vehicles[i];
                const b = vehicles[j];

                const dx = b.pos[0] - a.pos[0];
                const dz = b.pos[2] - a.pos[2];
                const dist = Math.hypot(dx, dz);

                if (dist > 3.1 && dist < 5.2 && (a.isPlayer || b.isPlayer)) {
                    const player = a.isPlayer ? a : b;
                    const rival = a.isPlayer ? b : a;
                    if (player.normalizedSpeed > 0.80 && player.nearMissCooldown <= 0) {
                        player.nearMissCooldown = 2.5;
                        player.addEmotion(0, 12, 'NEAR_MISS');
                        if (onNearMiss) onNearMiss(player, rival);
                    }
                }

                const hitRadius = 3.05;
                if (dist < hitRadius && dist > 0.001 && (a.collisionCooldown <= 0 || b.collisionCooldown <= 0)) {
                    a.collisionCooldown = 0.55;
                    b.collisionCooldown = 0.55;

                    const nx = dx / dist;
                    const nz = dz / dist;

                    const dotRight = nx * a.right[0] + nz * a.right[2];
                    const dotForward = nx * a.forward[0] + nz * a.forward[2];

                    let attacker = a;
                    let victim = b;
                    let hitType = 'SIDESWIPE';

                    if (Math.abs(dotForward) > 0.65) {
                        hitType = 'REAR_SHUNT';
                        attacker = dotForward > 0 ? a : b;
                        victim = attacker === a ? b : a;
                    } else {
                        const aLatSpeed = Math.abs(a.lateralVelocity);
                        const bLatSpeed = Math.abs(b.lateralVelocity);
                        attacker = aLatSpeed >= bLatSpeed ? a : b;
                        victim = attacker === a ? b : a;
                        if (Math.abs(a.lateralVelocity - b.lateralVelocity) > 12.0) {
                            hitType = 'TBONE_SLAM';
                        }
                    }

                    const rageMultiplier = attacker.isBoiling ? 1.35 : 1.0;
                    const latSign = Math.sign(victim.lateralOffset - attacker.lateralOffset) || 1;
                    victim.knockbackLatVel = latSign * 16.0 * rageMultiplier;
                    attacker.knockbackLatVel = -latSign * 7.0;
                    victim.lateralOffset += latSign * 0.85;
                    attacker.lateralOffset -= latSign * 0.45;

                    if (hitType === 'REAR_SHUNT') {
                        victim.speed = Math.min(victim.maxBaseSpeed * 1.15, victim.speed + 8.0);
                        attacker.speed *= 0.90;
                    } else {
                        victim.speed *= 0.90;
                    }

                    attacker.addEmotion(10, 15, 'RAM_SUCCESS');
                    const egoEvent = victim.addEmotion(25, -15, hitType === 'TBONE_SLAM' ? 'SLAMMED' : 'RAMMED');
                    victim.vendettaTargetId = attacker.id;

                    const screenDirX = latSign;
                    const screenDirY = -dotForward * 0.5;
                    const normForce = Math.min(1.0, 0.6 + Math.abs(a.lateralVelocity - b.lateralVelocity) / 25.0);

                    if (onCarCollision) {
                        onCarCollision({
                            attacker: attacker,
                            victim: victim,
                            hitType: hitType,
                            egoShattered: egoEvent === 'EGO_SHATTER',
                            screenImpactVector: [screenDirX, screenDirY],
                            normalizedForce: normForce
                        });
                    }
                }
            }
        }
    }
};
