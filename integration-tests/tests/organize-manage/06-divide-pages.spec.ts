import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Divide Pages', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'divide-pages');
    await expect(page.locator('h1')).toContainText(/divide/i);
  });

  test('divide pages and download', async ({ page }) => {
    await navigateToTool(page, 'divide-pages');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
