# WASM Migration Opportunities

This document identifies tools where JavaScript is doing **actual processing work** (not just UI) that could be moved to WASM modules for better quality, performance, and memory efficiency.

## Dependency Map Corrections

Before diving into opportunities, note these corrections to `docs/tool-dependency-map.md`:

| Tool | Listed As | Actually Is |
|---|---|---|
| merge-pdf | Pure JS (pdfjs-dist, sortablejs) | **Mixed** — CPDF WASM does the merge in a Web Worker; pdfjs renders thumbnails; sortablejs handles drag-drop |
| page-dimensions | Mixed (QPDF) | **Pure JS** — uses only pdfjs-dist for parsing, no WASM |
| decrypt-pdf | Pure JS | **Mixed** — CPDF WASM primary, PyMuPDF WASM fallback |
| alternate-merge | Pure JS | **Mixed** — CPDF WASM via Web Worker |

---

## HIGH Priority — Canvas Rasterize-Then-Re-Embed Anti-Pattern

These tools render PDF pages to canvas via pdfjs, manipulate pixels, then re-embed as images. This **destroys vector content** and balloons memory. PyMuPDF/CPDF can do these operations natively on PDF streams.

| Tool | Current Processing | WASM Replacement | Module |
|---|---|---|---|
| combine-single-page | pdfjs → canvas 2x → PNG → pdf-lib embed | Native page combining | PyMuPDF |
| posterize | pdfjs → canvas 2x → tile extraction → PNG → pdf-lib | Native tile rendering | PyMuPDF |
| text-color | pdfjs → canvas → pixel scan → recolor → PNG → pdf-lib | Stream-level text color ops | PyMuPDF |
| adjust-colors | pdfjs → canvas → ImageData manipulation → PNG → pdf-lib | Color transforms on PDF streams | PyMuPDF or Ghostscript |
| invert-colors | pdfjs → canvas → pixel inversion → PNG → pdf-lib | Native color inversion | PyMuPDF |
| pdf-to-greyscale | pdfjs → canvas → luminance calc → JPEG → pdf-lib | Native greyscale rendering | PyMuPDF |
| rotate-custom | Non-90° angles: renders page as image, applies affine transform | Native arbitrary rotation (preserves vectors) | CPDF |
| crop-pdf (flatten mode) | pdfjs → canvas → crop region → PNG → pdf-lib | Native crop + flatten | PyMuPDF |
| add-watermark | Renders watermark to canvas, overlays as image | Native text/image overlay layer | PyMuPDF |
| compare-pdfs | pdfjs → canvas → pixel-level diff | Page fingerprinting + text extraction (far more accurate) | PyMuPDF |
| remove-blank-pages | pdfjs → canvas 0.5x → pixel brightness analysis | Content block detection (no rasterization needed) | PyMuPDF |

### Why these matter

- **Vector content destroyed**: Text, paths, and fonts are rasterized to pixels then re-embedded as flat images. The output PDF is no longer searchable or scalable.
- **Memory explosion**: Canvas at 2x scale for a letter-size page = ~34 MB of raw RGBA per page. On low-tier devices this is already capped, reducing output quality.
- **Quality loss**: JPEG re-encoding introduces artifacts. PNG avoids this but inflates file size.
- **PyMuPDF alternative**: Operates directly on PDF content streams — modifies colors, applies transforms, extracts regions — without ever rasterizing. Output preserves full vector fidelity.

---

## MEDIUM Priority — JS Works But WASM Is More Robust/Faster

These tools function correctly but use JS libraries where WASM would handle edge cases better or process significantly faster.

