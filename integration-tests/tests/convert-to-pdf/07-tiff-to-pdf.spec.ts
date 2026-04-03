import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('TIFF to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'tiff-to-pdf');
    await expect(page.locator('h1')).toContainText(/tiff.*pdf/i);
  });

  test('convert TIFF to PDF', async ({ page }) => {
    await navigateToTool(page, 'tiff-to-pdf');
    await uploadFile(page, fixtures.sampleTiff);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
