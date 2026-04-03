import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Linearize PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'linearize-pdf');
    await expect(page.locator('h1')).toContainText(/linearize/i);
  });

  test('linearize PDF and download', async ({ page }) => {
    await navigateToTool(page, 'linearize-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
