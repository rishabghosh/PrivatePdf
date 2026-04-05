// Rust crate: bentopdf-image-effects
// A unified WASM module for all pixel-level image processing operations.
// Compile with: wasm-pack build --target web --out-dir pkg

use wasm_bindgen::prelude::*;

/// Apply luminance-weighted greyscale conversion in-place.
/// Weights: R=0.299, G=0.587, B=0.114 (ITU-R BT.601)
/// The alpha channel is preserved.
///
/// `data` must be a RGBA pixel buffer (length divisible by 4).
#[wasm_bindgen]
pub fn apply_greyscale(data: &mut [u8]) {
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;
        let grey = (0.299 * r + 0.587 * g + 0.114 * b).round() as u8;
        data[i] = grey;
        data[i + 1] = grey;
        data[i + 2] = grey;
        // data[i + 3] (alpha) untouched
        i += 4;
    }
}

/// Invert RGB channels in-place (255 - value). Alpha is preserved.
///
/// `data` must be a RGBA pixel buffer (length divisible by 4).
#[wasm_bindgen]
pub fn apply_invert_colors(data: &mut [u8]) {
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
        // data[i + 3] (alpha) untouched
        i += 4;
    }
}

/// Apply brightness adjustment in-place.
/// `brightness` is an additive offset applied to each RGB channel.
/// Typical range: -255 to 255. Values are clamped to [0, 255].
#[wasm_bindgen]
pub fn apply_brightness(data: &mut [u8], brightness: f32) {
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = clamp_u8(data[i] as f32 + brightness);
        data[i + 1] = clamp_u8(data[i + 1] as f32 + brightness);
        data[i + 2] = clamp_u8(data[i + 2] as f32 + brightness);
        i += 4;
    }
}

/// Apply contrast adjustment in-place.
/// `contrast` is the raw contrast value (the same as used in the JS version).
/// Formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
/// Each channel: new = factor * (old - 128) + 128, clamped to [0, 255].
#[wasm_bindgen]
pub fn apply_contrast(data: &mut [u8], contrast: f32) {
    if contrast == 0.0 {
        return;
    }
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = clamp_u8(factor * (data[i] as f32 - 128.0) + 128.0);
        data[i + 1] = clamp_u8(factor * (data[i + 1] as f32 - 128.0) + 128.0);
        data[i + 2] = clamp_u8(factor * (data[i + 2] as f32 - 128.0) + 128.0);
        i += 4;
    }
}

/// Apply sepia tone in-place.
/// `amount` is 0.0 (no sepia) to 1.0 (full sepia).
#[wasm_bindgen]
pub fn apply_sepia(data: &mut [u8], amount: f32) {
    if amount <= 0.0 {
        return;
    }
    let amt = if amount > 1.0 { 1.0 } else { amount };
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        let sr = 0.393 * r + 0.769 * g + 0.189 * b;
        let sg = 0.349 * r + 0.686 * g + 0.168 * b;
        let sb = 0.272 * r + 0.534 * g + 0.131 * b;

        data[i] = clamp_u8(r + (sr - r) * amt);
        data[i + 1] = clamp_u8(g + (sg - g) * amt);
        data[i + 2] = clamp_u8(b + (sb - b) * amt);
        i += 4;
    }
}

/// Apply gamma correction in-place.
/// `gamma` is the gamma value (1.0 = no change). The correction exponent is 1/gamma.
#[wasm_bindgen]
pub fn apply_gamma(data: &mut [u8], gamma: f32) {
    if gamma == 1.0 {
        return;
    }
    let correction = 1.0 / gamma;
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = clamp_u8((data[i] as f32 / 255.0).powf(correction) * 255.0);
        data[i + 1] = clamp_u8((data[i + 1] as f32 / 255.0).powf(correction) * 255.0);
        data[i + 2] = clamp_u8((data[i + 2] as f32 / 255.0).powf(correction) * 255.0);
        i += 4;
    }
}

/// Apply color temperature shift in-place.
/// `temperature` is the raw setting value. Internally divided by 50 and scaled by 30.
/// Positive = warmer (more red, less blue), negative = cooler.
#[wasm_bindgen]
pub fn apply_temperature(data: &mut [u8], temperature: f32) {
    if temperature == 0.0 {
        return;
    }
    let t = temperature / 50.0;
    let r_adj = 30.0 * t;
    let b_adj = -30.0 * t;
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = clamp_u8(data[i] as f32 + r_adj);
        data[i + 2] = clamp_u8(data[i + 2] as f32 + b_adj);
        i += 4;
    }
}

