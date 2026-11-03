# Rave Racer Remix — Low-Poly Vehicle Modeling & Production Plan

> **Target Engine & Pipeline:** Blender 4.x / Standalone Python `.FBX` Exporter → Unity 6 (URP)  
> **Visual Target:** *Auto Modellista* × *Jet Set Radio* × *Nam_Mac* × *Pixel_Tempys* × *Ridge Racer Type 4*  
> **Polycount Budget:** `2,500 – 4,000 Triangles` per fully kitted vehicle  
> **Reference Concept Sheets:** `Concept Art/02_Vehicle_Lineup_JDM_Rave_Liveries.jpg`, `Concept Art/09_Low_Poly_Vehicle_Wireframe_and_Mask_Blueprint.jpg`, `Concept Art/10_Expanded_Car_Customization_and_Fluid_Color_System.jpg` & `Concept Art/11_JSR_NamMac_PixelTempys_Visual_Identity.jpg`

---

## 1. Prefab Hierarchy & Pivot Specification (Unity Physics Compatibility)

Per `Rave Racer Remix - Systems & Unity Architecture.md` (**Pillar 1.1: Custom Sphere-Rigidbody + 4-Raycast Suspension**), vehicles do **not** use standard Unity `WheelCollider` rigs. Instead, every exported `.fbx` must follow a strict transform hierarchy and pivot convention so the C# controller can independently pitch/roll the chassis, steer/spin the wheels, and emit drift VFX:

* `CarRoot` `(0, 0, 0 Ground Center)`
  * `VisualChassis` `(Pitch, Roll & Drift Yaw)`
    * `Chassis_Body` `(Main Widebody Shell, Windows, Interior Silhouette)`
    * `Wheels_Group`
      * `Wheel_FL` `(Pivot: Exact Axle Center, +Z Forward)`
      * `Wheel_FR` `(Pivot: Exact Axle Center, +Z Forward)`
      * `Wheel_RL` `(Pivot: Exact Axle Center, +Z Forward)`
      * `Wheel_RR` `(Pivot: Exact Axle Center, +Z Forward)`
    * `Mod_Sockets` `(Modular Kitbash Attachments)`
      * `Socket_Wing` `(Rear Spoiler / GT Wing)`
      * `Socket_Roof` `(Roof Cargo Box / Yakima Rack)`
      * `Socket_FrontCooler` `(Exposed FMIC / External Oil Cooler)`
      * `Socket_Headlights` `(PopUp_L / PopUp_R Hinge Pivots)`
      * `Socket_Exhaust` `(Dual / Quad Exhaust Tips)`
    * `VFX_Anchors` `(Empty Transforms)`
      * `Trail_Taillight_L / R` `(Speed Ribbon Emitters)`
      * `Smoke_Contact_RL / RR` `(Toon Tire Smoke Emitters)`

### Mandatory Pivot & Scale Rules in Blender
1. **Unit Scale & Forward Axis:** Metric (`1.0 unit = 1.0 meter`). In Blender, model with `-Y` as forward and `+Z` as up; export to Unity `.fbx` with `Apply Transform` enabled (`+Z` forward, `+Y` up in Unity).
2. **`CarRoot` & `VisualChassis` Origin:** Placed at `(0, 0, 0)` on the **ground plane** midway between the front and rear axles.
3. **Wheel Pivots (`Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR`):** Each wheel's local origin MUST sit at the exact geometric center of the rim/tire cylinder so `transform.localRotation = Quaternion.Euler(spinAngle, steerAngle, camberAngle)` rotates without wobble.
4. **Articulated Sub-Meshes:**
   * **Pop-Up Headlights (`PopUp_L / R`):** Origin placed along the rear hinge edge of the headlight cover so a simple local X-rotation (`0°` closed → `20°` "sleepy eye" → `45°` fully open) works procedurally.
   * **Mudflaps (`Mudflap_FL / FR / RL / RR`):** Origin at top mounting bracket inside the wheel well for subtle speed-driven flutter.

---

## 2. Polygon Budget & Cel-Shading Topology Rules

### 2.1 Triangle Allocation Table (`2,500 – 4,000 Tris Total`)

