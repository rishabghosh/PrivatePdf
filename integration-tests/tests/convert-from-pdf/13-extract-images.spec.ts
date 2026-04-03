import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Extract Images', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'extract-images');
    await expect(page.locator('h1')).toContainText(/extract.*image/i);
  });

  test('extract images from PDF and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'extract-images');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
