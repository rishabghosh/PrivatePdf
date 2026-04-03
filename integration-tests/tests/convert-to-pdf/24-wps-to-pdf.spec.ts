import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('WPS to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'wps-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/wps.*pdf/i);
  });

  test('convert WPS to PDF', async ({ page }) => {
    test.fixme(); // WASM LibreOffice worker fails to load in headless Chrome
    test.slow();
    await navigateToTool(page, 'wps-to-pdf');
    await uploadFile(page, fixtures.sampleWps);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
