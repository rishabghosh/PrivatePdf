/**
 * wasm-provider.ts additions for the image-effects WASM module.
 *
 * This file shows the DIFF / additions needed in src/js/utils/wasm-provider.ts.
 * It is NOT a standalone file — merge these changes into the existing wasm-provider.ts.
 */

// ─── 1. Update WasmPackage type union (line 1) ──────────────────────
// BEFORE:
//   export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf';
// AFTER:
export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf' | 'image-effects';

// ─── 2. Update WasmProviderConfig interface (line 3-7) ──────────────
// Add:
//   'image-effects'?: string;

// ─── 3. Update CDN_DEFAULTS (line 11-15) ────────────────────────────
// Add:
//   'image-effects': 'https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm/',

// ─── 4. Update ENV_DEFAULTS (line 21-31) ────────────────────────────
// Add:
//   'image-effects': envOrDefault(
//     import.meta.env.VITE_WASM_IMAGE_EFFECTS_URL,
//     CDN_DEFAULTS['image-effects']
//   ),

// ─── 5. Update validateUrl testFiles (line 132-136) ─────────────────
// Add:
//   'image-effects': 'bentopdf_image_effects_wasm.js',

// ─── 6. Update getAllProviders (line 211-216) ────────────────────────
// Add:
//   'image-effects': this.config['image-effects'] || ENV_DEFAULTS['image-effects'],

// ─── 7. Update getPackageDisplayName (line 234-238) ─────────────────
// Add:
//   'image-effects': 'Image Effects (Pixel Processing)',

// ─── 8. Update getPackageFeatures (line 242-270) ────────────────────
// Add:
//   'image-effects': [
//     'Greyscale Conversion',
//     'Color Inversion',
//     'Color Adjustments (Brightness, Contrast, Saturation, etc.)',
//     'Scanner Effect Processing',
//   ],