| Tool | Current Processing | WASM Replacement | Module |
|---|---|---|---|
| flatten-pdf | pdf-lib `form.flatten()` + custom annotation flattener | Native flattening (handles complex annotations better) | CPDF |
| sanitize-pdf | pdf-lib dict manipulation (remove JS, fonts, layers) | Handles malformed/corrupted PDFs gracefully | PyMuPDF or Ghostscript |
| validate-signature | pdfjs extraction + node-forge cert validation | More reliable signature extraction | PyMuPDF |
| digital-sign-pdf | pdf-lib widget + node-forge signing | Better signature field positioning | PyMuPDF or CPDF |
| pdf-to-jpg | pdfjs → canvas → JPEG blob | Direct JPEG export (faster batch processing) | PyMuPDF |
| pdf-to-png | pdfjs → canvas → PNG blob | Direct PNG export (faster batch processing) | PyMuPDF |
| pdf-to-cbz | pdfjs → canvas → images → JSZip | Batch render to images + JSZip for packaging | PyMuPDF |
| scanner-effect | pdfjs → canvas → noise/blur/rotation effects → JPEG | Rendering + partial effects (noise/blur still needs canvas) | Ghostscript + PyMuPDF |
| n-up-pdf | pdf-lib embedPage grid layout | Native n-up imposition (better precision) | CPDF |
| pdf-booklet | pdf-lib embedPage reordering | Native booklet imposition | CPDF |
| divide-pages | pdf-lib setCropBox halves | Native page division | CPDF |
| delete-pages | pdf-lib utility | More reliable with complex PDFs | CPDF |

### Why these are medium, not high

