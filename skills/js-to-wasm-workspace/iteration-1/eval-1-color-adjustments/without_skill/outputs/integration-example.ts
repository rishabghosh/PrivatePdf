/**
 * integration-example.ts
 *
 * Demonstrates how to replace the existing JS `applyColorAdjustments` call
 * in image-effects.ts with the WASM-accelerated version, including a
 * graceful JS fallback for environments where WASM is unavailable.
 *
 * This file is NOT meant to be imported directly into the project. It is a
 * reference showing the integration pattern. The actual change would be in
 * `src/js/utils/image-effects.ts` (and callers that invoke it).
 */

import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';
import {
  loadColorAdjustmentsWasm,
  isColorAdjustmentsWasmAvailable,
} from './color-adjustments-loader.js';
import { rgbToHsl, hslToRgb } from './image-effects.js';

// --------------------------------------------------------------------------
// NEW: WASM-accelerated applyColorAdjustments
// --------------------------------------------------------------------------

/**
 * Apply color adjustments using the WASM module when available,
 * falling back to the original JS pixel loop otherwise.
 *
 * This is a drop-in replacement for the existing `applyColorAdjustments`
 * function with the identical signature.
 */
export async function applyColorAdjustments(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: AdjustColorsSettings
): Promise<void> {
  const ctx = canvas.getContext('2d')!;
  const w = sourceData.width;
  const h = sourceData.height;

  canvas.width = w;
  canvas.height = h;

  const imageData = new ImageData(
    new Uint8ClampedArray(sourceData.data),
    w,
    h
  );

  // Attempt WASM path
  if (isColorAdjustmentsWasmAvailable()) {
    try {
      const wasm = await loadColorAdjustmentsWasm();

      // The WASM function mutates a Uint8Array in-place.
      // Uint8ClampedArray and Uint8Array share the same underlying buffer
      // layout, so we can pass the .buffer view directly.
      const dataView = new Uint8Array(imageData.data.buffer);

      wasm.apply_color_adjustments(
        dataView,
        settings.brightness,
        settings.contrast,
        settings.saturation,
        settings.hueShift,
        settings.temperature,
        settings.tint,
        settings.gamma,
        settings.sepia
      );

      ctx.putImageData(imageData, 0, 0);
      return;
    } catch (err) {
      console.warn(
        '[ColorAdjustments] WASM failed, falling back to JS:',
        err
      );
      // Fall through to JS implementation below.
    }
  }

  // --------------------------------------------------------------------------
  // FALLBACK: Original JS pixel loop (kept verbatim from image-effects.ts)
  // --------------------------------------------------------------------------
  applyColorAdjustmentsJS(imageData, settings);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * The original pure-JS implementation extracted into its own function so it
 * can serve as a fallback.  Identical logic to the current
 * `applyColorAdjustments` in image-effects.ts.
 */
function applyColorAdjustmentsJS(
  imageData: ImageData,
  settings: AdjustColorsSettings
): void {
  const data = imageData.data;

  const contrastFactor =
    settings.contrast !== 0
      ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
      : 1;

  const gammaCorrection = settings.gamma !== 1.0 ? 1 / settings.gamma : 1;
  const sepiaAmount = settings.sepia / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Brightness
    if (settings.brightness !== 0) {
      const adj = settings.brightness * 2.55;
      r += adj;
      g += adj;
      b += adj;
    }

    // 2. Contrast
    if (settings.contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    // 3. Hue / Saturation
    if (settings.saturation !== 0 || settings.hueShift !== 0) {
      const [hue, sat, lig] = rgbToHsl(
        Math.max(0, Math.min(255, r)),
        Math.max(0, Math.min(255, g)),
        Math.max(0, Math.min(255, b))
      );

      let newHue = hue;
      if (settings.hueShift !== 0) {
        newHue = (hue + settings.hueShift / 360) % 1;
        if (newHue < 0) newHue += 1;
      }

      let newSat = sat;
      if (settings.saturation !== 0) {
        const satAdj = settings.saturation / 100;
        newSat = satAdj > 0 ? sat + (1 - sat) * satAdj : sat * (1 + satAdj);
        newSat = Math.max(0, Math.min(1, newSat));
      }

      [r, g, b] = hslToRgb(newHue, newSat, lig);
    }

    // 4. Temperature
    if (settings.temperature !== 0) {
      const t = settings.temperature / 50;
      r += 30 * t;
      b -= 30 * t;
    }

    // 5. Tint
    if (settings.tint !== 0) {
      const t = settings.tint / 50;
      g += 30 * t;
    }

    // 6. Gamma
    if (settings.gamma !== 1.0) {
      r = Math.pow(Math.max(0, Math.min(255, r)) / 255, gammaCorrection) * 255;
      g = Math.pow(Math.max(0, Math.min(255, g)) / 255, gammaCorrection) * 255;
      b = Math.pow(Math.max(0, Math.min(255, b)) / 255, gammaCorrection) * 255;
    }

    // 7. Sepia
    if (settings.sepia > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r + (sr - r) * sepiaAmount;
      g = g + (sg - g) * sepiaAmount;
      b = b + (sb - b) * sepiaAmount;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

// --------------------------------------------------------------------------
// Usage example (how a tool page would call this)
// --------------------------------------------------------------------------

/*
// In src/js/logic/adjust-colors-page.ts, replace:
//
//   import { applyColorAdjustments } from '../utils/image-effects.js';
//   applyColorAdjustments(sourceData, canvas, settings);
//
// With:
//
//   import { applyColorAdjustments } from '../utils/integration-example.js';
//   await applyColorAdjustments(sourceData, canvas, settings);
//
// Note: the new version is async because WASM loading is lazy.
// If the function is called from a synchronous context, wrap it:
//
//   applyColorAdjustments(sourceData, canvas, settings).catch(console.error);
*/
