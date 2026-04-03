import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Page Labels', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-page-labels');
    await expect(page.locator('h1')).toContainText(/label/i);
  });

  test('upload PDF and configure labels', async ({ page }) => {
    await navigateToTool(page, 'add-page-labels');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('add labels and download', async ({ page }) => {
    await navigateToTool(page, 'add-page-labels');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
