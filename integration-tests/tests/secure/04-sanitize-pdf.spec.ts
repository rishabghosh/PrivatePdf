import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Sanitize PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'sanitize-pdf');
    await expect(page.locator('h1')).toContainText(/sanitize/i);
  });

  test('sanitize PDF and download', async ({ page }) => {
    await navigateToTool(page, 'sanitize-pdf');
    await uploadFile(page, fixtures.metadataPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
