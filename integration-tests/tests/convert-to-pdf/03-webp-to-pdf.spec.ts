import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('WebP to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'webp-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/webp.*pdf/i);
  });

  test('convert WebP to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'webp-to-pdf');
    await uploadFile(page, fixtures.sampleWebp);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
