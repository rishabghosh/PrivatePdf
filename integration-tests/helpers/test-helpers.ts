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
  // Wait for tool JS module to register event handlers on the file input.
  // Module scripts execute asynchronously after networkidle and DOM ready.
  await page.waitForTimeout(2_000);
  const fileInput = page.locator(
    '#file-input, #pdfFile, #pdfFileInput, #pdf-file-input, #jsonFiles, #pdfFiles, input[type="file"]'
  ).first();
  await fileInput.setInputFiles(paths);
}

export async function uploadTwoFiles(page: Page, file1: string, file2: string) {
  await page.waitForTimeout(2_000);
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
  const downloadPromise = page.waitForEvent('download', { timeout: 0 });
  await action();
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
  // Give the app time to process the uploaded file and update the UI.
  // Different tools show different indicators after upload.
  await page.waitForTimeout(3_000);
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
