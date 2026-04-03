import { test, expect } from '@playwright/test';
import { navigateToTool, uploadTwoFiles, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Overlay', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'overlay-pdf');
    await expect(page.locator('h1').first()).toContainText(/overlay/i);
  });

  test('upload PDFs and overlay', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'overlay-pdf');
    await uploadTwoFiles(page, fixtures.samplePdf, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
