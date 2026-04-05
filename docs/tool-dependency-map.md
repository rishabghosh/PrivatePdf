# Tool Dependency Map: WASM vs JS

This document maps every BentoPDF tool to its processing dependencies — whether it uses WASM modules, pure JavaScript libraries, or a mix of both.

## Summary

- **~50 tools** — Pure JS (pdf-lib + pdfjs-dist do the heavy lifting)
- **~25 tools** — Pure WASM (PyMuPDF, LibreOffice, Ghostscript, CPDF)
- **~15 tools** — Mixed (JS for rendering/packaging, WASM for core processing)
- **~6 tools** — QPDF WASM (small, bundled module for encryption/structure)

## WASM Modules

| Module | Source | Bundled? | Tools Using |
|---|---|---|---|
| PyMuPDF | `@bentopdf/pymupdf-wasm` (jsDelivr CDN) | No, loaded at runtime | ~24 |
| LibreOffice | `@matbee/libreoffice-converter` | No, loaded at runtime | ~13 |
| Ghostscript | `@bentopdf/gs-wasm` (jsDelivr CDN) | No, loaded at runtime | 2 |
| CoherentPDF (CPDF) | `coherentpdf` (jsDelivr CDN) | No, loaded at runtime | 3 |
| QPDF | `@neslinesli93/qpdf-wasm` | Yes, bundled | 6 |
| Tesseract.js | `tesseract.js` | Yes, bundled (WASM loaded at runtime) | 1 |
| wasm-vips | `wasm-vips` | No, loaded at runtime | 1 |
| pdfium | `embedpdf-snippet` | Yes, bundled | 1 |

## JS Libraries

| Library | Role | Tools Using |
|---|---|---|
| pdf-lib | PDF creation/modification (pages, annotations, forms, metadata) | ~65 |
| pdfjs-dist | PDF rendering to canvas, page analysis | ~25 |
| jszip | ZIP archive creation/extraction | ~15 |
| sortablejs | Drag-and-drop UI for page reordering | ~3 |
| node-forge | Cryptographic operations (signing, validation) | 2 |
| zgapdfsigner | PDF digital signature embedding | 2 |
| heic2any | HEIC/HEIF image decoding | 2 |
| cropperjs | Image crop UI | 1 |
| xlsx | Excel file formatting | 1 |
| tiff | TIFF image decoding | 1 |

---

## Pure WASM Tools

Core operation is entirely delegated to a WASM module.

| Tool | WASM Module |
|---|---|
| deskew-pdf | PyMuPDF |
| epub-to-pdf | PyMuPDF |
| mobi-to-pdf | PyMuPDF |
| fb2-to-pdf | PyMuPDF |
| xps-to-pdf | PyMuPDF |
| psd-to-pdf | PyMuPDF |
| pdf-to-text | PyMuPDF |
| pdf-to-markdown | PyMuPDF |
| pdf-to-docx | PyMuPDF |
| pdf-to-csv | PyMuPDF |
| pdf-layers | PyMuPDF |
| prepare-pdf-for-ai | PyMuPDF |
| extract-images | PyMuPDF |
| word-to-pdf | LibreOffice |
| excel-to-pdf | LibreOffice |
| powerpoint-to-pdf | LibreOffice |
| odt-to-pdf | LibreOffice |
| ods-to-pdf | LibreOffice |
| odp-to-pdf | LibreOffice |
| odg-to-pdf | LibreOffice |
| rtf-to-pdf | LibreOffice |
| pub-to-pdf | LibreOffice |
| vsd-to-pdf | LibreOffice |
| wpd-to-pdf | LibreOffice |
| wps-to-pdf | LibreOffice |
| csv-to-pdf | LibreOffice |
| font-to-outline | Ghostscript |
| add-attachments | CPDF |
| edit-attachments | CPDF |
| extract-attachments | CPDF |
| change-permissions | QPDF |
| encrypt-pdf | QPDF |
| remove-restrictions | QPDF |
| linearize-pdf | QPDF |

## Mixed Tools (WASM + JS)

Both WASM and JS libraries collaborate. The table shows how work is divided.