- The output quality is acceptable — no vector-to-raster degradation in most cases.
- The improvement is in **robustness** (edge-case PDFs that break pdf-lib) or **speed** (batch operations where PyMuPDF's C++ core is 3-10x faster than JS).
- Some (like flatten-pdf) work fine for 95% of PDFs but fail on complex annotation structures that CPDF handles natively.

---

## LOW Priority — JS Is the Right Tool

These tools either do trivial operations, are UI-bound, or use JS libraries that are already optimal for the task.

### Trivial PDF Structure Operations (pdf-lib is correct)

| Tool | Why JS Is Fine |
|---|---|
| split-pdf | pdf-lib `copyPages` is clean; bookmarks already use CPDF WASM |
| extract-pages | Simple page copy + ZIP packaging |
| rotate-pdf (90° only) | pdf-lib rotation metadata change is correct and lossless |
| reverse-pages | Array index reversal, trivial operation |
| add-blank-page | Simple `addPage()` call |
| header-footer | pdf-lib `drawText()` with standard fonts is sufficient |
| page-numbers | Text positioning per page, same as above |
| bates-numbering | Sequential text stamping per page |
| background-color | pdf-lib embedPage + color rectangle underneath |
| organize-pdf | pdf-lib page reorder based on UI selection |
| fix-page-size | pdf-lib page dimension adjustment |

### Metadata Operations (pdf-lib dict access is correct)

| Tool | Why JS Is Fine |
|---|---|
| edit-metadata | Direct Info Dict read/write |
| view-metadata | pdfjs dict read, display only |
| remove-metadata | Dict entry deletion |
| remove-annotations | Annots dict removal per page |

### UI-Bound Tools (bottleneck is interaction, not processing)

| Tool | Why JS Is Fine |
|---|---|
| form-filler | PDF.js embedded viewer for interactive form editing |
| form-creator | PDF.js embedded viewer for form field creation |
| sign-pdf | PDF.js annotation UI for signature placement |
| add-stamps | pdfjs-annotation-extension viewer |
| edit-pdf | embedpdf-snippet (pdfium WASM, already bundled) |

### Image-to-PDF (pdf-lib image embedding is optimal)

| Tool | Why JS Is Fine |
|---|---|
| png-to-pdf | pdf-lib `embedPng()` direct embedding |
| webp-to-pdf | pdf-lib + canvas fallback for WebP decode |
| bmp-to-pdf | Canvas BMP→PNG conversion + pdf-lib embed |
| svg-to-pdf | Canvas SVG rasterization + pdf-lib embed |
| heic-to-pdf | heic2any native codec + pdf-lib embed |
| tiff-to-pdf | tiff decoder + pdf-lib embed |
| markdown-to-pdf | Custom HTML renderer, no PDF parsing involved |

### Already Using WASM / Crypto-Bound

| Tool | Why No Change Needed |
|---|---|
| encrypt-pdf | Already QPDF WASM |
| decrypt-pdf | Already CPDF WASM → PyMuPDF fallback |
| alternate-merge | Already CPDF WASM via Web Worker |
| merge-pdf | Already CPDF WASM via Web Worker |
| timestamp-pdf | TSA HTTP + node-forge crypto (not a rendering problem) |
| pdf-to-zip | JSZip only, no PDF processing at all |

---

## Mixed Tools — Current WASM+JS Split Assessment

These tools already use WASM but have JS in the processing pipeline. Assessment of whether the JS portion can be eliminated:

| Tool | WASM Part | JS Part | Can JS Be Eliminated? |
|---|---|---|---|
| compress-pdf | PyMuPDF (Condense) | pdfjs+canvas (Photon) | **No** — Photon is an intentional alternative algorithm |
| cbz-to-pdf | PyMuPDF (CBR path) | jszip+pdf-lib (CBZ path) | **Partially** — CBZ works pure JS; CBR needs WASM |
| extract-tables | PyMuPDF (extraction) | CSV/JSON/Markdown formatting | **No** — serialization is trivial but best in JS |
| pdf-to-excel | PyMuPDF (extraction) | xlsx (workbook creation) | **No** — Excel formatting requires xlsx library |
| pdf-to-svg | PyMuPDF (SVG render) | jszip (packaging) | **Yes** — ZIP is trivial; could skip for single files |
| rasterize-pdf | PyMuPDF (rasterize) | pdfjs (fallback) | **Yes** — pdfjs fallback is redundant |
| pdf-to-pdfa | Ghostscript+PyMuPDF | pdf-lib (orchestration) | **No** — multi-WASM pipeline needs JS glue |
| ocr-pdf | Tesseract WASM | pdfjs+pdf-lib | **Partially** — PyMuPDF could replace pdfjs rendering step |
| image-to-pdf | PyMuPDF (PDF creation) | heic2any+canvas (preprocessing) | **Partially** — HEIC decode still needs JS |
| jpg-to-pdf | PyMuPDF (PDF creation) | image compression | **Yes** — PyMuPDF handles this end-to-end |
| txt-to-pdf | PyMuPDF (text layout) | text input gathering | **Yes** — JS only gathers input strings |
| pdf-to-tiff | wasm-vips (TIFF encode) | pdfjs (PDF rendering) | **Partially** — PyMuPDF could replace pdfjs rendering |
| overlay-pdf | QPDF (merge) | pdfjs+FS management | **No** — FS management is tightly coupled |
| repair-pdf | QPDF (repair) | jszip+error handling | **No** — error recovery logic needs JS |

### Quick Wins (JS removal from mixed tools)

1. **rasterize-pdf** — Drop pdfjs fallback; PyMuPDF already handles all cases
2. **jpg-to-pdf** — Drop JS compression; PyMuPDF `imagesToPdf()` is sufficient
3. **txt-to-pdf** — Already pure WASM processing; JS only passes text strings
4. **pdf-to-svg** — Drop jszip for single-file output; keep only for batch

---

## Summary

| Priority | Count | Core Issue | Impact |
|---|---|---|---|
| **HIGH** | 11 | Canvas rasterize-then-re-embed destroys vectors, wastes memory | Vector fidelity, memory, quality |
| **MEDIUM** | 12 | Works but WASM is more robust/faster | Edge-case reliability, batch speed |
| **LOW** | 24+ | JS is the right tool, no change needed | N/A |
| **Mixed quick wins** | 4 | Redundant JS in mixed tools | Cleaner architecture |

### Recommended Migration Order

1. **Phase 1 — High-impact rendering tools**: combine-single-page, posterize, text-color, adjust-colors, invert-colors, pdf-to-greyscale, rotate-custom, crop-pdf (flatten). These all share the same anti-pattern and can reuse a common PyMuPDF rendering pipeline.
2. **Phase 2 — Comparison and detection**: compare-pdfs, remove-blank-pages. These benefit from PyMuPDF's structural analysis rather than pixel-level hacks.
3. **Phase 3 — Watermark and overlay**: add-watermark. Standalone but high-visibility tool.
4. **Phase 4 — Mixed tool cleanup**: rasterize-pdf, jpg-to-pdf, txt-to-pdf, pdf-to-svg. Quick wins to simplify architecture.
5. **Phase 5 — Medium priority batch**: flatten-pdf, sanitize-pdf, pdf-to-jpg, pdf-to-png, n-up-pdf, pdf-booklet, divide-pages. Incremental improvements.
