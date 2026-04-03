import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Organize PDF (Duplicate & Organize)', () => {
  test('page loads with organize heading', async ({ page }) => {
    await navigateToTool(page, 'organize-pdf');
    await expect(page.locator('h1')).toContainText(/organize|duplicate/i);
  });

  test('upload PDF and see page thumbnails', async ({ page }) => {
    await navigateToTool(page, 'organize-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
    // Should see draggable page thumbnails
    const thumbnails = page.locator('canvas, [class*="thumbnail"], [class*="page"]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 30_000 });
  });

  test('organize pages and download', async ({ page }) => {
    await navigateToTool(page, 'organize-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
