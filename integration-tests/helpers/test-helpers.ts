import { Page, expect, Download } from '@playwright/test';
import path from 'path';

// ─── Fixture paths ───────────────────────────────────────────────────
const FIXTURES = path.resolve(__dirname, '..', 'fixtures');

export const fixtures = {
  // PDFs
  samplePdf: path.join(FIXTURES, 'sample.pdf'),
  largePdf: path.join(FIXTURES, 'large-100-pages.pdf'),
  hugePdf: path.join(FIXTURES, 'huge-500-pages.pdf'),
  multiPagePdf: path.join(FIXTURES, 'multi-page-10.pdf'),
  encryptedPdf: path.join(FIXTURES, 'encrypted.pdf'),
  formPdf: path.join(FIXTURES, 'form-fields.pdf'),
  bookmarkedPdf: path.join(FIXTURES, 'bookmarked.pdf'),
  annotatedPdf: path.join(FIXTURES, 'annotated.pdf'),
  scannedPdf: path.join(FIXTURES, 'scanned-image.pdf'),
  attachmentsPdf: path.join(FIXTURES, 'with-attachments.pdf'),
  layersPdf: path.join(FIXTURES, 'with-layers.pdf'),
  signedPdf: path.join(FIXTURES, 'digitally-signed.pdf'),
  blankPagesPdf: path.join(FIXTURES, 'with-blank-pages.pdf'),
  colorPdf: path.join(FIXTURES, 'color-document.pdf'),
  corruptedPdf: path.join(FIXTURES, 'corrupted.pdf'),
  restrictedPdf: path.join(FIXTURES, 'restricted.pdf'),
  metadataPdf: path.join(FIXTURES, 'with-metadata.pdf'),
  tablesPdf: path.join(FIXTURES, 'with-tables.pdf'),

  // Images
  sampleJpg: path.join(FIXTURES, 'sample.jpg'),
  samplePng: path.join(FIXTURES, 'sample.png'),
  sampleWebp: path.join(FIXTURES, 'sample.webp'),
  sampleSvg: path.join(FIXTURES, 'sample.svg'),
  sampleBmp: path.join(FIXTURES, 'sample.bmp'),
  sampleHeic: path.join(FIXTURES, 'sample.heic'),
  sampleTiff: path.join(FIXTURES, 'sample.tiff'),
  samplePsd: path.join(FIXTURES, 'sample.psd'),

  // Documents
  sampleDocx: path.join(FIXTURES, 'sample.docx'),
  sampleXlsx: path.join(FIXTURES, 'sample.xlsx'),
  samplePptx: path.join(FIXTURES, 'sample.pptx'),
  sampleOdt: path.join(FIXTURES, 'sample.odt'),
  sampleOds: path.join(FIXTURES, 'sample.ods'),
  sampleOdp: path.join(FIXTURES, 'sample.odp'),
  sampleOdg: path.join(FIXTURES, 'sample.odg'),
  sampleRtf: path.join(FIXTURES, 'sample.rtf'),
  sampleCsv: path.join(FIXTURES, 'sample.csv'),
  sampleTxt: path.join(FIXTURES, 'sample.txt'),
  sampleMd: path.join(FIXTURES, 'sample.md'),
  sampleJson: path.join(FIXTURES, 'sample.json'),
  sampleXml: path.join(FIXTURES, 'sample.xml'),
  sampleXps: path.join(FIXTURES, 'sample.xps'),
  sampleEpub: path.join(FIXTURES, 'sample.epub'),
  sampleMobi: path.join(FIXTURES, 'sample.mobi'),
  sampleFb2: path.join(FIXTURES, 'sample.fb2'),
  sampleCbz: path.join(FIXTURES, 'sample.cbz'),
  sampleWpd: path.join(FIXTURES, 'sample.wpd'),
  sampleWps: path.join(FIXTURES, 'sample.wps'),
  samplePages: path.join(FIXTURES, 'sample.pages'),
  samplePub: path.join(FIXTURES, 'sample.pub'),
  sampleVsd: path.join(FIXTURES, 'sample.vsd'),
  sampleEml: path.join(FIXTURES, 'sample.eml'),
  sampleMsg: path.join(FIXTURES, 'sample.msg'),

  // Certificates (for digital signing)
  sampleCert: path.join(FIXTURES, 'test-cert.p12'),
};

