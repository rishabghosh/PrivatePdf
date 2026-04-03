import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Font to Outline', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'font-to-outline');
    await expect(page.locator('h1').first()).toContainText(/font.*outline|outline/i);
  });

  test('convert fonts to outlines and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'font-to-outline');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
