import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Page Numbers', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'page-numbers');
    await expect(page.locator('h1')).toContainText(/page number/i);
  });

  test('upload PDF and see numbering options', async ({ page }) => {
    await navigateToTool(page, 'page-numbers');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('add page numbers and download', async ({ page }) => {
    await navigateToTool(page, 'page-numbers');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
