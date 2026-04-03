import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Deskew PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'deskew-pdf');
    await expect(page.locator('h1')).toContainText(/deskew/i);
  });

  test('deskew PDF and download', async ({ page }) => {
    test.slow(); // Uses OpenCV - can be slow
    await navigateToTool(page, 'deskew-pdf');
    await uploadFile(page, fixtures.scannedPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
