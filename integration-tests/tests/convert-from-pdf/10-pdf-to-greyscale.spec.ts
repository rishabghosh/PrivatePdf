import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to Greyscale', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-greyscale');
    await expect(page.locator('h1')).toContainText(/grey|gray/i);
  });

  test('convert PDF to greyscale and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-greyscale');
    await uploadFile(page, fixtures.colorPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
