import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Alternate & Mix Pages', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'alternate-merge');
    await expect(page.locator('h1').first()).toContainText(/alternate|mix/i);
  });

  test('upload two PDFs and alternate merge', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'alternate-merge');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
