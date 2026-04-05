/**
 * Loader for the scanner-effect WASM module.
 *
 * Follows the BentoPDF cached-promise deduplication pattern used by
 * pymupdf-loader.ts and ghostscript-loader.ts.
 *
 * The module exposes `apply_scanner_pixel_kernel(pixels, settings)` which
 * handles the per-pixel processing (grayscale, brightness, contrast,
 * yellowish tint, noise). Blur, border, and rotation stay in JS because
 * they rely on Canvas 2D APIs.
 */

import { WasmProvider } from './wasm-provider.js';

/** Typed exports from the wasm-pack generated module. */
export interface ScannerEffectWasmModule {
  /** Initialize the WASM module. Must be called once with the .wasm URL. */
  default(wasmUrl: string): Promise<void>;

  /**
   * Apply per-pixel scanner effect processing.
   * @param pixels - RGBA pixel buffer (Uint8Array, length must be multiple of 4)
   * @param settings - ScannerPixelSettings object (serialized via serde-wasm-bindgen)
   * @returns Processed pixel buffer as Uint8Array
   */
  apply_scanner_pixel_kernel(
    pixels: Uint8Array,
    settings: ScannerPixelSettings
  ): Uint8Array;
}

/** Settings for the pixel processing kernel (matches the Rust struct). */
export interface ScannerPixelSettings {
  grayscale: boolean;
  brightness: number;
  contrast: number;
  yellowish: number;
  /** Noise value pre-scaled by DPI scale on the JS side. */
  scaled_noise: number;
  /** Seed for deterministic noise. 0 uses a default seed. */
  noise_seed: number;
}

let cachedModule: ScannerEffectWasmModule | null = null;
let loadPromise: Promise<ScannerEffectWasmModule> | null = null;

/**
 * Load the scanner-effect WASM module, returning a cached instance on
 * subsequent calls. Concurrent calls share the same in-flight promise.
 */
export async function loadScannerEffectWasm(): Promise<ScannerEffectWasmModule> {
  if (cachedModule) return cachedModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('scanner-effect')) {
      throw new Error(
        'Scanner Effect WASM not configured. Please configure it in Advanced Settings.'
      );
    }

    const baseUrl = WasmProvider.getUrl('scanner-effect')!;
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    try {
      const module = (await import(
        /* @vite-ignore */ `${normalized}bentopdf_scanner_effect_wasm.js`
      )) as ScannerEffectWasmModule;

      await module.default(`${normalized}bentopdf_scanner_effect_wasm_bg.wasm`);

      cachedModule = module;
      console.log('[Scanner Effect WASM] Successfully loaded from CDN');
      return module;
    } catch (error: unknown) {
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load Scanner Effect WASM: ${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

/**
 * Check whether the WASM module is configured (URL available) without
 * triggering a load. Use this for the fallback decision.
 */
export function isScannerEffectWasmAvailable(): boolean {
  return WasmProvider.isConfigured('scanner-effect');
}

/**
 * Clear the cached module (used by the wasm-settings page when the user
 * changes the URL).
 */
export function clearScannerEffectWasmCache(): void {
  cachedModule = null;
  loadPromise = null;
}
