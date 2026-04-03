import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('FB2 to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'fb2-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/fb2.*pdf/i);
  });

  test('convert FB2 to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'fb2-to-pdf');
    await uploadFile(page, fixtures.sampleFb2);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
