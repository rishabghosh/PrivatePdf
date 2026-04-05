/**
 * Loader for the bentopdf-image-effects-wasm module.
 *
 * Follows the same cached-promise deduplication pattern as pymupdf-loader.ts.
 * The WASM module is loaded from CDN via WasmProvider and cached for reuse.
 */

import { WasmProvider } from './wasm-provider.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface ImageEffectsWasmModule {
  /**
   * Apply color adjustments to an RGBA pixel buffer.
   *
   * @param pixels - Uint8Array of RGBA pixel data (4 bytes per pixel)
   * @param settings - Color adjustment settings matching AdjustColorsSettings
   * @returns Processed pixel buffer as Uint8Array
   */
  apply_color_adjustments(pixels: Uint8Array, settings: AdjustColorsSettings): Uint8Array;
}

// ─── Module-level cache ─────────────────────────────────────────────

let cachedModule: ImageEffectsWasmModule | null = null;
let loadPromise: Promise<ImageEffectsWasmModule> | null = null;

// ─── Loader ─────────────────────────────────────────────────────────

/**
 * Load the image-effects WASM module, returning a cached instance if available.
 * Uses the same pattern as loadPyMuPDF() — cache-first with promise deduplication
 * to prevent multiple concurrent loads.
 */
export async function loadImageEffectsWasm(): Promise<ImageEffectsWasmModule> {
  if (cachedModule) return cachedModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('image-effects')) {
      throw new Error(
        'Image Effects WASM is not configured. Please configure it in Advanced Settings.'
      );
    }

    const baseUrl = WasmProvider.getUrl('image-effects')!;
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    try {
      // wasm-pack produces an ES module with a default export (init function)
      // and named exports for each #[wasm_bindgen] function.
      const module = await import(
        /* @vite-ignore */ `${normalized}bentopdf_image_effects_wasm.js`
      );

      // Call the default export (init) to load the .wasm binary
      await module.default(`${normalized}bentopdf_image_effects_wasm_bg.wasm`);

      cachedModule = module as ImageEffectsWasmModule;
      console.log('[ImageEffects WASM] Successfully loaded from CDN');
      return cachedModule;
    } catch (error: unknown) {
      // Reset promise so the next call can retry
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Image Effects WASM from CDN: ${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

// ─── Availability check ─────────────────────────────────────────────

/**
 * Check whether the image-effects WASM module is configured (does not load it).
 */
export function isImageEffectsWasmAvailable(): boolean {
  return WasmProvider.isConfigured('image-effects');
}

// ─── Cache management ───────────────────────────────────────────────

/**
 * Clear the cached module instance. Used by the wasm-settings page when the
 * user changes the URL.
 */
export function clearImageEffectsWasmCache(): void {
  cachedModule = null;
  loadPromise = null;
}
