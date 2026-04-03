import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Background Color', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'background-color');
    await expect(page.locator('h1').first()).toContainText(/background/i);
  });

  test('upload PDF and change background', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'background-color');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
