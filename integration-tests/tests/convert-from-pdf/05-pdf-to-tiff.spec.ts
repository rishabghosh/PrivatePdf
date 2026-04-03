import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to TIFF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-tiff');
    await expect(page.locator('h1').first()).toContainText(/pdf.*tiff/i);
  });

  test('convert PDF to TIFF and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-to-tiff');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
