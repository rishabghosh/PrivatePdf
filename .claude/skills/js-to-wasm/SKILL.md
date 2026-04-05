---
name: js-to-wasm
description: >
  Convert JavaScript processing logic to Rust-based WebAssembly (WASM) modules for BentoPDF.
  Use this skill whenever the user wants to move CPU-intensive JS code (pixel manipulation,
  data transformation, compression, parsing, math-heavy loops) into WASM — whether they say
  "convert to WASM", "make this faster with Rust", "rewrite in WASM", "optimize this processing",
  or point at a specific file/function and ask for a WASM version. Also trigger when the user
  asks to "add a new WASM module", "create a Rust crate for X", or discusses performance
  bottlenecks in processing code that would benefit from compiled execution. If the user mentions
  image processing, pixel loops, PDF data transforms, or any non-UI computation that's slow —
  this skill applies.
---

# JS → Rust WASM Conversion

This skill guides you through converting pure-JavaScript processing logic into Rust-based
WebAssembly modules that integrate with BentoPDF's existing WASM architecture.

## Core Principle

**JS and HTML exist for UI. Everything else should be WASM.**

Any logic that processes data — pixel manipulation, PDF transformations, compression,
parsing, encoding, math-heavy loops — belongs in a compiled WASM module, not in JavaScript.
JS orchestrates the UI and calls into WASM for the actual work.

## When to Convert

A piece of JS is a conversion candidate when it:

1. **Processes data in tight loops** — iterating over pixel buffers, byte arrays, or page collections
2. **Does math-heavy work** — color space conversions (RGB↔HSL), gamma correction, matrix operations
3. **Transforms buffers** — compression, encoding, format conversion, hashing
4. **Has no DOM dependency** — once you strip away `canvas.getContext()` and `putImageData()`, the core logic is pure data→data
5. **Is a known bottleneck** — slow on low-tier devices, causes jank, or blocks the main thread

**Don't convert** code that is primarily DOM manipulation, event handling, UI state management,
or thin wrappers around existing WASM modules (like the PyMuPDF/CPDF/Ghostscript loaders).

## Conversion Workflow

### Step 1: Identify the Processing Boundary

Read the target file and separate the **processing kernel** from the **UI glue**.

**Example — `image-effects.ts:applyColorAdjustments`:**
- UI glue: `canvas.getContext('2d')`, `ctx.putImageData()`, reading `sourceData`
- Processing kernel: the `for (let i = 0; i < data.length; i += 4)` loop with brightness, contrast, HSL, gamma, sepia transforms

The processing kernel is what moves to Rust. The UI glue stays in TypeScript and passes
`Uint8ClampedArray` buffers across the WASM boundary.

Draw the boundary at the point where data becomes a typed array (usually `ImageData.data`
or a `Uint8Array` from a file read). WASM receives the buffer, processes it, returns the
result. JS handles getting data in/out of the DOM.

### Step 2: Scaffold the Rust Crate

Create a new Rust crate under `wasm/` in the project root. Read `references/rust-wasm-template.md`
for the full scaffold — it has the `Cargo.toml`, `lib.rs` structure, and `wasm-pack` build commands.

```
wasm/{module-name}/
├── Cargo.toml
├── src/
│   └── lib.rs
├── tests/
│   └── integration.rs
└── build.sh
```

Naming convention: `bentopdf-{feature}-wasm` (e.g., `bentopdf-image-effects-wasm`).

**Prefer unified crates over per-function crates.** If multiple JS functions operate on the
same data type (e.g., pixel buffers), group them into a single Rust crate. This avoids
duplicate WASM downloads and shares helper code (color space conversions, clamping, etc.).
Organize the crate internally with Rust modules:

```
wasm/bentopdf-image-effects-wasm/
├── Cargo.toml
├── src/
│   ├── lib.rs          # #[wasm_bindgen] exports only
│   ├── greyscale.rs    # pub fn apply_greyscale(...)
│   ├── invert.rs       # pub fn apply_invert(...)
│   ├── color.rs        # pub fn apply_color_adjustments(...)
│   ├── scanner.rs      # pub fn apply_scanner_kernel(...)
│   └── common.rs       # rgb_to_hsl, hsl_to_rgb, clamp_u8, etc.
```

`lib.rs` re-exports the public API via `mod` declarations and thin `#[wasm_bindgen]` wrappers.
Internal modules stay private — only the WASM boundary functions are exported. This keeps
the crate maintainable as more effects are added without bloating a single file.

Key Rust dependencies:
- `wasm-bindgen` — JS↔Rust FFI
- `js-sys` — JS type interop
- `web-sys` — Browser API bindings (only if needed; prefer pure computation)
- `serde` + `serde-wasm-bindgen` — for structured settings objects crossing the boundary

### Step 3: Implement the Rust Processing Kernel

Translate the JS processing logic to Rust. Guidelines:

**Data transfer:** Accept `&[u8]` or `Vec<u8>` for pixel buffers. Use `wasm_bindgen` to expose
functions that take `js_sys::Uint8ClampedArray` or `&[u8]` and return `Vec<u8>`.

