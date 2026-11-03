# Rave Racer Remix (`BUILD 0.3`)

> *"Unyielding Aesthetic First — A Racing Game Built to Be Felt."*  
> **Inspirations:** *Ridge Racer Type 4* × *Auto Modellista* × *Jet Set Radio* × *Redline* × **Hiroshi Nagai** × **Boiler Room / Pioneer rekordbox 7**

**Rave Racer Remix** is an arcade street-rave racing project built around the **Triad Coupling Loop (`Motion ↔ Color ↔ Music`)**. Every system—curvilinear R4 drift physics, 12-zone fluid vehicle color shifting, Hiroshi Nagai stepped cel-shading, *Redline* high-speed paint-smudge post-processing, 2D spring-physics anime driver portrait boxes, and a dual-deck **Pioneer rekordbox 7 / CDJ-3000 AI DJ ("KINETIX")**—reacts to and drives every other system in real time.

---

## Quick Start (Playable WebGL2 Prototype)

Open [`prototype/index.html`](prototype/index.html) via any local static HTTP server (so WebGL2 textures and local `/Music` audio files can be fetched via `fetch()`):

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080/prototype/` in Chrome, Edge, or Firefox.

### Core Controls
| Input | Action |
| :--- | :--- |
| **`W` / `S`** or **`▲` / `▼`** | Throttle / Brake & Reverse (Hold `W` during 3-2-1-GO for **R4 Boost-Start** at `6,500–8,400 RPM`) |
| **`A` / `D`** or **`◀` / `▶`** | Steer Left / Right (or Counter-Steer during R4 Drift) |
| **`SPACE` / `SHIFT`** | Initiate R4 Drift (Also supports Brake+Throttle overlap or *Ridge Racer* On-Off-On throttle flick) |
| **`ESC`** / **`G`** | Toggle Main Menu & 3D Garage Customizer |
| **`K`** | Toggle Pioneer rekordbox 7 / CDJ-3000 & DJM-A9 Dual-Deck AI DJ Studio |
| **`M`** | Open Regional Highway Overworld Map (Dijkstra Route Solver & Landmark Drive-Over Loader) |
| **`V`** / **`R`** / **`P`** | Cycle Camera Mode / Reset Car / Toggle AI Autopilot Cruise |
| **`C`** / **`B`** / **`Z`** | Trigger Demo Car-to-Car Box Slam / Manual Smudge Boost / Cycle Track Vibe Zone |
| **`1` – `8`** | Live-Switch Active 2D Vibe LUT Palette |

---

## Repository Structure

```text
Rave Racer Remix/
├── prototype/                              # Zero-dependency HTML5 + WebGL2 + Web Audio playable prototype
│   ├── index.html                          # Main Menu, 3D Garage Customizer, HUD, Race Modals & Rekordbox Studio UI
│   ├── css/style.css                       # Skewed arcade UI, 2D character box animations & Rekordbox deck styling
│   ├── js/
│   │   ├── main.js                         # GameApp director, Grand Prix race loop, countdown, telemetry & inputs
│   │   ├── vehicle-physics.js              # 2.5D Frenet-Serret curvilinear physics, 6-speed gearbox, R4 drift & combat
│   │   ├── track-spline.js                 # Centripetal Catmull-Rom spline builder (7 circuits) & Dijkstra World Map
│   │   ├── vehicle-roster.js               # 6 JDM/street archetypes, 12 concept builds & procedural 3D mesh builder
│   │   ├── vibe-palettes.js                # 8 Vibe LUT palettes × 4 track zones & 9-zone fluid car color morphing
│   │   ├── webgl-renderer.js               # 3-pass WebGL2 pipeline (Nagai Sky/Cel/Outlines → Paint Smudge → Ink/Speedlines)
│   │   ├── audio-engine.js                 # 5-stem procedural rave synth, 256-pt FFT analyzer & procedural vehicle SFX
│   │   ├── rekordbox-dj.js                 # Pioneer rekordbox 7 analyzer, PLL beat-sync, 3-stem EQ & AI DJ Kinetix
│   │   ├── rekordbox-library-data.js       # Pre-analyzed beatgrids, phrases, Camelot keys & RGB waveforms for 121 tracks
│   │   ├── dj-jumbotron.js                 # 512×256 Boiler Room DJ broadcast canvas streamed to 3D trackside jumbotrons
│   │   └── expression-hud.js               # Hooke's Law 2D spring character boxes, hitstop, border shatter & banter
│   └── tracks/README.md                    # Documentation for loading custom MP3/WAV folders into Rekordbox decks
├── Assets/_RaveRacer/                      # Target Unity 6 (6000.x LTS) URP C# scripts, shaders, LUTs & 3D .fbx models
├── Tools/                                  # Standalone Python & Blender procedural 3D .fbx car/livery/LUT generators
├── Concept Art/                            # 11 production concept art plates & technical blueprints
└── Reference Images/                       # Curated aesthetic, JDM vehicle & Dreamcast character reference library
```

---

## Architecture & Design Specifications

1. **[Rave Racer Remix — Systems & Unity Architecture](Rave%20Racer%20Remix%20-%20Systems%20%26%20Unity%20Architecture.md)** — Complete 22-subsystem specification across all 7 pillars (Motion, Color, Music, Expression, Track/AI, Overworld, VFX/Replay).
2. **[Rave Racer Remix — Map & Track Creation Guide](Rave%20Racer%20Remix%20-%20Map%20%26%20Track%20Creation%20Guide.md)** — Deep dive into Centripetal Catmull-Rom track splines, Clothoid curvature filtering, material zone IDs, and quantized Hiroshi Nagai skyboxes.
3. **[Rave Racer Remix — Low-Poly Vehicle Modeling Plan](Rave%20Racer%20Remix%20-%20Low-Poly%20Vehicle%20Modeling%20Plan.md)** — 6 vehicle archetypes, modular kitbash sockets, vertex-color outline weights, and 12-zone fluid color shader architecture.
4. **[Rave Racer Remix — DJ Study & AI Rekordbox Proposal](Rave%20Racer%20Remix%20-%20DJ%20Study%20%26%20AI%20Rekordbox%20Proposal.md)** — The 7 pillars of club DJing, reverse-timed drop alignment, Camelot wheel harmonic mixing, and AI DJ Kinetix specification.
5. **[Rave Racer Remix — Visual Identity & Concept Art Bible](Rave%20Racer%20Remix%20-%20Visual%20Identity%20%26%20Concept%20Art%20Bible.md)** — Concept art index, silhouette rules, and master `VibePaletteSO` color tables.
6. **[Rave Racer Remix — Resources & Links](Rave%20Racer%20Remix%20-%20Resources%20%26%20Links.md)** — Directory of free Unity packages, authoring tools, CC0 3D/2D assets, and audio libraries.
7. **[Original Concept Note (`Rave Racer Remix Idea.txt`)](Rave%20Racer%20Remix%20Idea.txt)** — Initial creative vision note.
