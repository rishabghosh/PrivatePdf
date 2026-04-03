# Playwright Integration Test Failure Summary

**Date:** 2026-04-03
**Total Tests:** 846 (across Chromium, Firefox, WebKit)
**Passed:** 609 (72%)
**Failed:** 237 (28%)
**Duration:** 42.7 minutes
**Target:** `http://localhost:5173` (Vite dev server)

---

## Failure Categories

### 1. Missing Fixture Files (~90 failures, ~30 per browser)

Tests reference fixture files that do not exist in `integration-tests/fixtures/`. The `uploadFile` helper throws `ENOENT` when trying to `setInputFiles` with a nonexistent path.

**Missing image fixtures:**
- `sample.jpg`, `sample.png`, `sample.webp`, `sample.bmp`, `sample.heic`, `sample.tiff`, `sample.psd`

**Missing document fixtures:**
- `sample.docx`, `sample.xlsx`, `sample.pptx`, `sample.odt`, `sample.ods`, `sample.odp`, `sample.odg`
- `sample.xps`, `sample.epub`, `sample.mobi`, `sample.fb2`, `sample.cbz`
- `sample.wpd`, `sample.wps`, `sample.pages`, `sample.pub`, `sample.vsd`, `sample.msg`

**Missing PDF fixtures:**
- `encrypted.pdf`, `with-attachments.pdf` (referenced but not present)

**Affected test suites:**
- `convert-to-pdf/*` (image-to-pdf, png-to-pdf, webp-to-pdf, bmp-to-pdf, heic-to-pdf, tiff-to-pdf, psd-to-pdf, word-to-pdf, excel-to-pdf, powerpoint-to-pdf, odt-to-pdf, xps-to-pdf, epub-to-pdf, mobi-to-pdf, fb2-to-pdf, cbz-to-pdf, wpd-to-pdf, wps-to-pdf, pages-to-pdf, odg-to-pdf, ods-to-pdf, odp-to-pdf, pub-to-pdf, vsd-to-pdf)
- `secure/02-decrypt-pdf` (needs `encrypted.pdf`)
- `organize-manage/04-extract-attachments` (needs `with-attachments.pdf`)

**Fix:** Generate the missing fixture files using the existing `helpers/generate-fixtures.mjs` script or create them manually.

---

### 2. Operation Timeouts (~30 failures, ~10 per browser)

Heavy PDF processing operations exceed the 2-minute test timeout. The `waitForDownload` helper times out waiting for the `download` event.

**Affected tests:**
| Test | Timeout |
|------|---------|
| `convert-from-pdf/08-pdf-to-csv` — convert PDF with tables to CSV | 2 min |
| `convert-from-pdf/09-pdf-to-excel` — convert PDF to Excel | 2 min |
| `convert-from-pdf/13-extract-images` — extract images from PDF | 2 min |
| `convert-from-pdf/17-extract-tables` — extract tables from PDF | 2 min |
| `convert-to-pdf/13-rtf-to-pdf` — convert RTF to PDF | 2 min |
| `edit-annotate/01-bookmark` — add a bookmark and download | 2 min |
| `edit-annotate/02-table-of-contents` — generate TOC and download | 2 min |
| `edit-annotate/17-remove-blank-pages` — remove blank pages and download | 2 min |
| `popular/03-merge-pdf` — merge two/large PDFs and download | 2 min |
| `secure/08-timestamp-pdf` — timestamp PDF and download | 2 min |

**Fix:** Either increase the per-test timeout for slow operations (use `test.slow()`) or optimize the underlying PDF processing code.

---

### 3. Selector / DOM Mismatches (~30 failures, ~10 per browser)

Test selectors do not match the actual DOM structure of certain tools. The tools either use a different page layout or load content dynamically in a way the tests don't account for.

**Affected tools and issues:**

