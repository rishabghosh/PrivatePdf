/**
 * image-effects-wasm-loader.ts
 *
 * Lazy-loads the `bentopdf-image-effects` WASM module and exposes a typed
 * interface that mirrors the Rust exports.  Follows the same singleton /
 * promise-dedup pattern used by `pymupdf-loader.ts`.
 *
 * The .wasm file is assumed to live at a path resolved by Vite (either a
 * local asset or a CDN URL configured via env var).
 */

// ---- raw wasm-bindgen bindings produced by `wasm-pack build --target web` --
// The generated JS glue re-exports an `init()` default + named functions.
// We import the glue lazily so the module is not in the initial bundle.

export interface ImageEffectsWasm {
  apply_greyscale(data: Uint8Array): void;
  apply_invert_colors(data: Uint8Array): void;
  apply_scanner_pixels(
    data: Uint8Array,
    grayscale: boolean,
    brightness: number,
    contrast: number,
    yellowish: number,
    scaledNoise: number,
    noiseSeed: number,
  ): void;
  apply_color_adjustments(
    data: Uint8Array,
    brightness: number,
    contrast: number,
    saturation: number,
    hueShift: number,
    temperature: number,
    tint: number,
    gamma: number,
    sepia: number,
  ): void;
  apply_brightness_contrast(
    data: Uint8Array,
    brightness: number,
    contrast: number,
  ): void;
  apply_sepia(data: Uint8Array, intensity: number): void;
}

// ---------------------------------------------------------------------------
// Singleton loader (mirrors pymupdf-loader.ts pattern)
// ---------------------------------------------------------------------------

let cached: ImageEffectsWasm | null = null;
let loadPromise: Promise<ImageEffectsWasm> | null = null;

/**
 * Returns the URL from which the WASM glue JS will be fetched.
 *
 * In production, set VITE_WASM_IMAGE_EFFECTS_URL to a CDN path such as:
 *   https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm@0.1.0/
 *
 * During development / tests the module is resolved relative to the repo root
 * via Vite's asset handling.
 */
function getWasmBaseUrl(): string {
  const envUrl = (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_WASM_IMAGE_EFFECTS_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  // Fallback: resolved by Vite from `public/wasm/image-effects/`
  return `${(import.meta as Record<string, Record<string, string>>).env?.BASE_URL ?? '/'}wasm/image-effects/`;
}

/**
 * Lazily load the WASM module. The returned promise is cached so that
 * concurrent callers share the same download.
 */
export async function loadImageEffectsWasm(): Promise<ImageEffectsWasm> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const baseUrl = getWasmBaseUrl();

      // wasm-pack --target web produces two files:
      //   bentopdf_image_effects.js   (ES module glue)
      //   bentopdf_image_effects_bg.wasm
      const glueUrl = `${baseUrl}bentopdf_image_effects.js`;
      const wasmUrl = `${baseUrl}bentopdf_image_effects_bg.wasm`;

      // Dynamic import keeps this out of the main bundle.
      const glue = await import(/* @vite-ignore */ glueUrl);

      // `init()` is the default export produced by wasm-pack --target web.
      // Passing the explicit URL avoids a same-origin fetch that may break on
      // CDN deployments.
      await glue.default(wasmUrl);

      cached = {
        apply_greyscale: glue.apply_greyscale,
        apply_invert_colors: glue.apply_invert_colors,
        apply_scanner_pixels: glue.apply_scanner_pixels,
        apply_color_adjustments: glue.apply_color_adjustments,
        apply_brightness_contrast: glue.apply_brightness_contrast,
        apply_sepia: glue.apply_sepia,
      };

      console.log('[ImageEffectsWasm] Successfully loaded');
      return cached;
    } catch (error: unknown) {
      loadPromise = null; // allow retry on transient failures
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load image-effects WASM: ${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

export function isImageEffectsWasmLoaded(): boolean {
  return cached !== null;
}

export function clearImageEffectsWasmCache(): void {
  cached = null;
  loadPromise = null;
}
