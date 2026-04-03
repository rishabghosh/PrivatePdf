import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to WebP', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-webp');
    await expect(page.locator('h1')).toContainText(/pdf.*webp/i);
  });

  test('convert PDF to WebP and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-webp');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
