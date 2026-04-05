# Unified Image Effects WASM Module -- Integration Guide

## Overview

This package consolidates all pixel-level image processing from `image-effects.ts` into a single Rust/WASM crate (`bentopdf-image-effects`). The WASM module provides accelerated versions of:

- `applyGreyscale` -- BT.601 luminance greyscale
- `applyInvertColors` -- RGB channel inversion
- `applyBrightness` -- additive brightness adjustment
- `applyContrast` -- contrast factor adjustment
- `applySepia` -- sepia tone blending
- `applyGamma` -- gamma correction
- `applyTemperature` -- warm/cool color shift
- `applyTint` -- green channel tint
- `applyYellowish` -- scanner-effect yellowish aging
- `applyScannerPixels` -- combined scanner effect pixel pipeline (single pass)
- `applyColorAdjustments` -- combined color adjustment pipeline (single pass)

## Files

| File | Purpose |
|------|---------|
| `Cargo.toml` | Rust crate configuration |
| `lib.rs` | Rust source -- all WASM-exported functions |
| `build.sh` | Build script (wasm-pack) |
| `image-effects-wasm.ts` | TypeScript WASM loader (new file, goes in `src/js/utils/`) |
| `image-effects.ts` | Updated drop-in replacement (replaces `src/js/utils/image-effects.ts`) |
| `image-effects-wasm.test.ts` | Test suite (goes in `src/tests/`) |

## Integration Steps

### 1. Build the WASM crate

```bash
cd wasm/image-effects/   # place Cargo.toml + lib.rs here
chmod +x build.sh
./build.sh
```

This produces `pkg/bentopdf_image_effects.js` and `pkg/bentopdf_image_effects_bg.wasm`.

### 2. Deploy WASM artifacts

Copy the build output to the public directory:

```bash
mkdir -p public/wasm/image-effects/
cp pkg/bentopdf_image_effects.js public/wasm/image-effects/
cp pkg/bentopdf_image_effects_bg.wasm public/wasm/image-effects/
```

Or for CDN hosting, set `VITE_WASM_IMAGE_EFFECTS_URL` to the CDN base URL.

### 3. Add the loader file

Copy `image-effects-wasm.ts` to `src/js/utils/image-effects-wasm.ts`.

### 4. Replace image-effects.ts

Replace `src/js/utils/image-effects.ts` with the updated version. The public API is 100% backward-compatible -- all existing imports continue to work without changes.

### 5. Add tests

Copy `image-effects-wasm.test.ts` to `src/tests/image-effects-wasm.test.ts`.

### 6. Optional: Preload on high-tier devices

For high-tier devices, preload the WASM module during idle time:

```typescript
import { getDeviceCapabilities } from './device-capability.js';
import { preloadImageEffectsWasm } from './image-effects.js';

const caps = getDeviceCapabilities();
if (caps.wasm.preloadOnIdle) {
  requestIdleCallback(() => preloadImageEffectsWasm());
}
```

## Architecture Decisions

### Single crate for all effects

Rather than separate WASM modules per function, everything is in one crate. This means:
- One `.wasm` download (smaller total due to shared code)
- One instantiation cost
- Shared helper functions (clamp, HSL conversion) are deduplicated

### Combined pipeline functions

`apply_scanner_pixels` and `apply_color_adjustments` run multiple effects in a single pass over the pixel buffer. This avoids multiple iterations and reduces memory bandwidth pressure -- the main bottleneck for these operations.

### JS fallback

Every public function checks for WASM availability synchronously and falls back to the original JS implementation. This means:
- The tool works even if WASM fails to load
- No async overhead in the hot path (WASM is loaded once, then used synchronously)
- Zero changes needed in calling code

### Noise PRNG difference

The WASM scanner effect uses a deterministic LCG PRNG instead of `Math.random()`. This produces visually similar grain but is reproducible. If exact parity with the JS `Math.random()` noise is required, the noise step can be kept in JS by passing `noise_amount = 0` to WASM and applying noise separately.
