# Rave Racer Remix — Map, Track & Skybox Creation Guide

> **Scope:** Complete architectural analysis and step-by-step authoring guide for **Race Tracks**, **World Maps / Landmarks**, and **Hiroshi Nagai Skyboxes & Vibe Palettes** across both the **Playable WebGL2 Prototype (`prototype/`)** and the **Target Unity 6 (6000.x LTS) URP Architecture**.

---

## 1. Executive Architecture Analysis: How the Project Handles Tracks, Maps & Skyboxes

*Rave Racer Remix* is built around the **Triad Coupling Loop (`Color ↔ Music ↔ Motion`)**. Tracks, maps, and skyboxes are not static 3D environments—they are reactive data structures that morph in real time with vehicle speed, player emotion (*Rage* / *Cockiness*), track sector progression, and audio FFT spectrum peaks (`SubBass`, `BeatPulse`).

The project currently defines these systems across two synchronized layers:
1. **Playable WebGL2 / JS Prototype (`prototype/`):** A zero-dependency custom WebGL2 engine using procedural Centripetal Catmull-Rom splines, procedural sector geometry, a custom GLSL 300 es quantized Hiroshi Nagai skybox shader, a `256×16` 2D Vibe LUT generator, and a Dijkstra node-graph overworld.
2. **Production Unity 6 Specification (`Rave Racer Remix - Systems & Unity Architecture.md`):** A Universal Render Pipeline (URP) architecture using `UnityEngine.Splines`, `VibePaletteSO` ScriptableObjects, `TrackVibeZone` triggers, single-`RenderTexture` Boiler Room DJ Jumbotrons, and additive Dijkstra `LandmarkSO` loading scenes.

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        WORLD MAP & OVERWORLD LAYER (Pillar 6)                     │
│  • WorldMapGraph (Nodes: HUB / JUNCTION / VENUE + Weighted Highway Edges)         │
│  • Dijkstra Route Solver -> Collects ordered Landmark definitions along highway   │
│  • Diegetic "Drive-Over" Loading Screen -> Scrolls landmarks + muffles DJ bass    │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      RACE TRACK SPLINE & GEOMETRY LAYER (Pillar 5)                │
│  • Control Points: { pos: [x,y,z], bank, halfWidth, zone: 0..3 }                  │
│  • Centripetal Catmull-Rom (α=0.5) -> Resampled to 720 Uniform Arc-Length Steps   │
│  • 5-Tap Gaussian Clothoid Curvature Filter + Auto-Banking + 150m/100m/50m Gates  │
│  • Procedural / Modular Sector Meshes + Shared RenderTexture DJ Jumbotrons        │
└───────────────────┬───────────────────────────────────────────┬───────────────────┘
                    ▼                                           ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────────┐
