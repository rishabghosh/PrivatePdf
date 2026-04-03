import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Overlay', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'overlay-pdf');
    await expect(page.locator('h1')).toContainText(/overlay/i);
  });

  test('upload PDFs and overlay', async ({ page }) => {
    await navigateToTool(page, 'overlay-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
