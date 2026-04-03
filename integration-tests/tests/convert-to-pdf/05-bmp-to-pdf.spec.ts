import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('BMP to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'bmp-to-pdf');
    await expect(page.locator('h1')).toContainText(/bmp.*pdf/i);
  });

  test('convert BMP to PDF', async ({ page }) => {
    await navigateToTool(page, 'bmp-to-pdf');
    await uploadFile(page, fixtures.sampleBmp);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