| Sub-Mesh Component | Triangle Budget | Modeling & Detail Guidelines |
| :--- | :--- | :--- |
| **`Chassis_Body` (Shell + Flares)** | `1,500 – 2,200 tris` | Bevel major body lines (fender arches, hood scoop, bumper ducts) with 1-segment hard chamfers. Keep doors, roof, and glass planar. |
| **`Interior_Silhouette` (Low-Poly)** | `150 – 250 tris` | Simple dark-tinted bucket seats, roll-cage bars (6-sided cylinders), and steering wheel top rim visible through the windshield. |
| **`Wheels` (×4 Total)** | `800 – 1,200 tris` (`200–300` each) | `16-sided` outer tire cylinder (enough to read as round inside a thick black outline without wasting tris). Chamfered tire shoulder to show wide "meaty" or "stretched" sidewall fitment. |
| **`Mod_Sockets` (Wing, Roof Box, FMIC)** | `250 – 500 tris` | Crisp planar wings, 12-tri exposed intercooler core with 8-sided intake pipes, boxy roof cargo pod. |
| **Total Vehicle Prefab** | **`2,700 – 4,150 tris`** | Zero LODs required at this budget—all 8 cars on track total `< 32,000 tris`. |

### 2.2 Normal & Crease Engineering for Stepped Cel-Shading
1. **Planar Faces + Weighted Normals:** Add a **Weighted Normal** modifier in Blender (`Weight: 50`, `Keep Sharp` enabled) so large flat surfaces (hood, roof, doors, widebody box flares) have uniform surface normals. When light hits the hood or fender flare, the entire plane snaps cleanly between light and shadow like a Hiroshi Nagai acrylic painting.
2. **Hard Creases (`Mark Sharp`):** Mark hard edges (`35°–45°` threshold) along overfender bolt-on seams, box-flare ridges, hood scoops, front splitters, and window pillars.
3. **Preventing Inverted-Hull Outline Gaps at Hard Edges:**
   * Bake **averaged, fully smoothed vertex normals into `UV3` (`TEXCOORD2`) or the Vertex Tangent channel**. The cel-lighting pass uses the crisp hard Mesh Normals, while the Inverted-Hull Outline pass extrudes along the gap-free smoothed normals.

---

## 3. Archetype-by-Archetype Modeling Specifications

Each of the three vehicles from `Concept Art/02_Vehicle_Lineup_JDM_Rave_Liveries.jpg` has exaggerated arcade proportions (**+12% width**, **-8% roof height**, **+15% wheel diameter** compared to stock real-world blueprints) to match the bottom-heavy *Jet Set Radio* character silhouettes.

### Archetype 01: `POCKET ROCKET` (Widebody Hot Hatchback)
* **Inspirations:** Toyota GR Yaris (`Cars/04`), Mazda 323 GTX (`Cars/12`), Hyundai RN30 (`Cars/08`), Mazda3 Roof-Box build (`Cars/10`).
* **Proportion Footprint:** `Length: 3.95m` | `Width: 1.98m` (ultra-wide rear haunches) | `Height: 1.38m`.
* **Key Geometric Features:**
  * **Box-Flared Fender Channels:** Front and rear fenders step outward by `18cm` per side with recessed vertical aero louvers behind the front wheels.
  * **Asymmetric Wheel Setup:** Front **Rotiform-style Turbofan Aerodisc** (`180 tris`) + Rear deep-dish 5-spoke concave racing rims (`240 tris`).
  * **Roof & Rear Aero:** Modular **Thule-style aerodynamic roof cargo box** mounted on dual crossbars + a two-tier rally hatch wing extending from the C-pillar.

