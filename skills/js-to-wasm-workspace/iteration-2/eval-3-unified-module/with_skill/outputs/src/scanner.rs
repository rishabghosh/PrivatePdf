use serde::Deserialize;

use crate::common::clamp_u8;

/// Settings for scanner effect pixel processing kernel.
///
/// This only contains the fields relevant to the pixel loop. UI-only fields
/// (border, rotate, rotateVariance, resolution, blur) are handled in TypeScript
/// since they require canvas/DOM APIs.
///
/// `noise` and `blur` are passed pre-scaled by the caller (the TS side multiplies
/// by the display scale before calling into WASM).
#[derive(Deserialize, Default, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScannerKernelSettings {
    pub grayscale: bool,
    pub brightness: f32,
    pub contrast: f32,
    pub yellowish: f32,
    pub scaled_noise: f32,
}

/// Apply scanner effect pixel processing to an RGBA buffer in-place.
///
/// This is the pure data kernel extracted from `applyScannerEffect` in image-effects.ts.
/// The caller (TypeScript) handles canvas blur, border gradients, and rotation -- those
/// are DOM operations that stay in JS. This function processes the pixel-level effects:
/// greyscale, brightness, contrast, yellowish tinting, and noise.
///
/// `seed` is used for deterministic pseudo-random noise generation. Pass 0 for
/// non-deterministic (will use a simple LCG seeded from the pixel index).
pub fn apply_scanner_kernel(pixels: &mut [u8], settings: &ScannerKernelSettings, seed: u32) {
    let contrast_factor = if settings.contrast != 0.0 {
        (259.0 * (settings.contrast + 255.0)) / (255.0 * (259.0 - settings.contrast))
    } else {
        1.0
    };

    let needs_greyscale = settings.grayscale;
    let needs_brightness = settings.brightness != 0.0;
    let needs_contrast = settings.contrast != 0.0;
    let needs_yellowish = settings.yellowish > 0.0;
    let needs_noise = settings.scaled_noise > 0.0;

    let yellowish_intensity = settings.yellowish / 50.0;

    // Simple LCG for noise -- much faster than a full PRNG and good enough for visual noise.
    // Constants from Numerical Recipes.
    let mut rng_state: u32 = if seed != 0 { seed } else { 0x12345678 };
    let lcg_next = |state: &mut u32| -> f32 {
        *state = state.wrapping_mul(1664525).wrapping_add(1013904223);
        // Map to -0.5..0.5
        (*state as f32 / u32::MAX as f32) - 0.5
    };

    for chunk in pixels.chunks_exact_mut(4) {
        let mut r = chunk[0] as f32;
        let mut g = chunk[1] as f32;
        let mut b = chunk[2] as f32;

        // Greyscale
        if needs_greyscale {
            let grey = (0.299 * r + 0.587 * g + 0.114 * b).round();
            r = grey;
            g = grey;
            b = grey;
        }

        // Brightness
        if needs_brightness {
            r += settings.brightness;
            g += settings.brightness;
            b += settings.brightness;
        }

        // Contrast
        if needs_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // Yellowish tint
        if needs_yellowish {
            r += 20.0 * yellowish_intensity;
            g += 12.0 * yellowish_intensity;
            b -= 15.0 * yellowish_intensity;
        }

        // Noise
        if needs_noise {
            let n = lcg_next(&mut rng_state) * settings.scaled_noise;
            r += n;
            g += n;
            b += n;
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

    fn default_settings() -> ScannerKernelSettings {
        ScannerKernelSettings {
            grayscale: false,
            brightness: 0.0,
            contrast: 0.0,
            yellowish: 0.0,
            scaled_noise: 0.0,
        }
    }

    #[test]
    fn test_no_effects_is_identity() {
        let original = vec![100, 150, 200, 255];
        let mut pixels = original.clone();
        apply_scanner_kernel(&mut pixels, &default_settings(), 0);
        assert_eq!(pixels, original);
    }

    #[test]
    fn test_greyscale_only() {
        let mut pixels = vec![100, 150, 200, 255];
        let settings = ScannerKernelSettings {
            grayscale: true,
            ..default_settings()
        };
        apply_scanner_kernel(&mut pixels, &settings, 0);
        // 0.299*100 + 0.587*150 + 0.114*200 = 140.75 -> 141
        assert_eq!(pixels[0], 141);
        assert_eq!(pixels[1], 141);
        assert_eq!(pixels[2], 141);
        assert_eq!(pixels[3], 255);
    }

    #[test]
    fn test_brightness_only() {
        let mut pixels = vec![100, 100, 100, 255];
        let settings = ScannerKernelSettings {
            brightness: 30.0,
            ..default_settings()
        };
        apply_scanner_kernel(&mut pixels, &settings, 0);
        assert_eq!(pixels[0], 130);
        assert_eq!(pixels[1], 130);
        assert_eq!(pixels[2], 130);
    }

    #[test]
    fn test_yellowish_tint() {
        let mut pixels = vec![100, 100, 100, 255];
        let settings = ScannerKernelSettings {
            yellowish: 50.0,
            ..default_settings()
        };
        apply_scanner_kernel(&mut pixels, &settings, 0);
        // intensity = 50/50 = 1.0
        // r += 20, g += 12, b -= 15
        assert_eq!(pixels[0], 120);
        assert_eq!(pixels[1], 112);
        assert_eq!(pixels[2], 85);
    }

    #[test]
    fn test_alpha_preserved() {
        let mut pixels = vec![100, 150, 200, 42];
        let settings = ScannerKernelSettings {
            grayscale: true,
            brightness: 10.0,
            yellowish: 25.0,
            ..default_settings()
        };
        apply_scanner_kernel(&mut pixels, &settings, 0);
        assert_eq!(pixels[3], 42);
    }

    #[test]
    fn test_noise_with_seed_is_deterministic() {
        let mut pixels_a = vec![100, 100, 100, 255, 200, 200, 200, 255];
        let mut pixels_b = pixels_a.clone();
        let settings = ScannerKernelSettings {
            scaled_noise: 30.0,
            ..default_settings()
        };
        apply_scanner_kernel(&mut pixels_a, &settings, 42);
        apply_scanner_kernel(&mut pixels_b, &settings, 42);
        assert_eq!(pixels_a, pixels_b);
    }
}
