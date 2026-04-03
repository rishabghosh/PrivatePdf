import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Remove Restrictions', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'remove-restrictions');
    await expect(page.locator('h1')).toContainText(/restriction/i);
  });

  test('remove restrictions and download', async ({ page }) => {
    await navigateToTool(page, 'remove-restrictions');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
