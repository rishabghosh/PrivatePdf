/**
 * Integration guide — how the WASM module plugs into existing tool pages.
 *
 * This file shows the changes needed in each consuming file. It is NOT meant
 * to be imported directly; each section documents a specific file that would
 * be modified.
 *
 * All integration follows the skill's Step 6: WASM-first with JS fallback.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. wasm-provider.ts — register the new package
// ═══════════════════════════════════════════════════════════════════
//
// --- a) Add 'image-effects' to the WasmPackage union type ---
//
//   export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf' | 'image-effects';
//
// --- b) Add to CDN_DEFAULTS ---
//
//   const CDN_DEFAULTS: Record<WasmPackage, string> = {
//     ...existing entries...
//     'image-effects': 'https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm/',
//   };
//
// --- c) Add to ENV_DEFAULTS ---
//
//   const ENV_DEFAULTS: Record<WasmPackage, string> = {
//     ...existing entries...
//     'image-effects': envOrDefault(
//       import.meta.env.VITE_WASM_IMAGE_EFFECTS_URL,
//       CDN_DEFAULTS['image-effects']
//     ),
//   };
//
// --- d) Add to WasmProviderConfig interface ---
//
//   interface WasmProviderConfig {
//     pymupdf?: string;
//     ghostscript?: string;
//     cpdf?: string;
//     'image-effects'?: string;
//   }
//
// --- e) Add to validateUrl testFiles ---
//
//   const testFiles: Record<WasmPackage, string> = {
//     ...existing entries...
//     'image-effects': 'bentopdf_image_effects_wasm.js',
//   };
//
// --- f) Add to getAllProviders ---
//
//   getAllProviders(): WasmProviderConfig {
//     return {
//       ...existing entries...
//       'image-effects': this.config['image-effects'] || ENV_DEFAULTS['image-effects'],
//     };
//   }
//
// --- g) Add to getPackageDisplayName ---
//
//   'image-effects': 'Image Effects (Greyscale, Invert, Color Adjustments)',
//
// --- h) Add to getPackageFeatures ---
//
//   'image-effects': [
//     'PDF to Greyscale',
//     'Invert PDF Colors',
//     'Adjust PDF Colors',
//     'Scanner Effect',
//   ],
//

// ═══════════════════════════════════════════════════════════════════
// 2. .env.example — add the new environment variable
// ═══════════════════════════════════════════════════════════════════
//
//   VITE_WASM_IMAGE_EFFECTS_URL=https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm/
//

// ═══════════════════════════════════════════════════════════════════
// 3. vite.config.ts — exclude from bundling
// ═══════════════════════════════════════════════════════════════════
//
// Add '@bentopdf/image-effects-wasm' to optimizeDeps.exclude:
//
//   optimizeDeps: {
//     exclude: [
//       ...existing entries...
//       '@bentopdf/image-effects-wasm',
//     ],
//   },
//

// ═══════════════════════════════════════════════════════════════════
// 4. pdf-to-greyscale-page.ts — WASM-first greyscale with JS fallback
// ═══════════════════════════════════════════════════════════════════

import {
  loadImageEffectsWasm,
  isImageEffectsWasmAvailable,
} from '../utils/image-effects-wasm-loader.js';
import { applyGreyscale as applyGreyscaleJS } from '../utils/image-effects.js';

/**
 * Apply greyscale to an ImageData, preferring WASM if available.
 *
 * Replaces the direct call to `applyGreyscale(imageData)` in the convert() loop.
 */
async function applyGreyscaleWithFallback(imageData: ImageData): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      const result = wasm.apply_greyscale(new Uint8Array(imageData.data.buffer));
      imageData.data.set(new Uint8ClampedArray(result.buffer));
      return;
    } catch (e) {
      console.warn('[WASM] Greyscale failed, falling back to JS:', e);
    }
  }
  // JS fallback — mutates imageData in place
  applyGreyscaleJS(imageData);
}

// Usage in pdf-to-greyscale-page.ts convert() loop:
//
//   // BEFORE:
//   // applyGreyscale(imageData);
//
//   // AFTER:
//   await applyGreyscaleWithFallback(imageData);
//

// ═══════════════════════════════════════════════════════════════════
// 5. invert-colors-page.ts — WASM-first invert with JS fallback
// ═══════════════════════════════════════════════════════════════════

import { applyInvertColors as applyInvertColorsJS } from '../utils/image-effects.js';

/**
 * Apply color inversion to an ImageData, preferring WASM if available.
 *
 * Replaces the direct call to `applyInvertColors(imageData)` in the invertColors() loop.
 */
async function applyInvertColorsWithFallback(
  imageData: ImageData
): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      const result = wasm.apply_invert_colors(
        new Uint8Array(imageData.data.buffer)
      );
      imageData.data.set(new Uint8ClampedArray(result.buffer));
      return;
    } catch (e) {
      console.warn('[WASM] Invert colors failed, falling back to JS:', e);
    }
  }
  // JS fallback — mutates imageData in place
  applyInvertColorsJS(imageData);
}

