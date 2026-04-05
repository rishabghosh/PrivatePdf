use wasm_bindgen::prelude::*;
use serde::Deserialize;

/// Settings for the scanner effect pixel kernel.
///
/// These fields match the subset of `ScanSettings` from TypeScript that
/// affect per-pixel processing. The blur, border, and rotation settings
/// are handled by Canvas APIs on the JS side and are NOT included here.
#[derive(Deserialize, Default, Clone)]
pub struct ScannerPixelSettings {
    /// Whether to convert the image to grayscale.
    pub grayscale: bool,
    /// Brightness offset applied to each channel (typically -100..100).
    pub brightness: f32,
    /// Contrast value. 0 = no change. The contrast factor is computed from this.
    pub contrast: f32,
    /// Yellowish tint intensity (0..100). Adds warm color cast.
    pub yellowish: f32,
    /// Noise intensity (already scaled by DPI scale on the JS side).
    /// 0 = no noise. Higher values add more random noise.
    pub scaled_noise: f32,
    /// Random seed for deterministic noise generation.
    /// If 0, a simple PRNG seeded from pixel position is used.
    pub noise_seed: u32,
}

/// Simple xorshift32 PRNG for deterministic noise.
///
/// This replaces `Math.random()` from the JS version so that noise is
/// reproducible given the same seed, which is useful for testing parity.
#[inline]
fn xorshift32(state: &mut u32) -> f32 {
    let mut x = *state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *state = x;
    // Convert to float in range [-0.5, 0.5)
    (x as f32 / u32::MAX as f32) - 0.5
}

/// Apply the scanner effect pixel kernel to an RGBA pixel buffer.
///
/// This function handles: grayscale conversion, brightness adjustment,
/// contrast adjustment, yellowish tint, and random noise. These are the
/// per-pixel operations from `applyScannerEffect` in `image-effects.ts`.
///
/// The blur (Canvas filter), border (gradient fills), and rotation
/// (Canvas transform) remain in JS because they depend on Canvas 2D APIs.
///
/// # Arguments
/// * `pixels` - RGBA pixel buffer (4 bytes per pixel, length must be multiple of 4)
/// * `settings_js` - A `JsValue` that deserializes to `ScannerPixelSettings`
///
/// # Returns
/// The processed pixel buffer as `Vec<u8>`, same length as input.
#[wasm_bindgen]
pub fn apply_scanner_pixel_kernel(pixels: &[u8], settings_js: JsValue) -> Result<Vec<u8>, JsError> {
    let settings: ScannerPixelSettings = serde_wasm_bindgen::from_value(settings_js)
        .map_err(|e| JsError::new(&format!("Invalid scanner pixel settings: {}", e)))?;

    if pixels.len() % 4 != 0 {
        return Err(JsError::new("Pixel buffer length must be a multiple of 4 (RGBA)"));
    }

    Ok(process_scanner_pixels(pixels, &settings))
}