**Settings objects:** Always use `serde::Deserialize` structs for settings with 3+ fields.
This is important because it keeps the WASM API ergonomic — callers pass a plain JS object
instead of 8+ positional parameters, and field names are self-documenting. Use `#[serde(rename_all = "camelCase")]`
so Rust snake_case fields map directly to the JS camelCase convention without manual conversion.

```rust
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ColorSettings {
    pub brightness: f64,
    pub contrast: f64,
    pub saturation: f64,
    pub hue_shift: f64,    // maps to JS "hueShift"
    pub gamma: f64,
    pub sepia: f64,
    pub temperature: f64,
    pub tint: f64,
}

#[wasm_bindgen]
pub fn apply_color_adjustments(pixels: &[u8], settings: JsValue) -> Result<Vec<u8>, JsError> {
    let settings: ColorSettings = serde_wasm_bindgen::from_value(settings)
        .map_err(|e| JsError::new(&format!("Invalid settings: {}", e)))?;
    let mut output = pixels.to_vec();
    // ... processing logic
    Ok(output)
}
```

For simple functions with 1-2 parameters (like `apply_greyscale` which only takes pixels),
skip serde and accept primitives directly — no need to over-abstract.

**Performance patterns:**
- Process pixels in chunks of 4 (RGBA) — same as JS but Rust's bounds-check elimination makes this much faster
- Precompute constants outside the loop (contrast factor, gamma inverse, sepia blend)
- Use `f32` instead of `f64` where full precision isn't needed — faster on WASM
- For very large buffers, consider SIMD via `std::arch::wasm32` (behind a feature flag)

**Error handling:** Use `Result` types internally but convert to `JsValue` errors at the boundary.
Panics in WASM crash the tab — always handle errors gracefully.

**Batch processing for multi-page workloads:** BentoPDF tools often process hundreds of pages
sequentially. When a WASM function will be called per-page in a loop, design for it:

1. **Reuse allocations** — expose an `init_processor(width, height)` function that pre-allocates
   an internal buffer, then `process_page(pixels)` reuses it. This avoids re-allocating
   `Vec<u8>` on every call. The JS side calls `init` once, then `process_page` in a loop.

2. **In-place mutation** — for pixel operations, accept `&mut [u8]` instead of returning
   `Vec<u8>` when possible. This eliminates the copy entirely since `wasm_bindgen` can
   operate directly on the JS `ArrayBuffer`.

3. **Progress reporting** — for long-running batch operations, expose a way to report progress
   back to JS (e.g., return a status struct with `pages_processed` after each page, or use
   a callback via `js_sys::Function`).

```rust
// Batch-friendly API example
static mut BUFFER: Vec<u8> = Vec::new();

#[wasm_bindgen]
pub fn init_processor(capacity: usize) {
    unsafe { BUFFER.reserve(capacity); }
}

#[wasm_bindgen]
pub fn process_page_in_place(pixels: &mut [u8], settings: JsValue) -> Result<(), JsError> {
    let settings: ColorSettings = serde_wasm_bindgen::from_value(settings)?;
    // Modify pixels in-place — zero copy
    for chunk in pixels.chunks_exact_mut(4) {
        // ... process RGBA
    }
    Ok(())
}
```

### Step 4: Build and Publish the WASM Package

```bash
cd wasm/{module-name}
wasm-pack build --target web --release
```

This produces a `pkg/` directory with:
- `{name}_bg.wasm` — the compiled module
- `{name}.js` — JS glue with `init()` and exported functions
- `{name}.d.ts` — TypeScript type definitions

For BentoPDF's CDN pattern, publish the `pkg/` contents to npm under `@bentopdf/{name}`
and host on jsDelivr. During development, serve from `/wasm/{module-name}/pkg/` locally.

### Step 5: Create the TypeScript Loader

Follow the existing loader pattern in BentoPDF. Read `references/wasm-patterns.md` for the
full architecture details. The loader should:

1. **Register with WasmProvider** — add the new package to the `WasmPackage` type union
   and `CDN_DEFAULTS` in `src/js/utils/wasm-provider.ts`

2. **Create a dedicated loader** at `src/js/utils/{module-name}-loader.ts`:

```typescript
import { WasmProvider } from './wasm-provider.js';

let cachedModule: WasmExports | null = null;
let loadPromise: Promise<WasmExports> | null = null;

export async function loadImageEffectsWasm(): Promise<WasmExports> {
  if (cachedModule) return cachedModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!WasmProvider.isConfigured('image-effects')) {
      throw new Error('Image Effects WASM not configured.');
    }

    const baseUrl = WasmProvider.getUrl('image-effects')!;
    const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const module = await import(/* @vite-ignore */ `${normalized}index.js`);
    await module.default(`${normalized}index_bg.wasm`);

    cachedModule = module;
    return module;
  })();

  return loadPromise;
}

export function isImageEffectsWasmAvailable(): boolean {
  return WasmProvider.isConfigured('image-effects');
}
```

