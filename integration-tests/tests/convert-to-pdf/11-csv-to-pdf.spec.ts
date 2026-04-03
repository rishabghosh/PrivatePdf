import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('CSV to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'csv-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/csv.*pdf/i);
  });

  test('convert CSV to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'csv-to-pdf');
    await uploadFile(page, fixtures.sampleCsv);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