### Archetype 02: `GRAVEL RAVERS` (90s Tarmac/Gravel Rally Coupe)
* **Inspirations:** 1st-Gen Subaru Impreza GC8 2-Door Coupe (`Cars/01`, `05`) & GD WRX STI Livery Sheet (`Cars/03`).
* **Proportion Footprint:** `Length: 4.30m` | `Width: 1.92m` | `Height: 1.36m`.
* **Key Geometric Features:**
  * **Cutout Front Bumper & Exposed FMIC:** Center bumper beam is cut away to reveal a boxy **Front-Mount Intercooler** mesh with angled end-tanks and dual intake pipes wrapping into the fenders, flanked by large round rally fog lights (`12-sided` cylinders).
  * **Hood & Roof Details:** Prominent center hood scoop + twin slatted hood vents + roof ventilation flap.
  * **Rally Stance & Mudflaps:** Slightly higher suspension travel clearance (`+4cm` vs. drift car), meaty square-shoulder tires on 6-spoke bronze rims, and planar **rally mudflaps** hanging behind all 4 wheels.

### Archetype 03: `SHAKOTAN CYBER` (Slammed Drift / Kaido Liftback)
* **Inspirations:** Nissan 180SX / Silvia S13 (`Cars/14`, `16`, `17`), Naoki Nakamura "Team Pink Style" PS13 (`Cars/04_818529301077179231`), Toyota Chaser JZX100 (`Cars/13`).
* **Proportion Footprint:** `Length: 4.45m` | `Width: 1.96m` | `Height: 1.26m` (lowest roofline).
* **Key Geometric Features:**
  * **Sleepy-Eye Pop-Up Headlights & External Oil Cooler:** Articulated pop-up headlight pods half-open at `22°`, plus an external **Kaido Racer-style front-mounted oil cooler** with two looped hose tubes entering the lower grille.
  * **BN Sports / Works Widebody Kit:** Flared lower side skirts and front/rear bumper lips that flare outward at the bottom edge.
  * **Oni-Kyan (Demon Camber) & Asymmetric Drift Wheel Fitment:** Supports mismatched front and rear wheel models/colors (e.g., Fluorescent Chartreuse 6-spoke front rim + Hot Pink rear rim per `Cars/04_818529301077179231`) tilted at `-6°` front / `-4°` rear camber.

### Archetype 04: `HARIGAYA CHASER / E36 SEDAN` (4-Door VIP & Pro-Am Drift Taxi)
* **Inspirations:** Purple/Orange Flame Toyota Chaser JZX100 (`Cars/01_818529301077179236_Fire_stuff`) & Donut Yellow/Black Nose-Flame BMW E36 4-Door Drift Sedan (`Cars/07_818529301077179226`).
* **Proportion Footprint:** `Length: 4.68m` | `Width: 1.96m` | `Height: 1.34m`.
* **Key Geometric Features:**
  * **Long-Wheelbase 4-Door Greenhouse & B-Pillar Framing:** Distinct 4-door sedan pillar geometry with rear window sticker-stack UV space and wide VIP rear quarter arches.
  * **Deep BN-Sports Front Drift Lip & Rear Diffuser Strakes:** Low-hanging front aero bumper with exposed FMIC cutout and modular rear underbody diffuser fins (`Diffuser_01_TimeAttack_Strakes`).
  * **Work VS-KF 5-Spoke Chrome Deep-Dish Rims (`Wheel_04_Chrome_VSKF_5Spoke`):** Stepped chrome dish lips with high metallic specular weight (`_WheelLipMetallic = 0.90`).

### Archetype 05: `SAVANNA FC3S / TEKKAMEN R30` (80s Wedge Rotary & Iron-Mask Box Coupe)
* **Inspirations:** AUTOart Nissan Skyline RS-Turbo R30 Panda Two-Tone (`Cars/05_818529301077179230_AUTOart`) & Mazda RX-7 FC3S Savanna `#39` Racing Stripe (`Cars/08_818529301077179225`).
* **Proportion Footprint:** `Length: 4.28m` | `Width: 1.92m` | `Height: 1.28m`.
* **Key Geometric Features:**
  * **Asymmetric "Wink" Pop-Up Headlights (`PopUp_L` / `PopUp_R`):** Independently articulated left and right pop-up pods allowing one headlight open at `42°` while the opposite remains flush at `0°` (`Cars/08` FC3S signature look), or swapped for the R30 "Tekkamen" narrow slit front clip with triple lower bumper ducts (`Cars/05`).
  * **Offset Rotary Hood Scoop & Horizontal Panda Beltline Molding:** Asymmetric Turbo II hood intake scoop (`Mod_OffsetRotaryHoodScoop`) and a crisp horizontal body rub-strip crease that divides upper and lower two-tone paint (`Livery_08_Tekkamen_PandaTwoTone`).
  * **8-Spoke Retro Watanabe Banana Rims (`Wheel_05_Watanabe_8Spoke_Retro`):** Deep machined silver outer lip paired with gunmetal or matte-black 8-spoke centers.