| Tool | WASM | JS | How They Split |
|---|---|---|---|
| compress-pdf | PyMuPDF (Condense mode) | pdf-lib, pdfjs-dist, canvas (Photon mode) | WASM for quality compression; JS canvas fallback |
| cbz-to-pdf | PyMuPDF | jszip, pdf-lib | jszip extracts archive, PyMuPDF converts |
| extract-tables | PyMuPDF | pdf-lib, jszip | PyMuPDF extracts, JS packages output |
| pdf-to-excel | PyMuPDF | xlsx | PyMuPDF extracts, xlsx formats |
| pdf-to-svg | PyMuPDF | jszip | PyMuPDF renders, JS zips |
| rasterize-pdf | PyMuPDF | pdfjs-dist | PyMuPDF rasterizes; pdfjs fallback |
| pdf-to-pdfa | Ghostscript + PyMuPDF | pdf-lib | Ghostscript converts; PyMuPDF validates |
| ocr-pdf | Tesseract.js (WASM internally) | pdf-lib, pdfjs-dist | pdfjs renders pages, Tesseract OCRs, pdf-lib embeds text |
| image-to-pdf | PyMuPDF | heic2any | JS converts HEIC, PyMuPDF builds PDF |
| jpg-to-pdf | PyMuPDF | — | PyMuPDF when available, JS fallback |
| txt-to-pdf | PyMuPDF | — | PyMuPDF when available |
| pdf-to-tiff | wasm-vips | pdfjs-dist, jszip | pdfjs renders, wasm-vips encodes TIFF |
| overlay-pdf | QPDF | pdfjs-dist | QPDF merges overlays |
| repair-pdf | QPDF | jszip | QPDF repairs structure |
| page-dimensions | QPDF | — | QPDF reads structure |

## Pure JS Tools

No WASM modules required. All processing done with JavaScript libraries.

| Tool | JS Libraries |
|---|---|
| merge-pdf | pdfjs-dist, sortablejs |
| split-pdf | pdf-lib |
| organize-pdf | sortablejs |
| delete-pages | pdfjs-dist |
| extract-pages | pdf-lib, jszip |
| rotate-pdf | pdf-lib, pdfjs-dist |
| rotate-custom | pdf-lib, pdfjs-dist |
| reverse-pages | pdf-lib, jszip |
| crop-pdf | pdf-lib, pdfjs-dist, cropperjs |
| add-blank-page | pdf-lib |
| divide-pages | pdf-lib |
| n-up-pdf | pdf-lib |
| pdf-booklet | pdf-lib, pdfjs-dist |
| combine-single-page | pdf-lib, pdfjs-dist |
| posterize | pdf-lib, pdfjs-dist |
| fix-page-size | pdf-lib |
| add-watermark | pdf-lib, pdfjs-dist |
| header-footer | pdf-lib |
| page-numbers | pdf-lib |
| bates-numbering | pdf-lib, jszip, sortablejs |
| add-stamps | pdf-lib |
| background-color | pdf-lib |
| text-color | pdf-lib, pdfjs-dist |
| adjust-colors | pdf-lib, pdfjs-dist |
| invert-colors | pdf-lib, pdfjs-dist |
| scanner-effect | pdf-lib, pdfjs-dist |
| pdf-to-greyscale | pdf-lib, pdfjs-dist |
| pdf-to-jpg | pdfjs-dist |
| pdf-to-png | pdfjs-dist |
| pdf-to-webp | pdfjs-dist |
| pdf-to-bmp | pdfjs-dist |
| pdf-to-cbz | pdfjs-dist, jszip |
| png-to-pdf | pdf-lib |
| webp-to-pdf | pdf-lib |
| bmp-to-pdf | pdf-lib |
| svg-to-pdf | pdf-lib |
| heic-to-pdf | heic2any, pdf-lib |
| tiff-to-pdf | tiff (decoder), pdf-lib |
| markdown-to-pdf | custom renderer |
| sign-pdf | zgapdfsigner, node-forge |
| digital-sign-pdf | zgapdfsigner, node-forge |
| validate-signature | node-forge |
| timestamp-pdf | node-forge |
| form-filler | pdf-lib |
| form-creator | pdf-lib |
| flatten-pdf | pdf-lib |
| remove-annotations | pdf-lib |
| remove-blank-pages | pdf-lib, pdfjs-dist |
| view-metadata | pdf-lib |
| edit-metadata | pdf-lib |
| remove-metadata | pdf-lib |
| sanitize-pdf | pdf-lib |
| decrypt-pdf | custom util, jszip |
| compare-pdfs | pdfjs-dist |
| pdf-to-zip | jszip |
| edit-pdf | embedpdf-snippet (pdfium WASM, bundled) |
