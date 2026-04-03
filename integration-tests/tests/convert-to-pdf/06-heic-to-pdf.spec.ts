import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('HEIC to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'heic-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/heic.*pdf/i);
  });

  test('convert HEIC to PDF', async ({ page }) => {
    test.fixme(); // HEIC fixture is a stub without real image data
    test.slow();
    await navigateToTool(page, 'heic-to-pdf');
    await uploadFile(page, fixtures.sampleHeic);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
