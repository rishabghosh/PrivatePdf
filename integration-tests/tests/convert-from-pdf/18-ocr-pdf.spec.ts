import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('OCR PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'ocr-pdf');
    await expect(page.locator('h1')).toContainText(/ocr/i);
  });

  test('upload scanned PDF and see OCR options', async ({ page }) => {
    await navigateToTool(page, 'ocr-pdf');
    await uploadFile(page, fixtures.scannedPdf);
    await expectFileUploaded(page);
  });

  test('OCR PDF and download', async ({ page }) => {
    test.slow(); // OCR is resource-intensive
    await navigateToTool(page, 'ocr-pdf');
    await uploadFile(page, fixtures.scannedPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
