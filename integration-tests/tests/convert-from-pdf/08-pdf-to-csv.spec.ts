import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to CSV', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-csv');
    await expect(page.locator('h1')).toContainText(/pdf.*csv/i);
  });

  test('convert PDF with tables to CSV', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-csv');
    await uploadFile(page, fixtures.tablesPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
