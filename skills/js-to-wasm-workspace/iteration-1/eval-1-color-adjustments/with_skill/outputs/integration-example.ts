/**
 * Integration example: How to use the image-effects WASM module in
 * adjust-colors-page.ts (or any tool page that calls applyColorAdjustments).
 *
 * This replaces the direct call to the JS function with a WASM-first strategy
 * that falls back to the original JS implementation when WASM is unavailable.
 *
 * Key patterns demonstrated:
 * 1. WASM-first with JS fallback
 * 2. Device-adaptive preloading
 * 3. Transferable buffer handling for future Web Worker support
 */

import { loadImageEffectsWasm, isImageEffectsWasmAvailable } from '../utils/image-effects-wasm-loader.js';
import { applyColorAdjustments as applyColorAdjustmentsJS } from '../utils/image-effects.js';
import { getDeviceCapabilities } from '../utils/device-capability.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';

// ─── Device-adaptive preloading ─────────────────────────────────────
// Call this once when the page loads (e.g., in DOMContentLoaded).
// High-tier devices preload during idle; others defer until first use.

export function preloadImageEffectsWasm(): void {
  if (!isImageEffectsWasmAvailable()) return;

  const caps = getDeviceCapabilities();
  if (caps.wasm.preloadOnIdle) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => loadImageEffectsWasm().catch(() => {}), { timeout: 5000 });
    } else {
      setTimeout(() => loadImageEffectsWasm().catch(() => {}), 1000);
    }
  }
  // Medium/low tier: WASM loads on first processPage() call automatically
}

// ─── Processing function (replaces direct applyEffects call) ────────

/**
 * Process an ImageData's pixels through color adjustments, using WASM if
 * available and falling back to the JS implementation.
 *
 * Unlike the original applyColorAdjustments which mutates a canvas directly,
 * this function returns a new ImageData — keeping the processing boundary
 * clean (data in, data out).
 *
 * Usage in adjust-colors-page.ts:
 *   Replace:
 *     applyEffects(baselineCopy, previewCanvas, settings);
 *   With:
 *     const result = await processColorAdjustments(baselineCopy, settings);
 *     const ctx = previewCanvas.getContext('2d')!;
 *     previewCanvas.width = result.width;
 *     previewCanvas.height = result.height;
 *     ctx.putImageData(result, 0, 0);
 */
export async function processColorAdjustments(
  sourceData: ImageData,
  settings: AdjustColorsSettings
): Promise<ImageData> {
  const pixels = sourceData.data;
  const width = sourceData.width;
  const height = sourceData.height;

  // ── Try WASM path ──
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();

      // Convert Uint8ClampedArray to Uint8Array for WASM boundary
      const inputBuffer = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
      const result = wasm.apply_color_adjustments(inputBuffer, settings);

      // Wrap result in a new ImageData
      return new ImageData(new Uint8ClampedArray(result.buffer), width, height);
    } catch (e) {
      console.warn('[WASM] Color adjustment failed, falling back to JS:', e);
      // Fall through to JS fallback
    }
  }

  // ── JS fallback ──
  // The original function mutates an ImageData and draws to a canvas.
  // We create a temporary canvas just for the fallback path.
  const fallbackCanvas = document.createElement('canvas');
  const copy = new ImageData(new Uint8ClampedArray(pixels), width, height);
  applyColorAdjustmentsJS(copy, fallbackCanvas, settings);

  // Read the result back from the canvas
  const ctx = fallbackCanvas.getContext('2d')!;
  return ctx.getImageData(0, 0, width, height);
}

// ─── Example: updated updatePreview() ───────────────────────────────
// Shows how the existing updatePreview function in adjust-colors-page.ts
// would be modified to use the WASM-accelerated path.

/*
async function updatePreview(): Promise<void> {
  if (!cachedBaselineData) return;

  const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
  if (!previewCanvas) return;

  const settings = getSettings();
  const baselineCopy = new ImageData(
    new Uint8ClampedArray(cachedBaselineData.data),
    cachedBaselineWidth,
    cachedBaselineHeight
  );

  try {
    const result = await processColorAdjustments(baselineCopy, settings);
    previewCanvas.width = result.width;
    previewCanvas.height = result.height;
    const ctx = previewCanvas.getContext('2d')!;
    ctx.putImageData(result, 0, 0);
  } catch (e) {
    console.error('[Color Adjustments] Processing failed:', e);
  }
}
*/

// ─── Example: updated processAllPages() ─────────────────────────────
// Shows how the batch processing loop would use WASM.

/*
async function processAllPages(): Promise<void> {
  // ... file loading / validation ...

  for (let i = 1; i <= doc.numPages; i++) {
    showLoader(`Processing page ${i} of ${doc.numPages}...`);

    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const renderCanvas = document.createElement('canvas');
    const renderCtx = renderCanvas.getContext('2d')!;
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;

    await page.render({ canvasContext: renderCtx, viewport, canvas: renderCanvas }).promise;

    const baseData = renderCtx.getImageData(0, 0, renderCanvas.width, renderCanvas.height);

    // Use WASM-accelerated processing with JS fallback
    const processedData = await processColorAdjustments(baseData, settings);

    // Write result to output canvas for PNG export
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = processedData.width;
    outputCanvas.height = processedData.height;
    const outputCtx = outputCanvas.getContext('2d')!;
    outputCtx.putImageData(processedData, 0, 0);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      outputCanvas.toBlob(resolve, 'image/png')
    );

    // ... embed in PDF ...
  }
}
*/

// ─── Example: DOMContentLoaded integration ──────────────────────────

/*
document.addEventListener('DOMContentLoaded', () => {
  // Preload WASM on capable devices
  preloadImageEffectsWasm();

  // ... rest of existing init code ...
});
*/
