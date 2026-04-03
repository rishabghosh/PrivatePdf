import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to SVG', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-svg');
    await expect(page.locator('h1')).toContainText(/pdf.*svg/i);
  });

  test('convert PDF to SVG and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-svg');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
