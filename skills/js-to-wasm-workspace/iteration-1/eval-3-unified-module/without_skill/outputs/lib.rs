use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Low-level helpers (not exported — inlined by the compiler)
// ---------------------------------------------------------------------------

/// Luminance weights matching the JS originals (ITU-R BT.601).
#[inline(always)]
fn luminance(r: f32, g: f32, b: f32) -> f32 {
    0.299 * r + 0.587 * g + 0.114 * b
}

#[inline(always)]
fn clamp_u8(v: f32) -> u8 {
    if v < 0.0 {
        0
    } else if v > 255.0 {
        255
    } else {
        v.round() as u8
    }
}

// --- RGB <-> HSL (mirrors the JS `rgbToHsl` / `hslToRgb`) -----------------

#[inline(always)]
fn rgb_to_hsl(r: f32, g: f32, b: f32) -> (f32, f32, f32) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    let mut h = 0.0_f32;
    let mut s = 0.0_f32;

    if (max - min).abs() > f32::EPSILON {
        let d = max - min;
        s = if l > 0.5 {
            d / (2.0 - max - min)
        } else {
            d / (max + min)
        };
        if (max - r).abs() < f32::EPSILON {
            h = ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0;
        } else if (max - g).abs() < f32::EPSILON {
            h = ((b - r) / d + 2.0) / 6.0;
        } else {
            h = ((r - g) / d + 4.0) / 6.0;
        }
    }

    (h, s, l)
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

#[inline(always)]
fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (f32, f32, f32) {
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

// ---------------------------------------------------------------------------
// Exported WASM functions — each operates on a `&mut [u8]` (RGBA pixel buffer)
// that is shared with JavaScript via WebAssembly linear memory.
// ---------------------------------------------------------------------------

/// Convert every pixel to greyscale (ITU-R BT.601 luma).
/// Matches `applyGreyscale` in image-effects.ts.
#[wasm_bindgen]
pub fn apply_greyscale(data: &mut [u8]) {
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let grey = luminance(data[i] as f32, data[i + 1] as f32, data[i + 2] as f32).round() as u8;
        data[i] = grey;
        data[i + 1] = grey;
        data[i + 2] = grey;
        // alpha (data[i+3]) is left unchanged
        i += 4;
    }
}

/// Invert RGB channels (alpha unchanged).
/// Matches `applyInvertColors` in image-effects.ts.
#[wasm_bindgen]
pub fn apply_invert_colors(data: &mut [u8]) {
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
        i += 4;
    }
}

