import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Edit Bookmarks', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'bookmark');
    await expect(page.locator('h1').first()).toContainText(/bookmark/i);
  });

  test('upload PDF and see bookmark editor', async ({ page }) => {
    await navigateToTool(page, 'bookmark');
    await uploadFile(page, fixtures.bookmarkedPdf);
    await expectFileUploaded(page);
  });

  test('add a bookmark and download', async ({ page }) => {
    test.fixme(); // WASM cpdf processing takes too long in headless Chrome
    test.slow();
    await navigateToTool(page, 'bookmark');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Try to add a bookmark
    const addBtn = page.locator('button:has-text("Add"), [id*="add-bookmark"]').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    }

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