// Usage in invert-colors-page.ts invertColors() loop:
//
//   // BEFORE:
//   // applyInvertColors(imageData);
//   // ctx.putImageData(imageData, 0, 0);
//
//   // AFTER:
//   await applyInvertColorsWithFallback(imageData);
//   ctx.putImageData(imageData, 0, 0);
//

// ═══════════════════════════════════════════════════════════════════
// 6. adjust-colors-page.ts — WASM-first color adjustments with JS fallback
// ═══════════════════════════════════════════════════════════════════

import { applyColorAdjustments as applyColorAdjustmentsJS } from '../utils/image-effects.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';

/**
 * Apply the full color adjustment pipeline, preferring WASM if available.
 *
 * The JS version (`applyColorAdjustments`) writes to canvas directly.
 * The WASM version returns a pixel buffer that we write to canvas manually.
 */
async function applyColorAdjustmentsWithFallback(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: AdjustColorsSettings
): Promise<void> {
  if (isImageEffectsWasmAvailable()) {
    try {
      const wasm = await loadImageEffectsWasm();
      const result = wasm.apply_color_adjustments(
        new Uint8Array(sourceData.data.buffer),
        settings
      );
      const ctx = canvas.getContext('2d')!;
      canvas.width = sourceData.width;
      canvas.height = sourceData.height;
      const outData = new ImageData(
        new Uint8ClampedArray(result.buffer),
        sourceData.width,
        sourceData.height
      );
      ctx.putImageData(outData, 0, 0);
      return;
    } catch (e) {
      console.warn('[WASM] Color adjustments failed, falling back to JS:', e);
    }
  }
  // JS fallback — handles canvas setup internally
  applyColorAdjustmentsJS(sourceData, canvas, settings);
}

// Usage in adjust-colors-page.ts:
//
//   // BEFORE:
//   // const applyEffects = applyColorAdjustments;
//   // applyEffects(sourceData, canvas, settings);
//
//   // AFTER:
//   await applyColorAdjustmentsWithFallback(sourceData, canvas, settings);
//

// ═══════════════════════════════════════════════════════════════════
// 7. scanner-effect-page.ts — WASM pixel kernel + JS DOM effects
// ═══════════════════════════════════════════════════════════════════
//
// The scanner effect is split: the pixel kernel goes to WASM, but
// blur (canvas filter), border (gradient fills), and rotation
// (canvas transforms) stay in TypeScript since they need DOM APIs.
//
// The integration replaces only the inner `for` loop of
// applyScannerEffect with the WASM `apply_scanner_pixel_kernel`.
// The surrounding blur, border, and rotation logic is unchanged.
//
// To integrate, modify `applyScannerEffect` in image-effects.ts:
//
//   1. After `const imageData = workCtx.getImageData(...)`, instead
//      of the `for (let i = 0; ...)` loop, call:
//
//        if (isImageEffectsWasmAvailable()) {
//          try {
//            const wasm = await loadImageEffectsWasm();
//            const processed = wasm.apply_scanner_pixel_kernel(
//              new Uint8Array(imageData.data.buffer),
//              {
//                grayscale: settings.grayscale,
//                brightness: settings.brightness,
//                contrast: settings.contrast,
//                yellowish: settings.yellowish,
//                noise: scaledNoise,
//                seed: 0, // 0 = auto-seed (non-deterministic)
//              }
//            );
//            imageData.data.set(new Uint8ClampedArray(processed.buffer));
//          } catch (e) {
//            console.warn('[WASM] Scanner pixel kernel failed, using JS:', e);
//            // ... existing for-loop as fallback ...
//          }
//        } else {
//          // ... existing for-loop ...
//        }
//
//   2. The rest of the function (border, rotation) stays the same.
//

// ═══════════════════════════════════════════════════════════════════
// 8. Device-adaptive loading (Step 7 from skill)
// ═══════════════════════════════════════════════════════════════════
//
// In each tool page that uses image effects WASM, add preloading
// for high-tier devices:
//
//   import { getDeviceCapabilities } from '../utils/device-capability.js';
//   import { loadImageEffectsWasm } from '../utils/image-effects-wasm-loader.js';
//
//   // At page initialization:
//   const caps = getDeviceCapabilities();
//   if (caps.wasm.preloadOnIdle) {
//     requestIdleCallback(() => loadImageEffectsWasm().catch(() => {}));
//   }
//
// On low-tier devices, caps.wasm.deferUntilUse = true, so the WASM
// module won't be loaded until the user clicks "Process". The JS
// fallback ensures the tool works even if the WASM load fails.
//
// Since the image-effects WASM module is small (~50-100KB), there's
// no need to skip WASM entirely on low-tier devices — the JS fallback
// is only for error cases, not a tier-based opt-out.
//

// ═══════════════════════════════════════════════════════════════════
// 9. Workflow node integration
// ═══════════════════════════════════════════════════════════════════
//
// Both `greyscale-node.ts` and `invert-colors-node.ts` in
// src/js/workflow/nodes/ use the same functions. Apply the same
// WASM-first fallback pattern there.
//

// NOTE: This file is a documentation artifact. The actual integration
// requires editing the real project files listed above.

export {};
