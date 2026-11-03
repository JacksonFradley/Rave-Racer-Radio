"""
Rave Racer Remix — Procedural `VibePaletteSO` 2D LUT & Expanded Vehicle Livery Mask Generator
=============================================================================================
Generates:
1. Six `256x16` `.png` Vibe 2D Gradient LUT textures in `Assets/_RaveRacer/Rendering/VibePalettes/`:
   - `VibeLUT_01_PacificSunset1984.png` (Hiroshi Nagai Turquoise/Coral/Amber/Deep Indigo)
   - `VibeLUT_02_AcidWarehouse.png`     (Pitch Black / Electric Violet / Acid Lime)
   - `VibeLUT_03_CRTCyber.png`          (Void Black / Prussian Blue / Phosphor Cyan / Ice White)
   - `VibeLUT_04_BoilingOverdrive.png`  (Soot Black / Arterial Crimson / Safety Orange / Sulfur Yellow)
   - `VibeLUT_05_HarigayaFlameNight.png`(Candy Royal Purple / Blazing Flame Orange / Solar Gold / Chrome)
   - `VibeLUT_06_PinkStyleD1GP.png`     (Dark Plum / Nakamura Hot Pink / Cyber Violet / Chartreuse Rim Yellow)
2. `MatCap_AutoModellista_Windshield.png` (`256x256` hard-edged anime specular streak sphere texture)
3. `Car_Shared_VibeMaskTex.png` (`512x512` RGBA Channel-Packed Material Zone ID Mask)
4. Eleven `512x512` Vehicle `_LiveryDecalTex.png` textures (3 classic RGB + 8 Multi-Channel Colorable Livery Masks
   where R=Layer1 Primary Flame/Stripe, G=Layer2 Secondary Splash/Kanji/Hearts, B=Layer3 Pinstripe/Keyline/Roundel, A=Mask)
   inspired by `Reference Images/Cars/01` through `09`.

Uses zero external dependencies (pure Python `zlib` + `struct` PNG encoder).
"""

import os
import math
import zlib
import struct


# ---------------------------------------------------------------------------
# PURE-PYTHON RGBA PNG WRITER (ZERO EXTERNAL DEPENDENCIES)
# ---------------------------------------------------------------------------