3. **Add env var** — `VITE_WASM_{MODULE}_URL` in `.env.example` and `.env.production`

4. **Add to wasm-settings page** — register the new module in the settings UI so users
   can configure/test the URL

### Step 6: Integrate into the Tool Page

Replace the JS processing call with the WASM call. Keep the fallback pattern:

```typescript
import { loadImageEffectsWasm, isImageEffectsWasmAvailable } from '../utils/image-effects-wasm-loader.js';
import { applyColorAdjustments as applyColorAdjustmentsJS } from '../utils/image-effects.js';

async function processPage(imageData: ImageData, settings: ColorSettings): Promise<ImageData> {
  const pixels = imageData.data;

  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      const result = wasm.apply_color_adjustments(pixels, settings);
      return new ImageData(new Uint8ClampedArray(result), imageData.width, imageData.height);
    } catch (e) {
      console.warn('[WASM] Color adjustment failed, falling back to JS:', e);
    }
  }

  // JS fallback — keeps the tool functional even without WASM
  applyColorAdjustmentsJS(imageData, canvas, settings);
  return imageData;
}
```

**Always provide a JS fallback.** WASM modules are CDN-loaded and may be unavailable
(offline, misconfigured, air-gapped deployments). The tool must degrade gracefully.

### Step 7: Device-Adaptive Loading

Integrate with `device-capability.ts`:

- **High-tier devices:** Preload the WASM module during idle time via `wasm-preloader.ts`
- **Medium-tier devices:** Load on first use, cache for subsequent calls
- **Low-tier devices:** Consider staying with the JS fallback if the WASM module is large
  (>2MB), or defer loading until the user actually clicks "process"

Check the device tier before preloading:

```typescript
import { getDeviceCapabilities } from '../utils/device-capability.js';

const caps = getDeviceCapabilities();
if (caps.wasm.preloadOnIdle) {
  requestIdleCallback(() => loadImageEffectsWasm().catch(() => {}));
}
```

### Step 8: Web Worker Integration (Optional)

For processing that takes >100ms, move the WASM call into a Web Worker to keep the
UI responsive:

```javascript
// workers/{module}.worker.js
let wasmModule = null;

async function loadWasm(wasmUrl) {
  const module = await import(wasmUrl + 'index.js');
  await module.default(wasmUrl + 'index_bg.wasm');
  wasmModule = module;
}

self.onmessage = async function(e) {
  const { command, wasmUrl, pixels, width, height, settings } = e.data;

  if (!wasmModule) await loadWasm(wasmUrl);

  if (command === 'process') {
    const result = wasmModule.apply_color_adjustments(new Uint8Array(pixels), settings);
    self.postMessage({ status: 'done', pixels: result.buffer }, [result.buffer]);
  }
};
```

Pass the WASM URL from the main thread (same pattern as existing CPDF workers).
Use `Transferable` objects for pixel buffers to avoid copying.

## Testing

### Rust Unit Tests

```bash
cd wasm/{module-name}
cargo test                    # Native tests (fast iteration)
wasm-pack test --headless --chrome  # Browser WASM tests
```

Write tests that verify numerical correctness against known inputs:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_brightness_adjustment() {
        let pixels = vec![100, 100, 100, 255]; // single RGBA pixel
        let settings = ColorSettings { brightness: 50.0, ..Default::default() };
        let result = apply_color_adjustments(&pixels, &settings);
        assert_eq!(result[0], 227); // 100 + 50*2.55, clamped
    }
}
```

### Integration Tests (Vitest)

Test that the WASM module loads correctly and produces equivalent output to the JS fallback:

```typescript
import { describe, it, expect } from 'vitest';

describe('image-effects WASM vs JS parity', () => {
  it('produces identical output for brightness adjustment', async () => {
    const testPixels = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
    const settings = { brightness: 25, contrast: 0, /* ... */ };

    const jsResult = applyColorAdjustmentsJS(testPixels, settings);
    const wasmResult = await applyColorAdjustmentsWasm(testPixels, settings);

    // Allow ±1 difference for floating point rounding
    for (let i = 0; i < jsResult.length; i++) {
      expect(Math.abs(jsResult[i] - wasmResult[i])).toBeLessThanOrEqual(1);
    }
  });
});
```

## Checklist

Before marking a conversion complete, verify:

- [ ] Rust crate builds with `wasm-pack build --target web --release`
- [ ] Rust unit tests pass (`cargo test`)
- [ ] WASM output is numerically equivalent to JS (±1 for float rounding)
- [ ] TypeScript loader follows the cached-promise deduplication pattern
- [ ] WasmProvider config updated with new package
- [ ] Env var added to `.env.example`
- [ ] JS fallback works when WASM is unavailable
- [ ] Device-adaptive loading respects tier capabilities
- [ ] Web Worker integration if processing >100ms
- [ ] wasm-settings page updated with new module
- [ ] No DOM APIs in the Rust code — pure data processing only