│   CURVILINEAR PHYSICS & AI (Pillar 1) │   │  NAGAI SKYBOX & VIBE LUT (Pillar 2)   │
│  • Curvilinear coords (t, lat, head)  │   │  • Quantized 10-band sky + Bayer 4x4  │
│  • Centrifugal curvature push + bank  │   │  • Pitch-shifted horizon & sliced sun │
│  • Slope gravity & tangential walls   │   │  • 4 Track Zones × 4 Vibe Palettes    │
│  • 2D Top-Down Auto-Fitted Minimap    │   │  • SubBass & Rage/Cockiness color mod │
└───────────────────────────────────────┘   └───────────────────────────────────────┘
```

---

## 2. Deep Dive: How Race Tracks Work

### 2.1 The Mathematical Spline Pipeline (`prototype/js/track-spline.js`)
Every race track in `RRR.TRACK_PRESETS` (`prototype/js/track-spline.js`) is a closed 3D loop generated from a compact array of **Control Points** processed through a 6-stage mathematical pipeline inside `RRR.TrackSpline.buildSplineTable()`:

1. **Control Point Schema:**
   Each control point defines five properties in a **Right-Handed 3D Coordinate System** (`+Z` = North / Forward at start line, `-X` = East / Right, `+Y` = Up in meters):
   ```javascript
   {
       pos: [x, y, z],     // 3D world coordinates in meters
       bank: 0.08,         // Roll angle in radians (+ = banked for Right turn, - = Left turn)
       halfWidth: 15.0,    // Distance from centerline to left/right barrier in meters (total width = 2 * halfWidth)
       zone: 0             // Track Vibe Sector ID (0, 1, 2, or 3)
   }
   ```
2. **Stage 1 — Centripetal Catmull-Rom Interpolation ($\alpha = 0.5$):**
   * Implemented in `centripetalCatmullRomSegment()` using the Barry-Goldman pyramidal formulation with chordal distance weighting ($\Delta t = d^{0.5}$) across `2,880` raw samples.
   * **Why Centripetal?** Standard uniform Catmull-Rom splines bow outward or self-intersect when transitioning from a 600m straightaway into a tight hairpin. Centripetal parameterization guarantees zero self-intersections and tight corner entries.
3. **Stage 2 — Strict Uniform 3D Arc-Length Resampling (`numSamples = 720`):**
   * Raw spline parameter $u$ does not move at constant speed in 3D space. The engine computes a cumulative 3D Euclidean distance table (`cumDist`) and binary-searches it to resample exactly `720` equidistant points around the closed loop (`ds = totalLength / 720`).
   * It simultaneously records the axis-aligned bounding box (`this.bounds = { minX, maxX, minZ, maxZ }`) used to auto-scale the HUD minimap.
4. **Stage 3 — Tangent Vectors, Yaw & Pitch:**
   * Computes central-difference unit tangent vectors `forward = [fx, fy, fz]`, heading `yaw = Math.atan2(-fx, fz)`, and elevation slope `pitch = Math.asin(fy)`.
5. **Stage 4 — Clothoid (Euler Spiral) Curvature Filtering & Progressive Banking:**
   * Computes differential signed curvature $\kappa(s) = \frac{d(\text{yaw})}{ds}$ in radians per meter (`+` = Right turn, `-` = Left turn).
   * Passes $\kappa(s)$ through **3 iterations of a 5-tap circular Gaussian filter** (`smoothCircular5Tap`) to emulate real-world highway **Clothoid (Euler spiral)** transitions—preventing sudden steering jerks at corner entry/exit.
   * Automatically adds curvature-proportional banking (`bankAssist = clamp(kappa * 12.0, -0.09, 0.09)`) and smooths both `bank` and `halfWidth` envelopes (`halfWidth` is clamped to a minimum of `10.0m`).
6. **Stage 5 & 6 — Orthonormal Basis Frame & Automatic Corner Telegraphing:**
   * Constructs an orthonormal 3D road frame (`forward`, banked `right`, and surface normal `up = right × forward`) at every sample.
   * **Outer-Wall Chevron Intensity (`chevronIntensity`):** Normalizes $|\kappa|$ above `0.0015 rad/m` into a `0.0–1.0` intensity scalar (`apexSide = -1` for Left, `+1` for Right).
   * **Automatic 150m / 100m / 50m Turn-In Countdown Gates (`isCornerEntryGate`):** Scans for corner entries where `chevronIntensity` crosses `0.35` (with a `90m` cooldown) and walks backward along the uniform arc-length samples by `50m`, `100m`, and `150m` to flag pylon positions automatically.

### 2.2 Procedural Track Geometry & Material Zone IDs (`prototype/js/webgl-renderer.js`)
In `WebGLRenderer.buildTrackAndJumbotronMeshes()`, the renderer sweeps along all `720` spline samples using a helper `addPt(s, lateralOffset, upOffset)` that converts curvilinear offsets into 3D world space:
$$\mathbf{P}_{\text{world}} = \mathbf{P}_{\text{spline}} + \mathbf{R}_{\text{banked}} \cdot \text{lat} + \mathbf{U}_{\text{normal}} \cdot \text{upOff}$$

Every vertex is packed into an interleaved **12-float format**:
`[x, y, z,  nx, ny, nz,  r, g, b, a,  u, v]`

Rather than binding dozens of separate textures, the world shader (`worldFS`) uses the vertex attribute `a_colorId` (`r, g, b, a`) as a **Channel-Packed Material & Vibe Mask**:

| `a_colorId` Channel | Meaning in Shader (`worldFS`) | Values & Behavior |
| :--- | :--- | :--- |
| **`r` (Red)** | Base Surface Luminance Weight | `0.0–1.0` shading weight. |
| **`g` (Green)** | **Material Zone ID** (`int(floor(g * 10.0 + 0.5))`) | Selects which dynamic Vibe color and shading rule applies (see table below). |
| **`b` (Blue)** | Specular / Halftone Weight | Controls hard anime specular streaks on car bodies (`zoneId 5 & 6`). |
| **`a` (Alpha)** | **Emissive / Audio-Reactive Mask** | If `a > 0.1`, mixes in `u_carEmissive * 1.35` boosted by `u_audioSpectrum.x` (`SubBass`). |

#### Material Zone ID Reference (`g` channel × 10)
| `g` Float | `zoneId` Int | Surface Type | Shader Color & Audio-Reactive Behavior |
| :---: | :---: | :--- | :--- |
| **`0.0`** | `0` | **Road Asphalt & Striping** | Lit by `u_roadLit` / `u_roadShadow`. Automatically draws a dashed center rave line (`|uv.x - 0.5| < 0.014`) and glowing edge lines (`uv.x < 0.035` or `> 0.965`) that pulse with `u_audioSpectrum.x` (`SubBass`). |
| **`0.1`** | `1` | **Apex Rumble Curbs & Aprons** | Alternates between `u_curbA` and `u_curbB` every `fract(uv.y * 0.75) > 0.5`. Generated automatically when `chevronIntensity >= 0.15`, plus an inner-apex `1.4m` rumble apron strip. |
| **`0.2`** | `2` | **Hiroshi Nagai Palms & Foliage** | Two-tone stepped cel-shading using `u_foliageLit` and `u_foliageShadow`. |
| **`0.3`** | `3` | **Concrete / Guardrails / Towers** | Architectural concrete (`mix(u_carTrim, u_roadLit, 0.35)`) with razor-sharp cool indigo shadows (`u_shadowCool`). Used for straightaway barriers, bridge pylons, tunnel arches, and skyscrapers. |
| **`0.4`** | `4` | **Audio-Reactive Neon & Chevrons** | Unlit high-intensity neon (`mix(u_carEmissive, u_curbA, ...)`), multiplied by `1.0 + u_audioSpectrum.x * 0.85 + u_beatPulse * 0.45`. Used for `>>>` chevron arrows, `150m/100m/50m` gate bars, tunnel ribs, and building neon strips. |
| **`0.5`** | `5` | **Car Primary Body** | `u_carPrimary` + hard anime specular & rim light. |
| **`0.6`** | `6` | **Car Secondary Trim / Wing** | `u_carSecondary` + hard anime specular & rim light. |
| **`0.7`** | `7` | **Windshield Canopy** | *Auto Modellista* view-space matcap reflection streaks (`step(0.32, fract(R.x * 2.4 + R.y * 1.6))`). |
| **`0.8`** | `8` | **Tires & Chassis Black** | Dark charcoal (`[0.16, 0.15, 0.22]`). |

#### Automatic Sector Set-Pieces (`s0.zone`)
As the mesh builder iterates `i = 0..719`, it inspects `s0.zone` (`0..3`) and automatically populates sector architecture alongside the road:
* **`zone === 0` (Sector 1 — Emerald Coast Palms):** Spawns `11m` tall geometric Hiroshi Nagai palm trees on both sides of the road every `9` samples (`hw0 + 5.5m`).
* **`zone === 1` (Sector 2 — Boiler Room Bass Tunnel):** Spawns `11.5m` tall subterranean concrete arches (`zoneId 0.3`) topped by glowing sub-bass neon overhead roof beams (`zoneId 0.4`) every `5` samples.
* **`zone === 2` (Sector 3 — Bayshore Suspension Bridge):** Spawns `12m` support pylons every `8` samples and `28m` suspension bridge H-towers with overhead crossbeams every `32` samples.
* **`zone === 3` (Sector 4 — Shibuya Neon Hairpins):** Spawns `22m–40m` tall monolith skyscrapers (`zoneId 0.3`) with vertical neon billboard strips (`zoneId 0.4`) on their facades every `10` samples.
* **All Sectors — Trackside Boiler Room DJ Jumbotrons (`i % 48 === 0`):** Every `48` samples (15 screens per track), the builder constructs a `13m` tall overhead gantry frame and a double-sided `18.4m × 9.2m` LED screen quad added to `jumbotronMesh`. During rendering (`u_passMode = 2`), all 15 jumbotrons sample a single shared GPU texture (`this.djTexture`) updated live from `djController.canvas`, overlaid with a `128×64` LED pixel-grid mask and bass-triggered horizontal glitch waves.

---

## 3. Deep Dive: How Maps Work (Overworld Graph, Landmarks & Minimap)

The project features **three distinct map systems**:

### 3.1 The Regional Highway Overworld Map (`RRR.WORLD_MAP_GRAPH`)
Defined at the bottom of `prototype/js/track-spline.js` (and specified as `WorldMapGraphSO` in Unity 6), the overworld is a weighted graph connecting the player's **Home Base Garage** to **Highway Junctions** and **Rave Venues**:

* **Nodes (`RRR.WORLD_MAP_GRAPH.nodes`):**
  * `type`: `'HUB'` (Home Base), `'JUNCTION'` (Highway Interchange), or `'VENUE'` (Playable Track / Sector).
  * `coords`: `[x, y]` percentage coordinates (`0–100`), `dj` credit string, `startZone` (`0..3`), and description.
* **Edges (`RRR.WORLD_MAP_GRAPH.edges`):**
  * Connects `from` node ID to `to` node ID with a kilometer distance `weight` (e.g., `3.2` km) and a **`landmark` object** representing the physical landmark along that stretch of highway:
    ```javascript
    {
        from: 'jct_bayshore',
        to: 'venue_emerald_coast',
        weight: 4.5,
        landmark: {
            id: 'suspension_bridge',
            title: 'BAYSHORE SUSPENSION BRIDGE // SPAN 02',
            subtitle: 'APPROACHING EMERALD BAY — DJ KINETIX LIVE ON AIR',
            skyTop: '#14246b',
            skyHorizon: '#ff6e54',
            type: 'BRIDGE' // 'TURBINES' | 'BRIDGE' | 'TOLLBOOTH' | 'BOWLING_PIN'
        }
    }
    ```
* **Dijkstra Shortest-Path Route Solver (`solveRoute(startId, targetId)`):**
  * When a player picks a venue in the World Map (`M` key or `LAB 05`), `solveRoute()` runs Dijkstra's algorithm from `home_base` to the target `venue_*` node, returning the ordered array of `nodes`, traversed `landmarks`, and `totalKm`.

### 3.2 Diegetic Landmark "Drive-Over" Loading Screen (`main.js`)
* **Concept:** *"Loading screen is based off a landmark you would logically see on the drive over."*
* In `GameApp.startLandmarkDriveOver(venueNode, route)` and `updateLandmarkLoading(dt)`:
  1. The engine switches to `mode = 'LANDMARK_LOADING'` and activates `#landmark-loading-overlay`.
  2. The audio engine sets `isLoadingMuffled: true`, applying a low-pass filter to the venue's music so the Track DJ's bass sounds like it is booming from miles away across the bay and gradually opening up as you approach.
  3. As `progress` advances from `0.0` to `1.0`, the loading screen steps through every `landmark` along the solved Dijkstra path (`landmarks[activeIdx]`), rendering its custom `skyTop`/`skyHorizon` gradient, oversized sun, bay water, parallax silhouettes (`TURBINES`, `BRIDGE`, or neon towers), and the player's car cruising in its active Vibe palette.
  4. At `progress >= 1.0`, the game spawns the player and AI rivals directly into the venue's `startZone` on the 3D circuit.

