use wasm_bindgen::prelude::*;

/// Clamp a floating-point value to [0, 255] and round to u8.
#[inline(always)]
fn clamp_u8(v: f64) -> u8 {
    if v <= 0.0 {
        0
    } else if v >= 255.0 {
        255
    } else {
        v.round() as u8
    }
}

/// Convert RGB [0..255] to HSL where H in [0..1], S in [0..1], L in [0..1].
#[inline(always)]
fn rgb_to_hsl(r: f64, g: f64, b: f64) -> (f64, f64, f64) {
    let r = r / 255.0;
    let g = g / 255.0;
    let b = b / 255.0;

    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;

    if (max - min).abs() < f64::EPSILON {
        return (0.0, 0.0, l);
    }

    let d = max - min;
    let s = if l > 0.5 {
        d / (2.0 - max - min)
    } else {
        d / (max + min)
    };

    let h = if (max - r).abs() < f64::EPSILON {
        let mut h = (g - b) / d;
        if g < b {
            h += 6.0;
        }
        h / 6.0
    } else if (max - g).abs() < f64::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };

    (h, s, l)
}

/// Helper for HSL-to-RGB conversion.
#[inline(always)]
fn hue2rgb(p: f64, q: f64, mut t: f64) -> f64 {
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

/// Convert HSL (all in [0..1]) back to RGB [0..255].
#[inline(always)]
fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (f64, f64, f64) {
    if s.abs() < f64::EPSILON {
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

/// Apply the full color-adjustment pipeline to an RGBA pixel buffer in-place.
///
/// `data` must be a `Uint8ClampedArray` (length = width * height * 4).
/// Parameters mirror `AdjustColorsSettings` from TypeScript:
///   brightness  [-100 .. 100]
///   contrast    [-255 .. 255]
///   saturation  [-100 .. 100]
///   hue_shift   [-180 .. 180]  (degrees)
///   temperature [-100 .. 100]
///   tint        [-100 .. 100]
///   gamma       [0.1 .. 5.0]   (1.0 = no change)
///   sepia       [0 .. 100]
#[wasm_bindgen]
pub fn apply_color_adjustments(
    data: &mut [u8],
    brightness: f64,
    contrast: f64,
    saturation: f64,
    hue_shift: f64,
    temperature: f64,
    tint: f64,
    gamma: f64,
    sepia: f64,
) {
    let len = data.len();
    if len % 4 != 0 {
        return;
    }

    // Pre-compute constants (same as the JS version).
    let contrast_factor = if contrast != 0.0 {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    let gamma_correction = if (gamma - 1.0).abs() > f64::EPSILON {
        1.0 / gamma
    } else {
        1.0
    };

    let sepia_amount = sepia / 100.0;

    let do_brightness = brightness != 0.0;
    let do_contrast = contrast != 0.0;
    let do_hsl = saturation != 0.0 || hue_shift != 0.0;
    let do_temperature = temperature != 0.0;
    let do_tint = tint != 0.0;
    let do_gamma = (gamma - 1.0).abs() > f64::EPSILON;
    let do_sepia = sepia > 0.0;

    // Pre-compute gamma LUT when gamma correction is active.
    // A 256-entry lookup table avoids per-pixel pow() calls.
    let gamma_lut: Option<[u8; 256]> = if do_gamma {
        let mut lut = [0u8; 256];
        for i in 0..256 {
            lut[i] = clamp_u8((i as f64 / 255.0).powf(gamma_correction) * 255.0);
        }
        Some(lut)
    } else {
        None
    };

    let brightness_adj = brightness * 2.55;
    let temp_factor = temperature / 50.0;
    let tint_factor = tint / 50.0;
    let sat_adj = saturation / 100.0;

    let mut i = 0;
    while i < len {
        let mut r = data[i] as f64;
        let mut g = data[i + 1] as f64;
        let mut b = data[i + 2] as f64;
        // Alpha (data[i+3]) is untouched.

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
            let clamped_r = r.max(0.0).min(255.0);
            let clamped_g = g.max(0.0).min(255.0);
            let clamped_b = b.max(0.0).min(255.0);

            let (hue, sat, lig) = rgb_to_hsl(clamped_r, clamped_g, clamped_b);

            let new_hue = if hue_shift != 0.0 {
                let mut h = (hue + hue_shift / 360.0) % 1.0;
                if h < 0.0 {
                    h += 1.0;
                }
                h
            } else {
                hue
            };

            let new_sat = if saturation != 0.0 {
                let ns = if sat_adj > 0.0 {
                    sat + (1.0 - sat) * sat_adj
                } else {
                    sat * (1.0 + sat_adj)
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

        // 4. Temperature
        if do_temperature {
            r += 30.0 * temp_factor;
            b -= 30.0 * temp_factor;
        }

        // 5. Tint
        if do_tint {
            g += 30.0 * tint_factor;
        }

        // 6. Gamma correction (via LUT)
        if let Some(ref lut) = gamma_lut {
            r = lut[clamp_u8(r) as usize] as f64;
            g = lut[clamp_u8(g) as usize] as f64;
            b = lut[clamp_u8(b) as usize] as f64;
        }

        // 7. Sepia
        if do_sepia {
            let sr = 0.393 * r + 0.769 * g + 0.189 * b;
            let sg = 0.349 * r + 0.686 * g + 0.168 * b;
            let sb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r + (sr - r) * sepia_amount;
            g = g + (sg - g) * sepia_amount;
            b = b + (sb - b) * sepia_amount;
        }

        // Final clamp and write back.
        data[i] = clamp_u8(r);
        data[i + 1] = clamp_u8(g);
        data[i + 2] = clamp_u8(b);

        i += 4;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_identity_no_adjustments() {
        // All settings at neutral: pixel should be unchanged.
        let mut data: Vec<u8> = vec![128, 64, 200, 255];
        apply_color_adjustments(&mut data, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        assert_eq!(data, vec![128, 64, 200, 255]);
    }

    #[test]
    fn test_brightness_increase() {
        let mut data: Vec<u8> = vec![100, 100, 100, 255];
        apply_color_adjustments(&mut data, 50.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        // brightness 50 => adj = 50 * 2.55 = 127.5 => 100 + 127.5 = 227.5 => 228
        assert_eq!(data[0], 228);
        assert_eq!(data[1], 228);
        assert_eq!(data[2], 228);
        assert_eq!(data[3], 255); // alpha unchanged
    }

    #[test]
    fn test_full_sepia() {
        let mut data: Vec<u8> = vec![100, 150, 200, 255];
        apply_color_adjustments(&mut data, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 100.0);
        // With sepia at 100%, the sepia formula fully replaces r/g/b.
        let sr = (0.393 * 100.0 + 0.769 * 150.0 + 0.189 * 200.0) as u8;
        let sg = (0.349 * 100.0 + 0.686 * 150.0 + 0.168 * 200.0) as u8;
        let sb = (0.272 * 100.0 + 0.534 * 150.0 + 0.131 * 200.0) as u8;
        assert_eq!(data[0], sr);
        assert_eq!(data[1], sg);
        assert_eq!(data[2], sb);
    }

    #[test]
    fn test_clamp_does_not_overflow() {
        let mut data: Vec<u8> = vec![250, 250, 250, 255];
        apply_color_adjustments(&mut data, 100.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
        assert_eq!(data[0], 255);
        assert_eq!(data[1], 255);
        assert_eq!(data[2], 255);
    }

    #[test]
    fn test_gamma_correction() {
        let mut data: Vec<u8> = vec![128, 128, 128, 255];
        // gamma = 2.0 => correction = 0.5 => (128/255)^0.5 * 255
        apply_color_adjustments(&mut data, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 0.0);
        let expected = ((128.0_f64 / 255.0).powf(0.5) * 255.0).round() as u8;
        assert_eq!(data[0], expected);
    }

    #[test]
    fn test_rgb_hsl_roundtrip() {
        let (h, s, l) = rgb_to_hsl(100.0, 150.0, 200.0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert!((r - 100.0).abs() <= 1.0);
        assert!((g - 150.0).abs() <= 1.0);
        assert!((b - 200.0).abs() <= 1.0);
    }

    #[test]
    fn test_temperature_warm() {
        let mut data: Vec<u8> = vec![100, 100, 100, 255];
        apply_color_adjustments(&mut data, 0.0, 0.0, 0.0, 0.0, 50.0, 0.0, 1.0, 0.0);
        // temp = 50 => factor = 1.0 => r += 30, b -= 30
        assert_eq!(data[0], 130);
        assert_eq!(data[1], 100);
        assert_eq!(data[2], 70);
    }
}
