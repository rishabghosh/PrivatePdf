import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Booklet', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-booklet');
    await expect(page.locator('h1')).toContainText(/booklet/i);
  });

  test('create booklet and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-booklet');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
