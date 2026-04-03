import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('ODP to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'odp-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/odp.*pdf/i);
  });

  test('convert ODP to PDF', async ({ page }) => {
    test.fixme(); // WASM LibreOffice worker fails to load in headless Chrome
    test.slow();
    await navigateToTool(page, 'odp-to-pdf');
    await uploadFile(page, fixtures.sampleOdp);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
