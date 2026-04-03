import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('CBZ to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'cbz-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/cbz.*pdf/i);
  });

  test('convert CBZ to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'cbz-to-pdf');
    await uploadFile(page, fixtures.sampleCbz);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
