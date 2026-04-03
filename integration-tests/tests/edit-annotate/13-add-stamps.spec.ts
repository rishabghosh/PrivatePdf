import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Stamps', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-stamps');
    await expect(page.locator('h1')).toContainText(/stamp/i);
  });

  test('upload PDF and see stamp options', async ({ page }) => {
    await navigateToTool(page, 'add-stamps');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('add stamp and download', async ({ page }) => {
    await navigateToTool(page, 'add-stamps');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