### 3.3 The Live 2D Top-Down HUD Minimap (`main.js`)
* Rendered every frame inside `GameApp.renderDiagnosticsTelemetry()` onto the left `118×114` half of `#diag-compass-canvas`.
* **Zero Manual Minimap Art Required:** The minimap automatically reads `this.trackSpline.bounds` (`minX, maxX, minZ, maxZ`) and computes an isotropic scale factor:
  ```javascript
  const spanX = Math.max(100, b.maxX - b.minX);
  const spanZ = Math.max(100, b.maxZ - b.minZ);
  const scale = Math.min(92 / spanX, 92 / spanZ);
  const toMapX = (wx) => 59 - (wx - midX) * scale; // -X is East (Right)
  const toMapY = (wz) => 57 - (wz - midZ) * scale; // +Z is North (Up)
  ```
* Any new track preset added to `RRR.TRACK_PRESETS` automatically gets an accurately scaled top-down minimap with live AI rival dots (`#ff2a7a`) and the player's cyan position + heading vector (`#00f5d4`).

---

## 4. Deep Dive: How Skyboxes & Fluid Vibe Palettes Work

### 4.1 The Procedural Hiroshi Nagai Skybox Shader (`webgl-renderer.js`)
Unlike standard cubemap or equirectangular skyboxes, *Rave Racer Remix* renders a **procedural screen-space Hiroshi Nagai illustration skybox** (`skyVS` / `skyFS` in `prototype/js/webgl-renderer.js`) on a fullscreen quad (`gl_Position = vec4(a_pos, 0.999, 1.0)`) with depth testing disabled:

1. **Pitch-Tracking Horizon Line:**
   * `float horizonY = 0.44 - u_camPitch * 0.35;`
   * Tilts the horizon up and down dynamically as the car climbs steep grades or plunges down roller-coaster drops (`playerCar.forward[1]`).
2. **Quantized 10-Band Sky with 4×4 Ordered Bayer Dithering:**
   * Above `horizonY`, the vertical gradient `skyT` is passed through a `4×4` Bayer dithering matrix (`bayer4x4(gl_FragCoord.xy) * 0.032`) and quantized into **10 discrete color bands**:
     ```glsl
     float bandedT = floor((pow(skyT, 0.75) + dither) * 10.0) / 10.0;
     vec3 skyCol = mix(u_skyHorizon, u_skyTop, clamp(bandedT, 0.0, 1.0));
     ```
   * This recreates Hiroshi Nagai's signature airbrushed/screen-printed acrylic sky transitions without smooth digital gradients.
3. **Oversized Beat-Reactive Sliced Sun Disc:**
   * Scrolls horizontally with camera yaw (`sunX = fract(0.5 - u_camYaw / 6.28318)`).
   * Radius expands on every bass hit (`sunRadius = 0.135 + u_bassPulse * 0.015`).
   * Below `sliceY < -0.15`, horizontal retro cutout bars slice through the lower sun disc (`fract(sliceY * 9.0) < 0.28`).
4. **Two-Tone Parallax Painted Cumulus Clouds:**
   * Generated along the horizon band (`cloudY` between `0.02` and `0.20`) using a 3-octave sine/cosine wave (`cloudX = uv.x * 4.5 + u_camYaw * 0.7 + u_time * 0.01`).
   * Shaded strictly with **two flat tones**: a warm sunlit top rim (`cloudLit = mix(vec3(1.0, 0.98, 0.95), u_sunColor, 0.25)`) and a cool indigo/violet shadow base (`cloudShade = mix(u_skyHorizon, u_shadowCool, 0.45)`).
5. **Below-Horizon Turquoise Ocean Bay & Sun Shimmer:**
   * Below `horizonY`, renders an 8-band quantized ocean (`floor(seaT * 8.0) / 8.0`) blending from `seaShallow` turquoise at the horizon to `seaDeep` indigo in the foreground, topped with animated horizontal `u_sunColor` reflection bars directly underneath the sun's azimuth (`sunX`).

### 4.2 The "Vibe" Fluid Color Palette System (`prototype/js/vibe-palettes.js`)
The skybox, road, curbs, foliage, shadows, and cars **never use static colors**. Instead, `RRR.VibeController` drives 14 semantic color uniforms (`activeState`) that morph continuously:

* **4 Vibes × 4 Track Zones:** Each palette in `RRR.VIBE_PALETTES` (`pacific_sunset`, `acid_warehouse`, `midnight_shibuya`, `cyber_flamingo`) defines 4 `zones` (`0..3`), and each zone defines 14 RGB `[0..1]` triplets:
  * **Skybox & Lighting:** `skyTop`, `skyHorizon`, `sunColor`, `shadowCool`
  * **Track Surface & Scenery:** `roadLit`, `roadShadow`, `curbA`, `curbB`, `foliageLit`, `foliageShadow`
  * **Vehicle Channels:** `carPrimary`, `carSecondary`, `carTrim`, `carEmissive`