/// Apply tint shift in-place.
/// `tint` is the raw setting value. Internally divided by 50 and scaled by 30.
/// Positive = more green, negative = less green.
#[wasm_bindgen]
pub fn apply_tint(data: &mut [u8], tint: f32) {
    if tint == 0.0 {
        return;
    }
    let t = tint / 50.0;
    let g_adj = 30.0 * t;
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i + 1] = clamp_u8(data[i + 1] as f32 + g_adj);
        i += 4;
    }
}

/// Apply yellowish tinting in-place (used by scanner effect).
/// `yellowish` is 0-50 range. The intensity is yellowish / 50.
#[wasm_bindgen]
pub fn apply_yellowish(data: &mut [u8], yellowish: f32) {
    if yellowish <= 0.0 {
        return;
    }
    let intensity = yellowish / 50.0;
    let r_adj = 20.0 * intensity;
    let g_adj = 12.0 * intensity;
    let b_adj = -15.0 * intensity;
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = clamp_u8(data[i] as f32 + r_adj);
        data[i + 1] = clamp_u8(data[i + 1] as f32 + g_adj);
        data[i + 2] = clamp_u8(data[i + 2] as f32 + b_adj);
        i += 4;
    }
}

/// Combined scanner-effect pixel pipeline.
/// Applies greyscale (if flag set), brightness, contrast, yellowish tint,
/// and noise in a single pass over the pixel buffer.
///
/// `noise_amount` controls noise intensity. When > 0, a simple deterministic
/// noise is applied (using a fast LCG PRNG seeded from pixel index) to avoid
/// needing JS random. This produces visually similar grain to Math.random().
#[wasm_bindgen]
pub fn apply_scanner_pixels(
    data: &mut [u8],
    grayscale: bool,
    brightness: f32,
    contrast: f32,
    yellowish: f32,
    noise_amount: f32,
) {
    let contrast_factor = if contrast != 0.0 {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    let yellow_intensity = if yellowish > 0.0 {
        yellowish / 50.0
    } else {
        0.0
    };

    let mut rng_state: u32 = 0x12345678;
    let len = data.len();
    let mut i = 0;

    while i + 3 < len {
        let mut r = data[i] as f32;
        let mut g = data[i + 1] as f32;
        let mut b = data[i + 2] as f32;

        // Greyscale
        if grayscale {
            let grey = (0.299 * r + 0.587 * g + 0.114 * b).round();
            r = grey;
            g = grey;
            b = grey;
        }

        // Brightness
        if brightness != 0.0 {
            r += brightness;
            g += brightness;
            b += brightness;
        }

        // Contrast
        if contrast != 0.0 {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Yellowish tint
        if yellow_intensity > 0.0 {
            r += 20.0 * yellow_intensity;
            g += 12.0 * yellow_intensity;
            b -= 15.0 * yellow_intensity;
        }

        // Noise (deterministic PRNG for reproducibility in WASM)
        if noise_amount > 0.0 {
            rng_state = rng_state.wrapping_mul(1664525).wrapping_add(1013904223);
            let rand_val = ((rng_state >> 16) as f32 / 65535.0) - 0.5;
            let n = rand_val * noise_amount;
            r += n;
            g += n;
            b += n;
        }

        data[i] = clamp_u8(r);
        data[i + 1] = clamp_u8(g);
        data[i + 2] = clamp_u8(b);
        i += 4;
    }
}

/// Combined color-adjustment pixel pipeline.
/// Applies brightness, contrast, hue/saturation shift, temperature, tint,
/// gamma, and sepia in a single pass. This mirrors the JS `applyColorAdjustments`
/// function but runs the entire per-pixel loop in WASM.
///
/// Parameters match the `AdjustColorsSettings` interface:
/// - brightness: -100..100 (internally scaled by 2.55)
/// - contrast: -255..255
/// - saturation: -100..100
/// - hue_shift: -180..180
/// - temperature: -100..100
/// - tint: -100..100
/// - gamma: 0.1..3.0 (1.0 = no change)
/// - sepia: 0..100
#[wasm_bindgen]
pub fn apply_color_adjustments(
    data: &mut [u8],
    brightness: f32,
    contrast: f32,
    saturation: f32,
    hue_shift: f32,
    temperature: f32,
    tint: f32,
    gamma: f32,
    sepia: f32,
) {
    let contrast_factor = if contrast != 0.0 {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };
    let gamma_correction = if gamma != 1.0 { 1.0 / gamma } else { 1.0 };
    let sepia_amount = sepia / 100.0;
    let has_hue_sat = saturation != 0.0 || hue_shift != 0.0;
    let temp_factor = temperature / 50.0;
    let tint_factor = tint / 50.0;

    let len = data.len();
    let mut i = 0;

    while i + 3 < len {
        let mut r = data[i] as f32;
        let mut g = data[i + 1] as f32;
        let mut b = data[i + 2] as f32;

        // Brightness
        if brightness != 0.0 {
            let adj = brightness * 2.55;
            r += adj;
            g += adj;
            b += adj;
        }

        // Contrast
        if contrast != 0.0 {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Hue/Saturation
        if has_hue_sat {
            let cr = clamp_f32(r, 0.0, 255.0);
            let cg = clamp_f32(g, 0.0, 255.0);
            let cb = clamp_f32(b, 0.0, 255.0);
            let (mut hue, mut sat, lig) = rgb_to_hsl(cr, cg, cb);

            if hue_shift != 0.0 {
                hue = (hue + hue_shift / 360.0) % 1.0;
                if hue < 0.0 {
                    hue += 1.0;
                }
            }

            if saturation != 0.0 {
                let sat_adj = saturation / 100.0;
                sat = if sat_adj > 0.0 {
                    sat + (1.0 - sat) * sat_adj
                } else {
                    sat * (1.0 + sat_adj)
                };
                sat = clamp_f32(sat, 0.0, 1.0);
            }

            let (nr, ng, nb) = hsl_to_rgb(hue, sat, lig);
            r = nr;
            g = ng;
            b = nb;
        }

        // Temperature
        if temperature != 0.0 {
            r += 30.0 * temp_factor;
            b -= 30.0 * temp_factor;
        }

        // Tint
        if tint != 0.0 {
            g += 30.0 * tint_factor;
        }

        // Gamma
        if gamma != 1.0 {
            r = (clamp_f32(r, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
            g = (clamp_f32(g, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
            b = (clamp_f32(b, 0.0, 255.0) / 255.0).powf(gamma_correction) * 255.0;
        }

        // Sepia
        if sepia > 0.0 {
            let sr = 0.393 * r + 0.769 * g + 0.189 * b;
            let sg = 0.349 * r + 0.686 * g + 0.168 * b;
            let sb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r + (sr - r) * sepia_amount;
            g = g + (sg - g) * sepia_amount;
            b = b + (sb - b) * sepia_amount;
        }

        data[i] = clamp_u8(r);
        data[i + 1] = clamp_u8(g);
        data[i + 2] = clamp_u8(b);
        i += 4;
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

#[inline(always)]
fn clamp_u8(val: f32) -> u8 {
    if val <= 0.0 {
        0
    } else if val >= 255.0 {
        255
    } else {
        val.round() as u8
    }
}

#[inline(always)]
fn clamp_f32(val: f32, min: f32, max: f32) -> f32 {
    if val < min {
        min
    } else if val > max {
        max
    } else {
        val
    }
}

/// Convert RGB (0-255) to HSL (h: 0-1, s: 0-1, l: 0-1).
/// Matches the JS `rgbToHsl` function exactly.
fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let r_n = r / 255.0;
    let g_n = g / 255.0;
    let b_n = b / 255.0;

    let max = f32::max(r_n, f32::max(g_n, b_n));
    let min = f32::min(r_n, f32::min(g_n, b_n));
    let l = (max + min) / 2.0;
    let mut h: f32 = 0.0;
    let mut s: f32 = 0.0;

    if (max - min).abs() > f32::EPSILON {
        let d = max - min;
        s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };

        if (max - r_n).abs() < f32::EPSILON {
            h = ((g_n - b_n) / d + if g_n < b_n { 6.0 } else { 0.0 }) / 6.0;
        } else if (max - g_n).abs() < f32::EPSILON {
            h = ((b_n - r_n) / d + 2.0) / 6.0;
        } else {
            h = ((r_n - g_n) / d + 4.0) / 6.0;
        }
    }

    (h, s, l)
}

/// Convert HSL (h: 0-1, s: 0-1, l: 0-1) to RGB (0-255).
/// Matches the JS `hslToRgb` function exactly.
fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
    if s == 0.0 {
        let v = (l * 255.0).round();
        return (v, v, v);
    }

    let q = if l < 0.5 {
        l * (1.0 + s)
    } else {
        l + s - l * s
    };
    let p = 2.0 * l - q;

    let r = (hue2rgb(p, q, h + 1.0 / 3.0) * 255.0).round();
    let g = (hue2rgb(p, q, h) * 255.0).round();
    let b = (hue2rgb(p, q, h - 1.0 / 3.0) * 255.0).round();

    (r, g, b)
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
    if t < 1.0 / 2.0 {
        return q;
    }
    if t < 2.0 / 3.0 {
        return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    }
    p
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_greyscale_red_pixel() {
        let mut data = vec![255, 0, 0, 255];
        apply_greyscale(&mut data);
        let expected = (0.299 * 255.0).round() as u8;
        assert_eq!(data[0], expected);
        assert_eq!(data[1], expected);
        assert_eq!(data[2], expected);
        assert_eq!(data[3], 255); // alpha preserved
    }

    #[test]
    fn test_greyscale_white() {
        let mut data = vec![255, 255, 255, 255];
        apply_greyscale(&mut data);
        assert_eq!(data[0], 255);
        assert_eq!(data[1], 255);
        assert_eq!(data[2], 255);
    }

    #[test]
    fn test_greyscale_black() {
        let mut data = vec![0, 0, 0, 255];
        apply_greyscale(&mut data);
        assert_eq!(data[0], 0);
        assert_eq!(data[1], 0);
        assert_eq!(data[2], 0);
    }

    #[test]
    fn test_invert_black_to_white() {
        let mut data = vec![0, 0, 0, 255];
        apply_invert_colors(&mut data);
        assert_eq!(data[0], 255);
        assert_eq!(data[1], 255);
        assert_eq!(data[2], 255);
        assert_eq!(data[3], 255); // alpha preserved
    }

    #[test]
    fn test_invert_white_to_black() {
        let mut data = vec![255, 255, 255, 255];
        apply_invert_colors(&mut data);
        assert_eq!(data[0], 0);
        assert_eq!(data[1], 0);
        assert_eq!(data[2], 0);
    }

    #[test]
    fn test_double_invert_is_identity() {
        let mut data = vec![42, 128, 200, 255];
        apply_invert_colors(&mut data);
        apply_invert_colors(&mut data);
        assert_eq!(data[0], 42);
        assert_eq!(data[1], 128);
        assert_eq!(data[2], 200);
    }

    #[test]
    fn test_brightness_positive() {
        let mut data = vec![100, 100, 100, 255];
        apply_brightness(&mut data, 50.0);
        assert_eq!(data[0], 150);
        assert_eq!(data[1], 150);
        assert_eq!(data[2], 150);
    }

    #[test]
    fn test_brightness_clamps() {
        let mut data = vec![250, 10, 100, 255];
        apply_brightness(&mut data, 20.0);
        assert_eq!(data[0], 255); // clamped
        assert_eq!(data[1], 30);
    }

    #[test]
    fn test_sepia_zero_is_noop() {
        let mut data = vec![100, 150, 200, 255];
        let original = data.clone();
        apply_sepia(&mut data, 0.0);
        assert_eq!(data, original);
    }

    #[test]
    fn test_rgb_hsl_roundtrip() {
        let test_colors: Vec<(f32, f32, f32)> = vec![
            (255.0, 0.0, 0.0),
            (0.0, 255.0, 0.0),
            (0.0, 0.0, 255.0),
            (128.0, 128.0, 128.0),
        ];
        for (r, g, b) in test_colors {
            let (h, s, l) = rgb_to_hsl(r, g, b);
            let (r2, g2, b2) = hsl_to_rgb(h, s, l);
            assert!((r - r2).abs() < 2.0, "R mismatch for ({}, {}, {}): got {}", r, g, b, r2);
            assert!((g - g2).abs() < 2.0, "G mismatch for ({}, {}, {}): got {}", r, g, b, g2);
            assert!((b - b2).abs() < 2.0, "B mismatch for ({}, {}, {}): got {}", r, g, b, b2);
        }
    }

    #[test]
    fn test_multi_pixel_greyscale() {
        let mut data = vec![
            255, 0, 0, 255,   // red
            0, 255, 0, 255,   // green
            0, 0, 255, 255,   // blue
        ];
        apply_greyscale(&mut data);
        // Each pixel's R==G==B after greyscale
        assert_eq!(data[0], data[1]);
        assert_eq!(data[0], data[2]);
        assert_eq!(data[4], data[5]);
        assert_eq!(data[4], data[6]);
        assert_eq!(data[8], data[9]);
        assert_eq!(data[8], data[10]);
    }
}