/// Pure processing function (no WASM/JS dependencies) for testability.
pub fn process_scanner_pixels(pixels: &[u8], settings: &ScannerPixelSettings) -> Vec<u8> {
    let mut output = pixels.to_vec();
    let len = output.len();

    // Precompute contrast factor outside the loop (same formula as JS)
    let contrast_factor: f32 = if settings.contrast != 0.0 {
        (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
    } else {
        1.0
    };

    // Precompute yellowish intensity
    let yellowish_intensity: f32 = settings.yellowish / 50.0;
    let has_yellowish = settings.yellowish > 0.0;

    // Initialize PRNG state. Use the seed if provided, otherwise default to a
    // position-based seed so noise varies across pixels.
    let mut rng_state: u32 = if settings.noise_seed != 0 {
        settings.noise_seed
    } else {
        2463534242 // default xorshift seed
    };

    let has_noise = settings.scaled_noise > 0.0;
    let has_brightness = settings.brightness != 0.0;
    let has_contrast = settings.contrast != 0.0;

    let mut i = 0;
    while i + 3 < len {
        let mut r = output[i] as f32;
        let mut g = output[i + 1] as f32;
        let mut b = output[i + 2] as f32;
        // Alpha (output[i + 3]) is passed through unchanged.

        // 1. Grayscale conversion using standard luminance weights
        if settings.grayscale {
            let grey = (0.299 * r + 0.587 * g + 0.114 * b).round();
            r = grey;
            g = grey;
            b = grey;
        }

        // 2. Brightness: simple additive offset
        if has_brightness {
            r += settings.brightness;
            g += settings.brightness;
            b += settings.brightness;
        }

        // 3. Contrast: standard formula centered on 128
        if has_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // 4. Yellowish tint: warm color shift
        if has_yellowish {
            r += 20.0 * yellowish_intensity;
            g += 12.0 * yellowish_intensity;
            b -= 15.0 * yellowish_intensity;
        }

        // 5. Random noise
        if has_noise {
            let n = xorshift32(&mut rng_state) * settings.scaled_noise;
            r += n;
            g += n;
            b += n;
        }

        // Clamp to [0, 255]
        output[i] = clamp_u8(r);
        output[i + 1] = clamp_u8(g);
        output[i + 2] = clamp_u8(b);

        i += 4;
    }

    output
}

/// Clamp a float to 0..255 and convert to u8.
#[inline]
fn clamp_u8(v: f32) -> u8 {
    v.max(0.0).min(255.0) as u8
}

// ─── Tests ───────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn default_settings() -> ScannerPixelSettings {
        ScannerPixelSettings {
            grayscale: false,
            brightness: 0.0,
            contrast: 0.0,
            yellowish: 0.0,
            scaled_noise: 0.0,
            noise_seed: 0,
        }
    }

    #[test]
    fn test_clamp_u8() {
        assert_eq!(clamp_u8(-10.0), 0);
        assert_eq!(clamp_u8(128.5), 128);
        assert_eq!(clamp_u8(300.0), 255);
        assert_eq!(clamp_u8(0.0), 0);
        assert_eq!(clamp_u8(255.0), 255);
    }

    #[test]
    fn test_passthrough_no_effects() {
        let pixels = vec![100, 150, 200, 255, 50, 75, 100, 128];
        let settings = default_settings();
        let result = process_scanner_pixels(&pixels, &settings);
        assert_eq!(result, pixels);
    }

    #[test]
    fn test_grayscale() {
        let pixels = vec![100, 150, 200, 255];
        let settings = ScannerPixelSettings {
            grayscale: true,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        // grey = round(0.299*100 + 0.587*150 + 0.114*200) = round(29.9 + 88.05 + 22.8) = round(140.75) = 141
        assert_eq!(result[0], 141);
        assert_eq!(result[1], 141);
        assert_eq!(result[2], 141);
        assert_eq!(result[3], 255); // alpha unchanged
    }

    #[test]
    fn test_brightness_positive() {
        let pixels = vec![100, 100, 100, 255];
        let settings = ScannerPixelSettings {
            brightness: 50.0,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        assert_eq!(result[0], 150);
        assert_eq!(result[1], 150);
        assert_eq!(result[2], 150);
    }

    #[test]
    fn test_brightness_clamps() {
        let pixels = vec![200, 200, 200, 255];
        let settings = ScannerPixelSettings {
            brightness: 100.0,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        assert_eq!(result[0], 255); // clamped
        assert_eq!(result[1], 255);
        assert_eq!(result[2], 255);
    }

    #[test]
    fn test_contrast() {
        let pixels = vec![100, 200, 50, 255];
        let settings = ScannerPixelSettings {
            contrast: 50.0,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        // contrast_factor = (259 * (50 + 255)) / (255 * (259 - 50))
        //                 = (259 * 305) / (255 * 209) = 79045 / 53295 ~= 1.4832
        let cf: f32 = (259.0 * 305.0) / (255.0 * 209.0);
        let r_expected = clamp_u8(cf * (100.0 - 128.0) + 128.0);
        let g_expected = clamp_u8(cf * (200.0 - 128.0) + 128.0);
        let b_expected = clamp_u8(cf * (50.0 - 128.0) + 128.0);
        assert_eq!(result[0], r_expected);
        assert_eq!(result[1], g_expected);
        assert_eq!(result[2], b_expected);
    }

    #[test]
    fn test_yellowish_tint() {
        let pixels = vec![100, 100, 100, 255];
        let settings = ScannerPixelSettings {
            yellowish: 50.0,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        // intensity = 50/50 = 1.0
        // r = 100 + 20*1 = 120, g = 100 + 12*1 = 112, b = 100 - 15*1 = 85
        assert_eq!(result[0], 120);
        assert_eq!(result[1], 112);
        assert_eq!(result[2], 85);
    }

    #[test]
    fn test_noise_deterministic_with_seed() {
        let pixels = vec![128, 128, 128, 255, 128, 128, 128, 255];
        let settings = ScannerPixelSettings {
            scaled_noise: 20.0,
            noise_seed: 42,
            ..default_settings()
        };
        let result1 = process_scanner_pixels(&pixels, &settings);
        let result2 = process_scanner_pixels(&pixels, &settings);
        // Same seed should produce identical results
        assert_eq!(result1, result2);
    }

    #[test]
    fn test_noise_changes_pixels() {
        let pixels = vec![128, 128, 128, 255];
        let settings = ScannerPixelSettings {
            scaled_noise: 50.0,
            noise_seed: 12345,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        // At least one channel should differ from the input (noise > 0)
        let any_changed = result[0] != 128 || result[1] != 128 || result[2] != 128;
        assert!(any_changed, "Noise should change at least one pixel value");
        // Alpha should be unchanged
        assert_eq!(result[3], 255);
    }

    #[test]
    fn test_combined_grayscale_brightness_yellowish() {
        let pixels = vec![100, 150, 200, 255];
        let settings = ScannerPixelSettings {
            grayscale: true,
            brightness: 20.0,
            yellowish: 25.0,
            ..default_settings()
        };
        let result = process_scanner_pixels(&pixels, &settings);
        // Step 1: grayscale -> grey = round(0.299*100 + 0.587*150 + 0.114*200) = 141
        // Step 2: brightness -> 141 + 20 = 161 for all channels
        // Step 3: yellowish intensity = 25/50 = 0.5
        //   r = 161 + 20*0.5 = 171, g = 161 + 12*0.5 = 167, b = 161 - 15*0.5 = 153.5 -> 153
        assert_eq!(result[0], 171);
        assert_eq!(result[1], 167);
        assert_eq!(result[2], 153);
    }

    #[test]
    fn test_alpha_preserved() {
        let pixels = vec![100, 100, 100, 128, 200, 200, 200, 0];
        let settings = ScannerPixelSettings {
            grayscale: true,
            brightness: 30.0,
            contrast: 20.0,
            yellowish: 40.0,
            scaled_noise: 10.0,
            noise_seed: 99,
        };
        let result = process_scanner_pixels(&pixels, &settings);
        assert_eq!(result[3], 128); // first pixel alpha
        assert_eq!(result[7], 0);   // second pixel alpha
    }

    #[test]
    fn test_empty_buffer() {
        let pixels: Vec<u8> = vec![];
        let settings = default_settings();
        let result = process_scanner_pixels(&pixels, &settings);
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_xorshift_distribution() {
        // Verify the PRNG produces reasonable values in [-0.5, 0.5)
        let mut state: u32 = 42;
        let mut sum: f32 = 0.0;
        let n = 10000;
        for _ in 0..n {
            let v = xorshift32(&mut state);
            assert!(v >= -0.5 && v < 0.5, "xorshift value {} out of range", v);
            sum += v;
        }
        // Mean should be roughly 0
        let mean = sum / n as f32;
        assert!(mean.abs() < 0.05, "xorshift mean {} is too far from 0", mean);
    }
}
