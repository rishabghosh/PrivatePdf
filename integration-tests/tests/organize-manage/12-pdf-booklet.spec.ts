import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Booklet', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-booklet');
    await expect(page.locator('h1')).toContainText(/booklet/i);
  });

  test('create booklet and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-booklet');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    // Booklet has a two-step flow: preview then download
    const previewBtn = page.locator('#preview-btn');
    if (await previewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(3_000);
    }

    const download = await waitForDownload(page, async () => {
      await page.locator('#download-btn, button:has-text("Download"), button.btn-gradient').first().click();
    });
    await expectDownloadTriggered(download);
  });
});
