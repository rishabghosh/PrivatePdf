import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('ODS to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'ods-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/ods.*pdf/i);
  });

  test('convert ODS to PDF', async ({ page }) => {
    test.fixme(); // WASM LibreOffice worker fails to load in headless Chrome
    test.slow();
    await navigateToTool(page, 'ods-to-pdf');
    await uploadFile(page, fixtures.sampleOds);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
