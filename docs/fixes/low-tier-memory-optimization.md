# Low-Tier Device Memory Optimization

## Problem

On low-tier devices (≤2 CPU cores, ≤2GB RAM), PDF files as small as 5-10 MB caused tab crashes ("Aw, Snap!") and prolonged UI freezes. The most affected features were **PDF to Word** and **Merge PDF**, though the issues applied broadly.

The existing device capability system (`src/js/utils/device-capability.ts`) already classified devices into `low`/`medium`/`high` tiers and adjusted rendering behavior (batch sizes, thumbnail scale, lazy loading). However, the actual file processing pipelines — where the heaviest memory usage occurs — ignored device tier entirely.

## Root Causes

1. **Duplicate ArrayBuffer copies** — `bytes.slice(0)` created a full copy of every file just to pass to pdfjs, doubling memory per file.
2. **PDFDocumentProxy held unnecessarily** — Parsed PDF objects (page trees, fonts, etc.) were kept in memory even when only the page count was needed.
3. **Deferred cleanup** — Heavy data (file buffers, parsed PDFs, blobs) was only released when the user dismissed a success dialog, not when the download completed.
4. **Full file parse for page count** — The PDF-to-Word UI loaded entire files into memory via `readFileAsArrayBuffer()` + `getPDFDocument()` just to display a page count.
5. **Canvas pixel buffers not freed** — Merge thumbnail canvases were converted to data URLs but never zeroed out, leaking GPU/CPU pixel buffers.
6. **No pre-processing guardrails** — No warnings or limits prevented low-tier devices from attempting operations that would inevitably crash.

## Changes Made

### 1. Eliminated `bytes.slice(0)` copy in merge

**File:** `src/js/logic/merge-pdf-page.ts`

Removed the defensive `.slice(0)` when passing ArrayBuffers to pdfjs. The library copies internally as needed; the extra slice doubled memory for every uploaded file.

**Impact:** ~10MB saved per file (halves ArrayBuffer memory during merge UI loading).

### 2. Canvas cleanup in merge thumbnails

**File:** `src/js/logic/merge-pdf-page.ts`

After `canvas.toDataURL()`, the canvas dimensions are now zeroed (`canvas.width = 0; canvas.height = 0`) to release the pixel buffer. On low-tier devices, thumbnails use JPEG encoding at 0.6 quality instead of PNG, producing 3-5x smaller base64 strings.

**Impact:** ~4-20MB saved for a 20-page PDF in page-mode thumbnails.

### 3. Early memory cleanup after download

**Files:** `src/js/logic/merge-pdf-page.ts`, `src/js/logic/pdf-to-docx-page.ts`

Heavy data (`pdfBytes`, `pdfDocs`, file references) is now released immediately after `downloadFile()` completes, before the success alert is shown. Previously, all data stayed pinned until the user clicked "OK".

**Impact:** 10-100MB freed immediately instead of held indefinitely.

### 4. Lightweight page count in PDF-to-Word UI

**File:** `src/js/logic/pdf-to-docx-page.ts`

Replaced full `readFileAsArrayBuffer()` + `getPDFDocument()` (which loaded the entire PDF into memory) with a lightweight trailer scan. The new `quickPageCount()` function reads only the last 2KB of the file and extracts the `/Count` value from the PDF trailer via regex. Falls back gracefully to showing just the file size.

**Impact:** ~10-20MB of transient memory saved per file during UI rendering.

### 5. Deferred PDFDocumentProxy in merge file-mode

**File:** `src/js/logic/merge-pdf-page.ts`

In file-mode (the default), PDFDocumentProxy objects are now destroyed immediately after extracting `numPages`. A new `pageCounts` map stores just the page count integers. When the user switches to page-mode (which needs proxies for thumbnail rendering), they are lazy-loaded on demand from the stored `pdfBytes`.

**Impact:** ~15-60MB saved (eliminates parsed PDF tree objects in the common file-mode path).

### 6. Memory budget warnings

**File:** `src/js/utils/device-capability.ts`, `src/js/logic/merge-pdf-page.ts`, `src/js/logic/pdf-to-docx-page.ts`

Added a `checkMemoryBudget()` helper that compares total file sizes against the device tier's `upload.warnFileSizeMB` and `upload.warnTotalSizeMB` thresholds. When exceeded, a dismissable warning dialog informs the user before processing begins. High-tier devices see no warnings (thresholds are `Infinity`).

**Impact:** Prevents unexpected crashes by letting users decide whether to proceed with large files on constrained devices.

### 7. Yield between files in multi-file PDF-to-Word

**File:** `src/js/logic/pdf-to-docx-page.ts`

In the multi-file conversion loop, the DOCX blob reference is now nulled after extracting its ArrayBuffer. On low-tier devices, a `setTimeout(0)` yield between iterations gives the browser an opportunity to garbage-collect intermediaries from the previous file before starting the next.

**Impact:** Reduces peak memory during multi-file conversion by allowing incremental GC.

## Estimated Total Memory Savings

For a typical session with 3 × 10MB PDFs on a low-tier device:

| Change | Before | After | Saved |
|--------|--------|-------|-------|
| bytes.slice(0) removal | 60MB (3 files × 2 copies) | 30MB | ~30MB |
| Canvas cleanup | 4-20MB leaked | 0 | ~4-20MB |
| Early cleanup | Held until dialog dismiss | Freed on download | ~30MB sooner |
| Lightweight page count | ~30-60MB transient | ~0 | ~30-60MB |
| Deferred PDFDocumentProxy | ~15-60MB parsed objects | ~0 (file-mode) | ~15-60MB |

## Testing

1. **Build:** `npm run build` — passes with no errors
2. **Low-tier simulation:** Chrome DevTools CPU 6x throttle + limited memory. Upload 3 × 10MB PDFs in merge and PDF-to-Word.
3. **Memory profiling:** Chrome DevTools Memory tab — heap snapshots before/after upload and after download confirm lower peak memory.
4. **High-tier regression:** Desktop with large files shows no behavior change (budget warnings do not appear for high tier).
