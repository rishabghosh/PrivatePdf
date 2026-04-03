import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Change Text Color', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'text-color');
    await expect(page.locator('h1').first()).toContainText(/text.*color/i);
  });

  test('upload PDF and change text color', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'text-color');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
