import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDFs to ZIP', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-zip');
    await expect(page.locator('h1').first()).toContainText(/zip/i);
  });

  test('upload PDFs and create ZIP', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-to-zip');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
    expect(download.suggestedFilename()).toMatch(/\.zip$/i);
  });
});
