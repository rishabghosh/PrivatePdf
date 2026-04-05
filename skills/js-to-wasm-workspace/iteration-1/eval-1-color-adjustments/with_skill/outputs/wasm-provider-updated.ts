/**
 * Updated wasm-provider.ts — shows the diff/additions needed to register
 * the new image-effects WASM module.
 *
 * Changes are marked with "// NEW" comments. Everything else is unchanged
 * from the original file.
 */

// ─── 1. Update WasmPackage type union ───────────────────────────────

export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf' | 'image-effects'; // NEW: added 'image-effects'

// ─── 2. Update WasmProviderConfig interface ─────────────────────────

interface WasmProviderConfig {
  pymupdf?: string;
  ghostscript?: string;
  cpdf?: string;
  'image-effects'?: string; // NEW
}

// ─── 3. Add CDN default ─────────────────────────────────────────────

const CDN_DEFAULTS: Record<WasmPackage, string> = {
  pymupdf: 'https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.16/',
  ghostscript: 'https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm/assets/',
  cpdf: 'https://cdn.jsdelivr.net/npm/coherentpdf/dist/',
  'image-effects': 'https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm@0.1.0/', // NEW
};

// ─── 4. Add env var mapping ─────────────────────────────────────────

const ENV_DEFAULTS: Record<WasmPackage, string> = {
  pymupdf: envOrDefault(
    import.meta.env.VITE_WASM_PYMUPDF_URL,
    CDN_DEFAULTS.pymupdf
  ),
  ghostscript: envOrDefault(
    import.meta.env.VITE_WASM_GS_URL,
    CDN_DEFAULTS.ghostscript
  ),
  cpdf: envOrDefault(import.meta.env.VITE_WASM_CPDF_URL, CDN_DEFAULTS.cpdf),
  'image-effects': envOrDefault(                                              // NEW
    import.meta.env.VITE_WASM_IMAGE_EFFECTS_URL,                              // NEW
    CDN_DEFAULTS['image-effects']                                              // NEW
  ),                                                                           // NEW
};

// ─── 5. Add validation test file ────────────────────────────────────
// Inside validateUrl(), add to the testFiles map:

const testFiles: Record<WasmPackage, string> = {
  pymupdf: 'dist/index.js',
  ghostscript: 'gs.js',
  cpdf: 'coherentpdf.browser.min.js',
  'image-effects': 'bentopdf_image_effects_wasm.js', // NEW
};

// ─── 6. Add display name ────────────────────────────────────────────
// Inside getPackageDisplayName():

const names: Record<WasmPackage, string> = {
  pymupdf: 'PyMuPDF (Document Processing)',
  ghostscript: 'Ghostscript (PDF/A Conversion)',
  cpdf: 'CoherentPDF (Bookmarks & Metadata)',
  'image-effects': 'Image Effects (Color Adjustments)', // NEW
};

// ─── 7. Add package features ────────────────────────────────────────
// Inside getPackageFeatures():

const features: Record<WasmPackage, string[]> = {
  pymupdf: [
    'PDF to Text',
    'PDF to Markdown',
    'PDF to SVG',
    'PDF to Images (High Quality)',
    'PDF to DOCX',
    'PDF to Excel/CSV',
    'Extract Images',
    'Extract Tables',
    'EPUB/MOBI/FB2/XPS/CBZ to PDF',
    'Image Compression',
    'Deskew PDF',
    'PDF Layers',
  ],
  ghostscript: ['PDF/A Conversion', 'Font to Outline'],
  cpdf: [
    'Merge PDF',
    'Alternate Merge',
    'Split by Bookmarks',
    'Table of Contents',
    'PDF to JSON',
    'JSON to PDF',
    'Add/Edit/Extract Attachments',
    'Edit Bookmarks',
    'PDF Metadata',
  ],
  'image-effects': [                                     // NEW
    'Color Adjustments (Brightness, Contrast, etc.)',    // NEW
    'HSL Hue/Saturation Shift',                          // NEW
    'Gamma Correction',                                  // NEW
    'Sepia Tone',                                        // NEW
    'Temperature/Tint',                                  // NEW
  ],                                                     // NEW
};

// ─── 8. Update getAllProviders() ─────────────────────────────────────

// getAllProviders(): WasmProviderConfig {
//   return {
//     pymupdf: this.config.pymupdf || ENV_DEFAULTS.pymupdf,
//     ghostscript: this.config.ghostscript || ENV_DEFAULTS.ghostscript,
//     cpdf: this.config.cpdf || ENV_DEFAULTS.cpdf,
//     'image-effects': this.config['image-effects'] || ENV_DEFAULTS['image-effects'],  // NEW
//   };
// }

// ─── 9. Environment variable ────────────────────────────────────────
// Add to .env.example and .env.production:
//
//   VITE_WASM_IMAGE_EFFECTS_URL=https://cdn.jsdelivr.net/npm/@bentopdf/image-effects-wasm@0.1.0/

function envOrDefault(envVar: string | undefined, fallback: string): string {
  return envVar || fallback;
}
