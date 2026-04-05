/**
 * wasm-provider-update.ts
 *
 * Shows the exact changes needed in wasm-provider.ts to register the new
 * 'color-adjustments' WASM package alongside the existing three packages.
 *
 * -----------------------------------------------------------------------
 * DIFF / CHANGE SUMMARY  (do NOT apply automatically; review first)
 * -----------------------------------------------------------------------
 *
 * 1. Extend the WasmPackage union type:
 *
 *    BEFORE:
 *      export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf';
 *
 *    AFTER:
 *      export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf' | 'color-adjustments';
 *
 *
 * 2. Add CDN default URL:
 *
 *    const CDN_DEFAULTS: Record<WasmPackage, string> = {
 *      pymupdf:            'https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.16/',
 *      ghostscript:        'https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm/assets/',
 *      cpdf:               'https://cdn.jsdelivr.net/npm/coherentpdf/dist/',
 *  +   'color-adjustments': 'https://cdn.jsdelivr.net/npm/@bentopdf/color-adjustments-wasm@0.1.0/pkg/',
 *    };
 *
 *
 * 3. Add env variable override:
 *
 *    const ENV_DEFAULTS: Record<WasmPackage, string> = {
 *      ...existing...,
 *  +   'color-adjustments': envOrDefault(
 *  +     import.meta.env.VITE_WASM_COLOR_ADJ_URL,
 *  +     CDN_DEFAULTS['color-adjustments']
 *  +   ),
 *    };
 *
 *
 * 4. Add validation test file entry:
 *
 *    const testFiles: Record<WasmPackage, string> = {
 *      pymupdf:            'dist/index.js',
 *      ghostscript:        'gs.js',
 *      cpdf:               'coherentpdf.browser.min.js',
 *  +   'color-adjustments': 'color_adjustments_wasm.js',
 *    };
 *
 *
 * 5. Add display name:
 *
 *    const names: Record<WasmPackage, string> = {
 *      pymupdf:            'PyMuPDF (Document Processing)',
 *      ghostscript:        'Ghostscript (PDF/A Conversion)',
 *      cpdf:               'CoherentPDF (Bookmarks & Metadata)',
 *  +   'color-adjustments': 'Color Adjustments (Image Processing)',
 *    };
 *
 *
 * 6. Add feature list:
 *
 *    const features: Record<WasmPackage, string[]> = {
 *      ...existing...,
 *  +   'color-adjustments': [
 *  +     'Brightness / Contrast',
 *  +     'Hue / Saturation shift',
 *  +     'Gamma correction',
 *  +     'Sepia filter',
 *  +     'Temperature / Tint',
 *  +   ],
 *    };
 *
 *
 * 7. Add env variable to .env.example:
 *
 *    VITE_WASM_COLOR_ADJ_URL=
 *
 * -----------------------------------------------------------------------
 * Below is the full updated WasmPackage type and the new entries rendered
 * as a standalone compilable snippet for review.
 * -----------------------------------------------------------------------
 */

// Updated WasmPackage type
export type WasmPackage =
  | 'pymupdf'
  | 'ghostscript'
  | 'cpdf'
  | 'color-adjustments';

// New CDN default
const COLOR_ADJ_CDN_DEFAULT =
  'https://cdn.jsdelivr.net/npm/@bentopdf/color-adjustments-wasm@0.1.0/pkg/';

// New env default
function envOrDefault(envVar: string | undefined, fallback: string): string {
  return envVar || fallback;
}

// This would be added to ENV_DEFAULTS:
const COLOR_ADJ_ENV_DEFAULT = envOrDefault(
  // @ts-expect-error -- VITE env var not declared yet
  import.meta.env.VITE_WASM_COLOR_ADJ_URL,
  COLOR_ADJ_CDN_DEFAULT
);

// Validation test file for the new package
const COLOR_ADJ_TEST_FILE = 'color_adjustments_wasm.js';

// Display name
const COLOR_ADJ_DISPLAY_NAME = 'Color Adjustments (Image Processing)';

// Feature list
const COLOR_ADJ_FEATURES = [
  'Brightness / Contrast',
  'Hue / Saturation shift',
  'Gamma correction',
  'Sepia filter',
  'Temperature / Tint',
];

export {
  COLOR_ADJ_CDN_DEFAULT,
  COLOR_ADJ_ENV_DEFAULT,
  COLOR_ADJ_TEST_FILE,
  COLOR_ADJ_DISPLAY_NAME,
  COLOR_ADJ_FEATURES,
};