/// Apply the scanner-effect pixel pipeline (greyscale, brightness, contrast,
/// yellowish tint, noise).  This is the per-pixel inner loop of
/// `applyScannerEffect` in image-effects.ts.
///
/// Canvas-level operations (blur, border, rotation) stay in JS because they
/// rely on the Canvas 2D API. Only the tight pixel loop is moved here.
///
/// `noise_seed` is a simple xorshift seed so that the WASM side can generate
/// deterministic pseudo-random noise without importing `Math.random`.
#[wasm_bindgen]
pub fn apply_scanner_pixels(
    data: &mut [u8],
    grayscale: bool,
    brightness: f32,
    contrast: f32,
    yellowish: f32,
    scaled_noise: f32,
    noise_seed: u32,
) {
    let contrast_factor = if contrast.abs() > f32::EPSILON {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    let yellow_intensity = yellowish / 50.0;

    // Simple xorshift32 PRNG — fast, no allocation, deterministic.
    let mut rng_state: u32 = if noise_seed == 0 { 0xDEAD_BEEF } else { noise_seed };

    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let mut r = data[i] as f32;
        let mut g = data[i + 1] as f32;
        let mut b = data[i + 2] as f32;

        if grayscale {
            let grey = luminance(r, g, b).round();
            r = grey;
            g = grey;
            b = grey;
        }

        if brightness.abs() > f32::EPSILON {
            r += brightness;
            g += brightness;
            b += brightness;
        }

        if contrast.abs() > f32::EPSILON {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        if yellowish > f32::EPSILON {
            r += 20.0 * yellow_intensity;
            g += 12.0 * yellow_intensity;
            b -= 15.0 * yellow_intensity;
        }

        if scaled_noise > f32::EPSILON {
            // xorshift32
            rng_state ^= rng_state << 13;
            rng_state ^= rng_state >> 17;
            rng_state ^= rng_state << 5;
            // Map to [-0.5, 0.5) range then scale
            let n = ((rng_state as f32) / (u32::MAX as f32) - 0.5) * scaled_noise;
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

/// Apply the full "adjust colours" pixel pipeline (brightness, contrast,
/// saturation, hue shift, temperature, tint, gamma, sepia).
/// Matches the per-pixel loop in `applyColorAdjustments` in image-effects.ts.
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
    let contrast_factor = if contrast.abs() > f32::EPSILON {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    let gamma_correction = if (gamma - 1.0).abs() > f32::EPSILON {
        1.0 / gamma
    } else {
        1.0
    };
    let sepia_amount = sepia / 100.0;
    let brightness_adj = brightness * 2.55;
    let temp_factor = temperature / 50.0;
    let tint_factor = tint / 50.0;

    let do_brightness = brightness.abs() > f32::EPSILON;
    let do_contrast = contrast.abs() > f32::EPSILON;
    let do_hsl = saturation.abs() > f32::EPSILON || hue_shift.abs() > f32::EPSILON;
    let do_temperature = temperature.abs() > f32::EPSILON;
    let do_tint = tint.abs() > f32::EPSILON;
    let do_gamma = (gamma - 1.0).abs() > f32::EPSILON;
    let do_sepia = sepia > f32::EPSILON;

    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let mut r = data[i] as f32;
        let mut g = data[i + 1] as f32;
        let mut b = data[i + 2] as f32;

        // Brightness
        if do_brightness {
            r += brightness_adj;
            g += brightness_adj;
            b += brightness_adj;
        }

        // Contrast
        if do_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Saturation & hue shift (via HSL round-trip)
        if do_hsl {
            let cr = clamp_u8(r) as f32;
            let cg = clamp_u8(g) as f32;
            let cb = clamp_u8(b) as f32;
            let (hue, sat, lig) = rgb_to_hsl(cr, cg, cb);

            let mut new_hue = hue;
            if hue_shift.abs() > f32::EPSILON {
                new_hue = (hue + hue_shift / 360.0) % 1.0;
                if new_hue < 0.0 {
                    new_hue += 1.0;
                }
            }

            let mut new_sat = sat;
            if saturation.abs() > f32::EPSILON {
                let sat_adj = saturation / 100.0;
                new_sat = if sat_adj > 0.0 {
                    sat + (1.0 - sat) * sat_adj
                } else {
                    sat * (1.0 + sat_adj)
                };
                new_sat = new_sat.clamp(0.0, 1.0);
            }

            let (nr, ng, nb) = hsl_to_rgb(new_hue, new_sat, lig);
            r = nr;
            g = ng;
            b = nb;
        }

        // Temperature
        if do_temperature {
            r += 30.0 * temp_factor;
            b -= 30.0 * temp_factor;
        }

        // Tint
        if do_tint {
            g += 30.0 * tint_factor;
        }

        // Gamma
        if do_gamma {
            let cr = clamp_u8(r) as f32;
            let cg = clamp_u8(g) as f32;
            let cb = clamp_u8(b) as f32;
            r = (cr / 255.0).powf(gamma_correction) * 255.0;
            g = (cg / 255.0).powf(gamma_correction) * 255.0;
            b = (cb / 255.0).powf(gamma_correction) * 255.0;
        }

        // Sepia
        if do_sepia {
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

/// Apply brightness + contrast only (a subset callers may need independently).
#[wasm_bindgen]
pub fn apply_brightness_contrast(data: &mut [u8], brightness: f32, contrast: f32) {
    let contrast_factor = if contrast.abs() > f32::EPSILON {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let mut r = data[i] as f32 + brightness;
        let mut g = data[i + 1] as f32 + brightness;
        let mut b = data[i + 2] as f32 + brightness;

        if contrast.abs() > f32::EPSILON {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        data[i] = clamp_u8(r);
        data[i + 1] = clamp_u8(g);
        data[i + 2] = clamp_u8(b);
        i += 4;
    }
}

/// Apply sepia tone at a given intensity (0..100).
#[wasm_bindgen]
pub fn apply_sepia(data: &mut [u8], intensity: f32) {
    let amount = intensity / 100.0;
    let len = data.len();
    let mut i = 0;
    while i + 3 < len {
        let r = data[i] as f32;
        let g = data[i + 1] as f32;
        let b = data[i + 2] as f32;

        let sr = 0.393 * r + 0.769 * g + 0.189 * b;
        let sg = 0.349 * r + 0.686 * g + 0.168 * b;
        let sb = 0.272 * r + 0.534 * g + 0.131 * b;

        data[i] = clamp_u8(r + (sr - r) * amount);
        data[i + 1] = clamp_u8(g + (sg - g) * amount);
        data[i + 2] = clamp_u8(b + (sb - b) * amount);
        i += 4;
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greyscale_basic() {
        // Pure red pixel (255, 0, 0, 255)
        let mut data = vec![255, 0, 0, 255];
        apply_greyscale(&mut data);
        // 0.299 * 255 ≈ 76
        assert_eq!(data[0], 76);
        assert_eq!(data[1], 76);
        assert_eq!(data[2], 76);
        assert_eq!(data[3], 255); // alpha unchanged
    }

    #[test]
    fn invert_basic() {
        let mut data = vec![100, 150, 200, 255];
        apply_invert_colors(&mut data);
        assert_eq!(data[0], 155);
        assert_eq!(data[1], 105);
        assert_eq!(data[2], 55);
        assert_eq!(data[3], 255); // alpha unchanged
    }

    #[test]
    fn sepia_zero_intensity_is_noop() {
        let original = vec![100, 150, 200, 255];
        let mut data = original.clone();
        apply_sepia(&mut data, 0.0);
        assert_eq!(data, original);
    }

    #[test]
    fn brightness_contrast_identity() {
        let original = vec![100, 150, 200, 255];
        let mut data = original.clone();
        apply_brightness_contrast(&mut data, 0.0, 0.0);
        assert_eq!(data, original);
    }

    #[test]
    fn scanner_pixels_greyscale_only() {
        let mut data = vec![255, 0, 0, 255];
        apply_scanner_pixels(&mut data, true, 0.0, 0.0, 0.0, 0.0, 0);
        assert_eq!(data[0], 76);
        assert_eq!(data[1], 76);
        assert_eq!(data[2], 76);
    }

    #[test]
    fn color_adjustments_identity() {
        let original = vec![100, 150, 200, 255];
        let mut data = original.clone();
        apply_color_adjustments(&mut data, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        assert_eq!(data, original);
    }
}
