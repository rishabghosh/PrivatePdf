import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Rasterize PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'rasterize-pdf');
    await expect(page.locator('h1')).toContainText(/rasterize/i);
  });

  test('rasterize PDF and download', async ({ page }) => {
    await navigateToTool(page, 'rasterize-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
