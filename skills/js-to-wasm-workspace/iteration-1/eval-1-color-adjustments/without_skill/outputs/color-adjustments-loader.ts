/**
 * color-adjustments-loader.ts
 *
 * Lazy-loads the color-adjustments WASM module following the same singleton /
 * cached-promise pattern used by pymupdf-loader.ts.  The module is fetched
 * from the URL registered in WasmProvider under the 'color-adjustments' key.
 */

import { WasmProvider } from './wasm-provider.js';

// ---- Types for the wasm-bindgen glue that wasm-pack generates ----

export interface ColorAdjustmentsWasm {
  /**
   * Mutates `data` (a Uint8ClampedArray / Uint8Array backed RGBA buffer)
   * in-place with the given adjustment parameters.
   */
  apply_color_adjustments(
    data: Uint8Array,
    brightness: number,
    contrast: number,
    saturation: number,
    hue_shift: number,
    temperature: number,
    tint: number,
    gamma: number,
    sepia: number
  ): void;
}

// ---- Singleton cache (mirrors pymupdf-loader pattern) ----

let cachedModule: ColorAdjustmentsWasm | null = null;
let loadPromise: Promise<ColorAdjustmentsWasm> | null = null;

/**
 * Load (or return the cached) color-adjustments WASM module.
 *
 * The module URL is resolved via `WasmProvider.getUrl('color-adjustments')`.
 * On first call the .wasm binary is fetched, compiled and instantiated.
 * Subsequent calls return the cached instance immediately.
 */
export async function loadColorAdjustmentsWasm(): Promise<ColorAdjustmentsWasm> {
  if (cachedModule) {
    return cachedModule;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('color-adjustments' as any)) {
      throw new Error(
        'Color-adjustments WASM is not configured. Please configure it in Advanced Settings.'
      );
    }

    const baseUrl = WasmProvider.getUrl('color-adjustments' as any)!;
    const normalizedUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    try {
      // wasm-pack (--target web) generates a JS glue module that exports an
      // `default` init function and the bound Rust functions.
      const glueUrl = `${normalizedUrl}color_adjustments_wasm.js`;
      const module = await import(/* @vite-ignore */ glueUrl);

      // The default export is the init() function that fetches + instantiates
      // the .wasm file.  We pass the wasm URL explicitly so the browser
      // fetches it from the CDN rather than a relative path.
      const wasmUrl = `${normalizedUrl}color_adjustments_wasm_bg.wasm`;
      await module.default(wasmUrl);

      cachedModule = module as ColorAdjustmentsWasm;

      console.log(
        '[ColorAdjustments WASM] Successfully loaded from',
        normalizedUrl
      );
      return cachedModule;
    } catch (error: unknown) {
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load color-adjustments WASM from CDN: ${msg}`,
        { cause: error }
      );
    }
  })();

  return loadPromise;
}

/**
 * Check whether the color-adjustments WASM provider is configured
 * (does NOT trigger a download).
 */
export function isColorAdjustmentsWasmAvailable(): boolean {
  return WasmProvider.isConfigured('color-adjustments' as any);
}

/**
 * Drop the cached WASM instance so the next call to
 * `loadColorAdjustmentsWasm()` will re-fetch it.
 */
export function clearColorAdjustmentsWasmCache(): void {
  cachedModule = null;
  loadPromise = null;
}
