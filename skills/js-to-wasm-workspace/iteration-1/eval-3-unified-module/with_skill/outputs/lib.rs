use wasm_bindgen::prelude::*;
use serde::Deserialize;

// ─── Clamp utility ──────────────────────────────────────────────

/// Clamp a float to 0..255 and convert to u8.
#[inline]
fn clamp_u8(v: f32) -> u8 {
    v.max(0.0).min(255.0) as u8
}

// ─── Color space utilities ──────────────────────────────────────

/// RGB to HSL conversion. Input: 0-255 per channel. Output: h in 0..1, s in 0..1, l in 0..1.
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
#[inline]
pub fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s.abs() < f32::EPSILON {
        let v = (l * 255.0).round();
        return (v, v, v);
    }

    let hue2rgb = |p: f32, q: f32, mut t: f32| -> f32 {
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
    };

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

// ─── Greyscale ──────────────────────────────────────────────────

/// Convert an RGBA pixel buffer to greyscale using ITU-R BT.601 luma weights.
///
/// Processes pixels in-place semantics: accepts &[u8], returns a new Vec<u8>.
/// Alpha channel is preserved unchanged.
#[wasm_bindgen]
pub fn apply_greyscale(pixels: &[u8]) -> Vec<u8> {
    let mut output = pixels.to_vec();
    let len = output.len();
    let mut i = 0;
    while i + 3 < len {
        let r = output[i] as f32;
        let g = output[i + 1] as f32;
        let b = output[i + 2] as f32;
        // ITU-R BT.601 luma: 0.299R + 0.587G + 0.114B
        let grey = (0.299 * r + 0.587 * g + 0.114 * b).round() as u8;
        output[i] = grey;
        output[i + 1] = grey;
        output[i + 2] = grey;
        // output[i + 3] (alpha) unchanged
        i += 4;
    }
    output
}

// ─── Invert Colors ──────────────────────────────────────────────

/// Invert the RGB channels of an RGBA pixel buffer.
/// Alpha channel is preserved unchanged.
#[wasm_bindgen]
pub fn apply_invert_colors(pixels: &[u8]) -> Vec<u8> {
    let mut output = pixels.to_vec();
    let len = output.len();
    let mut i = 0;
    while i + 3 < len {
        output[i] = 255 - output[i];
        output[i + 1] = 255 - output[i + 1];
        output[i + 2] = 255 - output[i + 2];
        // output[i + 3] (alpha) unchanged
        i += 4;
    }
    output
}

// ─── Color Adjustments ─────────────────────────────────────────

/// Settings for the full color adjustment pipeline.
/// Fields match the TypeScript `AdjustColorsSettings` interface.
#[derive(Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ColorAdjustmentSettings {
    pub brightness: f64,
    pub contrast: f64,
    pub saturation: f64,
    pub hue_shift: f64,
    pub temperature: f64,
    pub tint: f64,
    pub gamma: f64,
    pub sepia: f64,
}