### Archetype 06: `TOUGE SPIDER-EYE / SILHOUETTE GT` (DC2 Integra & LBWK Widebody Exotic)
* **Inspirations:** Burgundy Honda Integra Type R DC2 Touge Build (`Cars/09_818529301077179223_Honda_Integra`), Liberty Walk "LBWK KIDS" Pink-Doodle Widebody Miura (`Cars/06_818529301077179229`), and Ultraviolet Acid-Tribal Drift Coupe (`Cars/02_818529301077179234`).
* **Proportion Footprint:** `Length: 4.36m` | `Width: 2.02m` | `Height: 1.25m`.
* **Key Geometric Features:**
  * **Quad Round "Spider-Eye" Recessed Headlights (`Mod_SpiderEye_QuadHeadlights`):** Four circular recessed touge projector pods supporting custom **90s Amber/Yellow lens tinting** (`_HeadlightTintColor`).
  * **LBWK Dive-Plane Front Canards & High-Mount Aluminum GT Wing:** Aggressive front splitter with twin side dive-planes (`Bumper_01_LBWK_CanardSplitter`) and a towering aluminum-stanchion time-attack wing (`Wing_04_HighMount_AluGT`).
  * **Glowing Interior Roll Cage & Bucket Seats (`Interior_Silhouette` Zone `0.60`):** Prominently framed through the windshield and rear hatch glass to showcase custom neon green roll bars (`Cars/02`) or crimson bucket seats (`Cars/06`).

---

## 4. Vertex Color, UV Unwrapping & RGBA "Vibe" Mask Pipeline

### 4.1 Vertex Color Channel Specification (`COLOR0`)
* **`R Channel` (Inverted-Hull Outline Thickness):**
  * `1.0 (Pure Red)`: Outer body silhouette, wheel arch lips, lower bumper splitters, and rear wing endplates.
  * `0.3 (Dark Red)`: A-pillars, mirrors, and roof rack bars.
  * `0.0 (Black)`: Headlight lenses, grille mesh, interior roll cage, and wheel spokes.
* **`G Channel` (Cavity / Panel Line Darkening):** Baked Ambient Occlusion or `0.0` painted into recessed door seams and hood gaps.
* **`B Channel` (Speed Shake / Flutter Weight):** Painted `1.0` on exhaust tips, mudflaps, and radio antennas so the vertex shader can vibrate them with engine RPM and speed.

### 4.2 Dual-UV Unwrapping Strategy (Solving Asymmetric Graffiti & Kanji)
* **Single Non-Mirrored `2048×2048` UV Layout (`UV0`):**
  * Unwrap **Left Side, Right Side, Top (Hood/Roof/Trunk), Front Bumper, and Rear Bumper** as clean orthographic projection islands with **zero left-to-right overlapping** on the main painted body panels so typography (`WILD HORSES`, `01`, brush kanji) never flips backward.
  * Symmetric mechanical parts (wheels, tires, mirrors, intercooler, roof box underside) share overlapped UVs in the bottom-right quadrant.

