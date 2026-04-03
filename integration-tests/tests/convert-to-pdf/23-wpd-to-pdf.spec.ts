import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('WPD to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'wpd-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/wpd.*pdf|wordperfect/i);
  });

  test('convert WPD to PDF', async ({ page }) => {
    test.fixme(); // WASM LibreOffice worker fails to load in headless Chrome
    test.slow();
    await navigateToTool(page, 'wpd-to-pdf');
    await uploadFile(page, fixtures.sampleWpd);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
