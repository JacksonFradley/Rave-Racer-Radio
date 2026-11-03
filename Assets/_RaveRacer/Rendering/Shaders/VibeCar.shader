Shader "RaveRacer/VibeCar"
{
    Properties
    {
        [Header(Vibe Fluid Palette and RGBA Mask)]
        _VibeMaskTex ("RGBA Vibe Mask (R:AO G:ZoneID B:Halftone A:Emissive)", 2D) = "white" {}
        _LiveryDecalTex ("Livery Decal / Multi-Channel Mask (RGB:Layers A:Mask)", 2D) = "black" {}
        _VibeLUT ("Local Vibe 2D LUT (256x16)", 2D) = "white" {}
        _VibeRowBlend ("Track Zone / Energy Row (0..1)", Range(0.0, 1.0)) = 0.0
        [Toggle] _UseGlobalVibeLUT ("Sample Global Track Vibe LUT", Float) = 1.0
        [Toggle] _UseCustomZoneColors ("Enable Individual Zone Colors + Fluid Shift", Float) = 1.0
        [Toggle] _UseColorableLiveryMask ("Treat Livery RGB as 3 Colorable Graphic Layers", Float) = 0.0
        [Toggle] _TintDecalsWithVibe ("Tint Livery Decals With Vibe LUT", Float) = 0.0

        [Header(Individual Car Zone Colors and Fluid Race Shift Targets)]
        _BodyPrimaryColor ("1. Body Primary Base Color", Color) = (0.23, 0.05, 0.64, 1.0)
        _BodyPrimaryShiftColor ("1B. Body Primary Fluid Shift Target", Color) = (0.62, 0.08, 0.92, 1.0)
        _BodySecondaryColor ("2. Body Secondary / Panda Trim / Split Color", Color) = (0.08, 0.07, 0.12, 1.0)
        _BodySecondaryShiftColor ("2B. Body Secondary Fluid Shift Target", Color) = (0.18, 0.12, 0.32, 1.0)

        [Header(Livery Flame Tribal Stripe and Kanji Layer Colors)]
        _LiveryPrimaryColor ("3. Livery Layer 1 (Flames / Stripe / Tribal)", Color) = (1.00, 0.42, 0.00, 1.0)
        _LiveryPrimaryShiftColor ("3B. Livery Layer 1 Fluid Shift Target", Color) = (1.00, 0.85, 0.05, 1.0)
        _LiverySecondaryColor ("4. Livery Layer 2 (Splash / Kanji / Hearts)", Color) = (1.00, 0.12, 0.65, 1.0)
        _LiveryOutlineColor ("5. Livery Layer 3 (Pinstripe / Keyline / Number)", Color) = (0.96, 0.98, 1.00, 1.0)

        [Header(Asymmetric Wheel Rims Interior Roll Cage and Aero)]
        _WheelFrontColor ("6. Front Wheel Rim Color", Color) = (0.85, 1.00, 0.05, 1.0)
        _WheelRearColor ("7. Rear Wheel Rim Color (Mismatched Drift Setup)", Color) = (1.00, 0.12, 0.62, 1.0)
        _WheelLipMetallic ("Wheel Dish Lip Chrome / Metallic Highlight", Range(0.0, 1.0)) = 0.65
        _IsRearWheel ("Sub-Mesh Rear Wheel Override (0:Auto 1:Rear -1:Front)", Float) = 0.0
        _InteriorCageColor ("8. Interior Roll Cage & Bucket Seat Color", Color) = (0.22, 1.00, 0.08, 1.0)
        _WindshieldBannerColor ("9. Windshield Sun-Strip Banner Color", Color) = (1.00, 0.86, 0.05, 1.0)
        _HeadlightTintColor ("10. Headlight Lens Tint (White / Touge Amber / Neon)", Color) = (1.00, 0.88, 0.18, 1.0)
        _UnderglowColor ("11. Underglow Neon Tube & Emissive Trim Color", Color) = (0.22, 1.00, 0.08, 1.0)

        [Header(Fluid Race Color Dynamics)]
        _FluidColorShiftStrength ("Fluid Base-to-Target Morph Strength", Range(0.0, 1.0)) = 0.75
        _VibeAtmosphereCoupling ("Track Vibe LUT Atmosphere Coupling", Range(0.0, 1.0)) = 0.28
        _AudioColorPulseWeight ("Audio Bass & Beat Chromatic Pulse", Range(0.0, 1.0)) = 0.45
        _DriftHueShiftDeg ("Drift Slip Angle Hue Shift (Degrees)", Range(-90.0, 90.0)) = 28.0
        _DriftColorShift ("Runtime Normalized Drift Slip (0..1)", Range(0.0, 1.0)) = 0.0
        _EmotionRageBlend ("Runtime Boiling Rage Shift (0..1)", Range(0.0, 1.0)) = 0.0
        _EmotionCockinessBlend ("Runtime Untouchable Cockiness Shift (0..1)", Range(0.0, 1.0)) = 0.0

        [Header(Hiroshi Nagai Stepped Cel Lighting)]
        _CelStepThreshold ("NdotL Cel Step Threshold", Range(-0.2, 0.5)) = 0.05
        _CelStepFeather ("Cel Step Razor Sharpness", Range(0.001, 0.05)) = 0.005

        [Header(JSR x Nam_Mac x Pixel_Tempys Low-Poly Style)]
        _BayerDitherStrength ("Nam_Mac Bayer 4x4 Shadow Terminator Dither", Range(0.0, 1.0)) = 0.85
        _FacetCreaseInkStrength ("Pixel_Tempys Internal Facet Crease Ink", Range(0.0, 1.0)) = 0.90
        _PixelTexelSnap ("JSR Low-Res UV Texel Snap (0=Off, 256=Dreamcast)", Float) = 256.0

        [Header(Auto Modellista Windshield MatCap)]
        _WindshieldMatCap ("Windshield Anime Streak MatCap", 2D) = "black" {}
        _MatCapIntensity ("Windshield Streak Intensity", Range(0.0, 2.0)) = 1.15

        [Header(Auto Modellista Inverted Hull Ink Outline)]
        _OutlineColor ("Ink Outline Color", Color) = (0.03, 0.02, 0.05, 1.0)
        _OutlineWidth ("Base Outline Thickness (Meters)", Range(0.0, 0.05)) = 0.014
        _DistanceScale ("Screen-Space Distance Compensation", Range(0.0, 1.0)) = 0.35

        [Header(Audio and Speed Reactivity)]
        _EmissiveBoost ("Audio Bass Emissive Multiplier", Range(0.0, 5.0)) = 2.2
        _FlutterAmplitude ("Exhaust/Mudflap Speed Flutter (Meters)", Range(0.0, 0.03)) = 0.008
    }

    SubShader
    {
        Tags
        {
            "RenderPipeline" = "UniversalPipeline"
            "RenderType" = "Opaque"
            "Queue" = "Geometry"
        }

        HLSLINCLUDE
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
        #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

        CBUFFER_START(UnityPerMaterial)
            float4 _VibeMaskTex_ST;
            float4 _OutlineColor;
            float4 _BodyPrimaryColor;
            float4 _BodyPrimaryShiftColor;
            float4 _BodySecondaryColor;
            float4 _BodySecondaryShiftColor;
            float4 _LiveryPrimaryColor;
            float4 _LiveryPrimaryShiftColor;
            float4 _LiverySecondaryColor;
            float4 _LiveryOutlineColor;
            float4 _WheelFrontColor;
            float4 _WheelRearColor;
            float4 _InteriorCageColor;
            float4 _WindshieldBannerColor;
            float4 _HeadlightTintColor;
            float4 _UnderglowColor;

            float _VibeRowBlend;
            float _UseGlobalVibeLUT;
            float _UseCustomZoneColors;
            float _UseColorableLiveryMask;
            float _TintDecalsWithVibe;
            float _WheelLipMetallic;
            float _IsRearWheel;
            float _FluidColorShiftStrength;
            float _VibeAtmosphereCoupling;
            float _AudioColorPulseWeight;
            float _DriftHueShiftDeg;
            float _DriftColorShift;
            float _EmotionRageBlend;
            float _EmotionCockinessBlend;
            float _CelStepThreshold;
            float _CelStepFeather;
            float _BayerDitherStrength;
            float _FacetCreaseInkStrength;
            float _PixelTexelSnap;
            float _MatCapIntensity;
            float _OutlineWidth;
            float _DistanceScale;
            float _EmissiveBoost;
            float _FlutterAmplitude;
        CBUFFER_END

        // Global Triad State Bus uniforms (pushed by BeatBroadcastSystem & VibeController)
        float4 _AudioSpectrum; // x: SubBass, y: LowMid, z: HighMid, w: Treble
        float _BeatPulse;
        float _GlobalNormalizedSpeed;
        TEXTURE2D(_GlobalTrackVibeLUT);
        SAMPLER(sampler_GlobalTrackVibeLUT);

        TEXTURE2D(_VibeMaskTex);
        SAMPLER(sampler_VibeMaskTex);
        TEXTURE2D(_LiveryDecalTex);
        SAMPLER(sampler_LiveryDecalTex);
        TEXTURE2D(_VibeLUT);
        SAMPLER(sampler_VibeLUT);
        TEXTURE2D(_WindshieldMatCap);
        SAMPLER(sampler_WindshieldMatCap);

        // Nam_Mac & Pixel_Tempys 4x4 Ordered Bayer Halftone Dither Matrix
        float Bayer4x4(float2 screenPixel)
        {
            int2 p = int2(fmod(abs(floor(screenPixel)), 4.0));
            int idx = p.y * 4 + p.x;
            float bayer[16] = {
                 0.0/16.0,  8.0/16.0,  2.0/16.0, 10.0/16.0,
                12.0/16.0,  4.0/16.0, 14.0/16.0,  6.0/16.0,
                 3.0/16.0, 11.0/16.0,  1.0/16.0,  9.0/16.0,
                15.0/16.0,  7.0/16.0, 13.0/16.0,  5.0/16.0
            };
            return bayer[idx] - 0.5;
        }

        float3 ApplyExhaustAndMudflapFlutter(float3 positionOS, float flutterWeight)
        {
            if (flutterWeight <= 0.01)
                return positionOS;

            // Step vertex flutter to 12 FPS ("on twos") for authentic Nam_Mac / Pixel_Tempys motion
            float steppedTime = floor(_Time.y * 12.0) / 12.0;
            float freq = 45.0 + (_GlobalNormalizedSpeed * 65.0);
            float wave = sin(steppedTime * freq + positionOS.z * 12.0);
            positionOS.y += wave * _FlutterAmplitude * flutterWeight * (0.25 + _AudioSpectrum.x);
            return positionOS;
        }

        // Fast Rodrigues Hue Rotation around RGB diagonal (1,1,1)/sqrt(3)
        half3 RotateHueRGB(half3 col, float angleDeg)
        {
            float rad = radians(angleDeg);
            float c = cos(rad);
            float s = sin(rad);
            half3 k = half3(0.57735, 0.57735, 0.57735);
            return saturate(col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c));
        }
        ENDHLSL

        // ===================================================================
        // PASS 1: FORWARD LIT CEL-SHADED + INDIVIDUAL FLUID COLORS + VIBE LUT
        // ===================================================================
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode" = "UniversalForward" }
            Cull Back
            ZWrite On

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv         : TEXCOORD0;
                float4 color      : COLOR; // R:OutlineWidth, G:CavityAO, B:Flutter, A:ZoneOverride
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS   : TEXCOORD1;
                float2 uv         : TEXCOORD2;
                float3 positionOS : TEXCOORD3;
                float4 vertColor  : COLOR;
            };

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                float3 posOS = ApplyExhaustAndMudflapFlutter(IN.positionOS.xyz, IN.color.b);
                VertexPositionInputs posInputs = GetVertexPositionInputs(posOS);
                VertexNormalInputs normInputs = GetVertexNormalInputs(IN.normalOS);

                OUT.positionCS = posInputs.positionCS;
                OUT.positionWS = posInputs.positionWS;
                OUT.normalWS = normInputs.normalWS;
                OUT.uv = TRANSFORM_TEX(IN.uv, _VibeMaskTex);
                OUT.positionOS = posOS;
                OUT.vertColor = IN.color;
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                float3 normalWS = normalize(IN.normalWS);
                float3 viewDirWS = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                Light mainLight = GetMainLight(TransformWorldToShadowCoord(IN.positionWS));

                // 1. Sample RGBA Channel-Packed Vibe Mask (with JSR Dreamcast low-res texel snap option)
                // R: Surface AO/Luminance | G: Material Zone ID | B: Halftone Weight | A: Audio Emissive
                float2 snappedUV = (_PixelTexelSnap > 8.0) ? (floor(IN.uv * _PixelTexelSnap) + 0.5) / _PixelTexelSnap : IN.uv;
                half4 mask = SAMPLE_TEXTURE2D(_VibeMaskTex, sampler_VibeMaskTex, snappedUV);
                half surfaceAO = mask.r * max(IN.vertColor.g, 0.25);
                half zoneID = mask.g;
                half halftoneSpec = mask.b;
                half emissiveMask = mask.a;

                // 2. Stepped Two-Tone Hiroshi Nagai Cel Shading + Nam_Mac Bayer 4x4 Shadow Terminator Dither
                float ndotl = dot(normalWS, mainLight.direction);
                float dynamicThreshold = _CelStepThreshold - (_BeatPulse * 0.12 + _AudioSpectrum.x * 0.08);
                float bayerDither = Bayer4x4(IN.positionCS.xy) * 0.28 * _BayerDitherStrength;
                float steppedLit = smoothstep(
                    dynamicThreshold - _CelStepFeather,
                    dynamicThreshold + _CelStepFeather,
                    ndotl + bayerDither
                ) * mainLight.shadowAttenuation;

                // 3. Sample Track / Local Vibe 2D LUT for Fluid Race Harmonics & Nagai Shadow Tones
                float lutU = saturate((steppedLit * 0.55 + 0.10 + _BeatPulse * 0.12 + _AudioSpectrum.z * 0.08) * surfaceAO + (zoneID * 0.35));
                float lutV = saturate(_VibeRowBlend + (_AudioSpectrum.x * 0.38) + (_BeatPulse * 0.28) + (_AudioSpectrum.w * 0.15));
                float2 lutUV = float2(lutU, lutV);

                half3 vibeColor = (_UseGlobalVibeLUT > 0.5)
                    ? SAMPLE_TEXTURE2D(_GlobalTrackVibeLUT, sampler_GlobalTrackVibeLUT, lutUV).rgb
                    : SAMPLE_TEXTURE2D(_VibeLUT, sampler_VibeLUT, lutUV).rgb;

                half3 vibeShadowTone = (_UseGlobalVibeLUT > 0.5)
                    ? SAMPLE_TEXTURE2D(_GlobalTrackVibeLUT, sampler_GlobalTrackVibeLUT, float2(0.04, lutV)).rgb
                    : SAMPLE_TEXTURE2D(_VibeLUT, sampler_VibeLUT, float2(0.04, lutV)).rgb;

                half3 vibeHighlightTone = (_UseGlobalVibeLUT > 0.5)
                    ? SAMPLE_TEXTURE2D(_GlobalTrackVibeLUT, sampler_GlobalTrackVibeLUT, float2(0.95, lutV)).rgb
                    : SAMPLE_TEXTURE2D(_VibeLUT, sampler_VibeLUT, float2(0.95, lutV)).rgb;

                // 4. Compute Fluid Race Phase (Combines Track Zone Row, Audio Bass/Beat, Speed, Drift & Emotion)
                float audioDynamic = (_AudioSpectrum.x * 0.55 + _BeatPulse * 0.45) * _AudioColorPulseWeight;
                float fluidPhase = saturate(
                    (_VibeRowBlend * 0.55) +
                    audioDynamic +
                    (_GlobalNormalizedSpeed * 0.20) +
                    (_DriftColorShift * 0.25)
                ) * _FluidColorShiftStrength;

                float dynamicHueDeg = (_DriftColorShift * _DriftHueShiftDeg) + (_EmotionCockinessBlend * sin(_Time.y * 4.0) * 18.0);

                // 5. Evaluate Individual Car Zone Color + Fluid Race Modulation
                half3 baseZoneRGB = vibeColor;
                if (_UseCustomZoneColors > 0.5)
                {
                    half3 customCol = _BodyPrimaryColor.rgb;
                    half3 shiftCol = _BodyPrimaryShiftColor.rgb;

                    if (zoneID < 0.10)
                    {
                        // Zone 0.00: Primary Body Paint
                        customCol = _BodyPrimaryColor.rgb;
                        shiftCol = _BodyPrimaryShiftColor.rgb;
                    }
                    else if (zoneID < 0.30)
                    {
                        // Zone 0.20: Secondary Two-Tone / Panda Beltline / Overfenders / Wing / Splitter
                        customCol = _BodySecondaryColor.rgb;
                        shiftCol = _BodySecondaryShiftColor.rgb;
                    }
                    else if (zoneID < 0.50)
                    {
                        // Zone 0.40: Wheel Rims (Supports Mismatched Front vs Rear Drift Wheels like Pink Style PS13!)
                        bool isRear = (_IsRearWheel > 0.5) || (_IsRearWheel > -0.5 && IN.positionOS.z < -0.20);
                        half3 wheelBase = isRear ? _WheelRearColor.rgb : _WheelFrontColor.rgb;
                        // Chrome / Machined Lip Specular Band (Cars/01 VS-KF & Cars/05 Watanabe deep dish)
                        float viewRim = pow(1.0 - saturate(dot(normalWS, viewDirWS)), 2.0);
                        float metallicHighlight = step(0.55, viewRim + halftoneSpec * 0.35) * _WheelLipMetallic;
                        customCol = lerp(wheelBase, half3(0.96, 0.98, 1.0), metallicHighlight);
                        shiftCol = RotateHueRGB(customCol, 22.0);
                    }
                    else if (zoneID < 0.72)
                    {
                        // Zone 0.60: Interior Roll Cage & Bucket Seats (Cars/02 Neon Green Cage / Cars/06 Red Seats)
                        customCol = _InteriorCageColor.rgb;
                        shiftCol = RotateHueRGB(_InteriorCageColor.rgb, 18.0);
                    }
                    else if (zoneID < 0.88)
                    {
                        // Zone 0.80: Window Glass + Top Windshield Sun-Strip Banner (Cars/01, 03, 06, 07)
                        bool isSunStrip = (IN.uv.y > 0.88);
                        customCol = isSunStrip ? _WindshieldBannerColor.rgb : (vibeShadowTone * 0.45);
                        shiftCol = isSunStrip ? RotateHueRGB(_WindshieldBannerColor.rgb, 15.0) : customCol;
                    }
                    else
                    {
                        // Zone 1.00: Headlight Lens Tint (Cars/09 Touge Amber Yellow / Crystal / Neon) & Taillights
                        bool isFrontLight = (IN.positionOS.z >= 0.0);
                        customCol = isFrontLight ? _HeadlightTintColor.rgb : half3(1.0, 0.08, 0.22);
                        shiftCol = vibeHighlightTone;
                    }

                    // Morph between Player Base Color and Player Fluid Shift Target
                    half3 fluidCustom = lerp(customCol, shiftCol, fluidPhase);
                    if (abs(dynamicHueDeg) > 0.5)
                    {
                        fluidCustom = RotateHueRGB(fluidCustom, dynamicHueDeg);
                    }

                    // Apply Boiling Rage crimson overdrive or Untouchable Cockiness gold/cyan sheen
                    if (_EmotionRageBlend > 0.01)
                    {
                        half3 rageTone = lerp(half3(0.88, 0.05, 0.14), half3(1.0, 0.45, 0.0), _BeatPulse);
                        fluidCustom = lerp(fluidCustom, rageTone, _EmotionRageBlend * 0.40);
                    }

                    // Couple with Track Vibe LUT Atmosphere while preserving Player's Chosen Color Identity
                    half3 litZoneCol = lerp(fluidCustom, fluidCustom * (vibeColor * 1.45), _VibeAtmosphereCoupling);
                    half3 shadowZoneCol = lerp(fluidCustom * 0.36, vibeShadowTone * 0.65 + fluidCustom * 0.25, 0.55);
                    baseZoneRGB = lerp(shadowZoneCol, litZoneCol, steppedLit) * lerp(0.55, 1.0, surfaceAO);
                }

                // 6. Composite Street Graffiti / Flames / Tribal / Racing Stripe Livery Overlay (Point-Snapped)
                half4 decal = SAMPLE_TEXTURE2D(_LiveryDecalTex, sampler_LiveryDecalTex, snappedUV);
                half3 decalRGB = decal.rgb;
                if (_UseColorableLiveryMask > 0.5)
                {
                    // Multi-Layer Colorable Livery Mask (R: Layer 1 Flames/Stripe, G: Layer 2 Splash/Kanji/Doodles, B: Layer 3 Pinstripe/Keyline)
                    half3 layer1Col = lerp(_LiveryPrimaryColor.rgb, _LiveryPrimaryShiftColor.rgb, fluidPhase);
                    if (abs(dynamicHueDeg) > 0.5)
                    {
                        layer1Col = RotateHueRGB(layer1Col, dynamicHueDeg);
                    }
                    half3 layer2Col = RotateHueRGB(_LiverySecondaryColor.rgb, audioDynamic * 25.0);
                    half3 layer3Col = _LiveryOutlineColor.rgb;

                    decalRGB = half3(0.0, 0.0, 0.0);
                    decalRGB = lerp(decalRGB, layer1Col, saturate(decal.r));
                    decalRGB = lerp(decalRGB, layer2Col, saturate(decal.g));
                    decalRGB = lerp(decalRGB, layer3Col, saturate(decal.b));

                    // Shade livery crisply with Hiroshi Nagai cel step so flames/stripes wrap naturally around body creases
                    half3 decalShadow = lerp(decalRGB * 0.42, vibeShadowTone * 0.55, 0.40);
                    decalRGB = lerp(decalShadow, decalRGB * (1.05 + _BeatPulse * 0.18), steppedLit);
                }
                else if (_TintDecalsWithVibe > 0.5)
                {
                    decalRGB = decal.rgb * vibeColor * (1.35 + _BeatPulse * 0.35);
                }

                half3 finalRGB = lerp(baseZoneRGB, decalRGB, decal.a);

                // 7. Auto Modellista View-Space Windshield MatCap Specular Streaks (Zone ~ 0.80, below sun-strip banner)
                if (zoneID > 0.72 && zoneID < 0.88 && IN.uv.y <= 0.88)
                {
                    float3 normalVS = TransformWorldToViewNormal(normalWS, true);
                    float2 matcapUV = normalVS.xy * 0.5 + 0.5;
                    half3 matcapCol = SAMPLE_TEXTURE2D(_WindshieldMatCap, sampler_WindshieldMatCap, matcapUV).rgb;
                    finalRGB = lerp(finalRGB * 0.35, matcapCol * (_MatCapIntensity + _BeatPulse * 0.45), 0.85);
                }

                // 8. Audio-Reactive Rim Light, Custom Underglow & Headlight/Taillight Emissive Pulse
                // Nam_Mac signature: shadow-side electric neon rim + vertical under-chassis ambient bounce
                float shadowSideWeight = lerp(1.0, 0.35, steppedLit);
                float rimMask = step(0.72 - _BeatPulse * 0.15 - _AudioSpectrum.x * 0.10, (1.0 - saturate(dot(normalWS, viewDirWS))) * shadowSideWeight);
                half3 rimTone = (_UseCustomZoneColors > 0.5)
                    ? lerp(vibeHighlightTone, _LiveryPrimaryShiftColor.rgb, 0.45)
                    : vibeHighlightTone;
                finalRGB = lerp(finalRGB, rimTone * (1.15 + _BeatPulse * 0.45), rimMask * (0.55 + _AudioSpectrum.z * 0.35));

                // 9. Pixel_Tempys Internal Facet Crease & Panel-Seam Grease-Pencil Ink Lines
                if (_FacetCreaseInkStrength > 0.01)
                {
                    float normalJump = length(fwidth(normalWS));
                    float facetInk = smoothstep(0.18, 0.42, normalJump);
                    float seamCavityInk = smoothstep(0.45, 0.25, IN.vertColor.g);
                    float totalInternalInk = saturate(max(facetInk * 0.85, seamCavityInk * 0.90) * _FacetCreaseInkStrength);
                    finalRGB = lerp(finalRGB, _OutlineColor.rgb, totalInternalInk);
                }

                float bassPulse = 1.0 + (_AudioSpectrum.x * _EmissiveBoost) + (_BeatPulse * 1.15) + (_AudioSpectrum.w * 0.55);
                if (emissiveMask > 0.1 || zoneID > 0.92)
                {
                    bool isUnderglow = (zoneID < 0.90 && emissiveMask > 0.1);
                    half3 activeEmissive = isUnderglow
                        ? _UnderglowColor.rgb
                        : ((IN.positionOS.z >= 0.0) ? _HeadlightTintColor.rgb : half3(1.0, 0.12, 0.28));

                    if (_UseCustomZoneColors <= 0.5)
                        activeEmissive = vibeHighlightTone;

                    finalRGB += activeEmissive * max(emissiveMask, step(0.92, zoneID)) * bassPulse;
                }

                return half4(finalRGB, 1.0);
            }
            ENDHLSL
        }

        // ===================================================================
        // PASS 2: AUTO MODELLISTA INVERTED-HULL BLACK INK OUTLINE
        // Extrudes along gap-free smoothed normals stored in UV1/UV2 (or NormalOS fallback)
        // ===================================================================
        Pass
        {
            Name "Outline"
            Tags { "LightMode" = "SRPDefaultUnlit" }
            Cull Front
            ZWrite On

            HLSLPROGRAM
            #pragma vertex vertOutline
            #pragma fragment fragOutline

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float2 uv1        : TEXCOORD1; // Smoothed Normal XY (baked by exporter/postprocessor)
                float2 uv2        : TEXCOORD2; // Smoothed Normal Z + Valid Flag
                float4 color      : COLOR;     // R: Outline Thickness Multiplier
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
            };

            Varyings vertOutline(Attributes IN)
            {
                Varyings OUT;
                float3 posOS = ApplyExhaustAndMudflapFlutter(IN.positionOS.xyz, IN.color.b);

                // Reconstruct gap-free smoothed normal if baked into UV1/UV2, else fallback to normalOS
                float3 smoothNormalOS = float3(IN.uv1.x, IN.uv1.y, IN.uv2.x);
                float lenSq = dot(smoothNormalOS, smoothNormalOS);
                float3 extrudeDirOS = (lenSq > 0.1) ? normalize(smoothNormalOS) : normalize(IN.normalOS);

                // Weight outline thickness by Vertex Color Red channel (1.0 on outer arches/silhouette, 0.0 on interior)
                float vertWeight = (IN.color.r > 0.001) ? IN.color.r : 0.75;
                float4 clipPos = TransformObjectToHClip(posOS);
                float distScale = lerp(1.0, clamp(clipPos.w * 0.12, 0.6, 2.5), _DistanceScale);

                float audioExtrude = 1.0 + _BeatPulse * 0.45 + _AudioSpectrum.x * 0.28;
                posOS += extrudeDirOS * (_OutlineWidth * vertWeight * distScale * audioExtrude);
                OUT.positionCS = TransformObjectToHClip(posOS);
                return OUT;
            }

            half4 fragOutline(Varyings IN) : SV_Target
            {
                return _OutlineColor;
            }
            ENDHLSL
        }

        // ===================================================================
        // PASS 3: SHADOW CASTER (FOR RAZOR-SHARP HIROSHI NAGAI SHADOWS)
        // ===================================================================
        UsePass "Universal Render Pipeline/Lit/ShadowCaster"
        UsePass "Universal Render Pipeline/Lit/DepthOnly"
        UsePass "Universal Render Pipeline/Lit/DepthNormals"
        UsePass "Universal Render Pipeline/Lit/MotionVectors"
    }
}
