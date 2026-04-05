//! Integration tests for the scanner effect WASM module.
//!
//! These run under `wasm-pack test --headless --chrome` for browser WASM tests,
//! or `cargo test` for native (non-WASM) tests of the core logic.

use bentopdf_scanner_effect_wasm::*;

#[test]
fn test_grayscale_conversion_matches_js() {
    // JS: grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
    let pixels = vec![
        255, 0, 0, 255,     // pure red
        0, 255, 0, 255,     // pure green
        0, 0, 255, 255,     // pure blue
        128, 128, 128, 255,  // grey
    ];
    let settings = ScannerPixelSettings {
        grayscale: true,
        brightness: 0.0,
        contrast: 0.0,
        yellowish: 0.0,
        scaled_noise: 0.0,
        noise_seed: 0,
    };
    let result = process_scanner_pixels(&pixels, &settings);

    // Red: round(0.299*255) = round(76.245) = 76
    assert_eq!(result[0], 76);
    assert_eq!(result[1], 76);
    assert_eq!(result[2], 76);

    // Green: round(0.587*255) = round(149.685) = 150
    assert_eq!(result[4], 150);
    assert_eq!(result[5], 150);
    assert_eq!(result[6], 150);

    // Blue: round(0.114*255) = round(29.07) = 29
    assert_eq!(result[8], 29);
    assert_eq!(result[9], 29);
    assert_eq!(result[10], 29);

    // Grey: round(0.299*128 + 0.587*128 + 0.114*128) = round(128.0) = 128
    assert_eq!(result[12], 128);
    assert_eq!(result[13], 128);
    assert_eq!(result[14], 128);
}

#[test]
fn test_full_pipeline_order() {
    // Verify the processing order matches JS:
    // 1. grayscale -> 2. brightness -> 3. contrast -> 4. yellowish -> 5. noise
    let pixels = vec![100, 150, 200, 255];
    let settings = ScannerPixelSettings {
        grayscale: true,
        brightness: 10.0,
        contrast: 0.0,
        yellowish: 50.0,
        scaled_noise: 0.0,
        noise_seed: 0,
    };
    let result = process_scanner_pixels(&pixels, &settings);

    // Step 1: grayscale -> grey = round(0.299*100 + 0.587*150 + 0.114*200) = 141
    // Step 2: brightness -> 141 + 10 = 151
    // Step 3: contrast = 0 -> no change
    // Step 4: yellowish = 50, intensity = 1.0
    //   r = 151 + 20 = 171, g = 151 + 12 = 163, b = 151 - 15 = 136
    assert_eq!(result[0], 171);
    assert_eq!(result[1], 163);
    assert_eq!(result[2], 136);
}

#[test]
fn test_large_buffer_performance() {
    // Process a 1920x1080 RGBA buffer to ensure it handles large images.
    let pixel_count = 1920 * 1080;
    let mut pixels = vec![0u8; pixel_count * 4];
    // Fill with a gradient pattern
    for i in 0..pixel_count {
        let offset = i * 4;
        pixels[offset] = (i % 256) as u8;
        pixels[offset + 1] = ((i * 2) % 256) as u8;
        pixels[offset + 2] = ((i * 3) % 256) as u8;
        pixels[offset + 3] = 255;
    }

    let settings = ScannerPixelSettings {
        grayscale: true,
        brightness: 20.0,
        contrast: 30.0,
        yellowish: 25.0,
        scaled_noise: 10.0,
        noise_seed: 42,
    };

    let result = process_scanner_pixels(&pixels, &settings);
    assert_eq!(result.len(), pixels.len());

    // Verify alphas are all preserved
    for i in 0..pixel_count {
        assert_eq!(result[i * 4 + 3], 255, "Alpha changed at pixel {}", i);
    }
}

#[test]
fn test_negative_brightness_clamps() {
    let pixels = vec![10, 10, 10, 255];
    let settings = ScannerPixelSettings {
        brightness: -50.0,
        ..ScannerPixelSettings {
            grayscale: false,
            brightness: 0.0,
            contrast: 0.0,
            yellowish: 0.0,
            scaled_noise: 0.0,
            noise_seed: 0,
        }
    };
    let result = process_scanner_pixels(&pixels, &settings);
    // 10 - 50 = -40 -> clamped to 0
    assert_eq!(result[0], 0);
    assert_eq!(result[1], 0);
    assert_eq!(result[2], 0);
}

#[test]
fn test_high_contrast_clamps() {
    let pixels = vec![250, 5, 128, 255];
    let settings = ScannerPixelSettings {
        contrast: 200.0,
        ..ScannerPixelSettings {
            grayscale: false,
            brightness: 0.0,
            contrast: 0.0,
            yellowish: 0.0,
            scaled_noise: 0.0,
            noise_seed: 0,
        }
    };
    let result = process_scanner_pixels(&pixels, &settings);
    // With high contrast, values far from 128 should be pushed to extremes
    assert_eq!(result[0], 255); // 250 pushed to 255
    assert_eq!(result[1], 0);   // 5 pushed to 0
    // 128 should stay near 128 (it's the midpoint)
    assert_eq!(result[2], 128);
}
