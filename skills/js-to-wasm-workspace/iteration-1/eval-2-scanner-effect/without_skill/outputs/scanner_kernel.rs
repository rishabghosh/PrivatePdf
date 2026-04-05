// scanner_kernel.rs
//
// Rust/WASM implementation of the per-pixel scanner effect kernel.
// Covers: grayscale conversion, brightness, contrast, yellowish tint, and noise.
// Blur and border/rotation remain in JS (Canvas API).
//
// Build with: wasm-pack build --target web --out-dir pkg
//
// The WASM module operates directly on a shared pixel buffer passed from JS.
// It receives a pointer to RGBA u8 data and modifies it in place.

use wasm_bindgen::prelude::*;

/// A simple xorshift64 PRNG — deterministic, fast, no std dependency.
/// We seed it from JS so results are reproducible when desired, or
/// pass a random seed for non-deterministic noise.
struct Xorshift64 {
    state: u64,
}

impl Xorshift64 {
    fn new(seed: u64) -> Self {
        // Avoid zero state which would produce all zeros
        Self {
            state: if seed == 0 { 0x853c49e6748fea9b } else { seed },
        }
    }

    /// Returns a value in [-0.5, 0.5)
    fn next_f32(&mut self) -> f32 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        // Map to [0, 1) then shift to [-0.5, 0.5)
        (x as u32 as f32 / u32::MAX as f32) - 0.5
    }
}

/// Clamp an f32 to the 0..=255 range and round to u8.
#[inline(always)]
fn clamp_u8(v: f32) -> u8 {
    if v <= 0.0 {
        0
    } else if v >= 255.0 {
        255
    } else {
        (v + 0.5) as u8
    }
}

