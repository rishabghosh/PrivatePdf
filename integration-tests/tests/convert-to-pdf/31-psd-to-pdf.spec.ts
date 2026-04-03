import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PSD to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'psd-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/psd.*pdf|photoshop/i);
  });

  test('convert PSD to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'psd-to-pdf');
    await uploadFile(page, fixtures.samplePsd);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
