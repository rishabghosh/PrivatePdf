/**
 * TypeScript loader for the bentopdf-image-effects-wasm module.
 *
 * Follows the existing BentoPDF loader pattern (cached-promise deduplication)
 * matching the style of pymupdf-loader.ts.
 *
 * Exports:
 *  - apply_greyscale(pixels: Uint8Array) -> Uint8Array
 *  - apply_invert_colors(pixels: Uint8Array) -> Uint8Array
 *  - apply_color_adjustments(pixels: Uint8Array, settings: JsValue) -> Uint8Array
 *  - apply_scanner_pixel_kernel(pixels: Uint8Array, settings: JsValue) -> Uint8Array
 */

import { WasmProvider } from './wasm-provider.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';

// ─── Types for the WASM module exports ──────────────────────────

export interface ScannerPixelSettings {
  grayscale: boolean;
  brightness: number;
  contrast: number;
  yellowish: number;
  noise: number;
  seed?: number;
}

export interface ImageEffectsWasmModule {
  /** Convert RGBA pixel buffer to greyscale (BT.601 luma). */
  apply_greyscale(pixels: Uint8Array): Uint8Array;

  /** Invert RGB channels of an RGBA pixel buffer. */
  apply_invert_colors(pixels: Uint8Array): Uint8Array;

  /** Full color adjustment pipeline (brightness, contrast, saturation, hue, temperature, tint, gamma, sepia). */
  apply_color_adjustments(
    pixels: Uint8Array,
    settings: AdjustColorsSettings
  ): Uint8Array;

  /** Scanner effect pixel kernel (grayscale, brightness, contrast, yellowish, noise). */
  apply_scanner_pixel_kernel(
    pixels: Uint8Array,
    settings: ScannerPixelSettings
  ): Uint8Array;
}

// ─── Cached-promise deduplication pattern ───────────────────────

let cachedModule: ImageEffectsWasmModule | null = null;
let loadPromise: Promise<ImageEffectsWasmModule> | null = null;

/**
 * Load the image effects WASM module.
 *
 * Uses cache-first strategy with promise deduplication to prevent
 * multiple concurrent loads. Matches the pattern from pymupdf-loader.ts.
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
      // wasm-pack generates an ES module with a default export (init function)
      // and named exports for each #[wasm_bindgen] function
      const module = await import(
        /* @vite-ignore */ `${normalized}bentopdf_image_effects_wasm.js`
      );

      // Call the init() default export to fetch and compile the .wasm binary
      await module.default(`${normalized}bentopdf_image_effects_wasm_bg.wasm`);

      cachedModule = module as ImageEffectsWasmModule;
      console.log(
        '[ImageEffects WASM Loader] Successfully loaded from CDN'
      );
      return cachedModule;
    } catch (error: unknown) {
      // Reset promise so next attempt can retry
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load Image Effects WASM from CDN: ${msg}`,
        { cause: error }
      );
    }
  })();

  return loadPromise;
}

/**
 * Check whether the image effects WASM module is configured (not necessarily loaded yet).
 * Use this for fast synchronous feature-detection before attempting a load.
 */
export function isImageEffectsWasmAvailable(): boolean {
  return WasmProvider.isConfigured('image-effects');
}

/**
 * Clear the cached module. Used by the wasm-settings page when the user
 * changes the URL so the next load picks up the new configuration.
 */
export function clearImageEffectsWasmCache(): void {
  cachedModule = null;
  loadPromise = null;
}