* **Zone Morphing (`update()`):** When the player's car crosses into a spline sample with a new `zone` index (`0..3`), `VibeController.setTrackZone(playerSample.zone)` smoothly interpolates all 14 colors from `currentZoneIndex` to `targetZoneIndex` (`zoneBlend += dt * 1.4`, ~0.7 seconds).
* **Audio & Emotion Modulation:**
  * `subBass` boosts `skyHorizon`, `curbA`, and `carEmissive` brightness in real time.
  * **Boiling State (`Rage > 75%`):** Pulls `carPrimary`, `carEmissive`, and `curbA` up to `35%` toward arterial crimson (`[1.0, 0.08, 0.18]`).
  * **Untouchable State (`Cockiness > 75%`):** Pulls `carSecondary`, `carTrim`, and `carEmissive` up to `30%` toward iridescent gold (`[1.0, 0.88, 0.22]`).
* **256×16 2D LUT Texture Generation:** `regenerateLUTCanvas()` renders a `256×16` 2D gradient canvas (`X = shadow → primary → secondary → trim → emissive`, `Y = 16 interpolated zone rows`) matching the Unity `VibePaletteSO` specification.

---

## 5. Step-by-Step Guide: Creating New Maps & Tracks in the WebGL2 Prototype

You can add a completely new playable track, custom 3D sector architecture, custom skybox/Vibe zone colors, and a World Map venue to the prototype in **4 steps**.

### Step 1: Define the Track Spline Preset in `prototype/js/track-spline.js`
Add a new key to `RRR.TRACK_PRESETS` (`prototype/js/track-spline.js`, around line 109):

```javascript
    shibuya_express: {
        id: 'shibuya_express',
        name: 'TRACK 05 // SHIBUYA MIDNIGHT EXPRESS LOOP',
        subtitle: 'Elevated Wangan C1 Highway + Spiral Ramp + Cyber Tunnel',
        desc: 'High-speed urban expressway with banked S-curves, a -18m subterranean acid tunnel, and tight tollbooth hairpins.',
        roadHalfWidth: 14.0,
        controlPoints: [
            // Start/Finish Straight along +Z (Keep X=0 on first 2 and last 1-2 points for zero start-line curvature!)
            { pos: [0, 0, 0],       bank: 0.00, halfWidth: 14.0, zone: 3 },
            { pos: [0, 0, 160],     bank: 0.00, halfWidth: 14.0, zone: 3 },
            // Sweeping Right Turn climbing onto the elevated bridge (+18m)
            { pos: [-80, 10, 310],  bank: 0.14, halfWidth: 15.5, zone: 2 },
            { pos: [-220, 18, 340], bank: 0.18, halfWidth: 16.0, zone: 2 },
            // Plunge into the Underground Acid Bass Tunnel (-12m)
            { pos: [-340, -12, 200], bank: -0.12, halfWidth: 15.0, zone: 1 },
            { pos: [-310, -12, 20],  bank: 0.15,  halfWidth: 16.5, zone: 1 },
            // Coastal Palm Hairpin returning to Start/Finish
            { pos: [-160, 0, -140], bank: 0.16, halfWidth: 17.0, zone: 0 },
            { pos: [-25, 0, -110],  bank: 0.06, halfWidth: 14.5, zone: 0 },
            { pos: [0, 0, -55],     bank: 0.00, halfWidth: 14.0, zone: 3 }
        ]
    }
```

#### Track Spline Authoring Rules:
1. **Closed Loop Continuity:** `TrackSpline` automatically wraps the last control point back to `controlPoints[0]`. Do **not** duplicate `[0, 0, 0]` as the final point (leave ~50m–120m between the last point and `[0, 0, 0]`).
2. **Start-Line Alignment:** Place point `0` at `[0, 0, 0]`, point `1` along `[0, y, +Z]` (e.g., `[0, 0, 140]`), and the final point along `[0, y, -Z]` (e.g., `[0, 0, -80]`). This ensures cars spawn facing straight ahead along `+Z` with zero initial curvature jump.
3. **Banking Sign Convention:**
   * **Right Turn ($\kappa > 0$):** Use **positive** `bank` (e.g., `+0.08` to `+0.28` rad).
   * **Left Turn ($\kappa < 0$):** Use **negative** `bank` (e.g., `-0.08` to `-0.22` rad).
4. **Road Half-Width Envelope:**
   * Standard straights: `12.0` to `14.5` (`24m–29m` total width).
   * Drift corners & hairpins: Widen to `15.5` to `17.2` (`31m–34.4m` total width) so players have room to kick out `33°+` R4 slip angles alongside 3 AI rivals.
   * Never set `halfWidth < 10.0` (the spline compiler clamps values below `10.0m`).
5. **Control Point Spacing:** Keep adjacent control points roughly `70m–180m` apart. Avoid placing two control points `< 25m` apart, which creates high curvature spikes ($\kappa$) that push cars toward the outer wall.

### Step 2: Add Custom 3D Trackside Architecture (Optional, in `webgl-renderer.js`)
Inside `WebGLRenderer.buildTrackAndJumbotronMeshes()` (`prototype/js/webgl-renderer.js`, lines 815–868), you can add custom procedural 3D set-pieces for specific sectors or track presets using `addPt(s0, lateralOffset, heightOffset)` and `this.pushBox(trackVerts, center, [width, height, depth], [lum, zoneId, spec, emissive])`:

```javascript
// Example: Overhead Neon Cyber-Gate every 12 samples in Zone 3
if (s0.zone === 3 && i % 12 === 0) {
    const archTop = addPt(s0, 0, 14.0);
    // Glowing audio-reactive neon crossbar (zoneId = 0.4, emissive = 1.0)
    this.pushBox(trackVerts, archTop, [hw0 * 2.2, 0.8, 0.8], [1.0, 0.4, 0.0, 1.0]);
}
```

### Step 3: Register the Track in the World Map & Dev Menu (`track-spline.js`, `main.js`, `index.html`)
1. **Add a World Map Venue Node & Highway Edge (`prototype/js/track-spline.js`):**
   * Add a node under `RRR.WORLD_MAP_GRAPH.nodes` (with `type: 'VENUE'`, `startZone`, `dj`, `coords`).
   * Add an edge under `RRR.WORLD_MAP_GRAPH.edges` connecting `jct_bayshore` (or another node) to your new venue ID, including a `landmark` object (`skyTop`, `skyHorizon`, `type: 'TURBINES' | 'BRIDGE' | 'TOLLBOOTH' | 'BOWLING_PIN'`).
   * Add the new venue ID to the `venues` array in `GameApp.buildWorldMapUI()` (`prototype/js/main.js`, line 1222).
2. **Add a Dev Menu Launcher Card (`prototype/index.html` & `prototype/js/main.js`):**
   * In `prototype/js/main.js` inside `launchDevMode(modeKey)` (line 195), map your new `data-launch-mode` key to your preset key (`shibuya_express`).
   * In `prototype/index.html` inside `#dev-start-menu` (line 35), add a `.dev-card` element with `data-launch-mode="track_shibuya"`.

---

## 6. Step-by-Step Guide: Creating Production Maps, Tracks & Skyboxes in Unity 6 (URP)

When building or porting tracks into the **Unity 6 (6000.x LTS) Universal Render Pipeline** project (`Rave Racer Remix - Systems & Unity Architecture.md`), follow this 5-stage pipeline:

### Stage 1: Greyboxing the Master Racing Spline (`UnityEngine.Splines`)
1. Install the official **`com.unity.splines`** package via Unity Package Manager.
2. Create an empty GameObject `Track_MasterSpline` with a `SplineContainer` component and set the spline to **Closed**.
3. Attach two custom `SplineData<float>` / `SplineData<float2>` data channels to the spline:
   * `RoadWidthData` (`float2`: X = Left Half-Width, Y = Right Half-Width; `12m–17m` each).
   * `RoadBankData` (`float`: Roll angle in degrees, `-16°` to `+16°`).
4. Run the **Spline-to-Road Greybox Mesh Generator** Editor script to extrude a collision mesh on the **`TrackSurface` layer** (used by the vehicle's 4-corner `Physics.RaycastNonAlloc` ground alignment rays) and kinematic barrier colliders on the **`TrackBarrier` layer**.

### Stage 2: Modeling Track Environments & Set-Pieces in Blender
1. **Aesthetic & Geometry Rules (Hiroshi Nagai × *Auto Modellista*):**
   * **Hard Geometric Normals:** Because the Nagai Toon Shader uses a razor-sharp stepped ramp (`smoothstep(0.0, 0.01, NdotL)`), model buildings, palm fronds, bridges, and barriers with **clean, flat-shaded geometric faces** (use **Auto Smooth / Split Normals** at `30°–45°` in Blender). Avoid noisy micro-bevels that break up crisp geometric shadow shapes.
   * **Silhouette Proportions:** Follow the Visual Bible's *"Bottom-Heavy, Wide & Angular"* rule—chunky concrete highway supports, oversized overhead signage, bold truss bridges, and sharp low-poly palm canopies.
2. **Vertex Color & RGBA Channel-Packed Mask Authoring:**
   * For **Inverted-Hull Ink Outlines**, paint **Vertex Color R** in Blender (`1.0` on outer structural silhouettes like bridge towers and barrier edges; `0.0` on flat road seams where outlines shouldn't extrude).
   * For **Vibe-Reactive Materials**, author textures as **Channel-Packed RGBA Masks** (export as **Uncompressed / Lossless 8-bit PNG** with **sRGB Disabled / Linear** in Unity):
     * **Red (`R`):** Base surface luminance / ambient occlusion weight (`0.0–1.0`).
     * **Green (`G`):** Material Zone ID (`0.0` = Road, `0.2` = Foliage, `0.3` = Concrete/Architecture, `0.4` = Audio-Reactive Neon).
     * **Blue (`B`):** Specular / Halftone ramp weight (`0.0–1.0`).
     * **Alpha (`A`):** Emissive / `SubBass` audio-reactive pulse mask (`0.0–1.0`).

### Stage 3: Setting Up Track Vibe Zones & The `256×16` Vibe LUT
1. **Authoring `VibePaletteSO` LUT Textures:**
   * Each Vibe uses a **`256×16` pixel PNG or EXR texture** (`RGBAHalf` or `RGBA32`, **Filter Mode: Bilinear**, **Wrap Mode: Clamp**, **sRGB: Checked**):
     * **X-Axis (`0–255`):** Material/Luminance ramp (`Shadow Cool` → `Primary` → `Secondary` → `Trim` → `Emissive`).
     * **Y-Axis (`0–15`):** 4 Track Zones × 4 sub-states per zone.
2. **Placing `TrackVibeZone` Colliders:**
   * Place BoxCollider triggers (`isTrigger = true`) across the road at sector transitions (e.g., entering the subterranean Acid Tunnel or exiting onto the Coastal Promenade).
   * Assign `zoneRowIndex` (`0..3`) on the `TrackVibeZone.cs` component so `VibeController` smoothly interpolates `_VibeRowBlend` and morphs the world, skybox, and car colors.

### Stage 4: Authoring the Hiroshi Nagai Skybox & Cloud Cards
1. **Procedural Banded Skybox Material (`NagaiSkybox.shader`):**
   * Assign the custom URP `NagaiSkybox` shader to `Window > Rendering > Lighting > Environment > Skybox Material`.
   * The shader automatically reads `_SkyTop`, `_SkyHorizon`, `_SunColor`, and `_ShadowCool` from the active `VibeController` and applies the 10-band quantization + 4×4 Bayer dithering matrix.
2. **2D Painted Cumulus Cloud Cards (Optional Distant Parallax):**
   * Paint crisp, flat two-tone cumulus cloud silhouettes in **Krita** or **Photoshop** (`2048×512` PNG with alpha transparency, using white `R=1` for sunlit cloud tops and grey `R=0.5` for cloud shadow bellies so the shader can tint them with `_SunColor` and `_ShadowCool`).
   * Place them on curved parallax cylinder planes around the distant horizon.

### Stage 5: Placing Trackside Boiler Room DJ Jumbotrons & World Map Landmarks
1. **Single-`RenderTexture` DJ Jumbotrons:**
   * Place the isolated `DJBoothStage` prefab once in the scene at `(0, -500, 0)` on the `DJStage` layer, captured by `DJBroadcastCamera` into `RT_DJBroadcast` (`1024×512`, `ARGB32`).
   * Place as many 3D Jumbotron frames, tunnel LED walls, or blimp screens along your track as desired—simply assign the shared `M_TracksideJumbotron` material to their screen quads. All 50+ screens cost **zero extra camera renders**.
2. **World Map Node & `LandmarkSO` Setup:**
   * Add a `WorldMapNode` entry to `WorldMapGraphSO` and link it to adjacent nodes via `RoadSegment` edges.
   * Create a `LandmarkSO` asset for the connecting highway edge referencing a lightweight 3D/2D diorama prefab (e.g., *Bayshore Suspension Bridge* or *Coastal Wind Turbines*) so `TravelLoadingManager.cs` can scroll it past the car during additive scene loading.

---

## 7. Complete Software Suite & File Format Reference

### 7.1 Recommended Software Stack

| Category | Software | License | Specific Role in Map & Track Creation |
| :--- | :--- | :--- | :--- |
| **Game Engine** | **Unity 6 (6000.x LTS)** + URP, `Splines`, `Cinemachine 3.x`, `VFX Graph` | Free (Personal) | Master Racing Spline authoring, URP RenderGraph `PaintSmudge` pass, `TrackVibeZone` setup, and scene assembly. |
| **3D Modeling & UV** | **Blender 4.x** | Free / Open Source | Modeling modular road segments, coastal buildings, bridges, tunnels, palm trees, vertex-color outline weights, and UV unwrapping. |
| **2D Art, Masks & Clouds** | **Krita** or **GIMP** (or Photoshop / Substance Painter) | Free / Open Source | Painting RGBA channel-packed material ID masks, `256×16` Vibe LUT gradients, 2D Nagai cumulus cloud sprites, and road decals. |
| **Audio & Beatgrid Analysis** | **FMOD Studio** / **Rekordbox** / **Waveform Free** / **Reaper** | Free / Indie | Authoring 5-stem track music (`Kick_SubBass`, `Percussion_Tops`, `Synths_Chords`, `Lead_Acid`, `FX_Risers`) and `.rekordbox.json` beatgrids. |
| **Rapid Prototyping Kits** | **Kenney Racing Kit / City Kit** & **Quaternius Tropical Pack** | CC0 (Public Domain) | Blocking out modular overpasses, grandstands, buildings, and Hiroshi Nagai coastal palm trees (links in `Rave Racer Remix - Resources & Links.md`). |

### 7.2 Proper File Formats & Technical Specifications

| Asset Type | Format | Resolution / Budget | Import & Encoding Rules |
| :--- | :--- | :--- | :--- |
| **Prototype Track Presets** | JavaScript Object (`RRR.TRACK_PRESETS` in `track-spline.js`) | `8–24` control points (compiled to `720` uniform samples) | Right-handed meters (`+Z` forward, `-X` right, `+Y` up); `halfWidth >= 10.0`; `zone` in `{0, 1, 2, 3}`. |
| **Unity 3D Track & Scenery Meshes** | **`.fbx`** or **`.glb` / `.gltf`** | Track Props: `200–2,500 tris`<br>Hero Landmarks: `3,000–8,000 tris` | Scale `1.0` (`1 unit = 1 meter`), Apply All Transforms in Blender, Export Tangents & Sharp Normals (`30°–45°` split), Vertex Color `R` = Outline thickness. |
| **Vibe 2D Palette LUTs** | **`.png`** (8-bit/16-bit) or **`.exr`** (`RGBAHalf`) | **`256 × 16` pixels** | **Filter Mode:** `Bilinear`<br>**Wrap Mode:** `Clamp`<br>**Compression:** `None (Uncompressed)` |
| **Channel-Packed Surface Masks** | **`.png`** or **`.tga`** (4-Channel RGBA) | `1024×1024` or `2048×2048` | **sRGB (Color Texture):** `OFF (Linear)`<br>`R`=Luminance, `G`=ZoneID, `B`=Specular, `A`=Emissive/Bass Mask. |
| **Skybox Cumulus Cloud Sprites** | **`.png`** (with Alpha) | `2048×512` or `1024×512` | Hard-edged 2-tone silhouette (no soft airbrush alpha gradients) so stepped cel-shader preserves crisp Nagai shapes. |
| **Track Music & DJ Beatgrids** | **`.wav` / `.ogg` / `.mp3`** + **`.rekordbox.json`** | `44.1 kHz` / `48 kHz` Stereo | Drop MP3/WAV into `prototype/tracks/` and register in `playlist.json`, or export 5 synchronized loop stems for FMOD/Unity. |

---

## 8. Golden Design Rules & Checklist for Every New Track

1. **Design for `316 KM/H` (`88 m/s`) Arcade Speeds:**
   * At top speed + Tier 3 Redline Overdrive (`~380+ KM/H`), the car covers **100 meters per second**. Make straightaways `300m–750m` long and give sweeping drift corners generous radii (`80m–180m`) with `15.5m–17.2m` half-widths so players can hold multi-second R4 drifts.
2. **Keep the Center Road Corridor Readability Clean (For Paint Smudge):**
   * The `PaintSmudge` and `Kuwahara` post-processing shaders (`webgl-renderer.js` lines 407–471) intentionally preserve a clear focal circle around the vanishing point (`peripheryMask = smoothstep(0.16, 0.68, radialDist)`) while heavily smearing the outer screen periphery.
   * **Rule:** Place high-contrast neon props, palm trees, building billboards, and Jumbotron pillars **along the lateral margins (`±(halfWidth + 2m..12m)`) and overhead (`+10m..28m`)**. They will streak into gorgeous *Redline*-style wet acrylic paint trails at the edges of the screen while keeping the driving line crystal clear.
3. **Contrast Every Track Across All 4 Vibe Sectors (`zone: 0..3`):**
   * A great *Rave Racer Remix* circuit is a visual and musical journey. Sequence your control points through distinct spatial moods—e.g., **Open Sunlit Coast (`zone 0`)** → **Enclosed Subterranean Acid Tunnel (`zone 1`)** → **Elevated Suspension Bridge (`zone 2`)** → **Dense Urban Neon Canyon (`zone 3`)**—so the player experiences dramatic skybox and Vibe LUT transitions every 15–25 seconds.
4. **Orient Set-Pieces to Catch the Directional Sun (`u_lightDir = [0.45, 0.82, -0.35]`):**
   * Because the Hiroshi Nagai shader uses a razor-sharp two-tone step (`NdotL > 0`), angle building facades, bridge towers, and tunnel ribs so roughly 50% of visible faces catch direct light (`baseLit`) and 50% fall into cool indigo shadow (`u_shadowCool`).
5. **Verify in the Built-In Developer Diagnostic Labs (`ESC`):**
   * After adding a track, test it in:
     * **Chase & Top-Down Camera (`V` key):** Check that `150m/100m/50m` turn-in gates and `>>>` neon chevrons spawn cleanly before every sharp corner.
     * **Left Telemetry Panel (`#diag-compass-canvas`):** Confirm the 2D top-down minimap auto-fits your loop and that `CURVATURE` transitions smoothly without sudden spikes.
     * **Shader Studio (`LAB 02` / `Z` key):** Cycle through all 4 Vibe Palettes (`1–4` keys) and all 4 Track Zones (`Z` key) while toggling `RAW 3D` vs `SMUDGE BUF` vs `FINAL` in the right-hand Tuning Drawer.


---

## 9. The Figma ↔ Blender ↔ Antigravity Track & Asset Pipeline

Combining **Figma** (for 2D vector layout, elevation/sector annotations, signage, and Vibe LUT design) with **Blender** (for 3D elevation, banking tilt, modular set-pieces, and Nagai split normals) gives you an industry-grade arcade track pipeline. Because Antigravity is connected to **Figma** and can execute **Blender Python scripts**, both tools can talk to each other through the agent.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ 1. FIGMA (2D Vector Schematic, Moodboard, Signage & Vibe Palettes)            │
│    • 1000×1000 px Frame (1 px = 1 meter scale, Center = [0,0,0])              │
│    • Closed Vector Loop (Pen Tool + Corner Radius for smooth clothoid turns)  │
│    • Node Callouts (Elevation Y, Bank°, HalfWidth, Sector Zone 0..3)          │
│    • Export .SVG + Paste Figma Frame Link to Antigravity                      │
└───────────────────┬───────────────────────────────────────┬───────────────────┘
                    │                                       │
         (Direct Figma URL / SVG)                   (Export .SVG / .PNG)
                    ▼                                       ▼
┌───────────────────────────────────────┐   ┌───────────────────────────────────┐
│ 2A. ANTIGRAVITY AUTOMATED BRIDGE      │   │ 2B. BLENDER 4.x (3D Track & Art)  │
│  • Reads Figma nodes & vector paths   │   │  • Import .SVG as 3D Curve        │
│  • Compiles RRR.TRACK_PRESETS spline  │   │  • Pull Z (Elevation) & Ctrl+T    │
│  • Extracts VibePalette RGB stops     │   │    (Banking Tilt) on curve knots  │
│  • Generates Blender Python (.py)     │   │  • Curve Bevel / Array Modifiers  │
│    script to build 3D meshes          │   │  • 30°–45° Split Normals + Export │
└───────────────────────────────────────┘   └───────────────────────────────────┘
```

### Phase 1: Setting Up Your Track Schematic in Figma

1. **Create a 1:1 Meter-Scale Frame:**
   * Press `F` in Figma and create a Frame sized **`1000 × 1000` px** (or `1200 × 1200` px) named `Track_Schematic_<Name>`.
   * Treat **`1 px = 1 meter`** in world space:
     * **Frame Center `(500, 500)`** = World Origin `[0, 0, 0]`.
     * **Up (`-Y` in Figma)** = World `+Z` (North / Start-Finish Forward Direction).
     * **Right (`+X` in Figma)** = World `-X` (East).
2. **Draw the Master Racing Line (`Track_Centerline`):**
   * Select the **Pen Tool (`P`)** and click out your track's control points as a closed polygon loop starting at `(500, 500)` and heading straight **Up** for the first segment (`150–300 px`).
   * Select the corner vertices and increase **Corner Radius** in the right sidebar (e.g., `40 px` for tight hairpins, `120–200 px` for sweeping high-speed drift arcs).
   * Set the **Stroke Width** to **`28 px`** (`halfWidth = 14m`) with `Center` stroke alignment and `50%` opacity so you can visually see the true physical width of the asphalt.
3. **Add Sector Color Overlay & Callout Pins:**
   * Create a layer group named `Annotations` and drop text labels next to key corners/straights using a consistent shorthand that Antigravity (or you in Blender) can read at a glance:
     * `Z0 | Y: 0m | Bank: 0° | W: 14m` (Start/Finish Straight)
     * `Z1 | Y: -12m | Bank: -10° | W: 16m | Acid Tunnel`
     * `Z2 | Y: +22m | Bank: +14° | W: 13.5m | Suspension Bridge`
     * `Z3 | Y: +4m | Bank: +18° | W: 17m | Shibuya Hairpin`
4. **Pin Reference Images & Palette Swatches Next to the Frame:**
   * Drop 2–4 reference images onto the same Figma page and create 4 rectangles named `Vibe_SkyTop`, `Vibe_SkyHorizon`, `Vibe_Road`, and `Vibe_Neon` sampled from your references.
5. **Design 2D Track Signage, Stickers & Cross-Sections (Optional):**
   * **Cross-Section Profile (`Profile_RoadCurb`):** Draw a flat 2D cross-section line (`28 px` wide road bed + `2 px` angled curbs on each side) to use as a Blender Curve Bevel object.
   * **Highway Signs & Jumbotron Overlays:** Design highway gantry signs, Japanese/English brutalist typography (`BASS NATION // 140 BPM`), and road decals as components for instant `.png` texture atlas export.

---

### Phase 2: Moving from Figma into Blender (Manual & Automated Paths)

#### Path A: The Automated Antigravity Bridge (Fastest)
1. Copy the **Figma link** to your `Track_Schematic_<Name>` frame (`Right-Click Frame > Copy/Paste as > Copy link to selection`) and export `Track_Centerline` as **`track_centerline.svg`**.
2. Send the Figma link (or `.svg` file) to Antigravity in chat.
3. Antigravity will:
   * Inspect your Figma frame via the Figma MCP tools (reading your annotations, sector zones, and reference palette swatches).
   * Convert the `.svg` Bézier path into 3D control points in [`RRR.TRACK_PRESETS`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/track-spline.js#L14-L110) so you can immediately drive the track in the WebGL2 prototype.
   * Generate and run a **Blender Python script (`build_track_blender.py`)** that constructs the 3D banked curve, extrudes the road mesh, places sector set-pieces, and exports `.fbx` / `.glb`.

#### Path B: The Direct Figma `.SVG` → Blender 3D Curve Workflow
If you are sculpting the 3D track environment hands-on in Blender:

1. **Export Clean `.SVG` from Figma:**
   * Select only the `Track_Centerline` vector layer (and optionally `Profile_RoadCurb`).
   * Before exporting, set Stroke Width to `1 px` (Center) so Figma exports a single clean centerline path rather than an outlined stroke shape.
   * Click **`Export > SVG`** in the bottom-right sidebar.
2. **Import `.SVG` into Blender 4.x:**
   * In Blender, go to **`File > Import > Scalable Vector Graphics (.svg)`**.
   * The imported curve will appear on the `XY` ground plane.
   * Select the curve, press `S` and scale it so `1 Blender Unit = 1 Meter` (or set dimensions in the `N` Item sidebar to match your `1000m` frame size), then press **`Ctrl + A > All Transforms`** and **`Right-Click > Set Origin > Origin to Geometry`**.
3. **Convert to a 3D Curve & Add Elevation + Banking:**
   * Select the curve and open **`Object Data Properties` (Green Curve Icon)** in the right properties panel.
   * Under **Shape**, change button from **`2D` → `3D`** (critical—`2D` curves lock Z-elevation and banking!).
   * Press **`Tab`** to enter **Edit Mode**:
     * **Elevation (`Z` in Blender / `Y` in Unity/WebGL):** Select control points and press **`G` then `Z`** (with Proportional Editing `O` enabled) to raise bridges (`+20m`) or sink underground tunnels (`-12m`).
     * **Track Banking (`Tilt`):** Select corner control points and press **`Ctrl + T`** (or adjust `Mean Tilt` in the `N` sidebar) to roll the road surface into the turn (`+8°` to `+18°`).
     * **Dynamic Road Width (`Radius`):** Press **`Alt + S`** on hairpin apex control points to widen the road envelope (`Radius = 1.15–1.25`).
4. **Extrude the Road & Array Trackside Set-Pieces:**
   * **Road Surface:** In Curve Properties under **Geometry > Bevel**, switch to **Object** and pick your imported `Profile_RoadCurb` curve (check **Fill Caps** if needed). The entire 3D banked road and rumble curbs will extrude cleanly along your Figma path.
   * **Guardrails, Tunnel Arches & Palm Trees:** Model a single modular segment (`4m` guardrail, tunnel rib, or palm tree) and add two modifiers:
     1. **`Array` Modifier:** Set `Fit Type` to **`Fit Curve`** and select `Track_Centerline`.
     2. **`Curve` Modifier:** Select `Track_Centerline` (`Deform Axis: X` or `Y`).
5. **Apply Hiroshi Nagai Normals & *Auto Modellista* Vertex Colors:**
   * Convert the finished road/props to meshes (**`Right-Click > Convert To > Mesh`**).
   * Add a **`Weighted Normal`** or **`Smooth by Angle` (`35°`)** modifier so shadows step cleanly across flat geometric faces.
   * Switch to **Vertex Paint Mode** and paint **Red (`R = 1.0`)** on outer silhouettes where inverted-hull ink outlines should extrude, and **Black (`R = 0.0`)** on flat road seams.
   * Export via **`File > Export > FBX (.fbx)`** (`Scale: 1.0`, `Apply Transform: Checked`).

---

## 10. Standard Map & Track Building Rules for Constant Perceived Speed

In spline-based arcade racers, a car's **perceived and physical speed** can warp dramatically inside turns if the spline geometry, curvilinear physics, or UV parameterization violate differential geometry limits. All maps in *Rave Racer Remix* must obey the following **7 Standard Rules** (codified in [`RRR.MAP_SPEED_STANDARDS`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/track-spline.js#L14-L32)):

### Rule 1: Minimum Centerline Turn Radius ($R_{\min} \ge 3.6 \times W_{\text{half}} \ge 54\text{m}$)
* **The Math:** On a road of half-width $W_{\text{half}}$ with centerline curvature $\kappa = 1/R$, the outer road edge has length $(1 + \kappa W_{\text{half}})\,\Delta s$ and the inner curb has length $(1 - \kappa W_{\text{half}})\,\Delta s$. If $R$ approaches $W_{\text{half}}$ (e.g., $R < 30\text{m}$ on a $15\text{m}$ half-width road), the outer lane is $>2\times$ longer than the inner lane, and at $R \le W_{\text{half}}$ the inner curb folds backward over itself (creating a geometric cusp).
* **The Rule:** Never design a turn with a centerline radius smaller than **$54\text{m}$** ($R_{\min} \ge 3.6 \times W_{\text{half}}$, or $|\kappa|_{\max} \le 0.0185\,\text{rad/m}$). In Figma (`1 px = 1m`), never use a Corner Radius smaller than `55 px`.
* **Engine Guardrail:** [`TrackSpline.buildSplineTable`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/track-spline.js#L430-L465) runs an automatic 28-iteration **Minimum Turn Radius Relaxation Pass** to expand any curve tighter than $54\text{m}$.

### Rule 2: Multi-Node Corner Arcs (Max Deflection $\Delta\theta \le 48^\circ$ per Control Point)
* **The Problem:** In Catmull-Rom splines, a $180^\circ$ U-turn built from only 3 points (entry, single apex, exit) has a $90^\circ$ chord deflection that concentrates curvature at the middle node and pinches the effective radius down to $\sim 0.35 R$.
* **The Rule:**
  * Every **$90^\circ$ corner** must use at least **2 intermediate control points** ($\le 45^\circ$ chord deflection per node).
  * Every **$180^\circ$ hairpin / turnaround** must use at least **4 control points** spaced at $\sim 45^\circ\text{–}60^\circ$ intervals around a diameter $\ge 120\text{m}$ ($R \ge 60\text{m}$).
  * Never place a V-shaped reversal ($>90^\circ$ angle between consecutive chords) in the control polygon.

### Rule 3: Chord-Length Spacing Envelope ($80\text{m} \le \Delta L \le 220\text{m}$) & Centripetal Parameterization
* **The Problem:** Placing a very short control-point chord ($<55\text{m}$) immediately after a long straightaway chord ($>250\text{m}$) causes standard splines to overshoot the corner entry and pinch curvature.
* **The Rule:** Keep control-point chord lengths between **$80\text{m}$ and $220\text{m}$** (subdivide long straights into $\sim 150\text{m}$ segments), and always evaluate splines with **Centripetal Catmull-Rom ($\alpha = 0.5$)** ([`TrackSpline.centripetalCatmullRomSegment`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/track-spline.js#L286-L327)).

### Rule 4: Post-Smoothing 3D Arc-Length Re-Equalization & Constant Sample Density ($\Delta s = 2.50\text{m}$)
* **The Problem:** Any corner-smoothing or relaxation filter pulls corner vertices inward, shortening the physical distance $\Delta s$ between samples inside turns compared to straights. If `splineT` advances uniformly by sample index, the car physically slows down inside every smoothed corner.
* **The Rule:**
  * Sample count `numSamples` must scale proportionally to total circuit length ($\text{numSamples} = \text{round}(L / 2.50)$) so every track in the game has a fixed **$2.50\text{m}$ physical sample step**.
  * After any corner-relaxation pass, the spline compiler **must recompute cumulative 3D arc length and resample a second time** ([`TrackSpline.buildSplineTable`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/track-spline.js#L467-L515)) so $\Delta s = 2.500\text{m}$ is strictly invariant through every corner and straightaway.

### Rule 5: Road Width Continuity Across Corners ($\Delta W_{\text{half}} \le \pm 0.6\text{m}$)
* **The Problem:** Human peripheral speed perception (optical flow angular velocity $\dot{\theta} \approx v / W_{\text{half}}$) is inversely proportional to the distance from the camera to the road edges and lane stripes. Widening `halfWidth` from `12.5m` on straights to `17.2m` in corners (+38%) causes a 28% drop in peripheral optical flow the moment the car enters a turn.
* **The Rule:** Keep `halfWidth` within a tight **$\pm 0.6\text{m}$ envelope** around the circuit's nominal width (e.g., `14.4m–15.2m`).

### Rule 6: Frenet-Serret Curvilinear Metric Compensation in Vehicle Physics
* **The Math:** At lateral offset $n$ (`lateralOffset`) from a centerline of signed curvature $\kappa$ (`curvatureRadPerMeter`), the differential 3D world-space arc length is $ds_{\text{world}} = (1 - \kappa \cdot n)\,ds_{\text{centerline}}$. Without compensating for $h_s = 1 - \kappa \cdot n$, a car on the outside of a turn moves at $(1 + |\kappa n|)\,v$ (speeding up in 3D world space), while a car on the inside apex moves at $(1 - |\kappa n|)\,v$ (slowing down in 3D world space).
* **The Rule:** [`ArcadeVehicle.update`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/vehicle-physics.js#L550-L558) divides centerline advancement `ds` by `metricScale = clamp(1.0 - curvatureRadPerM * lateralOffset, 0.74, 1.28)` and preserves longitudinal cornering speed (`speed * Math.cos(headingOffset * 0.35)`), keeping 3D world speed locked within $\pm 2\%$ across inner, center, and outer racing lines.

### Rule 7: True Physical-Meter Road & Edge-Integrated Curb UVs
* **The Problem:** Driving road `v_uv.y` or roadside speed bollards from array index `i` (`i * 0.25`) stretches dashes on long tracks and compresses them on short tracks, while using centerline distance for left/right curbs squashes inner-apex curb checks and stretches outer-wall curb checks.
* **The Rule:** [`WebGLRenderer.buildTrackAndJumbotronMeshes`](file:///c:/Users/jacks/dev/Rave Racer Remix/prototype/js/webgl-renderer.js#L1214-L1308) parameterizes road asphalt UVs by **true centerline meters** (`s0.distance / 10.0`), integrates **separate cumulative 3D edge lengths (`cumDistL / 4.0`, `cumDistR / 4.0`)** for left and right curbs so every curb stripe is strictly $2.0\text{m}$ long on both the inside and outside of turns, and spaces roadside speed bollards at exact **$10.0\text{m}$ physical intervals**.

