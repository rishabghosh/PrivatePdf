# License & Attribution

## This Project

This project is a fork of [BentoPDF](https://github.com/alam00000/bentopdf), licensed under **AGPL-3.0**.

Per the AGPL-3.0 license terms:
- The source code of this project (including all modifications) is publicly available.
- Any network use (serving this as a website) requires making the source code available to users.
- All derivative works must also be licensed under AGPL-3.0.

## Original Work

**BentoPDF** — Copyright (c) BentoPDF contributors
- Repository: https://github.com/alam00000/bentopdf
- License: AGPL-3.0-only
- The original LICENSE file is preserved in this repository.

## Third-Party Libraries & Licenses

### MIT License (permissive, no restrictions)
| Library | Purpose |
|---------|---------|
| pdf-lib | PDF manipulation (merge, split, rotate, text) |
| Vite | Build tool |
| Tailwind CSS | Styling |
| i18next | Internationalization |
| Lucide | Icon set |
| SortableJS | Drag-and-drop |
| html2canvas | HTML to image conversion |
| jsPDF | PDF generation |
| Cropper.js | Image cropping |

### Apache 2.0 License (permissive)
| Library | Purpose |
|---------|---------|
| PDF.js (Mozilla) | PDF rendering and viewing |
| tesseract.js | Client-side OCR |
| qpdf-wasm | PDF repair and transformation |

### AGPL-3.0 (copyleft — loaded at runtime from CDN)
| Library | Purpose |
|---------|---------|
| PyMuPDF (via Wasm) | High-performance PDF manipulation |
| Ghostscript (via Wasm) | Compression, PDF/A conversion |
| CoherentPDF (cpdf) | Content-preserving PDF operations |

**Important**: These AGPL libraries are NOT bundled in the source code. They are loaded at runtime from jsDelivr CDN. If you self-host these Wasm files, you must comply with their AGPL-3.0 terms.

### LGPL License
| Library | Purpose |
|---------|---------|
| wasm-vips | Image processing (TIFF, JPEG, PNG) |

### Other
| Library | License | Purpose |
|---------|---------|---------|
| pdfjs-dist | Apache 2.0 | PDF rendering |
| SheetJS (xlsx) | Apache 2.0 | Spreadsheet processing |
| pdfkit | MIT | PDF creation |
| EmbedPDF | Proprietary | PDF editing widget |

## Custom Landing Page

The custom homepage design (index.html hero, comparison table, tool grid, privacy card) was
created specifically for this project and is released under the same AGPL-3.0 license as the
rest of the project.

## How to Comply

If you fork this project:
1. Keep the LICENSE file intact
2. Keep your fork's source code publicly accessible
3. Include a link to the source code in your website footer
4. Preserve attribution to BentoPDF as the upstream project
5. Any modifications you make must also be AGPL-3.0

## Questions

If you need a commercial license (to keep your code private), BentoPDF offers a
one-time $49 lifetime commercial license. Contact: https://github.com/alam00000/bentopdf