/// Apply the scanner-effect pixel kernel in-place on an RGBA buffer.
///
/// # Arguments
/// * `data`        - Mutable slice of RGBA pixel data (length must be divisible by 4).
/// * `grayscale`   - If true, convert each pixel to luminance first.
/// * `brightness`  - Added to each channel (can be negative). 0 = no change.
/// * `contrast`    - Contrast setting in the range roughly [-255, 255]. 0 = no change.
///                   The JS formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
/// * `yellowish`   - Yellowish tint intensity [0..100]. 0 = no tint.
/// * `noise`       - Noise amplitude (already scaled by caller). 0 = no noise.
/// * `noise_seed`  - Seed for the PRNG used to generate noise.
#[wasm_bindgen]
pub fn apply_scanner_kernel(
    data: &mut [u8],
    grayscale: bool,
    brightness: f32,
    contrast: f32,
    yellowish: f32,
    noise: f32,
    noise_seed: u64,
) {
    let len = data.len();
    debug_assert!(len % 4 == 0, "Pixel data length must be a multiple of 4");

    // Pre-compute contrast factor (matches the JS formula exactly).
    let contrast_factor = if contrast != 0.0 {
        (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast))
    } else {
        1.0
    };

    // Pre-compute yellowish intensity.
    let yellow_intensity = if yellowish > 0.0 {
        yellowish / 50.0
    } else {
        0.0
    };

    let apply_brightness = brightness != 0.0;
    let apply_contrast = contrast != 0.0;
    let apply_yellow = yellowish > 0.0;
    let apply_noise = noise > 0.0;

    let mut rng = Xorshift64::new(noise_seed);

    let pixel_count = len / 4;
    for i in 0..pixel_count {
        let base = i * 4;
        let mut r = data[base] as f32;
        let mut g = data[base + 1] as f32;
        let mut b = data[base + 2] as f32;
        // Alpha (data[base + 3]) is left untouched.

        // 1) Grayscale
        if grayscale {
            let grey = 0.299 * r + 0.587 * g + 0.114 * b;
            // Round like the JS version: Math.round()
            let grey_rounded = (grey + 0.5).floor();
            r = grey_rounded;
            g = grey_rounded;
            b = grey_rounded;
        }

        // 2) Brightness
        if apply_brightness {
            r += brightness;
            g += brightness;
            b += brightness;
        }

        // 3) Contrast
        if apply_contrast {
            r = contrast_factor * (r - 128.0) + 128.0;
            g = contrast_factor * (g - 128.0) + 128.0;
            b = contrast_factor * (b - 128.0) + 128.0;
        }

        // 4) Yellowish tint
        if apply_yellow {
            r += 20.0 * yellow_intensity;
            g += 12.0 * yellow_intensity;
            b -= 15.0 * yellow_intensity;
        }

        // 5) Noise
        if apply_noise {
            let n = rng.next_f32() * noise;
            r += n;
            g += n;
            b += n;
        }

        // 6) Clamp to [0, 255]
        data[base] = clamp_u8(r);
        data[base + 1] = clamp_u8(g);
        data[base + 2] = clamp_u8(b);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grayscale() {
        // Pure red pixel
        let mut data = vec![255, 0, 0, 255];
        apply_scanner_kernel(&mut data, true, 0.0, 0.0, 0.0, 0.0, 0);
        // 0.299 * 255 = 76.245 -> rounds to 76
        assert_eq!(data[0], 76);
        assert_eq!(data[1], 76);
        assert_eq!(data[2], 76);
        assert_eq!(data[3], 255); // alpha unchanged
    }

    #[test]
    fn test_brightness() {
        let mut data = vec![100, 100, 100, 255];
        apply_scanner_kernel(&mut data, false, 50.0, 0.0, 0.0, 0.0, 0);
        assert_eq!(data[0], 150);
        assert_eq!(data[1], 150);
        assert_eq!(data[2], 150);
    }

    #[test]
    fn test_brightness_clamp() {
        let mut data = vec![240, 10, 240, 255];
        apply_scanner_kernel(&mut data, false, 30.0, 0.0, 0.0, 0.0, 0);
        assert_eq!(data[0], 255); // clamped
        assert_eq!(data[1], 40);
        assert_eq!(data[2], 255); // clamped
    }

    #[test]
    fn test_no_ops() {
        let mut data = vec![128, 64, 32, 255];
        let original = data.clone();
        apply_scanner_kernel(&mut data, false, 0.0, 0.0, 0.0, 0.0, 0);
        assert_eq!(data, original);
    }

    #[test]
    fn test_yellowish() {
        let mut data = vec![100, 100, 100, 255];
        apply_scanner_kernel(&mut data, false, 0.0, 0.0, 50.0, 0.0, 0);
        // intensity = 50/50 = 1.0
        // r = 100 + 20 = 120, g = 100 + 12 = 112, b = 100 - 15 = 85
        assert_eq!(data[0], 120);
        assert_eq!(data[1], 112);
        assert_eq!(data[2], 85);
    }

    #[test]
    fn test_multiple_pixels() {
        let mut data = vec![
            255, 0, 0, 255, // red
            0, 255, 0, 255, // green
            0, 0, 255, 255, // blue
        ];
        apply_scanner_kernel(&mut data, true, 0.0, 0.0, 0.0, 0.0, 0);
        // Each pixel should become its luminance value
        // Red:   0.299*255 = 76.245 -> 76
        // Green: 0.587*255 = 149.685 -> 150
        // Blue:  0.114*255 = 29.07 -> 29
        assert_eq!(data[0], 76);
        assert_eq!(data[1], 76);
        assert_eq!(data[2], 76);
        assert_eq!(data[4], 150);
        assert_eq!(data[5], 150);
        assert_eq!(data[6], 150);
        assert_eq!(data[8], 29);
        assert_eq!(data[9], 29);
        assert_eq!(data[10], 29);
    }

    #[test]
    fn test_noise_deterministic() {
        let mut data1 = vec![128, 128, 128, 255];
        let mut data2 = vec![128, 128, 128, 255];
        apply_scanner_kernel(&mut data1, false, 0.0, 0.0, 0.0, 50.0, 42);
        apply_scanner_kernel(&mut data2, false, 0.0, 0.0, 0.0, 50.0, 42);
        assert_eq!(data1, data2, "Same seed should produce same noise");
    }

    #[test]
    fn test_noise_different_seeds() {
        let mut data1 = vec![128, 128, 128, 255];
        let mut data2 = vec![128, 128, 128, 255];
        apply_scanner_kernel(&mut data1, false, 0.0, 0.0, 0.0, 50.0, 1);
        apply_scanner_kernel(&mut data2, false, 0.0, 0.0, 0.0, 50.0, 2);
        // Extremely unlikely to be equal with different seeds
        assert_ne!(data1, data2, "Different seeds should produce different noise");
    }
}
