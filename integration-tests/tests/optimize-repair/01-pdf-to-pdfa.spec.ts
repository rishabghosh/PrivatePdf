import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to PDF/A', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-pdfa');
    await expect(page.locator('h1')).toContainText(/pdf.*a|archiv/i);
  });

  test('convert to PDF/A and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-pdfa');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
