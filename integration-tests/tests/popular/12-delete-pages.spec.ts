import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Delete Pages', () => {
  test('page loads with delete pages heading', async ({ page }) => {
    await navigateToTool(page, 'delete-pages');
    await expect(page.locator('h1').first()).toContainText(/delete/i);
  });

  test('upload PDF and see page selection for deletion', async ({ page }) => {
    await navigateToTool(page, 'delete-pages');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('delete pages and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'delete-pages');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
