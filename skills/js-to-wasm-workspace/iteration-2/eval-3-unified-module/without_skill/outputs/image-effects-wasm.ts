/**
 * image-effects-wasm.ts
 *
 * Loader and TypeScript bindings for the unified bentopdf-image-effects WASM module.
 * Follows the same lazy-load caching pattern used by pymupdf-loader.ts.
 *
 * The WASM module URL is resolved from the VITE_WASM_IMAGE_EFFECTS_URL env var,
 * falling back to a bundled local path. On low-tier devices the module is only
 * loaded when first needed (consistent with the project's device-adaptive strategy).
 */

// Type declarations matching the wasm-bindgen exports from lib.rs
export interface ImageEffectsWasm {
  apply_greyscale(data: Uint8ClampedArray): void;
  apply_invert_colors(data: Uint8ClampedArray): void;
  apply_brightness(data: Uint8ClampedArray, brightness: number): void;
  apply_contrast(data: Uint8ClampedArray, contrast: number): void;
  apply_sepia(data: Uint8ClampedArray, amount: number): void;
  apply_gamma(data: Uint8ClampedArray, gamma: number): void;
  apply_temperature(data: Uint8ClampedArray, temperature: number): void;
  apply_tint(data: Uint8ClampedArray, tint: number): void;
  apply_yellowish(data: Uint8ClampedArray, yellowish: number): void;
  apply_scanner_pixels(
    data: Uint8ClampedArray,
    grayscale: boolean,
    brightness: number,
    contrast: number,
    yellowish: number,
    noise_amount: number
  ): void;
  apply_color_adjustments(
    data: Uint8ClampedArray,
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

// Wasm-bindgen init function type
interface WasmInit {
  default: (input?: RequestInfo | URL | BufferSource) => Promise<ImageEffectsWasm>;
}

let cachedInstance: ImageEffectsWasm | null = null;
let loadPromise: Promise<ImageEffectsWasm> | null = null;

/**
 * Resolve the URL for the WASM package.
 * Checks VITE_WASM_IMAGE_EFFECTS_URL env var first, then falls back to
 * a local path relative to the application root.
 */
function getWasmUrl(): string {
  const envUrl = import.meta.env.VITE_WASM_IMAGE_EFFECTS_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }
  // Default: bundled alongside the app in the wasm/ directory
  return `${import.meta.env.BASE_URL}wasm/image-effects/`;
}

/**
 * Load the image-effects WASM module. Uses singleton caching -- subsequent
 * calls return the same instance. Safe to call concurrently (deduplicates
 * the in-flight load).
 */
export async function loadImageEffectsWasm(): Promise<ImageEffectsWasm> {
  if (cachedInstance) {
    return cachedInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const baseUrl = getWasmUrl();
      const jsUrl = `${baseUrl}bentopdf_image_effects.js`;

      // Dynamic import of the wasm-bindgen generated JS glue
      const module: WasmInit = await import(/* @vite-ignore */ jsUrl);
      const wasmUrl = `${baseUrl}bentopdf_image_effects_bg.wasm`;

      const instance = await module.default(wasmUrl);
      cachedInstance = instance;

      console.log('[ImageEffectsWasm] Successfully loaded WASM module');
      return instance;
    } catch (error: unknown) {
      loadPromise = null;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[ImageEffectsWasm] Failed to load WASM module: ${msg}`);
      throw new Error(`Failed to load image-effects WASM: ${msg}`, {
        cause: error,
      });
    }
  })();

  return loadPromise;
}

/**
 * Check whether the WASM module is already loaded and cached.
 */
export function isImageEffectsWasmLoaded(): boolean {
  return cachedInstance !== null;
}

/**
 * Clear the cached WASM instance (useful for testing or error recovery).
 */
export function clearImageEffectsWasmCache(): void {
  cachedInstance = null;
  loadPromise = null;
}