### 4.3 The 2-Texture + 12-Zone Fluid Individual Color Architecture (`M_VibeCar`)
1. **`_VibeMaskTex` (`512×512` / `2048×2048` Linear, `sRGB = OFF`):**
   * **`R`**: Base Surface Luminance / Shading Weight (`0.0–1.0`)
   * **`G`**: Material Zone ID mapping to 12 individually customizable `FluidColorSlot` uniforms:
     * `0.00`: **Primary Body Paint** (`_BodyPrimaryColor` $\leftrightarrow$ `_BodyPrimaryShiftColor`)
     * `0.20`: **Secondary Two-Tone / Panda Beltline / Overfenders / Wing / Splitter** (`_BodySecondaryColor` $\leftrightarrow$ `_BodySecondaryShiftColor`)
     * `0.40`: **Wheel Rims & Mechanical Coolers** (`_WheelFrontColor` vs. `_WheelRearColor` via `_IsRearWheel` / axle Z-position + `_WheelLipMetallic` chrome dish highlight)
     * `0.60`: **Interior Roll Cage & Bucket Seats** (`_InteriorCageColor`, e.g., Neon Green cage in `Cars/02` or Crimson seats in `Cars/06`)
     * `0.80`: **Window Glass & Top Windshield Sun-Strip Banner** (`_WindshieldBannerColor` for `UV.y > 0.88`)
     * `1.00`: **Headlight Lens Tint & Taillights** (`_HeadlightTintColor`, e.g., 90s Touge Amber/Yellow quad fogs in `Cars/09`)
   * **`B`**: Halftone Dot / Chrome Lip Specular Ramp Weight
   * **`A`**: Audio-Reactive Emissive & Neon Underglow Mask (`_UnderglowColor`)
2. **`_LiveryDecalTex` (`512×512` / `2048×2048`):**
   * Supports **Classic RGB Sticker-Bomb Mode** (`_UseColorableLiveryMask = 0`) **AND** **3-Channel Colorable Livery Mask Mode** (`_UseColorableLiveryMask = 1`):
     * **`R Channel`**: Livery Layer 1 (`_LiveryPrimaryColor` $\leftrightarrow$ `_LiveryPrimaryShiftColor` — Hot-Rod Flames `Cars/01`, Tribal Bolts `Cars/02`, STI Swoosh `Cars/03`, Panda Lower Split `Cars/05`, Nose Block `Cars/07`, Savanna Center Stripe `Cars/08`)
     * **`G Channel`**: Livery Layer 2 (`_LiverySecondaryColor` — Harigaya Kanji `Cars/01`, D1GP Checkers/Splashes `Cars/04`, Doodle Hearts `Cars/06`, Inverse Flame Tongues `Cars/07`)
     * **`B Channel`**: Livery Layer 3 (`_LiveryOutlineColor` — Chrome/White Tribal Keyline `Cars/02`, Twin Pinstripes & `#39` Door Roundel `Cars/08`, `RS-TURBO` Stencil `Cars/05`)
     * **`A Channel`**: Composite Decal Opacity Mask (`0` = bare car paint, `1` = livery graphic)

---

## 5. Phased Production Roadmap & Automation Scripts

1. **Phase 1: Automated Blender Scaffold, Standalone FBX 7.4 Exporter & Unity Import Pipeline**
   * `generate_car_templates.py` & `generate_standalone_car_meshes.py`: Procedurally build all **6 Vehicle Archetypes** (`Car_01` through `Car_06`) and **16 Modular Parts** (6 wheel rim styles, 4 rear wings, 2 roof attachments, 2 coolers, LBWK dive-plane canards, and rear diffuser strakes) directly as multi-node `.fbx` files with preserved transform hierarchies, local wheel/pop-up pivots, `COLOR0` vertex colors, and 3 UV channels (`UV0`, `UV1`, `UV2`).
   * `export_rave_car_fbx.py` & `RaveCarModelPostprocessor.cs`: Bake smoothed outline normals into `UV1/UV2` (`TEXCOORD1/2`) so inverted-hull ink outlines never split at hard creases.
   * `generate_vibe_masks_and_luts.py`: Procedurally generates 6 `256×16` `.png` `VibePaletteSO` LUTs, `MatCap_AutoModellista_Windshield.png`, `Car_Shared_VibeMaskTex.png`, and 11 `_LiveryDecalTex` sheets.
2. **Phase 2: Individual Zone Color & Fluid Race Customization (`CarCustomizationPresetSO.cs` & `CarCustomizationController.cs`)**
   * Binds all 12 individual color slots, mismatched front/rear wheel colors, asymmetric "wink" pop-up headlight angles (`Cars/08`), and fluid race color shifting to `VibeCar.shader`.
