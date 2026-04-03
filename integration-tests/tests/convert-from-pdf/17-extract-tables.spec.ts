import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Extract Tables', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'extract-tables');
    await expect(page.locator('h1').first()).toContainText(/extract.*table/i);
  });

  test('extract tables from PDF', async ({ page }) => {
    test.fixme(); // WASM processing (cpdf/PyMuPDF) takes too long in headless Chrome
    test.slow();
    await navigateToTool(page, 'extract-tables');
    await uploadFile(page, fixtures.tablesPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
