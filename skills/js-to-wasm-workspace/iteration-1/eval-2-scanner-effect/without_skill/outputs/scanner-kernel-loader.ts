// scanner-kernel-loader.ts
//
// Loader for the scanner-effect WASM pixel kernel.
// Follows the project's lazy-loading pattern: the WASM module is only fetched
// and instantiated when first needed, and the promise is cached so subsequent
// calls reuse the same instance.
//
// The WASM binary is expected to be built with wasm-pack (--target web) and
// placed in public/wasm/scanner_kernel_bg.wasm. Vite will serve it from there
// in dev and copy it to dist/ at build time.

/** The shape of the exports from the wasm-pack generated module. */
interface ScannerKernelWasm {
  memory: WebAssembly.Memory;
  apply_scanner_kernel: (
    data_ptr: number,
    data_len: number,
    grayscale: boolean,
    brightness: number,
    contrast: number,
    yellowish: number,
    noise: number,
    noise_seed_lo: number,
    noise_seed_hi: number
  ) => void;
  __wbindgen_malloc: (size: number, align: number) => number;
  __wbindgen_free: (ptr: number, size: number, align: number) => void;
}

/** Public API returned after the module is initialized. */
export interface ScannerKernel {
  /**
   * Apply the scanner effect pixel kernel to RGBA image data in-place.
   *
   * @param data       - Uint8ClampedArray of RGBA pixel data (from ImageData.data)
   * @param grayscale  - Convert to grayscale first
   * @param brightness - Brightness offset (0 = no change)
   * @param contrast   - Contrast value [-255, 255] (0 = no change)
   * @param yellowish  - Yellow tint intensity [0, 100] (0 = none)
   * @param noise      - Noise amplitude, pre-scaled (0 = none)
   * @param noiseSeed  - PRNG seed for deterministic noise (pass Date.now() for random)
   */
  applyKernel(
    data: Uint8ClampedArray,
    grayscale: boolean,
    brightness: number,
    contrast: number,
    yellowish: number,
    noise: number,
    noiseSeed: number
  ): void;
}

let cachedInstance: Promise<ScannerKernel> | null = null;

/**
 * Returns the URL for the scanner kernel WASM binary.
 * Uses the Vite BASE_URL so it works in subdirectory deployments.
 */
function getWasmUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}wasm/scanner_kernel_bg.wasm`;
}

/**
 * Load and instantiate the scanner kernel WASM module.
 * The returned promise is cached — safe to call multiple times.
 */
export function loadScannerKernel(): Promise<ScannerKernel> {
  if (cachedInstance) {
    return cachedInstance;
  }

  cachedInstance = instantiate();
  return cachedInstance;
}

async function instantiate(): Promise<ScannerKernel> {
  const wasmUrl = getWasmUrl();

  let wasmInstance: WebAssembly.Instance;
  let wasmMemory: WebAssembly.Memory;

  // Try streaming instantiation first (faster, supported in modern browsers),
  // fall back to ArrayBuffer-based instantiation.
  const importObject = {
    // wasm-bindgen may expect a `wbg` or `__wbindgen_placeholder__` import
    // object. For a minimal kernel with no JS imports, we provide an empty one.
    // If the generated glue requires specific imports, extend this object.
    wbg: {},
    __wbindgen_placeholder__: {},
  };

  try {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      const result = await WebAssembly.instantiateStreaming(
        fetch(wasmUrl, { credentials: 'same-origin' }),
        importObject
      );
      wasmInstance = result.instance;
    } else {
      // Fallback for environments without streaming support
      const response = await fetch(wasmUrl, { credentials: 'same-origin' });
      const bytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, importObject);
      wasmInstance = result.instance;
    }
  } catch (err) {
    // Reset cache so a retry is possible
    cachedInstance = null;
    throw new Error(
      `[ScannerKernel] Failed to load WASM module from ${wasmUrl}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const exports = wasmInstance.exports as unknown as ScannerKernelWasm;
  wasmMemory = exports.memory;

  return {
    applyKernel(
      data: Uint8ClampedArray,
      grayscale: boolean,
      brightness: number,
      contrast: number,
      yellowish: number,
      noise: number,
      noiseSeed: number
    ): void {
      const byteLength = data.byteLength;

      // Allocate space in WASM linear memory
      const ptr = exports.__wbindgen_malloc(byteLength, 1);

      // Copy pixel data into WASM memory
      const wasmBuf = new Uint8Array(wasmMemory.buffer, ptr, byteLength);
      wasmBuf.set(data);

      // Split the seed into two u32 halves (WASM doesn't natively pass u64 from JS).
      // The Rust side reconstructs: seed = (hi << 32) | lo
      const seedLo = noiseSeed >>> 0;
      const seedHi = (noiseSeed / 0x100000000) >>> 0;

      // Call the WASM kernel
      exports.apply_scanner_kernel(
        ptr,
        byteLength,
        grayscale,
        brightness,
        contrast,
        yellowish,
        noise,
        seedLo,
        seedHi
      );

      // Copy results back to the original Uint8ClampedArray.
      // Re-wrap because memory.buffer may have been detached by growth.
      const resultBuf = new Uint8Array(wasmMemory.buffer, ptr, byteLength);
      data.set(resultBuf);

      // Free the WASM allocation
      exports.__wbindgen_free(ptr, byteLength, 1);
    },
  };
}

/**
 * Check if the WASM kernel is already loaded (useful for feature detection).
 */
export function isScannerKernelLoaded(): boolean {
  return cachedInstance !== null;
}