// ─── Page navigation ─────────────────────────────────────────────────
export async function navigateToTool(page: Page, toolSlug: string) {
  await page.goto(`${toolSlug}.html`, { waitUntil: 'networkidle' });
  await expect(page.locator('#tool-uploader, #uploader, #editor-container, #workflow-container, #workflow-app, #upload-area, #back-to-tools, #back-to-tools-upload').first()).toBeVisible({ timeout: 15_000 });
}

// ─── File upload helpers ─────────────────────────────────────────────
export async function uploadFile(page: Page, filePath: string | string[]) {
  const paths = Array.isArray(filePath) ? filePath : [filePath];
  // Try known file input IDs first, then fall back to generic input[type="file"]
  const fileInput = page.locator(
    '#file-input, #pdfFile, #pdfFileInput, #pdf-file-input, #jsonFiles, #pdfFiles, input[type="file"]'
  ).first();
  await fileInput.setInputFiles(paths);
}

export async function uploadTwoFiles(page: Page, file1: string, file2: string) {
  const input1 = page.locator('#file-input-1, #base-file-input').first();
  const input2 = page.locator('#file-input-2, #overlay-file-input').first();
  await input1.setInputFiles(file1);
  await page.waitForTimeout(1_000);
  await input2.setInputFiles(file2);
}

export async function uploadViaDragDrop(page: Page, filePath: string) {
  const dropZone = page.locator('#drop-zone');
  const buffer = require('fs').readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = getMimeType(fileName);

  const dataTransfer = await page.evaluateHandle(
    ({ data, name, type }) => {
      const dt = new DataTransfer();
      const arr = new Uint8Array(data);
      const file = new File([arr], name, { type });
      dt.items.add(file);
      return dt;
    },
    { data: Array.from(buffer), name: fileName, type: mimeType }
  );

  await dropZone.dispatchEvent('drop', { dataTransfer });
}

// ─── Processing helpers ──────────────────────────────────────────────
export async function clickProcessButton(page: Page) {
  // Try specific button IDs first (most reliable), then fall back to generic selectors
  const specificIds = ['#process-btn', '#merge-btn', '#split-btn', '#compress-btn', '#convert-btn',
    '#download-btn', '#downloadBtn', '#save-stamped-btn', '#export-pdf-btn', '#save-layers-btn'];
  for (const sel of specificIds) {
    const btn = page.locator(sel);
    if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await btn.click();
      return;
    }
  }
  // Fall back to text-based or class-based selectors
  const fallback = page.locator('button.btn-gradient, [id$="-btn"]:has-text("Process"), button:has-text("Convert"), button:has-text("Download")');
  await fallback.first().click();
}

export async function waitForProcessing(page: Page, timeoutMs = 120_000) {
  // Wait for loader to appear then disappear
  const loaderModal = page.locator('#loader-modal');
  try {
    await loaderModal.waitFor({ state: 'visible', timeout: 5_000 });
    await loaderModal.waitFor({ state: 'hidden', timeout: timeoutMs });
  } catch {
    // Some tools don't show loader modal - that's ok
  }
}

export async function waitForDownload(page: Page, action: () => Promise<void>): Promise<Download> {
  // Start listening for download event before triggering the action.
  // Use timeout: 0 so it inherits the test timeout (which respects test.slow()).
  const downloadPromise = page.waitForEvent('download', { timeout: 0 });

  await action();

  // Wait for loader to finish (WASM processing can take time)
  const loaderModal = page.locator('#loader-modal');
  try {
    await loaderModal.waitFor({ state: 'visible', timeout: 5_000 });
    await loaderModal.waitFor({ state: 'hidden', timeout: 0 }); // inherit test timeout
  } catch {
    // Some tools don't show loader
  }

  // Check for error alert after processing (only actual errors, not success messages)
  const alertModal = page.locator('#alert-modal, #errorModal');
  const alertVisible = await alertModal.first().isVisible().catch(() => false);
  if (alertVisible) {
    const msg = await page.locator('#alert-message, #errorModalMessage').first().textContent().catch(() => '') || '';
    const isError = /error|failed|could not|invalid|corrupt|timeout/i.test(msg);
    // Dismiss the alert
    await page.locator('#alert-ok, #errorModalClose').first().click().catch(() => {});
    if (isError) {
      throw new Error(`Processing failed with alert: ${msg}`);
    }
    // Success alert - dismiss and download should follow shortly
  }

  return downloadPromise;
}

