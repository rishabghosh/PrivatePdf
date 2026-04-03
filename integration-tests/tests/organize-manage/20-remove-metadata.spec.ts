import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Remove Metadata', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'remove-metadata');
    await expect(page.locator('h1')).toContainText(/remove.*metadata/i);
  });

  test('remove metadata and download', async ({ page }) => {
    await navigateToTool(page, 'remove-metadata');
    await uploadFile(page, fixtures.metadataPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
