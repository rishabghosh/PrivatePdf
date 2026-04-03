import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to Excel', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-excel');
    await expect(page.locator('h1')).toContainText(/pdf.*excel/i);
  });

  test('convert PDF to Excel and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-excel');
    await uploadFile(page, fixtures.tablesPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