// ─── Assertion helpers ───────────────────────────────────────────────
export async function expectPageLoaded(page: Page, toolSlug: string) {
  // Check the page title or h1 is present
  await expect(page.locator('h1').first()).toBeVisible();
  // Check the drop zone or editor is present
  await expect(
    page.locator('#drop-zone, #editor-container, #workflow-container, #workflow-app, #simple-tool-container, #upload-area, #back-to-tools, #back-to-tools-upload').first()
  ).toBeVisible();
}

export async function expectFileUploaded(page: Page) {
  // Wait for any upload indicator to become actually visible.
  // We use waitForFunction because CSS selectors + .first() can pick
  // a hidden element before the visible one (e.g. #file-display-area
  // inside a hidden #uploader while #editor-panel is the visible one).
  await page.waitForFunction(() => {
    const selectors = [
      '#editor-panel', '#viewer-card', '#tool-container',
      '#embed-pdf-wrapper', '#compare-viewer', '#pdfCanvas',
      '#file-display-area', '#file-controls', '#file-list', '#fileList',
      '#page-preview', '#preview-container', '#merge-options',
      '#tool-options', '#pages-container', '#loading-overlay',
      '#loader-modal', '#process-btn-container',
    ];
    return selectors.some(sel => {
      const el = document.querySelector(sel);
      if (!el) return false;
      if (el.classList.contains('hidden')) return false;
      // Check actual visibility: element has dimensions and isn't inside a hidden parent
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      return el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
    });
  }, { timeout: 30_000 });
}

export async function expectDownloadTriggered(download: Download) {
  expect(download).toBeTruthy();
  const suggestedName = download.suggestedFilename();
  expect(suggestedName).toBeTruthy();
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
}

export async function expectNoErrorAlert(page: Page) {
  const alertModal = page.locator('#alert-modal');
  const isVisible = await alertModal.isVisible().catch(() => false);
  if (isVisible) {
    const message = await page.locator('#alert-message').textContent();
    // Only fail if it's an actual error, not an informational alert
    if (message && (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed'))) {
      throw new Error(`Unexpected error alert: ${message}`);
    }
  }
}

// ─── Utility ─────────────────────────────────────────────────────────
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.heic': 'image/heic',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.psd': 'image/vnd.adobe.photoshop',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    '.odp': 'application/vnd.oasis.opendocument.presentation',
    '.rtf': 'application/rtf',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.epub': 'application/epub+zip',
    '.eml': 'message/rfc822',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export async function dismissAlertIfPresent(page: Page) {
  const alertOk = page.locator('#alert-ok');
  if (await alertOk.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await alertOk.click();
  }
}

/**
 * Full end-to-end flow: navigate → upload → process → download
 */
export async function runToolE2E(
  page: Page,
  toolSlug: string,
  filePath: string | string[],
  options?: {
    beforeProcess?: (page: Page) => Promise<void>;
    skipDownload?: boolean;
  }
) {
  await navigateToTool(page, toolSlug);
  await expectPageLoaded(page, toolSlug);
  await uploadFile(page, filePath);
  await expectFileUploaded(page);
  await expectNoErrorAlert(page);

  if (options?.beforeProcess) {
    await options.beforeProcess(page);
  }

  if (options?.skipDownload) {
    await clickProcessButton(page);
    await waitForProcessing(page);
    await expectNoErrorAlert(page);
  } else {
    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
    await expectNoErrorAlert(page);
    return download;
  }
}