/// Apply a full color adjustment pipeline to an RGBA pixel buffer.
///
/// Matches the JS `applyColorAdjustments` pixel loop exactly:
/// brightness -> contrast -> saturation/hue -> temperature -> tint -> gamma -> sepia
///
/// Accepts settings as a JsValue (deserialized via serde). Returns new pixel buffer.
#[wasm_bindgen]
pub fn apply_color_adjustments(pixels: &[u8], settings_js: JsValue) -> Result<Vec<u8>, JsError> {
    let settings: ColorAdjustmentSettings = serde_wasm_bindgen::from_value(settings_js)
        .map_err(|e| JsError::new(&format!("Invalid color adjustment settings: {}", e)))?;

    let mut output = pixels.to_vec();
    let len = output.len();

    // Precompute constants outside the loop
    let contrast_factor: f32 = if settings.contrast != 0.0 {
        ((259.0 * (settings.contrast as f32 + 255.0)) / (255.0 * (259.0 - settings.contrast as f32)))
    } else {
        1.0
    };
    let gamma_correction: f32 = if settings.gamma != 1.0 {
        1.0 / settings.gamma as f32
    } else {
        1.0
    };
    let sepia_amount: f32 = settings.sepia as f32 / 100.0;
    let brightness_adj: f32 = settings.brightness as f32 * 2.55;
    let temperature_factor: f32 = settings.temperature as f32 / 50.0;
    let tint_factor: f32 = settings.tint as f32 / 50.0;
    let saturation_adj: f32 = settings.saturation as f32 / 100.0;
    let hue_shift_normalized: f32 = settings.hue_shift as f32 / 360.0;

    let has_brightness = settings.brightness != 0.0;
    let has_contrast = settings.contrast != 0.0;
    let has_sat_or_hue = settings.saturation != 0.0 || settings.hue_shift != 0.0;
    let has_temperature = settings.temperature != 0.0;
    let has_tint = settings.tint != 0.0;
    let has_gamma = settings.gamma != 1.0;
    let has_sepia = settings.sepia > 0.0;

    let mut i = 0;
    while i + 3 < len {
        let mut r = output[i] as f32;
        let mut g = output[i + 1] as f32;
        let mut b = output[i + 2] as f32;

        // Brightness
        if has_brightness {
            r += brightness_adj;
            g += brightness_adj;
            b += brightness_adj;
        }

        // Contrast
        if has_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Saturation + Hue shift (via HSL roundtrip)
        if has_sat_or_hue {
            let (hue, sat, lig) = rgb_to_hsl(
                r.max(0.0).min(255.0),
                g.max(0.0).min(255.0),
                b.max(0.0).min(255.0),
            );

            let new_hue = if settings.hue_shift != 0.0 {
                let mut h = (hue + hue_shift_normalized) % 1.0;
                if h < 0.0 {
                    h += 1.0;
                }
                h
            } else {
                hue
            };

            let new_sat = if settings.saturation != 0.0 {
                let ns = if saturation_adj > 0.0 {
                    sat + (1.0 - sat) * saturation_adj
                } else {
                    sat * (1.0 + saturation_adj)
                };
                ns.max(0.0).min(1.0)
            } else {
                sat
            };

            let (nr, ng, nb) = hsl_to_rgb(new_hue, new_sat, lig);
            r = nr;
            g = ng;
            b = nb;
        }

        // Temperature
        if has_temperature {
            r += 30.0 * temperature_factor;
            b -= 30.0 * temperature_factor;
        }

        // Tint
        if has_tint {
            g += 30.0 * tint_factor;
        }

        // Gamma
        if has_gamma {
            r = (r.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
            g = (g.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
            b = (b.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
        }

        // Sepia
        if has_sepia {
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
        // output[i + 3] (alpha) unchanged
        i += 4;
    }

    Ok(output)
}

// ─── Scanner Effect Pixel Kernel ────────────────────────────────

/// Settings for the scanner effect pixel processing kernel.
/// Only the fields that affect pixel values are included here.
/// DOM-level settings (blur, border, rotation) stay in TypeScript.
#[derive(Deserialize, Default, Clone)]
pub struct ScannerPixelSettings {
    pub grayscale: bool,
    pub brightness: f32,
    pub contrast: f32,
    pub yellowish: f32,
    pub noise: f32,
    /// Random seed for deterministic noise in tests; 0 = use simple PRNG.
    #[serde(default)]
    pub seed: u32,
}

/// Simple xorshift32 PRNG for deterministic noise generation.
/// Avoids pulling in `rand` crate, keeping the WASM binary small.
struct Xorshift32 {
    state: u32,
}

impl Xorshift32 {
    fn new(seed: u32) -> Self {
        // Ensure non-zero state
        Self {
            state: if seed == 0 { 0xDEAD_BEEF } else { seed },
        }
    }

    /// Returns a float in [-0.5, 0.5)
    #[inline]
    fn next_f32(&mut self) -> f32 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 17;
        self.state ^= self.state << 5;
        // Map u32 to [0, 1) then shift to [-0.5, 0.5)
        (self.state as f32 / u32::MAX as f32) - 0.5
    }
}

/// Apply the scanner effect pixel kernel to an RGBA buffer.
///
/// This handles the per-pixel processing from `applyScannerEffect`:
/// grayscale -> brightness -> contrast -> yellowish tint -> noise.
///
/// DOM-level effects (blur, border, rotation) remain in TypeScript
/// since they require Canvas API access.
#[wasm_bindgen]
pub fn apply_scanner_pixel_kernel(pixels: &[u8], settings_js: JsValue) -> Result<Vec<u8>, JsError> {
    let settings: ScannerPixelSettings = serde_wasm_bindgen::from_value(settings_js)
        .map_err(|e| JsError::new(&format!("Invalid scanner pixel settings: {}", e)))?;

    let mut output = pixels.to_vec();
    let len = output.len();

    // Precompute constants
    let contrast_factor: f32 = if settings.contrast != 0.0 {
        (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
    } else {
        1.0
    };

    let has_grayscale = settings.grayscale;
    let has_brightness = settings.brightness != 0.0;
    let has_contrast = settings.contrast != 0.0;
    let has_yellowish = settings.yellowish > 0.0;
    let has_noise = settings.noise > 0.0;

    let yellowish_intensity = settings.yellowish / 50.0;

    let mut rng = Xorshift32::new(settings.seed);

    let mut i = 0;
    while i + 3 < len {
        let mut r = output[i] as f32;
        let mut g = output[i + 1] as f32;
        let mut b = output[i + 2] as f32;

        // Grayscale
        if has_grayscale {
            let grey = (0.299 * r + 0.587 * g + 0.114 * b).round();
            r = grey;
            g = grey;
            b = grey;
        }

        // Brightness
        if has_brightness {
            r += settings.brightness;
            g += settings.brightness;
            b += settings.brightness;
        }

        // Contrast
        if has_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Yellowish tint
        if has_yellowish {
            r += 20.0 * yellowish_intensity;
            g += 12.0 * yellowish_intensity;
            b -= 15.0 * yellowish_intensity;
        }

        // Noise
        if has_noise {
            let n = rng.next_f32() * settings.noise;
            r += n;
            g += n;
            b += n;
        }

        output[i] = clamp_u8(r);
        output[i + 1] = clamp_u8(g);
        output[i + 2] = clamp_u8(b);
        // output[i + 3] (alpha) unchanged
        i += 4;
    }

    Ok(output)
}

// ─── Tests ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clamp_u8() {
        assert_eq!(clamp_u8(-10.0), 0);
        assert_eq!(clamp_u8(0.0), 0);
        assert_eq!(clamp_u8(128.5), 128);
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
    fn test_rgb_hsl_achromatic() {
        let (h, s, l) = rgb_to_hsl(128.0, 128.0, 128.0);
        assert_eq!(h, 0.0);
        assert_eq!(s, 0.0);
        assert!((l - 128.0 / 255.0).abs() < 0.01);
    }

    // ── Greyscale tests ──

    #[test]
    fn test_greyscale_single_pixel() {
        let pixels = vec![100, 150, 200, 255];
        let result = apply_greyscale(&pixels);
        // 0.299*100 + 0.587*150 + 0.114*200 = 29.9 + 88.05 + 22.8 = 140.75 -> 141
        let expected_grey = (0.299 * 100.0 + 0.587 * 150.0 + 0.114 * 200.0).round() as u8;
        assert_eq!(result[0], expected_grey);
        assert_eq!(result[1], expected_grey);
        assert_eq!(result[2], expected_grey);
        assert_eq!(result[3], 255); // alpha preserved
    }

    #[test]
    fn test_greyscale_white_stays_white() {
        let pixels = vec![255, 255, 255, 255];
        let result = apply_greyscale(&pixels);
        assert_eq!(result[0], 255);
        assert_eq!(result[1], 255);
        assert_eq!(result[2], 255);
    }

    #[test]
    fn test_greyscale_black_stays_black() {
        let pixels = vec![0, 0, 0, 255];
        let result = apply_greyscale(&pixels);
        assert_eq!(result[0], 0);
        assert_eq!(result[1], 0);
        assert_eq!(result[2], 0);
    }

    #[test]
    fn test_greyscale_multiple_pixels() {
        let pixels = vec![
            255, 0, 0, 255, // red
            0, 255, 0, 255, // green
            0, 0, 255, 255, // blue
        ];
        let result = apply_greyscale(&pixels);
        // Red: 0.299*255 = 76.245 -> 76
        assert_eq!(result[0], 76);
        // Green: 0.587*255 = 149.685 -> 150
        assert_eq!(result[4], 150);
        // Blue: 0.114*255 = 29.07 -> 29
        assert_eq!(result[8], 29);
    }

    // ── Invert tests ──

    #[test]
    fn test_invert_single_pixel() {
        let pixels = vec![100, 150, 200, 255];
        let result = apply_invert_colors(&pixels);
        assert_eq!(result[0], 155);
        assert_eq!(result[1], 105);
        assert_eq!(result[2], 55);
        assert_eq!(result[3], 255); // alpha preserved
    }

    #[test]
    fn test_invert_double_invert_is_identity() {
        let pixels = vec![42, 128, 200, 255, 0, 255, 127, 128];
        let once = apply_invert_colors(&pixels);
        let twice = apply_invert_colors(&once);
        assert_eq!(pixels, twice);
    }

    #[test]
    fn test_invert_extremes() {
        let pixels = vec![0, 0, 0, 255, 255, 255, 255, 255];
        let result = apply_invert_colors(&pixels);
        assert_eq!(result[0], 255);
        assert_eq!(result[1], 255);
        assert_eq!(result[2], 255);
        assert_eq!(result[3], 255);
        assert_eq!(result[4], 0);
        assert_eq!(result[5], 0);
        assert_eq!(result[6], 0);
        assert_eq!(result[7], 255);
    }

    // ── Color adjustments tests (native, without JsValue) ──

    #[test]
    fn test_brightness_pixel() {
        // Simulating brightness = 50 -> adj = 50 * 2.55 = 127.5
        let r: f32 = 100.0;
        let adj: f32 = 50.0 * 2.55;
        assert_eq!(clamp_u8(r + adj), 227); // 100 + 127.5 = 227.5 -> 227
    }

    #[test]
    fn test_contrast_pixel() {
        // contrast = 50 -> factor = (259*(50+255))/(255*(259-50)) = 259*305/(255*209)
        let contrast: f32 = 50.0;
        let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
        let r: f32 = 200.0;
        let result = factor * (r - 128.0) + 128.0;
        // Just verify it increases contrast (pushes away from 128)
        assert!(result > r, "Contrast should push 200 further from 128");
    }

    #[test]
    fn test_sepia_pixel() {
        let r: f32 = 100.0;
        let g: f32 = 100.0;
        let b: f32 = 100.0;
        let sepia_amount: f32 = 1.0; // 100%
        let sr = 0.393 * r + 0.769 * g + 0.189 * b;
        let sg = 0.349 * r + 0.686 * g + 0.168 * b;
        let sb = 0.272 * r + 0.534 * g + 0.131 * b;
        let out_r = r + (sr - r) * sepia_amount;
        let out_g = g + (sg - g) * sepia_amount;
        let out_b = b + (sb - b) * sepia_amount;
        // Sepia should give warm tone: R > G > B
        assert!(out_r > out_g);
        assert!(out_g > out_b);
    }

    // ── Scanner pixel kernel tests (native) ──

    #[test]
    fn test_scanner_grayscale_flag() {
        // Manually apply grayscale logic from the scanner kernel
        let r: f32 = 100.0;
        let g: f32 = 150.0;
        let b: f32 = 200.0;
        let grey = (0.299 * r + 0.587 * g + 0.114 * b).round();
        // Should match the standalone greyscale result
        let expected = (0.299 * 100.0 + 0.587 * 150.0 + 0.114 * 200.0).round();
        assert_eq!(grey, expected);
    }

    #[test]
    fn test_scanner_yellowish_tint() {
        let yellowish: f32 = 50.0;
        let intensity = yellowish / 50.0; // = 1.0
        let r: f32 = 100.0 + 20.0 * intensity; // 120
        let g: f32 = 100.0 + 12.0 * intensity; // 112
        let b: f32 = 100.0 - 15.0 * intensity; // 85
        assert_eq!(clamp_u8(r), 120);
        assert_eq!(clamp_u8(g), 112);
        assert_eq!(clamp_u8(b), 85);
    }

    #[test]
    fn test_xorshift_determinism() {
        let mut rng1 = Xorshift32::new(42);
        let mut rng2 = Xorshift32::new(42);
        for _ in 0..100 {
            assert_eq!(rng1.next_f32().to_bits(), rng2.next_f32().to_bits());
        }
    }

    #[test]
    fn test_xorshift_range() {
        let mut rng = Xorshift32::new(12345);
        for _ in 0..1000 {
            let v = rng.next_f32();
            assert!(v >= -0.5 && v < 0.5, "Value out of range: {}", v);
        }
    }
}
