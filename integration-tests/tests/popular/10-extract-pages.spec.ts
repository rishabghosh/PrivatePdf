import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Extract Pages', () => {
  test('page loads with extract pages heading', async ({ page }) => {
    await navigateToTool(page, 'extract-pages');
    await expect(page.locator('h1').first()).toContainText(/extract/i);
  });

  test('upload PDF and see page selection', async ({ page }) => {
    await navigateToTool(page, 'extract-pages');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('extract pages and download', async ({ page }) => {
    await navigateToTool(page, 'extract-pages');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });

  test('extract from large PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'extract-pages');
    await uploadFile(page, fixtures.largePdf);
    await expectFileUploaded(page);
  });
});
