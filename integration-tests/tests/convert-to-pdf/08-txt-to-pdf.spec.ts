import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Text to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'txt-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/text.*pdf|txt.*pdf/i);
  });

  test('convert text file to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'txt-to-pdf');
    await uploadFile(page, fixtures.sampleTxt);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
