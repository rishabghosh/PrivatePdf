import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('N-Up PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'n-up-pdf');
    await expect(page.locator('h1').first()).toContainText(/n-up|n up/i);
  });

  test('create N-Up layout and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'n-up-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
