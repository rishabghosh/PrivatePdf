import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Reverse Pages', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'reverse-pages');
    await expect(page.locator('h1').first()).toContainText(/reverse/i);
  });

  test('reverse page order and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'reverse-pages');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