| Tool | Issue |
|------|-------|
| **PDF Workflow Builder** (`popular/01-pdf-workflow`) | `#workflow-container` not found — tool uses a different container ID or lazy-loads the canvas |
| **PDF Multi Tool** (`popular/02-pdf-multi-tool`) | Page heading doesn't match `/multi.tool/i` pattern; tool UI differs from expected selectors |
| **Markdown to PDF** (`convert-to-pdf/09-markdown-to-pdf`) | `navigateToTool` fails — page doesn't render `#tool-uploader` within 15s; may use a different page structure |
| **Form Creator** (`edit-annotate/16-form-creator`) | `navigateToTool` fails — `#tool-uploader` not found; tool may use `#editor-container` instead |
| **Add Watermark** (`edit-annotate/06-add-watermark`) | `expectFileUploaded` times out — watermark tool renders upload confirmation differently |
| **Add Stamps** (`edit-annotate/13-add-stamps`) | `expectFileUploaded` times out — stamp tool uses a different post-upload UI |
| **PDF Layers / OCG** (`edit-annotate/18-pdf-layers`) | `navigateToTool` intermittent — page loads slowly or uses different route |
| **Compare PDFs** (`organize-manage/17-compare-pdfs`) | Upload two PDFs fails — tool expects a different multi-file upload flow |
| **PDF Overlay** (`organize-manage/02-overlay-pdf`) | Upload two PDFs fails — same multi-file upload selector issue |
| **PDF Booklet** (`organize-manage/12-pdf-booklet`) | Download not triggered — process button selector doesn't match |

**Fix:** Audit each tool's actual DOM and update the test selectors to match. Some tools may need custom `navigateToTool` or `uploadFile` logic.

---

### 4. Process/Download Button Issues (~30 failures, ~10 per browser)

The `clickProcessButton` helper finds and clicks a button, but the download event is never triggered. This affects tools where the process button has a different ID or the processing flow differs from the standard pattern.

**Affected tests:**
- `popular/04-split-pdf` — split PDF with page range and download
- `popular/04-split-pdf` — split large PDF
- `popular/05-compress-pdf` — upload/compress/download tests
- `popular/06-edit-pdf` — upload PDF and see editor canvas; annotation toolbar
- `popular/07-jpg-to-pdf` — upload JPG and see preview; convert and download
- `popular/10-extract-pages` — extract pages and download
- `popular/11-organize-pdf` — organize pages and download
- `popular/12-delete-pages` — delete pages and download
- `convert-from-pdf/18-ocr-pdf` — OCR PDF and download
- `convert-to-pdf/10-json-to-pdf` — convert JSON to PDF
- `convert-from-pdf/11-pdf-to-json` — convert PDF to JSON
- `popular/03-merge-pdf` — switch between file/page mode

**Root causes:**
1. The process button selector (`#process-btn, #merge-btn, ...`) doesn't match the actual button
2. The tool uses a multi-step process (e.g., page selection before download)
3. The download is triggered via a different mechanism (e.g., blob URL click instead of native download)

**Fix:** Inspect each tool's process flow and update `clickProcessButton` or use tool-specific button selectors in the test files.

---

## Fixes Applied During This Run

| File | Change | Reason |
|------|--------|--------|
| `playwright.config.ts` | Added trailing `/` to default `baseURL` | Relative URLs resolved incorrectly without it |
| `helpers/test-helpers.ts` | Changed `navigateToTool` path from `/${slug}.html` to `${slug}.html` | Leading `/` bypasses `baseURL` path in Playwright |
| `helpers/test-helpers.ts` | Added `.first()` to `navigateToTool` visibility check | Strict mode violation — selector matched both `#uploader` and `#tool-uploader` |
| `helpers/test-helpers.ts` | Added `#file-display-area, #file-controls` to `expectFileUploaded` selector | App uses these IDs for post-upload UI, not `#file-list` |

---

## Recommended Next Steps

1. **Generate missing fixtures** — Run `node helpers/generate-fixtures.mjs` or create the missing image/document fixtures to unblock ~90 tests
2. **Add `test.slow()` to heavy operations** — Tests for CSV/Excel extraction, OCR, table extraction, merge, and RTF conversion need longer timeouts
3. **Audit tool-specific selectors** — Workflow Builder, Multi Tool, Form Creator, Markdown-to-PDF, and PDF Editor have custom UIs that need dedicated test helpers
4. **Fix process button matching** — Several tools use non-standard button IDs or multi-step flows that the generic `clickProcessButton` doesn't handle
