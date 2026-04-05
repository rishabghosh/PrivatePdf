use wasm_bindgen::prelude::*;
use serde::Deserialize;

// ─── Settings struct ────────────────────────────────────────────────
// Matches the TypeScript `AdjustColorsSettings` interface exactly.
// Fields use camelCase via serde rename to match the JS object keys.

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColorSettings {
    pub brightness: f32,
    pub contrast: f32,
    pub saturation: f32,
    pub hue_shift: f32,
    pub temperature: f32,
    pub tint: f32,
    pub gamma: f32,
    pub sepia: f32,
}

impl Default for ColorSettings {
    fn default() -> Self {
        Self {
            brightness: 0.0,
            contrast: 0.0,
            saturation: 0.0,
            hue_shift: 0.0,
            temperature: 0.0,
            tint: 0.0,
            gamma: 1.0,
            sepia: 0.0,
        }
    }
}

// ─── Main WASM entry point ──────────────────────────────────────────
//
// Accepts an RGBA pixel buffer and a settings JsValue (deserialized into
// ColorSettings). Returns the processed pixel buffer as Vec<u8>.
//
// This is a direct port of `applyColorAdjustments` from image-effects.ts,
// with the canvas/DOM interaction removed. The caller is responsible for
// reading pixels from an ImageData and writing the result back.

