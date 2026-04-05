/**
 * Integration example: how tool pages should use the WASM module with JS fallback.
 *
 * This file shows the pattern for integrating image-effects WASM into existing
 * tool pages. It is NOT a standalone file -- adapt this pattern into the relevant
 * tool page (e.g., adjust-colors-page.ts, scanner-effect-page.ts, greyscale-page.ts).
 *
 * File location reference: src/js/logic/{tool}-page.ts
 */

import {
  loadImageEffectsWasm,
  isImageEffectsWasmAvailable,
} from '../utils/image-effects-wasm-loader.js';
import {
  applyGreyscale as applyGreyscaleJS,
  applyInvertColors as applyInvertColorsJS,
  applyColorAdjustments as applyColorAdjustmentsJS,
} from '../utils/image-effects.js';
import { getDeviceCapabilities } from '../utils/device-capability.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';

// ─── Device-adaptive preloading (Step 7) ─────────────────────────────
// Call this once during page initialization.
export function initImageEffectsWasm(): void {
  const caps = getDeviceCapabilities();
  if (caps.wasm.preloadOnIdle && isImageEffectsWasmAvailable()) {
    requestIdleCallback(() => loadImageEffectsWasm().catch(() => {}));
  }
}

// ─── Greyscale with WASM + JS fallback ───────────────────────────────
export async function processGreyscale(imageData: ImageData): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      // WASM operates on the buffer in-place via &mut [u8]
      wasm.apply_greyscale(new Uint8Array(imageData.data.buffer));
      return;
    } catch (e) {
      console.warn('[WASM] Greyscale failed, falling back to JS:', e);
    }
  }

  // JS fallback
  applyGreyscaleJS(imageData);
}

// ─── Invert colors with WASM + JS fallback ───────────────────────────
export async function processInvertColors(imageData: ImageData): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      wasm.apply_invert_colors(new Uint8Array(imageData.data.buffer));
      return;
    } catch (e) {
      console.warn('[WASM] Invert failed, falling back to JS:', e);
    }
  }

  // JS fallback
  applyInvertColorsJS(imageData);
}

// ─── Color adjustments with WASM + JS fallback ──────────────────────
export async function processColorAdjustments(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: AdjustColorsSettings
): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      const ctx = canvas.getContext('2d')!;
      const w = sourceData.width;
      const h = sourceData.height;
      canvas.width = w;
      canvas.height = h;

      // Clone the source data so we don't mutate the original
      const imageData = new ImageData(new Uint8ClampedArray(sourceData.data), w, h);

      // WASM processes in-place
      wasm.apply_color_adjustments(
        new Uint8Array(imageData.data.buffer),
        settings
      );

      ctx.putImageData(imageData, 0, 0);
      return;
    } catch (e) {
      console.warn('[WASM] Color adjustments failed, falling back to JS:', e);
    }
  }

  // JS fallback
  applyColorAdjustmentsJS(sourceData, canvas, settings);
}
