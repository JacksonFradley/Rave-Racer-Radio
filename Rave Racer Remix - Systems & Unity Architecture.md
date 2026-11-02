# Rave Racer Remix — Unity Technical Architecture & Systems Specification

> **Engine Target:** Unity 6 (6000.x LTS)  
> **Render Pipeline:** Universal Render Pipeline (URP) with Custom RenderGraph Passes  
> **Audio Middleware:** FMOD Studio for Unity (or Native Audio + Custom DSP)  
> **Core Inspirations:** *Ridge Racer Type 4*, *Auto Modellista*, *Redline* (Anime), Hiroshi Nagai (Art), Boiler Room Sets  

---

## Development Responsibility & Dependency Matrix

This matrix categorizes all **22 subsystems** by what can be built directly by **Gemini** (C# code, HLSL shaders, URP RenderGraph passes, Editor generators, math/physics logic, and procedural/AI concept assets), what requires **Custom Art / Audio Production**, and what requires **Third-Party Software or Unity Packages**.

| # | System Name | 🤖 Can Be Completed Using Gemini | 🎨 Requires Art / Audio Assets | 📦 Third-Party Software / Plugins (Outside Base Unity) |
| :--- | :--- | :--- | :--- | :--- |
| **1.1** | **Arcade Vehicle Physics Controller** | **100% of Code:** Full C# Sphere-Rigidbody physics, 4-raycast suspension, R4 drift state machine, and tuning ScriptableObjects. | **3D Art:** Low/Mid-poly 3D car meshes (chassis + separate wheel meshes). | **None** *(Built-in Unity PhysX)*. |
| **1.2** | **Car-to-Car Combat & Collision System** | **100% of Code:** Collision math, hit classification (`Sideswipe`, `Slam`, `Shunt`), knockback impulses, and HUD vector projection. | **Audio:** Crash/scrape SFX. | **None** *(Built-in Unity PhysX)*. |
| **1.3** | **Dynamic Sense-of-Speed Camera** | **100% of Code:** Custom `CinemachineExtension` script driving FOV curves, dutch angles, spring lag, and Perlin shake. | **None.** | **Unity Registry (Free):** `Cinemachine 3.x` package. |
| **2.1** | **"Vibe" Fluid Color Palette System** | **95% (Code + LUT Generation):** HLSL shaders, `VibeController.cs`, and a custom **C# Editor Script / Python script** written by Gemini to procedurally generate the `256x16` `.png` LUT gradient textures. | **3D Texturing:** Authoring the greyscale/channel-packed ID mask textures (`R/G/B/A`) mapped to the 3D car UVs. | **External (Free):** *Blender* (UV unwrapping) & *Krita / GIMP / Substance Painter* (painting channel masks). |
| **2.2** | **High-Speed "Paint Smudge" Post-Processing** | **95% (Code + Shaders):** Full URP `ScriptableRendererFeature` (RenderGraph), ping-pong history buffers, Kuwahara filter, and Roberts Cross ink outline HLSL shaders. | **Technical Art Texture:** 1 tiling anisotropic brush-stroke flow map texture (can also be procedurally generated via a Gemini shader/script). | **None** *(Built-in Unity 6 URP RenderGraph)*. |
| **2.3** | **Hiroshi Nagai & Auto Modellista Shaders** | **90% (Shaders):** Stepped toon lighting HLSL, inverted-hull outline pass, procedural banded skybox shader, and Bayer dithering code. | **3D/2D Art:** 3D track buildings, palm trees, road meshes, painted 2D cumulus cloud sprites, and matcap reflection sphere textures. | **External (Free):** *Blender* (3D modeling) & 2D illustration app (*Krita / Procreate / Photoshop*). |
| **3.1** | **Interactive Music & Stem Manager** | **100% of C# Integration Code:** `AudioRaceBridge.cs` parameter mapping (speed/drift/crash → audio filters/stems). *Note: Can also be built in 100% native Unity `AudioMixer` if avoiding FMOD.* | **Music Production:** Original multi-stem rave/electronic tracks (`Kick`, `Tops`, `Synths`, `Acid Lead`, `Risers`). | **External (Free for Indies):** *FMOD Studio* (+ FMOD for Unity plugin) **OR** zero plugins using native Unity `AudioSource` + `AudioMixer` DSP. **DAW:** *Ableton / FL Studio / Reaper*. |
| **3.2** | **Real-Time Audio Spectrum & Beat Bus** | **100% of Code:** FFT spectrum extraction (`GetSpectrumData` or FMOD FFT DSP), beat envelope detector, and global shader vector broadcaster (`_AudioSpectrum`). | **None.** | **None** *(Works natively with Unity `AudioListener.GetSpectrumData` or FMOD)*. |
| **3.3** | **Track DJ Controller & Jumbotron Pipeline** | **90% (Code + Shaders):** Single-`RenderTexture` broadcast setup, BPM-synced `Animator` controller script, and CRT/LED jumbotron shader. | **2D/3D Character Art:** Track DJ character sprites/rig (idle bob, crossfader slam, shocked/hyped faces) and 3D jumbotron screen frames. | **Optional:** *Spine2D* or *Live2D* (if using 2D mesh deformation for the DJ), or **None** if using frame-by-frame sprites / Blender 3D rig. |
| **4.1** | **Physics-Driven Character Portrait Boxes** | **90% (Code):** `CharacterBoxPhysics.cs` Hooke's Law 2D spring-damper, `Rigidbody2D` impact impulse handler, and 2-frame hitstop logic. | **2D Character Art:** Anime driver portraits with 4–5 expression states (Neutral, Smirk, Enraged, Impact/Gritted Teeth) + UI frame borders. | **None** *(Built-in Unity `Physics2D` & `uGUI`)*. |
| **4.2** | **Rage & Cockiness Emotion Meters** | **95% (Code + UI Shaders):** `DriverEmotionState.cs` stat tracking, event listeners, *"Vendetta Boost"* / *"Ego Shatter"* modifiers, and glowing UI meter shaders. | **2D UI Art:** Custom stylized meter frames/icons. | **None.** |
| **4.3** | **Contextual Mid-Race Dialogue System** | **100% of Code & Writing:** `BanterManager.cs` priority queue, `DialogueBarkSO` definitions, all character dialogue writing, and kinetic shaky/wavy text mesh modifiers. | **Audio (Optional):** Short anime voice grunts or retro synth speech blips (can be generated procedurally). | **Unity Registry (Free):** `TextMeshPro` (included in Unity). |
| **5.1** | **Spline & Track Manager** | **95% (Code + Tools):** Lap/position spatial hashing, Wrong-Way detection, `TrackVibeZone` triggers, and a custom **Spline-to-Road Mesh Generator script** for greyboxing tracks. | **3D Environment Art:** Final dressed track environments, barriers, tunnels, and coastal scenery around the splines. | **Unity Registry (Free):** `UnityEngine.Splines` package. |
| **5.2** | **Personality-Driven AI Rivals** | **100% of Code:** `RivalBrain.cs` spline look-ahead steering, local avoidance raycasts, rubber-banding, and high-Rage ramming / high-Cockiness drift behaviors. | **None.** | **None.** |
| **5.3** | **Race Director & Event Bus** | **100% of Code:** Zero-allocation generic `EventBus<T>`, race state machine (Countdown, Racing, Photo Finish, Results), and pacing director. | **None.** | **None.** |
| **6.1** | **Home Base / Garage Hub** | **85% (Code + Cameras):** Interactive camera state switcher, Vibe palette live-previewer UI, and rival dossier viewer scripts. | **3D Diorama Art:** The physical 3D garage/coastal parking deck scene props. | **Unity Registry (Free):** `Cinemachine 3.x`. |
| **6.2** | **World Map & Route Selector** | **90% (Code + Graph Tools):** `WorldMapGraphSO` node-edge data structures, custom Unity Editor graph inspector, and interactive map selection UI logic. | **2D/3D Map Art:** Stylized highway map illustration and venue node icons. | **None.** |
| **6.3** | **Landmark "Drive-Over" Loading System** | **90% (Code):** Dijkstra shortest-path route solver, async additive scene loader, shader warm-up, and scrolling highway loop controller. | **3D/2D Landmark Art:** Modular landmark set-pieces (e.g., suspension bridge, giant neon signs, wind turbines). | **None.** |
| **7.1** | **Stylized Anime VFX Pipeline** | **80% (Shaders + Particle Scripts):** Stepped alpha-erosion toon smoke shader, Vibe-colored spark emitters, and speed-scaled `TrailRenderer` scripts. | **2D VFX Textures:** Smoke flipbooks, anime impact star sprites, and paint splatter alpha masks. | **Unity Registry (Free):** `Visual Effect Graph` (or built-in `Shuriken Particle System`). |
| **7.2** | **Input & Beat-Synced Haptics System** | **100% of Code:** Input Action maps and `HapticsController.cs` dual-motor rumble driven by audio `SubBass` peaks and tire slip. | **None.** | **Unity Registry (Free):** `Unity Input System`. |
| **7.3** | **Post-Race Replay System** | **100% of Code:** 30Hz ring-buffer struct recorder/player (`ReplayRecorder.cs`) and automated trackside TV camera switcher. | **None.** | **Unity Registry (Free):** `Cinemachine 3.x`. |

### Summary of Breakdown
* **🤖 What Gemini Can Build Directly (~85–90% of Technical Development):**
  * **100% of C# Gameplay, Physics, AI, UI & Architecture Code:** Every script across all 7 pillars.
  * **100% of Custom HLSL Shaders & URP RenderGraph Passes:** The Paint Smudge post-process, Hiroshi Nagai toon shader, Auto Modellista outlines, Vibe 2D LUT sampling, and audio-reactive shaders.
  * **Procedural Asset Generators & Editor Tools:** Gemini can write Unity Editor scripts to procedurally generate the `256x16` Vibe LUT textures, noise/brush-flow textures, greybox road meshes along splines, and all dialogue writing.
  * **2D Concept Art & Placeholder Sprites:** Using the built-in `image-generator` subagent, Gemini can generate anime character portraits, expression variants, Track DJ frames, and Hiroshi Nagai skybox/landmark concept art for rapid prototyping.
* **🎨 What Strictly Requires Human Art / Audio Tools:**
  * **3D Models & UV Masks:** Modeling the cars, track environments, and landmarks in Blender, plus painting the channel-packed ID masks for the cars.
  * **Final Production 2D Art:** Consistent production-ready anime character animations and Track DJ loops.
  * **Music & SFX:** Composing the multi-stem electronic/rave soundtrack in a DAW.
* **📦 What Third-Party Software Is Actually Required:**
  * **Zero Paid Unity Asset Store Plugins Required!** Everything in the architecture is specifically designed to run on **Free Official Unity Registry Packages** (`URP`, `Splines`, `Cinemachine 3.x`, `Input System`, `TextMeshPro`, `VFX Graph`).
  * **Optional Audio Middleware:** **FMOD Studio** (free for indies under $200k budget)—or you can skip FMOD entirely and let Gemini build the stem mixer and low-pass/high-pass filters natively using Unity's built-in `AudioMixer` and `OnAudioFilterRead` DSP callbacks.

---

## System Architecture Overview

At the heart of **Rave Racer Remix** is the **Triad Coupling Loop** (*Color ↔ Music ↔ Motion*). Rather than treating rendering, audio, and physics as isolated silos, every system reads from and writes to a central, zero-allocation **Global Triad State Bus**.

```
                      ┌───────────────────────────────────┐
                      │      GLOBAL TRIAD STATE BUS       │
                      │ (Speed, Bass/BPM, Vibe LUT, Race) │
                      └─────────────────┬─────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                               ▼
┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
│   MOTION PILLAR   │           │   COLOR PILLAR    │           │   MUSIC PILLAR    │
│ ───────────────── │           │ ───────────────── │           │ ───────────────── │
│ • Arcade Physics  │──────────▶│ • Vibe LUT Shader │◀──────────│ • FMOD Stem Mixer │
│ • Drift State     │  Speed    │ • Paint Smudge    │  Spectrum │ • FFT Beat Detect │
│ • Car Combat      │  Vectors  │ • Nagai Toon Lit  │  & Drops  │ • Track DJ Screen │
└─────────┬─────────┘           └───────────────────┘           └─────────┬─────────┘
          │                                                               │
          └─────────────────────────────┬─────────────────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │   EXPRESSION & WORLD PILLAR   │
                        │ ───────────────────────────── │
                        │ • 2D Physics Character Boxes  │
                        │ • Rage & Cockiness Meters     │
                        │ • Personality AI & Landmarks  │
                        └───────────────────────────────┘
```

---

## Pillar 1: Arcade Vehicle & Motion Systems
*Built for the "Ridge Racer Type 4" high-speed drift feel and visceral physical impact.*

### 1.1 Custom Raycast/Sphere Arcade Vehicle Controller
Standard `WheelCollider` components simulate realistic suspension and friction curves that actively fight snappy arcade handling. Instead, the vehicle will be built around a **Custom Sphere-Rigidbody + Visual Chassis Rig**.

* **Physics Hierarchy:**
  * `CarRoot` (GameObject): Tracks position/rotation and syncs to the physics sphere.
  * `PhysicsSphere` (Rigidbody): Unparented at runtime (`Interpolate.Interpolate`, `CollisionDetectionMode.ContinuousDynamic`). Driven by `AddForce` along the visual chassis' forward vector.
  * `VisualChassis` (Transform): Child of `CarRoot`. Handles visual pitch (acceleration/braking squat), roll (body lean into corners), and yaw (drift angle offset).
* **4-Corner Suspension Raycasts (For Ground Alignment Only):**
  * Cast 4 rays downward from the chassis corners using `Physics.RaycastNonAlloc` onto the `TrackSurface` layer.
  * Average the hit normals to smoothly Slerp the `CarRoot.up` vector to match track banking, loops, and elevation changes.
* **R4-Style Drift State Machine (`Grip` → `InitiatingDrift` → `Drifting` → `DriftRecovery`):**
  * **Entry Trigger:** Reaching a minimum speed threshold (`> 45%` top speed) and either tapping the brake/e-brake while steering or flicking the steering input (`On-Off-On` throttle tech, homage to *Ridge Racer*).
  * **Rail-Assisted Slip Angle:** When entering `Drifting`, decouple the `VisualChassis` yaw from the `PhysicsSphere` velocity vector by `15°–55°`. Blend lateral velocity damping (`lateralGripCurve`) with an inward centripetal assist force aligned with the track's tangent spline so drifts feel fast, controllable, and heroic around tight hairpins.
  * **Drift Boost Accumulation:** Accumulate `driftCharge` based on `slipAngle * normalizedSpeed * deltaTime`. Exiting a clean drift converts `driftCharge` into a temporary burst of forward acceleration and triggers a spike in the **Paint Smudge** shader.

### 1.2 Car-to-Car Combat & Collision System
* **Separate Combat Hitboxes:** Use a dedicated kinematic BoxCollider trigger/collider around the chassis specifically on a `CarCombat` layer to avoid physics spheres bouncing unpredictably off each other.
* **Collision Resolution (`OnCollisionEnter`):**
  * Calculate relative impact velocity: `Vector3 relativeVel = collision.relativeVelocity`.
  * Project the collision normal onto the local horizontal plane of both cars (`Vector3.Dot(contactNormal, transform.right)` and `transform.forward`) to classify the hit:
    * **Sideswipe / Shunt:** High lateral dot product (`|dotRight| > 0.6`).
    * **Rear-End / Bump Draft:** High forward dot product (`dotForward > 0.7`).
    * **T-Bone / Slam:** High impact magnitude (`relativeVel.magnitude > threshold`).
  * Apply a controlled horizontal impulse to the victim's `PhysicsSphere` while clamping vertical pop so cars never flip awkwardly.
* **Event Dispatch:** Emit a `CarCollisionEvent` struct containing:
  ```csharp
  public readonly struct CarCollisionEvent {
      public readonly DriverIdentity Attacker;
      public readonly DriverIdentity Victim;
      public readonly Vector2 ScreenSpaceImpactVector; // Projected to HUD space
      public readonly float NormalizedForce;           // 0.0 to 1.0
  }
  ```

### 1.3 Dynamic Sense-of-Speed Camera System
* **Cinemachine 3.x Integration:**
  * Base rig using `CinemachineCamera` with a custom `CinemachineExtension` (`RaveSpeedCameraExtension`).
* **Speed-Driven Parameters (Evaluated via `AnimationCurve` against `NormalizedSpeed` `0.0–1.2`):**
  * **FOV Warping:** Base `60°` FOV smoothly expanding to `95°` at top speed and `108°` during drift-boost/slipstream.
  * **Camera Distance & Height Compression:** At `100%+` speed, pull the camera slightly closer to the asphalt (`Y offset: -0.25m`) while pushing the follow distance back briefly on boost ignition (elastic spring-arm lag).
  * **Drift Dutch Angle:** Roll the camera `Z` axis up to `±6°` proportional to the current drift slip angle.
  * **High-Speed Micro-Jitter:** Drive a 6D Perlin noise profile (`CinemachineBasicMultiChannelPerlin`) whose frequency scales with engine RPM and whose amplitude spikes when scraping walls or hitting redline speeds.

---

## Pillar 2: "Unyielding Aesthetic" Rendering & Shader Systems
*Bringing the Hiroshi Nagai, Auto Modellista, and Redline inspirations to life in URP.*

### 2.1 The "Vibe" Fluid Color Palette System
In *Rave Racer Remix*, players do not pick a static hex color like "Red" or "Blue" for their car; they pick a **Vibe** (e.g., *Pacific Sunset 1984*, *Acid Warehouse*, *Midnight Shibuya*). As the car moves through different zones of the track and as the music hits different states, the car and world colors morph fluidly.

* **Data Architecture (`VibePaletteSO` ScriptableObject):**
  * Each Vibe defines a **2D Gradient LUT Texture** (`256x16` pixels, `RGBAHalf` format, bilinear filtering, wrap mode clamp):
    * **X-Axis (`0–255`):** Luminance / Material ID ramp (Shadow, Midtone, Highlight, Rim, Accent 1, Accent 2, Emissive).
    * **Y-Axis (`0–15`):** Track Zone / Musical Energy state rows.
* **Car & Environment Material Setup:**
  * Car textures are authored as **ID + Greyscale Value Masks** rather than RGB albedo textures:
    * `R Channel`: Base surface luminance / shading weight.
    * `G Channel`: Material Zone ID (Primary Body, Secondary Trim, Decals, Rims, Window Tint).
    * `B Channel`: Specular / Halftone ramp weight.
    * `A Channel`: Emissive / Audio-reactive mask.
* **Runtime Shader Blending (`VibeController.cs`):**
  * As a car crosses a `TrackZoneTrigger`, the system interpolates a global or per-renderer `MaterialPropertyBlock` parameter `_VibeRowBlend` (`float`) and blends between the current zone's LUT and the next zone's LUT via `Shader.SetGlobalTexture("_GlobalTrackVibeLUT", ...)` and `_MusicEnergyOffset`.
  * In the shader, final color is sampled dynamically:
    ```hlsl
    float2 lutUV = float2(surfaceLuminance + (audioBassPulse * emissiveMask), currentZoneRowV);
    half3 finalColor = SAMPLE_TEXTURE2D(_VibeLUT, sampler_VibeLUT, lutUV).rgb;
    ```

### 2.2 High-Speed "Paint Smudge" Post-Processing (Redline Inspiration)
As the player approaches top speed, colors on screen should smudge and smear like wet acrylic/oil paint being dragged by a palette knife, accompanied by bold anime ink lines.

* **URP `ScriptableRendererFeature` (`PaintSmudgeRenderFeature`):**
  * Implemented using Unity 6's **RenderGraph API**, injected at `RenderPassEvent.BeforeRenderingPostProcessing`.
* **Ping-Pong Temporal Accumulation Buffer:**
  * Maintain two persistent history `RTHandle` textures (`_SmudgeHistoryA` and `_SmudgeHistoryB`) across frames.
  * Require `Depth` and `MotionVectors` inputs in the URP pass (`ScriptableRenderPassInput.Motion | ScriptableRenderPassInput.Color`).
* **The Smudge Shader (`PaintSmudgePass.shader`):**
  1. **Radial + Motion Vector Advection:** Combine the pixel's camera/object motion vector (`_MotionVectorTexture`) with a radial vector pointing away from the screen-space vanishing point (the direction of travel).
  2. **Brush-Stroke Noise Distortion:** Perturb the advection vector using a tiling anisotropic brush-stroke normal/flow map (`_BrushFlowTex`) scrolled at high speed.
  3. **Chromatic & Luminance Smearing:** At `NormalizedSpeed > 0.75`, blend the current frame's color with the advected history buffer sample (`lerp(currentColor, smudgedHistoryColor, smudgeIntensity)`), weighted heavily toward saturated/bright pixels so neon lights, tail-lights, and car paint leave thick painterly trails across the edges of the screen while keeping the center road focal area readable.
  4. **Kuwahara / Oil-Paint Edge Filter:** Apply a directional 4-sector Kuwahara kernel on the outer screen periphery scaled by speed, turning distant scenery and barrier blur into flat, overlapping paint strokes.
* **Redline Heavy Ink Outlines & Speed Lines:**
  * A secondary pass performing Roberts Cross depth + normal-buffer edge detection, modulated by a procedural polar-coordinate noise texture to draw jagged black ink speed-lines converging toward the car's bumper at top speed or during boosts.

### 2.3 Hiroshi Nagai & Auto Modellista Environment Shaders
* **Crisp Two-Tone Cel Shading with Zero Soft Gradients:**
  * Custom HLSL Lighting function using a stepped ramp (`smoothstep(0.0, 0.01, NdotL)`) so shadows on buildings, palm trees, and asphalt cast razor-sharp geometric shapes—just like Hiroshi Nagai's acrylic illustrations.
* **Shadow Color Override:** Shadows are never black or grey; they sample a saturated cool tone (deep indigo, violet, or teal) directly from the active `VibePaletteSO`.
* **Stylized Skybox & Horizon Shader:**
  * Procedural skybox with quantized color banding (optional subtle Bayer 4x4 dithering at band transitions), oversized crisp sun/moon discs, and static parallax 2D painted cumulus cloud planes that shift hue alongside the track's Vibe.
* **Auto Modellista Car Shader:**
  * Inverted-hull back-face extrusion pass for outer vehicle silhouettes (with vertex-color thickness control so lines thicken on wheel arches and bumpers).
  * View-space matcap reflection texture featuring hard-edged white anime light-streaks that slide across the windshield and hood as the car drifts.

---

## Pillar 3: Reactive Audio & "Boiler Room" DJ Systems
*Connecting Music ↔ Color ↔ Motion so the track feels like a live underground rave set.*

### 3.1 Interactive Music & Stem Manager (FMOD Integration)
* **Multi-Stem Track Architecture:**
  * Every race track's song is authored in FMOD Studio as a multi-track event split into synchronized stems:
    1. `Kick_SubBass` (Drives visual pulses and haptics)
    2. `Percussion_Tops` (Hi-hats, breakbeats—scales with speed)
    3. `Synths_Chords` (Main harmonic vibe)
    4. `Lead_Acid` (Unlocks during high *Cockiness* or 1st place)
    5. `FX_Risers` (Triggered on long drifts and final lap)
* **Real-Time Race-to-Music Parameter Mapping (`AudioRaceBridge.cs`):**
  * `NormalizedSpeed (0.0–1.0)` → Controls high-shelf EQ excitement and brings in `Percussion_Tops` double-time layers above `85%` speed.
  * `DriftState (0.0–1.0)` → Applies a resonant stereo phaser/flanger sweep; holding a massive drift builds a subtle pitch-riser that drops right as the drift boost fires.
  * `CarCollision` → Triggers an instant 150ms vinyl-scratch / tape-stop or low-pass filter duck (`Cutoff: 250Hz`) followed by a heavy sub-drop recovery.
  * `FinalLap` → Shifts the FMOD state to a "+4 BPM" or high-energy VIP remix stem arrangement.

### 3.2 Real-Time Audio Spectrum & Beat Broadcast Bus
* **FFT & Timeline Marker Extraction (`BeatBroadcastSystem.cs`):**
  * Subscribes to `FMOD.Studio.EVENT_CALLBACK_TYPE.TIMELINE_BEAT` and `TIMELINE_MARKER` (for exact authored "Drop", "Breakdown", and "Fill" cues).
  * Runs a custom FMOD DSP FFT capture on the `Kick_SubBass` and `Synths_Chords` buses (or `AudioListener.GetSpectrumData(samples, 0, FFTWindow.BlackmanHarris)` if using native Unity audio) to calculate 4 smoothed frequency bands (`SubBass`, `LowMid`, `HighMid`, `Treble`) every frame.
* **Global Shader Broadcast:**
  * Pushes global shader vectors every `LateUpdate`:
    ```csharp
    Shader.SetGlobalVector("_AudioSpectrum", new Vector4(subBass, lowMid, highMid, treble));
    Shader.SetGlobalFloat("_BeatPulse", currentBeatEnvelope); // 1.0 on beat, decays to 0.0
    ```
  * Environment shaders use `_AudioSpectrum.x` (`SubBass`) to pulse neon trackside barriers, billboard brightness, and road lane markers without a single per-object C# script update.

### 3.3 Track DJ Controller & Trackside Jumbotron Pipeline
* **The "Boiler Room" DJ Concept:**
  * Each track has a signature resident DJ performing live. Their feed is plastered on giant LED jumbotrons, highway overhead signs, tunnels, and blimps along the course.
* **Single-RenderTexture Broadcast Architecture:**
  * Place an isolated **"DJ Booth Stage"** prefab at world coordinates `(0, -500, 0)` on a dedicated `DJStage` layer.
  * Render the DJ stage using a secondary URP camera (`DJBroadcastCamera`) targeting a single shared `RenderTexture` (`512x512` or `1024x512`, `ARGB32`) at a stylized 24 FPS or 30 FPS step rate.
  * All 50+ trackside screens along the race course simply reference a single material (`M_TracksideJumbotron`) that samples this `RenderTexture`, overlaid with CRT scanlines, LED pixel-grid masks, and audio-reactive glitch distortion. Zero extra draw-call multiplier per screen!
* **DJ Animation State Machine (`TrackDJController.cs`):**
  * Driven by a Unity `Animator` (2D Sprite/Spine rig or cel-shaded 3D character):
    * **BPM Sync:** `djAnimator.speed = currentBPM / baseAnimationBPM` so head-bobbing and deck tweaking lock 1:1 to the beat.
    * **Song Marker Reactions:** When FMOD fires a `PreDrop` marker, the DJ raises a hand on the mixer; on `Drop`, the DJ slams the crossfader, triggering strobe lights in the DJ booth and shifting the track's global Vibe palette row.
    * **Race Event Reactions:** When the player pulls off a massive collision or overtakes 1st place in front of a screen, the `RaceDirector` sends a trigger (`TriggerDJReaction(DJReactionType.HypeShock)`), swapping the DJ's face animation to a hyped grin or shocked expression.

---

## Pillar 4: Player Expression, Emotion & Interactive HUD Systems
*Anime-inspired character boxes that physically interact on the HUD, backed by Rage and Cockiness meters.*

### 4.1 Physics-Driven Character Portrait Boxes
* **UI + 2D Physics Architecture:**
  * Built on a Screen-Space Camera `Canvas` (`HUDCanvas`) rendered by a UI Overlay Camera.
  * Each active racer in proximity (Player + up to 2–3 nearby rivals) has a `CharacterBoxWidget` positioned dynamically along the left/right/top margins of the screen.
* **Spring-Damper + 2D Rigidbody Simulation (`CharacterBoxPhysics.cs`):**
  * Each `CharacterBoxWidget` possesses a `Rigidbody2D` (`Dynamic`, `GravityScale = 0`) and `BoxCollider2D` on a `HUDPhysics` layer.
  * Every frame, a **Hooke's Law Spring Force** pulls each box toward its designated HUD anchor slot:
    ```csharp
    Vector2 displacement = anchorPosition - rb2D.position;
    Vector2 springForce = (displacement * springStiffness) - (rb2D.linearVelocity * damping);
    rb2D.AddForce(springForce);
    ```
* **Car Ramming → Box Ramming Synchronization:**
  * When `CarCollisionEvent` fires on the 3D track between `Driver A` and `Driver B`:
    1. If `Driver B`'s box isn't currently on screen, snap-slide it into an adjacent slot next to `Driver A`'s box.
    2. Convert the 3D `ScreenSpaceImpactVector` into a high-velocity 2D impulse on `Driver A`'s `Rigidbody2D` aimed directly at `Driver B`'s `Rigidbody2D`.
    3. When the two `BoxCollider2D` components collide on the HUD (`OnCollisionEnter2D`):
       * Trigger a **2-frame Hitstop** on the portrait animations.
       * Spawn a 2D anime impact star / comic border shatter VFX at the UI contact point.
       * Swap the victim's portrait sprite/mesh to an "Impact / Gritted Teeth" expression pushed against the edge of their frame.
       * Trigger the **Mid-Race Dialogue System**.

### 4.2 Rage & Cockiness Emotion Meters
* **Dual-Axis Emotion State (`DriverEmotionState.cs`):**
  * Attached to both the Player and every AI Rival. Both meters range from `0f` to `100f` with passive decay curves.
* **Event Drivers:**
  | Race Action / Event | Rage Delta | Cockiness Delta |
  | :--- | :--- | :--- |
  | Getting rammed by another car | `+25` | `-15` |
  | Grinding a barrier / spinning out | `+15` | `-25` |
  | Getting overtaken | `+10` | `-10` |
  | Executing a clean high-angle drift | `-5` (Cools down) | `+15 / sec` |
  | Near-miss at `> 90%` speed | `0` | `+12` |
  | Ramming a rival successfully | `+10` | `+15` |
  | Holding 1st place | `-5 / sec` | `+8 / sec` |
* **Threshold States & Gameplay/Visual Effects:**
  * **High Rage (`> 75%` — *"BOILING"*):**
    * **Visual:** Character box border glows jagged crimson and vibrates continuously; portrait swaps to an enraged anime expression with shadow lines over the eyes; car's Vibe LUT shifts toward aggressive high-contrast reds/blacks.
    * **Gameplay:** Increases car mass/ramming knockback power by `35%` and grants a temporary top-speed slipstream surge when trailing the driver who hit you ("Vendetta Boost"), at the cost of slightly looser drift stability.
  * **High Cockiness (`> 75%` — *"UNTOUCHABLE"*):**
    * **Visual:** Character box border shines iridescent gold/neon; portrait smirks or adjusts sunglasses; car leaves extended iridescent paint-smudge trails; unlocks the `Lead_Acid` solo stem in the music.
    * **Gameplay:** Widens the sweet-spot window for drift boosts and increases boost duration by `20%`. **Risk:** Getting slammed while at max Cockiness triggers an *"Ego Shatter"* penalty (instant drop to `0` Cockiness and `+50` Rage).

### 4.3 Contextual Mid-Race Dialogue & Banter System
* **Data Structure (`DialogueBarkSO`):**
  * Contains speaker ID, target rival ID (optional), trigger type (`OnRam`, `OnRammed`, `OnOvertake`, `OnMaxRage`, `OnMaxCockiness`), required emotion thresholds, localized text string, voice audio clip/synth blip, and portrait expression enum.
* **Priority Queue & Cooldown Manager (`BanterManager.cs`):**
  * Prevents dialogue spam during multi-car pileups using a priority score (`PlayerInvolved > RivalToRival`, `HighEmotion > Neutral`).
  * Renders dialogue in stylized angled comic/anime speech ribbons extending directly from the colliding character portrait boxes, with kinetic typography (shaking text for *Rage*, wavy/smooth text for *Cockiness*).

---

## Pillar 5: Track, AI & Race Logic Systems

### 5.1 Spline & Track Manager
* **Unity `Splines` Package (`UnityEngine.Splines`):**
  * **Master Racing Spline:** Defines center-line progression (`0.0` to `1.0` normalized lap distance), track width data (`float2` left/right boundary widths stored in `SplineData`), and banking angles.
  * **Spatial Hashing for Lap Progress:** Use `SplineUtility.GetNearestPoint` on a coarse segment cache to calculate each car's exact `LapProgress`, race position (`1st–8th`), and `WrongWay` detection in `< 0.05ms` per frame.
* **Track Zone Triggers (`TrackVibeZone.cs`):**
  * Box/Spline triggers placed at tunnel entrances, coastal cliff reveals, and downtown neon sectors. Crossing a zone notifies the `VibeController` to morph the global/car color LUT and updates environmental fog/sky gradients.

### 5.2 Personality-Driven AI Rivals
* **Spline-Following + Local Avoidance Steering:**
  * AI drivers evaluate a look-ahead point along the Master Racing Spline (`currentDist + lookAheadBySpeed`) and feed virtual steering, throttle, and drift inputs into the **exact same `ArcadeVehicleController`** used by the player (ensuring AI cars drift and smudge paint identically).
* **Emotion-Driven Utility AI (`RivalBrain.cs`):**
  * Each AI has a `RivalPersonalitySO` defining base aggression, drift skill, and emotional volatility.
  * **Dynamic Behavior Switching:**
    * **Normal State:** Follows optimal racing line, attempts clean overtakes.
    * **Rival in High Rage (`> 75%`):** Switches target vector from the racing spline to the lateral flank of the car that last hit them (`VendettaTarget`), intentionally swerving to sideswipe and box-ram the player.
    * **Rival in High Cockiness (`> 75%`):** Takes wider, showier drift angles through corners and triggers taunt barks on the HUD when passing the player.

### 5.3 Race Director & Event Bus
* **Zero-Allocation C# Generic Event Bus (`EventBus<T>`):**
  * Static struct-based pub/sub system so physics, UI, shaders, and audio never hold tight references to one another:
    * `EventBus<CarCollisionEvent>.Raise(...)`
    * `EventBus<DriftCompletedEvent>.Raise(...)`
    * `EventBus<EmotionThresholdEvent>.Raise(...)`
    * `EventBus<LeadChangeEvent>.Raise(...)`
* **Dynamic Rubber-Banding / Pacing Director:**
  * Subtly adjusts AI top-speed scalars (`0.94x–1.05x`) based on distance behind/ahead of the player so the pack stays tight enough for frequent car-to-car / box-to-box interactions without feeling cheap.

---

## Pillar 6: World Map, Home Base & Diegetic Loading Systems

### 6.1 Home Base / Garage Hub
* **3D Stylized Diorama Scene (`HomeBase.unity`):**
  * Set in a Hiroshi Nagai-inspired location (e.g., a sunlit coastal parking deck overlooking a turquoise bay or a neon-lit underground parking garage).
  * Interactive camera states (driven by Cinemachine State-Driven Cameras) transitioning seamlessly between:
    1. **Vibe Customizer:** Previewing how different `VibePaletteSO` selections react to different audio frequencies and lighting states on the car.
    2. **Driver & Rival Dossier:** Inspecting character bios, portrait animations, and track DJ lineups.
    3. **World Map Table:** Zooming into the regional highway map to select the next race.

### 6.2 World Map & Route Graph System
* **Node-Graph Overworld (`WorldMapGraphSO`):**
  * Represent the game world as a directed graph of **Nodes** (`HomeBase`, `TrackVenues`, and `HighwayIntersections`) connected by **Edges** (`RoadSegments`).
  * Each `RoadSegment` stores an ordered list of `LandmarkSO` assets that exist physically along that stretch of highway (e.g., *Bayshore Suspension Bridge*, *Giant Neon Bowling Pin*, *Coastal Wind Turbines*, *Tunnel 04 Tollbooth*).

### 6.3 Landmark-Based "Drive-Over" Loading System
* **Concept Execution:** *"Loading screen is based off a landmark you would logically see on the drive over."*
* **Pathfinding the Route:**
  * When the player selects a track from the World Map (or moves from Track A to Track B), run **Dijkstra's Algorithm** on the `WorldMapGraphSO` from `CurrentLocationNode` to `TargetTrackNode`.
  * Collect the sequence of `LandmarkSO` assets along the traversed edges.
* **Asynchronous Additive Scene Loading (`TravelLoadingManager.cs`):**
  1. Immediately load a lightweight `TravelTransitionScene` (< 10ms) containing the player's car cruising on a looping procedural highway strip against a Hiroshi Nagai skybox.
  2. Spawn the 2D/3D diorama set-piece from the selected `LandmarkSO` scrolling past in the background (e.g., passing under the *Bayshore Suspension Bridge* at sunset while the muffled bass of the upcoming venue's Track DJ fades in from the distance via an FMOD low-pass filter).
  3. Call `SceneManager.LoadSceneAsync(targetTrackScene, LoadSceneMode.Additive)` with `allowSceneActivation = false`.
  4. Pre-warm all URP Shader Variants (`ShaderVariantCollection.WarmUp`) and FMOD sample data during the scenic drive.
  5. Once `asyncOperation.progress >= 0.9f` and the landmark pass-by animation completes, whip-pan the camera or drive into the venue tunnel to seamlessly activate the race scene.

---

## Pillar 7: Core Game Loop, VFX & Polish Systems

### 7.1 Stylized Anime VFX Pipeline
* **Unity VFX Graph & Particle System:**
  * **Cel-Shaded Tire Smoke:** Billboards using stepped alpha-erosion shaders and normal-mapped spheres so smoke puffs catch the flat two-tone Nagai lighting and change color with the track's Vibe LUT.
  * **Collision Sparks & Paint Splatters:** When cars ram each other, emit burst particles that sample the colliding cars' current Vibe colors—literally splashing droplets of each car's color onto the screen/camera lens.
  * **Taillight Light-Trails:** Custom `TrailRenderer` ribbons attached to taillights and spoiler tips that widen and stretch as `NormalizedSpeed` exceeds `80%`.

### 7.2 Input & Beat-Synced Haptics System
* **Unity Input System (`UnityEngine.InputSystem`):**
  * Action maps for `Gameplay` (Steering, Throttle, Brake/Drift, Look Back, Horn/Taunt) and `UI`.
* **Dual-Layer Gamepad Rumble (`HapticsController.cs`):**
  * **Low-Frequency Motor (Left):** Driven by `SubBass` peaks on beat drops and heavy car-to-car impacts.
  * **High-Frequency Motor (Right):** Driven by tire slip during drifts, redline engine RPM vibrations, and curb rumbles.

### 7.3 Post-Race Replay System (Ridge Racer Type 4 Homage)
* **Ring-Buffer Transform & State Recorder (`ReplayRecorder.cs`):**
  * Records a lightweight `ReplayFrame` struct at a fixed 30Hz tick (`PhysicsSphere` pos/rot, `VisualChassis` local rot, `NormalizedSpeed`, `DriftState`, and `CharacterBox` events) for all cars—requiring less than `2 MB` of RAM for a 3-minute race.
* **Trackside TV Camera Switcher:**
  * Upon crossing the finish line, immediately transition into an automated broadcast replay using trackside Cinemachine cameras with long telephoto lenses, pan-and-scan motion, and the Track DJ's post-set music mix playing over the results screen.

---

## Recommended Unity Project Folder Structure

```text
Assets/
├── _RaveRacer/
│   ├── Core/
│   │   ├── EventBus/               # Zero-alloc generic event bus & event structs
│   │   ├── TriadState/             # Global Color-Music-Motion state manager
│   │   └── SceneLoading/           # Dijkstra route finder & Landmark loading system
│   ├── Vehicle/
│   │   ├── Physics/                # Sphere-Rigidbody + 4-raycast arcade controller
│   │   ├── Combat/                 # Collision classifier & knockback resolver
│   │   └── Camera/                 # Cinemachine speed FOV, dutch angle & shake extensions
│   ├── Rendering/
│   │   ├── RenderFeatures/         # PaintSmudgeRenderFeature (URP RenderGraph)
│   │   ├── Shaders/                # NagaiToon.shader, VibeCar.shader, PaintSmudge.shader
│   │   └── VibePalettes/           # VibePaletteSO assets & 2D LUT textures
│   ├── Audio/
│   │   ├── FMODBridge/             # Stem controller, FFT spectrum & beat callback listener
│   │   └── TrackDJ/                # DJ booth stage, RenderTexture pipeline & state machine
│   ├── ExpressionHUD/
│   │   ├── CharacterBoxes/         # 2D Rigidbody spring-anchored portraits & impact FX
│   │   ├── EmotionMeters/          # Rage & Cockiness trackers & gameplay modifiers
│   │   └── Banter/                 # DialogueBarkSO assets & comic speech ribbon queue
│   ├── TrackAndAI/
│   │   ├── Splines/                # Track progress, boundaries & Vibe zone triggers
│   │   └── AI/                     # Personality-driven RivalBrain & spline steering
│   └── World/
│       ├── HomeBase/               # Garage diorama & Vibe customizer
│       └── Landmarks/              # WorldMapGraphSO & LandmarkSO prefabs
```