#[wasm_bindgen]
pub fn apply_color_adjustments(pixels: &[u8], settings_js: JsValue) -> Result<Vec<u8>, JsError> {
    let settings: ColorSettings = serde_wasm_bindgen::from_value(settings_js)
        .map_err(|e| JsError::new(&format!("Invalid settings: {}", e)))?;

    let mut output = pixels.to_vec();
    let len = output.len();

    // Precompute constants outside the loop — same as the JS version
    let contrast_factor: f32 = if settings.contrast != 0.0 {
        (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
    } else {
        1.0
    };

    let gamma_correction: f32 = if settings.gamma != 1.0 {
        1.0 / settings.gamma
    } else {
        1.0
    };

    let sepia_amount: f32 = settings.sepia / 100.0;

    let brightness_adj: f32 = settings.brightness * 2.55;
    let temperature_adj: f32 = settings.temperature / 50.0;
    let tint_adj: f32 = settings.tint / 50.0;

    // Pre-check which adjustments are active to skip branches in the hot loop
    let do_brightness = settings.brightness != 0.0;
    let do_contrast = settings.contrast != 0.0;
    let do_hsl = settings.saturation != 0.0 || settings.hue_shift != 0.0;
    let do_temperature = settings.temperature != 0.0;
    let do_tint = settings.tint != 0.0;
    let do_gamma = settings.gamma != 1.0;
    let do_sepia = settings.sepia > 0.0;

    let mut i = 0;
    while i + 3 < len {
        let mut r = output[i] as f32;
        let mut g = output[i + 1] as f32;
        let mut b = output[i + 2] as f32;
        // Alpha at output[i + 3] — passed through unchanged

        // 1. Brightness
        if do_brightness {
            r += brightness_adj;
            g += brightness_adj;
            b += brightness_adj;
        }

        // 2. Contrast
        if do_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // 3. HSL hue/saturation shift
        if do_hsl {
            let (h, s, l) = rgb_to_hsl(
                clamp_f32(r, 0.0, 255.0),
                clamp_f32(g, 0.0, 255.0),
                clamp_f32(b, 0.0, 255.0),
            );

            let new_hue = if settings.hue_shift != 0.0 {
                let mut nh = (h + settings.hue_shift / 360.0) % 1.0;
                if nh < 0.0 {
                    nh += 1.0;
                }
                nh
            } else {
                h
            };

            let new_sat = if settings.saturation != 0.0 {
                let sat_adj = settings.saturation / 100.0;
                let ns = if sat_adj > 0.0 {
                    s + (1.0 - s) * sat_adj
                } else {
                    s * (1.0 + sat_adj)
                };
                clamp_f32(ns, 0.0, 1.0)
            } else {
                s
            };

            let (nr, ng, nb) = hsl_to_rgb(new_hue, new_sat, l);
            r = nr;
            g = ng;
            b = nb;
        }

        // 4. Temperature (warm/cool shift)
        if do_temperature {
            r += 30.0 * temperature_adj;
            b -= 30.0 * temperature_adj;
        }

        // 5. Tint (green/magenta shift)
        if do_tint {
            g += 30.0 * tint_adj;
        }

        // 6. Gamma correction
        if do_gamma {
            r = (clamp_f32(r, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
            g = (clamp_f32(g, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
            b = (clamp_f32(b, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
        }

        // 7. Sepia tone
        if do_sepia {
            let sr = 0.393 * r + 0.769 * g + 0.189 * b;
            let sg = 0.349 * r + 0.686 * g + 0.168 * b;
            let sb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r + (sr - r) * sepia_amount;
            g = g + (sg - g) * sepia_amount;
            b = b + (sb - b) * sepia_amount;
        }

        // Final clamp and write back
        output[i] = clamp_u8(r);
        output[i + 1] = clamp_u8(g);
        output[i + 2] = clamp_u8(b);
        // output[i + 3] unchanged (alpha)

        i += 4;
    }

    Ok(output)
}

// ─── Color space utilities ──────────────────────────────────────────

/// Clamp a float to 0..255 and convert to u8.
#[inline(always)]
fn clamp_u8(v: f32) -> u8 {
    v.max(0.0).min(255.0).round() as u8
}

/// Clamp a float to an arbitrary range.
#[inline(always)]
fn clamp_f32(v: f32, min: f32, max: f32) -> f32 {
    v.max(min).min(max)
}

/// RGB to HSL conversion. Input: 0-255 per channel. Output: h in 0..1, s in 0..1, l in 0..1.
/// Matches the JS `rgbToHsl` function in image-effects.ts exactly.
#[inline]
pub fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f32::EPSILON {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };

    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

/// HSL to RGB conversion. Input: h, s, l all in 0..1. Output: 0-255 per channel.
/// Matches the JS `hslToRgb` function in image-effects.ts exactly.
#[inline]
pub fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s.abs() < f32::EPSILON {
        let v = (l * 255.0).round();
        return (v, v, v);
    }

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;

    (
        (hue2rgb(p, q, h + 1.0 / 3.0) * 255.0).round(),
        (hue2rgb(p, q, h) * 255.0).round(),
        (hue2rgb(p, q, h - 1.0 / 3.0) * 255.0).round(),
    )
}

#[inline(always)]
fn hue2rgb(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 {
        t += 1.0;
    }
    if t > 1.0 {
        t -= 1.0;
    }
    if t < 1.0 / 6.0 {
        return p + (q - p) * 6.0 * t;
    }
    if t < 0.5 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

// ─── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_settings(overrides: impl FnOnce(&mut ColorSettings)) -> ColorSettings {
        let mut s = ColorSettings::default();
        overrides(&mut s);
        s
    }

    #[test]
    fn test_clamp_u8() {
        assert_eq!(clamp_u8(-10.0), 0);
        assert_eq!(clamp_u8(0.0), 0);
        assert_eq!(clamp_u8(128.4), 128);
        assert_eq!(clamp_u8(128.5), 129); // round() rounds .5 up
        assert_eq!(clamp_u8(255.0), 255);
        assert_eq!(clamp_u8(300.0), 255);
    }

    #[test]
    fn test_rgb_hsl_roundtrip() {
        let (h, s, l) = rgb_to_hsl(100.0, 150.0, 200.0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 100.0).abs() <= 1.0, "r: expected ~100, got {}", r);
        assert!((g - 150.0).abs() <= 1.0, "g: expected ~150, got {}", g);
        assert!((b - 200.0).abs() <= 1.0, "b: expected ~200, got {}", b);
    }

    #[test]
    fn test_rgb_hsl_roundtrip_pure_red() {
        let (h, s, l) = rgb_to_hsl(255.0, 0.0, 0.0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 255.0).abs() <= 1.0);
        assert!((g - 0.0).abs() <= 1.0);
        assert!((b - 0.0).abs() <= 1.0);
    }

    #[test]
    fn test_rgb_hsl_roundtrip_grey() {
        let (h, s, l) = rgb_to_hsl(128.0, 128.0, 128.0);
        assert_eq!(h, 0.0);
        assert_eq!(s, 0.0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 128.0).abs() <= 1.0);
        assert!((g - 128.0).abs() <= 1.0);
        assert!((b - 128.0).abs() <= 1.0);
    }

    #[test]
    fn test_brightness_single_pixel() {
        let pixels = vec![100, 100, 100, 255];
        let settings = make_settings(|s| s.brightness = 50.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // 100 + 50*2.55 = 100 + 127.5 = 227.5 -> round() = 228
        assert_eq!(result[0], 228);
        assert_eq!(result[1], 228);
        assert_eq!(result[2], 228);
        assert_eq!(result[3], 255); // alpha unchanged
    }

    #[test]
    fn test_negative_brightness() {
        let pixels = vec![50, 50, 50, 255];
        let settings = make_settings(|s| s.brightness = -30.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // 50 + (-30 * 2.55) = 50 - 76.5 = -26.5 -> clamped to 0
        assert_eq!(result[0], 0);
        assert_eq!(result[3], 255);
    }

    #[test]
    fn test_contrast_increase() {
        let pixels = vec![200, 100, 50, 255];
        let settings = make_settings(|s| s.contrast = 50.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        let factor = (259.0 * (50.0 + 255.0)) / (255.0 * (259.0 - 50.0));
        let expected_r = (factor * (200.0 - 128.0) + 128.0).max(0.0).min(255.0).round() as u8;
        assert_eq!(result[0], expected_r);
    }

    #[test]
    fn test_gamma_correction() {
        let pixels = vec![128, 128, 128, 255];
        let settings = make_settings(|s| s.gamma = 2.2);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // (128/255)^(1/2.2) * 255
        let expected = ((128.0_f32 / 255.0).powf(1.0 / 2.2) * 255.0).round() as u8;
        assert_eq!(result[0], expected);
    }

    #[test]
    fn test_sepia_full() {
        let pixels = vec![100, 150, 200, 255];
        let settings = make_settings(|s| s.sepia = 100.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // Full sepia: use the sepia matrix
        let sr = (0.393 * 100.0 + 0.769 * 150.0 + 0.189 * 200.0).min(255.0).round() as u8;
        let sg = (0.349 * 100.0 + 0.686 * 150.0 + 0.168 * 200.0).min(255.0).round() as u8;
        let sb = (0.272 * 100.0 + 0.534 * 150.0 + 0.131 * 200.0).min(255.0).round() as u8;
        assert_eq!(result[0], sr);
        assert_eq!(result[1], sg);
        assert_eq!(result[2], sb);
    }

    #[test]
    fn test_temperature_warm() {
        let pixels = vec![128, 128, 128, 255];
        let settings = make_settings(|s| s.temperature = 50.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // t = 50/50 = 1.0; r += 30, b -= 30
        assert_eq!(result[0], 158); // 128 + 30
        assert_eq!(result[1], 128); // unchanged
        assert_eq!(result[2], 98);  // 128 - 30
    }

    #[test]
    fn test_tint() {
        let pixels = vec![128, 128, 128, 255];
        let settings = make_settings(|s| s.tint = 50.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        // t = 50/50 = 1.0; g += 30
        assert_eq!(result[0], 128); // unchanged
        assert_eq!(result[1], 158); // 128 + 30
        assert_eq!(result[2], 128); // unchanged
    }

    #[test]
    fn test_no_adjustments_passthrough() {
        let pixels = vec![10, 20, 30, 255, 200, 150, 100, 128];
        let settings = ColorSettings::default();

        let result = apply_color_adjustments_native(&pixels, &settings);
        assert_eq!(result, pixels);
    }

    #[test]
    fn test_alpha_preserved() {
        let pixels = vec![100, 100, 100, 42]; // alpha = 42
        let settings = make_settings(|s| {
            s.brightness = 50.0;
            s.contrast = 30.0;
            s.sepia = 50.0;
        });

        let result = apply_color_adjustments_native(&pixels, &settings);
        assert_eq!(result[3], 42); // alpha must be unchanged
    }

    #[test]
    fn test_multiple_pixels() {
        let pixels = vec![
            255, 0, 0, 255,   // red pixel
            0, 255, 0, 255,   // green pixel
            0, 0, 255, 255,   // blue pixel
        ];
        let settings = make_settings(|s| s.brightness = 10.0);

        let result = apply_color_adjustments_native(&pixels, &settings);
        assert_eq!(result.len(), 12);
        // Red pixel: 255 + 25.5 = 280.5 -> clamped to 255
        assert_eq!(result[0], 255);
        // Green channel of red pixel: 0 + 25.5 = 25.5 -> 26
        assert_eq!(result[1], 26);
    }

    // Helper to call the core logic directly in native tests (without JsValue)
    fn apply_color_adjustments_native(pixels: &[u8], settings: &ColorSettings) -> Vec<u8> {
        let mut output = pixels.to_vec();
        let len = output.len();

        let contrast_factor: f32 = if settings.contrast != 0.0 {
            (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
        } else {
            1.0
        };
        let gamma_correction: f32 = if settings.gamma != 1.0 { 1.0 / settings.gamma } else { 1.0 };
        let sepia_amount: f32 = settings.sepia / 100.0;
        let brightness_adj: f32 = settings.brightness * 2.55;
        let temperature_adj: f32 = settings.temperature / 50.0;
        let tint_adj: f32 = settings.tint / 50.0;

        let do_brightness = settings.brightness != 0.0;
        let do_contrast = settings.contrast != 0.0;
        let do_hsl = settings.saturation != 0.0 || settings.hue_shift != 0.0;
        let do_temperature = settings.temperature != 0.0;
        let do_tint = settings.tint != 0.0;
        let do_gamma = settings.gamma != 1.0;
        let do_sepia = settings.sepia > 0.0;

        let mut i = 0;
        while i + 3 < len {
            let mut r = output[i] as f32;
            let mut g = output[i + 1] as f32;
            let mut b = output[i + 2] as f32;

            if do_brightness {
                r += brightness_adj;
                g += brightness_adj;
                b += brightness_adj;
            }
            if do_contrast {
                r = contrast_factor * (r - 128.0) + 128.0;
                g = contrast_factor * (g - 128.0) + 128.0;
                b = contrast_factor * (b - 128.0) + 128.0;
            }
            if do_hsl {
                let (h, s, l) = rgb_to_hsl(
                    clamp_f32(r, 0.0, 255.0),
                    clamp_f32(g, 0.0, 255.0),
                    clamp_f32(b, 0.0, 255.0),
                );
                let new_hue = if settings.hue_shift != 0.0 {
                    let mut nh = (h + settings.hue_shift / 360.0) % 1.0;
                    if nh < 0.0 { nh += 1.0; }
                    nh
                } else { h };
                let new_sat = if settings.saturation != 0.0 {
                    let sat_adj = settings.saturation / 100.0;
                    let ns = if sat_adj > 0.0 { s + (1.0 - s) * sat_adj } else { s * (1.0 + sat_adj) };
                    clamp_f32(ns, 0.0, 1.0)
                } else { s };
                let (nr, ng, nb) = hsl_to_rgb(new_hue, new_sat, l);
                r = nr;
                g = ng;
                b = nb;
            }
            if do_temperature {
                r += 30.0 * temperature_adj;
                b -= 30.0 * temperature_adj;
            }
            if do_tint {
                g += 30.0 * tint_adj;
            }
            if do_gamma {
                r = (clamp_f32(r, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
                g = (clamp_f32(g, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
                b = (clamp_f32(b, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
            }
            if do_sepia {
                let sr = 0.393 * r + 0.769 * g + 0.189 * b;
                let sg = 0.349 * r + 0.686 * g + 0.168 * b;
                let sb = 0.272 * r + 0.534 * g + 0.131 * b;
                r = r + (sr - r) * sepia_amount;
                g = g + (sg - g) * sepia_amount;
                b = b + (sb - b) * sepia_amount;
            }

            output[i] = clamp_u8(r);
            output[i + 1] = clamp_u8(g);
            output[i + 2] = clamp_u8(b);
            i += 4;
        }

        output
    }
}
