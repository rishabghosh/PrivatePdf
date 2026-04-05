/**
 * Loader for the bentopdf-image-effects-wasm module.
 *
 * Follows the same cached-promise deduplication pattern used by pymupdf-loader.ts.
 * The WASM module is loaded from CDN via dynamic import() of the wasm-pack ES module output.
 *
 * File location: src/js/utils/image-effects-wasm-loader.ts
 */

import { WasmProvider } from './wasm-provider.js';

/**
 * Type interface for the wasm-pack generated module exports.
 * These match the #[wasm_bindgen] functions in lib.rs.
 */
export interface ImageEffectsWasmModule {
  /** Convert RGBA pixels to greyscale in-place. */
  apply_greyscale(pixels: Uint8Array): void;

  /** Invert RGB channels in-place. Alpha is preserved. */
  apply_invert_colors(pixels: Uint8Array): void;

  /**
   * Apply color adjustments in-place.
   * @param pixels RGBA buffer
   * @param settings Object matching AdjustColorsSettings
   */
  apply_color_adjustments(pixels: Uint8Array, settings: unknown): void;

  /**
   * Apply scanner effect pixel kernel in-place.
   * @param pixels RGBA buffer
   * @param settings Object with grayscale, brightness, contrast, yellowish, scaledNoise
   * @param seed Noise seed (0 for default)
   */
  apply_scanner_kernel(pixels: Uint8Array, settings: unknown, seed: number): void;
}

let cachedModule: ImageEffectsWasmModule | null = null;
let loadPromise: Promise<ImageEffectsWasmModule> | null = null;

/**
 * Load the image effects WASM module. Returns a cached instance on subsequent calls.
 * Deduplicates concurrent loads via a shared promise.
 */
export async function loadImageEffectsWasm(): Promise<ImageEffectsWasmModule> {
  if (cachedModule) return cachedModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('image-effects')) {
      throw new Error(
        'Image Effects WASM module is not configured. Please configure it in Advanced Settings.'
      );
    }

    const baseUrl = WasmProvider.getUrl('image-effects')!;
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    try {
      // wasm-pack --target web produces an ES module with a default export (init function)
      // and named exports for each #[wasm_bindgen] function.
      const module = await import(
        /* @vite-ignore */ `${normalized}bentopdf_image_effects_wasm.js`
      );
      await module.default(`${normalized}bentopdf_image_effects_wasm_bg.wasm`);

      cachedModule = module as ImageEffectsWasmModule;
      console.log('[ImageEffects WASM] Successfully loaded from CDN');
      return cachedModule;
    } catch (error: unknown) {
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Image Effects WASM from CDN: ${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

/**
 * Check if the Image Effects WASM module is configured (URL available).
 * Does not trigger loading.
 */
export function isImageEffectsWasmAvailable(): boolean {
  return WasmProvider.isConfigured('image-effects');
}

/**
 * Clear the cached module instance. Used by the settings page when the user
 * changes the WASM URL.
 */
export function clearImageEffectsWasmCache(): void {
  cachedModule = null;
  loadPromise = null;
}
