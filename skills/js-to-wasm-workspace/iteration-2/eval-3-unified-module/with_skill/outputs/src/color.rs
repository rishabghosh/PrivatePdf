use serde::Deserialize;

use crate::common::{clamp_u8, hsl_to_rgb, rgb_to_hsl};

/// Settings for color adjustment, matching the TypeScript `AdjustColorsSettings` interface.
/// Field names use camelCase to match the JS convention via serde rename.
#[derive(Deserialize, Default, Clone, Debug)]
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

/// Apply color adjustments to an RGBA pixel buffer in-place.
///
/// Processes brightness, contrast, saturation, hue shift, temperature, tint,
/// gamma correction, and sepia -- in that order, matching the JS implementation.
pub fn apply_color_adjustments(pixels: &mut [u8], settings: &ColorSettings) {
    // Precompute constants outside the loop
    let contrast_factor = if settings.contrast != 0.0 {
        (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
    } else {
        1.0
    };

    let gamma_correction = if settings.gamma != 1.0 {
        1.0 / settings.gamma
    } else {
        1.0
    };

    let sepia_amount = settings.sepia / 100.0;

    let brightness_adj = settings.brightness * 2.55;
    let temp_factor = settings.temperature / 50.0;
    let tint_factor = settings.tint / 50.0;
    let hue_shift_norm = settings.hue_shift / 360.0;
    let sat_adj = settings.saturation / 100.0;

    let needs_brightness = settings.brightness != 0.0;
    let needs_contrast = settings.contrast != 0.0;
    let needs_hsl = settings.saturation != 0.0 || settings.hue_shift != 0.0;
    let needs_temperature = settings.temperature != 0.0;
    let needs_tint = settings.tint != 0.0;
    let needs_gamma = settings.gamma != 1.0;
    let needs_sepia = settings.sepia > 0.0;

    for chunk in pixels.chunks_exact_mut(4) {
        let mut r = chunk[0] as f32;
        let mut g = chunk[1] as f32;
        let mut b = chunk[2] as f32;

        // Brightness
        if needs_brightness {
            r += brightness_adj;
            g += brightness_adj;
            b += brightness_adj;
        }

        // Contrast
        if needs_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Saturation & Hue shift (via HSL)
        if needs_hsl {
            let (h, s, l) = rgb_to_hsl(
                r.max(0.0).min(255.0),
                g.max(0.0).min(255.0),
                b.max(0.0).min(255.0),
            );

            let mut new_hue = h;
            if settings.hue_shift != 0.0 {
                new_hue = (h + hue_shift_norm) % 1.0;
                if new_hue < 0.0 {
                    new_hue += 1.0;
                }
            }

            let mut new_sat = s;
            if settings.saturation != 0.0 {
                new_sat = if sat_adj > 0.0 {
                    s + (1.0 - s) * sat_adj
                } else {
                    s * (1.0 + sat_adj)
                };
                new_sat = new_sat.max(0.0).min(1.0);
            }

            let (nr, ng, nb) = hsl_to_rgb(new_hue, new_sat, l);
            r = nr;
            g = ng;
            b = nb;
        }

        // Temperature
        if needs_temperature {
            r += 30.0 * temp_factor;
            b -= 30.0 * temp_factor;
        }

        // Tint
        if needs_tint {
            g += 30.0 * tint_factor;
        }

        // Gamma correction
        if needs_gamma {
            r = (r.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
            g = (g.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
            b = (b.max(0.0).min(255.0) / 255.0).powf(gamma_correction) * 255.0;
        }

        // Sepia
        if needs_sepia {
            let sr = 0.393 * r + 0.769 * g + 0.189 * b;
            let sg = 0.349 * r + 0.686 * g + 0.168 * b;
            let sb = 0.272 * r + 0.534 * g + 0.131 * b;
            r = r + (sr - r) * sepia_amount;
            g = g + (sg - g) * sepia_amount;
            b = b + (sb - b) * sepia_amount;
        }

        chunk[0] = clamp_u8(r);
        chunk[1] = clamp_u8(g);
        chunk[2] = clamp_u8(b);
        // chunk[3] (alpha) unchanged
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_settings() -> ColorSettings {
        ColorSettings {
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

    #[test]
    fn test_no_adjustments_is_identity() {
        let original = vec![100, 150, 200, 255];
        let mut pixels = original.clone();
        apply_color_adjustments(&mut pixels, &default_settings());
        assert_eq!(pixels, original);
    }

    #[test]
    fn test_brightness_positive() {
        let mut pixels = vec![100, 100, 100, 255];
        let settings = ColorSettings {
            brightness: 50.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        // 100 + 50*2.55 = 100 + 127.5 = 227.5 -> 228
        assert_eq!(pixels[0], 228);
        assert_eq!(pixels[1], 228);
        assert_eq!(pixels[2], 228);
    }

    #[test]
    fn test_brightness_clamps_at_255() {
        let mut pixels = vec![200, 200, 200, 255];
        let settings = ColorSettings {
            brightness: 100.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        assert_eq!(pixels[0], 255);
        assert_eq!(pixels[1], 255);
        assert_eq!(pixels[2], 255);
    }

    #[test]
    fn test_contrast_adjustment() {
        let mut pixels = vec![200, 100, 50, 255];
        let settings = ColorSettings {
            contrast: 50.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        // contrastFactor = (259 * (50+255)) / (255 * (259-50)) = 79025 / 53295 ~ 1.483
        // r = 1.483 * (200-128) + 128 = 1.483*72 + 128 = 106.8 + 128 = 234.8 -> 235
        assert!(pixels[0] >= 234 && pixels[0] <= 236);
    }

    #[test]
    fn test_full_sepia() {
        let mut pixels = vec![100, 100, 100, 255];
        let settings = ColorSettings {
            sepia: 100.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        // Full sepia: sr = 0.393*100 + 0.769*100 + 0.189*100 = 135.1
        //             sg = 0.349*100 + 0.686*100 + 0.168*100 = 120.3
        //             sb = 0.272*100 + 0.534*100 + 0.131*100 = 93.7
        assert_eq!(pixels[0], 135);
        assert_eq!(pixels[1], 120);
        assert_eq!(pixels[2], 94);
    }

    #[test]
    fn test_temperature_warm() {
        let mut pixels = vec![100, 100, 100, 255];
        let settings = ColorSettings {
            temperature: 50.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        // temp_factor = 50/50 = 1.0
        // r += 30, b -= 30
        assert_eq!(pixels[0], 130);
        assert_eq!(pixels[1], 100);
        assert_eq!(pixels[2], 70);
    }

    #[test]
    fn test_gamma_correction() {
        let mut pixels = vec![128, 128, 128, 255];
        let settings = ColorSettings {
            gamma: 2.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        // gamma_correction = 1/2.0 = 0.5
        // (128/255)^0.5 * 255 = 0.50196^0.5 * 255 = 0.7085 * 255 = 180.67 -> 181
        assert!(pixels[0] >= 180 && pixels[0] <= 182);
    }

    #[test]
    fn test_alpha_preserved() {
        let mut pixels = vec![100, 150, 200, 42];
        let settings = ColorSettings {
            brightness: 25.0,
            contrast: 10.0,
            sepia: 50.0,
            ..default_settings()
        };
        apply_color_adjustments(&mut pixels, &settings);
        assert_eq!(pixels[3], 42); // alpha must not change
    }
}
