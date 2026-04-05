//! BentoPDF Image Effects WASM Module
//!
//! Unified crate for all pixel-level image processing effects used by BentoPDF.
//! Each effect is in its own module; this file provides the #[wasm_bindgen] boundary
//! functions that JS calls into.
//!
//! All functions operate on RGBA pixel buffers (4 bytes per pixel).
//! UI/DOM operations (canvas, getContext, putImageData, blur filters, gradients)
//! stay in TypeScript -- only the data-processing kernels live here.

use wasm_bindgen::prelude::*;

mod color;
mod common;
mod greyscale;
mod invert;
mod scanner;

// ─── Simple effects (no settings, 1-2 params — skip serde) ──────────

/// Convert an RGBA pixel buffer to greyscale in-place.
///
/// Uses ITU-R BT.601 luma coefficients: 0.299 R + 0.587 G + 0.114 B.
/// Alpha channel is preserved.
#[wasm_bindgen]
pub fn apply_greyscale(pixels: &mut [u8]) {
    greyscale::apply_greyscale(pixels);
}

/// Invert all RGB channels in an RGBA pixel buffer in-place.
///
/// Each channel becomes (255 - original). Alpha channel is preserved.
#[wasm_bindgen]
pub fn apply_invert_colors(pixels: &mut [u8]) {
    invert::apply_invert(pixels);
}

// ─── Color adjustments (complex settings — use serde) ────────────────

/// Apply color adjustments (brightness, contrast, saturation, hue, temperature,
/// tint, gamma, sepia) to an RGBA pixel buffer in-place.
///
/// `settings_js` must be a JS object matching `AdjustColorsSettings`:
/// ```js
/// {
///   brightness: number,  // -100..100 (0 = no change)
///   contrast: number,    // -100..100
///   saturation: number,  // -100..100
///   hueShift: number,    // -180..180 degrees
///   temperature: number, // -100..100
///   tint: number,        // -100..100
///   gamma: number,       // 0.1..5.0 (1.0 = no change)
///   sepia: number,       // 0..100 (percent)
/// }
/// ```
#[wasm_bindgen]
pub fn apply_color_adjustments(pixels: &mut [u8], settings_js: JsValue) -> Result<(), JsError> {
    let settings: color::ColorSettings = serde_wasm_bindgen::from_value(settings_js)
        .map_err(|e| JsError::new(&format!("Invalid color settings: {}", e)))?;
    color::apply_color_adjustments(pixels, &settings);
    Ok(())
}

// ─── Scanner effect kernel (complex settings — use serde) ────────────

/// Apply the scanner effect pixel kernel to an RGBA buffer in-place.
///
/// This handles only the per-pixel processing (greyscale, brightness, contrast,
/// yellowish, noise). Canvas-level effects (blur, border, rotation) are handled
/// in TypeScript.
///
/// `settings_js` must be a JS object:
/// ```js
/// {
///   grayscale: boolean,
///   brightness: number,
///   contrast: number,
///   yellowish: number,
///   scaledNoise: number,  // noise * scale, pre-computed by the caller
/// }
/// ```
///
/// `seed` controls noise determinism. Pass 0 for a default seed, or a specific
/// value for reproducible results (useful for testing / previews).
#[wasm_bindgen]
pub fn apply_scanner_kernel(
    pixels: &mut [u8],
    settings_js: JsValue,
    seed: u32,
) -> Result<(), JsError> {
    let settings: scanner::ScannerKernelSettings =
        serde_wasm_bindgen::from_value(settings_js)
            .map_err(|e| JsError::new(&format!("Invalid scanner settings: {}", e)))?;
    scanner::apply_scanner_kernel(pixels, &settings, seed);
    Ok(())
}
