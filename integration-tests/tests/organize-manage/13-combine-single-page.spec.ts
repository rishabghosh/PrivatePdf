import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Combine to Single Page', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'combine-single-page');
    await expect(page.locator('h1').first()).toContainText(/combine|single.*page/i);
  });

  test('combine to single page and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'combine-single-page');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
