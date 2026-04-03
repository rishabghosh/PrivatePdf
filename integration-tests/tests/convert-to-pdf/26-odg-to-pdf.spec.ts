import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('ODG to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'odg-to-pdf');
    await expect(page.locator('h1')).toContainText(/odg.*pdf/i);
  });

  test('convert ODG to PDF', async ({ page }) => {
    await navigateToTool(page, 'odg-to-pdf');
    await uploadFile(page, fixtures.sampleOdg);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