def write_png_rgba(filepath, width, height, rgba_bytes):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    def make_chunk(chunk_type, data):
        chunk = struct.pack(">I", len(data)) + chunk_type + data
        crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
        return chunk + struct.pack(">I", crc)

    raw_rows = bytearray()
    stride = width * 4
    for y in range(height):
        raw_rows.append(0)  # Filter type 0 (None)
        row_start = y * stride
        raw_rows.extend(rgba_bytes[row_start : row_start + stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw_rows), level=6)

    with open(filepath, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(make_chunk(b"IHDR", ihdr))
        f.write(make_chunk(b"IDAT", compressed))
        f.write(make_chunk(b"IEND", b""))


def lerp_color(c0, c1, t):
    t = max(0.0, min(1.0, t))
    return (
        int(round(c0[0] + (c1[0] - c0[0]) * t)),
        int(round(c0[1] + (c1[1] - c0[1]) * t)),
        int(round(c0[2] + (c1[2] - c0[2]) * t)),
        int(round(c0[3] + (c1[3] - c0[3]) * t)),
    )


def sample_stops(stops, u):
    """stops: list of (pos_0_to_1, (r,g,b,a)). Stepped + smooth hybrid ramp."""
    if u <= stops[0][0]:
        return stops[0][1]
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        if u <= p1:
            t = (u - p0) / max(p1 - p0, 1e-5)
            # Quantize slightly to preserve crisp Nagai / Auto Modellista cel-bands
            t_stepped = math.floor(t * 4.0) / 3.0 if t < 0.95 else 1.0
            return lerp_color(c0, c1, t_stepped)
    return stops[-1][1]


# ---------------------------------------------------------------------------
# 1. GENERATE `256x16` VIBE PALETTE 2D LUT TEXTURES (6 PALETTES)
# ---------------------------------------------------------------------------

def generate_vibe_luts(palettes_dir):
    w, h = 256, 16
    vibe_specs = {
        "VibeLUT_01_PacificSunset1984.png": (
            [
                (0.00, (43,  30,  88,  255)),  # Deep Indigo Shadow (#2B1E58)
                (0.28, (32,  158, 176, 255)),  # Coastal Teal Mid-Shadow
                (0.55, (42,  212, 201, 255)),  # Turquoise Cyan (#2AD4C9)
                (0.78, (255, 110, 108, 255)),  # Coral Pink (#FF6E6C)
                (0.92, (245, 166, 35,  255)),  # Warm Amber Sun (#F5A623)
                (1.00, (255, 248, 224, 255)),  # Crisp Specular White-Gold
            ],
            [
                (0.00, (28,  16,  68,  255)),
                (0.30, (98,  42,  188, 255)),
                (0.58, (255, 72,  148, 255)),
                (0.82, (0,   240, 255, 255)),
                (1.00, (255, 238, 85,  255)),
            ],
        ),
        "VibeLUT_02_AcidWarehouse.png": (
            [
                (0.00, (5,   5,   7,   255)),  # Pitch Void (#050507)
                (0.25, (48,  18,  96,  255)),  # Dark Ultraviolet Shadow
                (0.52, (139, 92,  246, 255)),  # Electric Violet (#8B5CF6)
                (0.76, (184, 255, 0,   255)),  # Acid Lime (#B8FF00)
                (0.92, (57,  255, 20,  255)),  # Radioactive Green (#39FF14)
                (1.00, (242, 255, 210, 255)),  # Laser White-Lime Core
            ],
            [
                (0.00, (2,   8,   2,   255)),
                (0.28, (20,  90,  40,  255)),
                (0.55, (57,  255, 20,  255)),
                (0.80, (217, 70,  239, 255)),
                (1.00, (255, 255, 255, 255)),
            ],
        ),
        "VibeLUT_03_CRTCyber.png": (
            [
                (0.00, (2,   6,   13,  255)),  # CRT Void Black (#02060D)
                (0.28, (13,  59,  102, 255)),  # Prussian Blue (#0D3B66)
                (0.55, (37,  99,  235, 255)),  # Electric Cobalt (#2563EB)
                (0.80, (0,   240, 255, 255)),  # Phosphor Cyan (#00F0FF)
                (1.00, (224, 255, 255, 255)),  # Ice White Halation (#E0FFFF)
            ],
            [
                (0.00, (4,   12,  24,  255)),
                (0.30, (30,  75,  255, 255)),
                (0.60, (0,   255, 200, 255)),
                (0.85, (184, 255, 0,   255)),
                (1.00, (255, 255, 255, 255)),
            ],
        ),
        "VibeLUT_04_BoilingOverdrive.png": (
            [
                (0.00, (20,  17,  17,  255)),  # Soot Charcoal (#141111)
                (0.28, (92,  8,   22,  255)),  # Oxblood Shadow
                (0.55, (217, 17,  38,  255)),  # Arterial Crimson (#D91126)
                (0.80, (255, 85,  0,   255)),  # Safety Laser Orange (#FF5500)
                (0.94, (255, 240, 51,  255)),  # Sulfur Yellow (#FFF033)
                (1.00, (255, 255, 235, 255)),  # White-Hot Core
            ],
            [
                (0.00, (10,  4,   6,   255)),
                (0.25, (180, 10,  30,  255)),
                (0.55, (255, 60,  0,   255)),
                (0.80, (255, 220, 0,   255)),
                (1.00, (255, 255, 255, 255)),
            ],
        ),
        # NEW: Inspired by Cars/01 (Harigaya Purple & Flame Orange Chaser)
        "VibeLUT_05_HarigayaFlameNight.png": (
            [
                (0.00, (18,  6,   46,  255)),  # Midnight Royal Indigo
                (0.28, (58,  12,  163, 255)),  # Candy Royal Purple (#3A0CA3)
                (0.55, (114, 9,   183, 255)),  # Ultraviolet Pearl
                (0.76, (255, 109, 0,   255)),  # Hot-Rod Flame Orange (#FF6D00)
                (0.92, (255, 214, 10,  255)),  # Solar Flame Yellow (#FFD60A)
                (1.00, (248, 250, 255, 255)),  # Chrome Rim Specular
            ],
            [
                (0.00, (12,  4,   32,  255)),
                (0.28, (88,  18,  210, 255)),
                (0.55, (255, 65,  0,   255)),
                (0.82, (255, 215, 0,   255)),
                (1.00, (255, 255, 255, 255)),
            ],
        ),
        # NEW: Inspired by Cars/04 (Naoki Nakamura Team Pink Style PS13)
        "VibeLUT_06_PinkStyleD1GP.png": (
            [
                (0.00, (26,  5,   38,  255)),  # Dark Plum Shadow
                (0.28, (108, 18,  156, 255)),  # Deep Origin Violet
                (0.54, (255, 20,  147, 255)),  # Team Pink Style Magenta (#FF1493)
                (0.78, (0,   225, 255, 255)),  # D-Magic Cyber Cyan
                (0.92, (210, 255, 10,  255)),  # Chartreuse Front Wheel Neon (#D2FF0A)
                (1.00, (255, 250, 255, 255)),  # Strobe Flash White
            ],
            [
                (0.00, (16,  2,   28,  255)),
                (0.30, (220, 12,  135, 255)),
                (0.58, (255, 80,  190, 255)),
                (0.84, (210, 255, 10,  255)),
                (1.00, (255, 255, 255, 255)),
            ],
        ),
    }

    for filename, (stops_base, stops_drop) in vibe_specs.items():
        buf = bytearray(w * h * 4)
        for y in range(h):
            row_blend = y / float(h - 1)
            for x in range(w):
                u = x / float(w - 1)
                c_base = sample_stops(stops_base, u)
                c_drop = sample_stops(stops_drop, u)
                c_final = lerp_color(c_base, c_drop, row_blend)
                idx = (y * w + x) * 4
                buf[idx : idx + 4] = bytes(c_final)
        write_png_rgba(os.path.join(palettes_dir, filename), w, h, buf)


# ---------------------------------------------------------------------------
# 2. GENERATE `256x256` AUTO MODELLISTA WINDSHIELD MATCAP TEXTURE
# ---------------------------------------------------------------------------

def generate_windshield_matcap(palettes_dir):
    w, h = 256, 256
    buf = bytearray(w * h * 4)
    for y in range(h):
        ny = (y / 127.5) - 1.0
        for x in range(w):
            nx = (x / 127.5) - 1.0
            r2 = nx * nx + ny * ny
            if r2 > 1.0:
                c = (18, 22, 38, 255)
            else:
                diag = nx * 0.75 + ny * 0.65
                if 0.18 < diag < 0.36 or -0.42 < diag < -0.32:
                    c = (245, 252, 255, 255)
                elif r2 > 0.84:
                    c = (0, 240, 255, 255)
                else:
                    c = (24, 32, 58, 255)
            idx = (y * w + x) * 4
            buf[idx : idx + 4] = bytes(c)
    write_png_rgba(os.path.join(palettes_dir, "MatCap_AutoModellista_Windshield.png"), w, h, buf)


# ---------------------------------------------------------------------------
# 3. GENERATE VEHICLE RGBA `_VibeMaskTex`, EXPANDED LIVERY MASKS & UV GUIDES
# ---------------------------------------------------------------------------

def generate_vehicle_textures(textures_dir):
    """
    Generates 512x512 RGBA Channel-Packed `_VibeMaskTex` and 11 `_LiveryDecalTex` textures
    matching the 4-Quadrant Non-Mirrored UV layout:
      - Top-Left (u: 0.0..0.5, v: 0.5..1.0): Left Side Body (-X)
      - Top-Right (u: 0.5..1.0, v: 0.5..1.0): Right Side Body (+X)
      - Bottom-Left (u: 0.0..0.5, v: 0.0..0.5): Top Hood / Roof / Trunk (+Y)
      - Bottom-Right (u: 0.5..1.0, v: 0.0..0.5): Bumpers, Wheels, Trim & Emissive Lights
    """
    w, h = 512, 512
    half = w // 2

    # A. Baseline RGBA Channel-Packed `Car_Shared_VibeMaskTex.png`
    mask_buf = bytearray(w * h * 4)
    for y in range(h):
        v = 1.0 - (y / float(h - 1))
        for x in range(w):
            u = x / float(w - 1)
            if v >= 0.50:
                local_v = (v - 0.50) * 2.0
                r_ao = int(min(255, max(40, 75 + local_v * 175)))
                if local_v > 0.68:
                    g_zone = 204  # Window Glass + Top Sun-Strip Banner Zone (0.80)
                elif local_v < 0.18:
                    g_zone = 51   # Lower Side Skirt / Panda Trim / Overfender Zone (0.20)
                else:
                    g_zone = 0    # Primary Body Paint Zone (0.00)
                b_halftone = 128
                a_emissive = 255 if local_v < 0.06 else 0  # Underglow strip
            else:
                if u < 0.50:
                    r_ao = 225
                    g_zone = 0    # Hood / Roof / Trunk Primary Body Paint
                    b_halftone = 180
                    a_emissive = 0
                else:
                    local_v = v * 2.0
                    r_ao = 190
                    if local_v > 0.78:
                        g_zone = 255  # Headlights / Taillights Emissive Zone (1.00)
                        a_emissive = 255
                    else:
                        g_zone = 102  # Wheel Rims & Intercooler Zone (0.40)
                        a_emissive = 0
                    b_halftone = 140

            idx = (y * w + x) * 4
            mask_buf[idx : idx + 4] = bytes((r_ao, g_zone, b_halftone, a_emissive))

    write_png_rgba(os.path.join(textures_dir, "Car_Shared_VibeMaskTex.png"), w, h, mask_buf)

    # B. Classic 3 Archetype Livery Decal Sheets (Backwards-Compatible RGB)
    classic_liveries = [
        ("Car_01_PocketRocket_LiveryDecal.png",  (0, 140, 255, 255),   (230, 35, 30, 255)),
        ("Car_02_GravelRavers_LiveryDecal.png",  (140, 210, 35, 255),  (220, 20, 25, 255)),
        ("Car_03_ShakotanCyber_LiveryDecal.png", (255, 20, 165, 255),  (165, 60, 255, 255)),
    ]

    for liv_name, col_primary, col_secondary in classic_liveries:
        decal_buf = bytearray(w * h * 4)
        for y in range(h):
            v = 1.0 - (y / float(h - 1))
            for x in range(w):
                u = x / float(w - 1)
                idx = (y * w + x) * 4
                if 0.54 <= v <= 0.84:
                    local_u = (u * 2.0) if u < 0.5 else ((u - 0.5) * 2.0)
                    local_v = (v - 0.50) * 2.0
                    stripe = (local_u * 1.6 - local_v * 0.7)
                    if 0.38 < local_u < 0.54 and 0.20 < local_v < 0.58:
                        if local_u < 0.40 or local_u > 0.52 or local_v < 0.24 or local_v > 0.54:
                            decal_buf[idx : idx + 4] = bytes((10, 10, 12, 255))
                        else:
                            decal_buf[idx : idx + 4] = bytes((245, 245, 248, 255))
                    elif 0.18 < (stripe % 0.45) < 0.29:
                        decal_buf[idx : idx + 4] = bytes(col_primary)
                    elif 0.30 < (stripe % 0.45) < 0.36:
                        decal_buf[idx : idx + 4] = bytes(col_secondary)
                    else:
                        decal_buf[idx : idx + 4] = bytes((0, 0, 0, 0))
                else:
                    decal_buf[idx : idx + 4] = bytes((0, 0, 0, 0))
        write_png_rgba(os.path.join(textures_dir, liv_name), w, h, decal_buf)

    # C. NEW: 8 Multi-Channel Colorable Livery Masks (`_UseColorableLiveryMask = 1`)
    # R = Layer 1 (Primary Flames / Stripe / Panda Split / Tribal)
    # G = Layer 2 (Secondary Kanji / Splash / Hearts / Inner Core)
    # B = Layer 3 (Pinstripe / Keyline Outline / Door Roundel #39)
    # A = Overall Decal Alpha Mask
    colorable_schemes = [
        "Livery_04_Harigaya_HotRodFlames.png",      # Cars/01: Wrapping bumper-to-door flames + kanji band
        "Livery_05_Ultraviolet_AcidLightning.png",  # Cars/02: Jagged tribal lightning + white keyline + stars
        "Livery_06_Y2K_DuotoneRallySwoosh.png",     # Cars/03: Sweeping STI diagonal rally swoosh + blocks
        "Livery_07_PinkStyle_D1GPSplash.png",       # Cars/04: Naoki Nakamura splash flames + checker + katakana
        "Livery_08_Tekkamen_PandaTwoTone.png",      # Cars/05: 80s R30 Skyline horizontal panda beltline + RS-TURBO
        "Livery_09_LBWK_KidsDoodleBomb.png",        # Cars/06: Hand-drawn street marker hearts & graffiti doodles
        "Livery_10_Donut_NoseFlameSplit.png",       # Cars/07: Black front nose block + inverse flames + rear logo
        "Livery_11_Savanna_TwinStripe39.png",       # Cars/08: FC3S center racing stripe + twin pinstripes + #39 roundel
    ]

    for scheme_name in colorable_schemes:
        buf = bytearray(w * h * 4)
        for y in range(h):
            v = 1.0 - (y / float(h - 1))
            for x in range(w):
                u = x / float(w - 1)
                idx = (y * w + x) * 4
                r_ch, g_ch, b_ch, a_ch = 0, 0, 0, 0

                is_side = (v >= 0.50)
                is_top = (v < 0.50 and u < 0.50)
                local_u = (u * 2.0) if u < 0.50 else ((u - 0.50) * 2.0)
                local_v = (v - 0.50) * 2.0 if v >= 0.50 else (v * 2.0)

                if scheme_name == "Livery_04_Harigaya_HotRodFlames.png":
                    # Wrapping flames from nose (local_u -> 1.0) licking backward + lower skirt flames + door kanji script
                    if is_side and local_v < 0.65:
                        flame_wave = math.sin(local_v * 28.0) * 0.14 + math.cos(local_v * 13.0) * 0.08
                        reach = 0.25 + (1.0 - local_v) * 0.55 + flame_wave
                        if (1.0 - local_u) < reach or local_v < 0.18:
                            r_ch = 255
                            if (1.0 - local_u) < reach - 0.08:
                                g_ch = 180
                            elif abs((1.0 - local_u) - reach) < 0.025:
                                b_ch = 255
                            a_ch = 255
                        # Cursive Harigaya door kanji banner across mid-door
                        elif 0.25 < local_u < 0.78 and 0.26 < local_v < 0.44:
                            if ((int(local_u * 48) + int(local_v * 32)) % 3) == 0:
                                g_ch = 255
                                b_ch = 220
                                a_ch = 255
                    elif is_top and local_v > 0.55:
                        flame_top = math.sin(local_u * 34.0) * 0.12
                        if local_v > (0.68 + flame_top):
                            r_ch = 255
                            a_ch = 255

                elif scheme_name == "Livery_05_Ultraviolet_AcidLightning.png":
                    # Jagged tribal lightning vectors with bright keyline (B channel) and star sparkles
                    if is_side and 0.12 < local_v < 0.66:
                        zig = abs(((local_u * 5.0 + local_v * 3.5) % 1.0) - 0.5)
                        bolt = abs(local_v - (0.22 + local_u * 0.38 + (zig - 0.25) * 0.28))
                        if bolt < 0.055:
                            r_ch = 255
                            a_ch = 255
                        elif bolt < 0.082:
                            b_ch = 255  # Crisp white/chrome tribal outline
                            a_ch = 255
                        # 4-point star sparkles
                        sx = (local_u * 9.0) % 1.0 - 0.5
                        sy = (local_v * 7.0) % 1.0 - 0.5
                        if abs(sx) + abs(sy) < 0.08:
                            b_ch = 255
                            a_ch = 255

                elif scheme_name == "Livery_06_Y2K_DuotoneRallySwoosh.png":
                    # Sweeping Subaru STI side swoosh & star cluster
                    if is_side and 0.15 < local_v < 0.68:
                        arc = local_v - (0.18 + (local_u ** 1.4) * 0.45)
                        if -0.08 < arc < 0.08:
                            r_ch = 255
                            a_ch = 255
                        elif 0.10 < arc < 0.15 and (int(local_u * 20) % 2 == 0):
                            g_ch = 255
                            b_ch = 200
                            a_ch = 255

                elif scheme_name == "Livery_07_PinkStyle_D1GPSplash.png":
                    # Naoki Nakamura multi-layer diagonal splash flames + checker grid + katakana strips
                    if is_side or is_top:
                        diag = (local_u * 2.2 - local_v * 1.4) % 0.55
                        checker = ((int(local_u * 24) + int(local_v * 24)) % 2) == 0
                        if 0.08 < diag < 0.22:
                            r_ch = 255
                            a_ch = 255
                        elif 0.22 <= diag < 0.34:
                            g_ch = 255 if checker else 120
                            b_ch = 255 if not checker else 0
                            a_ch = 255
                        elif 0.36 < diag < 0.40:
                            b_ch = 255
                            a_ch = 255

                elif scheme_name == "Livery_08_Tekkamen_PandaTwoTone.png":
                    # Classic 80s R30 Skyline RS-Turbo Panda lower two-tone + beltline molding + RS-TURBO stencil
                    if is_side:
                        if local_v < 0.28:
                            r_ch = 255
                            a_ch = 255
                            # Crisp RS-TURBO lettering band just below beltline
                            if 0.22 < local_v < 0.27 and 0.18 < local_u < 0.42:
                                if int(local_u * 60) % 2 == 0:
                                    b_ch = 255
                                else:
                                    g_ch = 255
                        elif 0.28 <= local_v < 0.31:
                            b_ch = 255  # Pinstripe separation above black rub-strip
                            a_ch = 255

                elif scheme_name == "Livery_09_LBWK_KidsDoodleBomb.png":
                    # Hand-drawn street marker hearts & scattered graffiti doodles across white widebody
                    if is_side or is_top:
                        cell_u = (local_u * 6.0) % 1.0 - 0.5
                        cell_v = (local_v * 6.0) % 1.0 - 0.5
                        # Heart implicit equation: (x^2 + y^2 - r)^3 - x^2 * y^3 < 0
                        hx, hy = cell_u * 2.8, cell_v * 2.8
                        heart_val = (hx * hx + hy * hy - 0.35) ** 3 - (hx * hx) * (hy ** 3)
                        if heart_val < 0.0:
                            r_ch = 255
                            if heart_val > -0.02:
                                b_ch = 255
                            a_ch = 255
                        elif abs(math.sin(local_u * 19.0 + local_v * 11.0)) > 0.94:
                            g_ch = 255
                            a_ch = 230

                elif scheme_name == "Livery_10_Donut_NoseFlameSplit.png":
                    # Cars/07: Black front nose block with flames licking backward + diagonal rear Donut slash
                    if is_side:
                        flame = math.sin(local_v * 24.0) * 0.11
                        if local_u > (0.66 + flame):
                            r_ch = 255  # Black front clip block
                            a_ch = 255
                        elif abs(local_u - (0.66 + flame)) < 0.04:
                            g_ch = 255  # Inverse yellow/orange flame tongues
                            b_ch = 200
                            a_ch = 255
                        elif (local_u + local_v * 0.65) < 0.52:
                            r_ch = 255  # Black rear quarter block
                            if 0.20 < local_v < 0.55 and ((int(local_u * 28 - local_v * 14)) % 3 == 0):
                                g_ch = 255  # Giant diagonal Donut typography
                            a_ch = 255
                    elif is_top and local_v > 0.58:
                        flame = math.sin(local_u * 28.0) * 0.10
                        if local_v > (0.64 + flame):
                            r_ch = 255
                            a_ch = 255

                elif scheme_name == "Livery_11_Savanna_TwinStripe39.png":
                    # Cars/08: Mazda RX-7 FC3S Emerald Green center racing stripe + twin white pinstripes + #39 roundel
                    if is_top:
                        dist_center = abs(local_u - 0.50)
                        if dist_center < 0.14:
                            r_ch = 255  # Center Emerald Green racing stripe
                            a_ch = 255
                        elif 0.14 <= dist_center < 0.165:
                            b_ch = 255  # Crisp white outer pinstripe
                            a_ch = 255
                        elif 0.165 <= dist_center < 0.18:
                            r_ch = 255  # Outer thin green accent line
                            a_ch = 255
                    elif is_side:
                        # Door Roundel Circle (#39)
                        dx = local_u - 0.48
                        dy = local_v - 0.38
                        r2 = dx * dx + dy * dy
                        if r2 < 0.032:
                            if r2 > 0.027:
                                g_ch = 255  # Black ring outline
                            elif abs(dx) < 0.06 and abs(dy) < 0.09 and (int((dx + 0.1) * 45) % 2 == 0):
                                g_ch = 255  # #39 digits
                            else:
                                b_ch = 255  # White roundel disc
                            a_ch = 255
                        elif 0.58 < local_v < 0.66:
                            # Upper beltline green/white racing stripe continuation
                            r_ch = 255
                            if local_v < 0.60:
                                b_ch = 255
                            a_ch = 255

                buf[idx : idx + 4] = bytes((r_ch, g_ch, b_ch, a_ch))

        write_png_rgba(os.path.join(textures_dir, scheme_name), w, h, buf)

    # D. Non-Mirrored 4-Quadrant UV Painting Guide Template
    guide_buf = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            is_border = (x in (0, half - 1, half, w - 1)) or (y in (0, half - 1, half, h - 1))
            is_grid = (x % 32 == 0) or (y % 32 == 0)
            if is_border:
                c = (184, 255, 0, 255)
            elif is_grid:
                c = (55, 60, 75, 255)
            else:
                if y < half and x < half:
                    c = (25, 45, 75, 255)
                elif y < half and x >= half:
                    c = (45, 25, 75, 255)
                elif y >= half and x < half:
                    c = (25, 65, 55, 255)
                else:
                    c = (65, 45, 25, 255)
            guide_buf[idx : idx + 4] = bytes(c)
    write_png_rgba(os.path.join(textures_dir, "UV_Template_NonMirrored_4Quadrant.png"), w, h, guide_buf)


if __name__ == "__main__":
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    palettes_out = os.path.join(root, "Assets", "_RaveRacer", "Rendering", "VibePalettes")
    textures_out = os.path.join(root, "Assets", "_RaveRacer", "Vehicle", "Textures")
    generate_vibe_luts(palettes_out)
    generate_windshield_matcap(palettes_out)
    generate_vehicle_textures(textures_out)
    print("[Rave Racer Remix] Generated 6 Vibe 2D LUTs, Windshield MatCap, and 11 Vehicle Livery Masks!")
