import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Fix Page Size', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'fix-page-size');
    await expect(page.locator('h1')).toContainText(/fix.*page.*size|page.*size/i);
  });

  test('fix page sizes and download', async ({ page }) => {
    await navigateToTool(page, 'fix-page-size');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
