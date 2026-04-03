import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to BMP', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-bmp');
    await expect(page.locator('h1')).toContainText(/pdf.*bmp/i);
  });

  test('convert PDF to BMP and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-bmp');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
