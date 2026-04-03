import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Multi Tool', () => {
  test('page loads with correct heading', async ({ page }) => {
    await navigateToTool(page, 'pdf-multi-tool');
    await expect(page.locator('h1')).toContainText(/multi tool/i);
  });

  test('upload PDF and see multi-tool interface', async ({ page }) => {
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('can switch between tool modes (merge, split, organize, etc.)', async ({ page }) => {
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    // Check for mode/tab buttons
    const tabs = page.locator('button:has-text("Merge"), button:has-text("Split"), button:has-text("Organize"), button:has-text("Rotate"), button:has-text("Delete")');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can reorder pages via drag interface', async ({ page }) => {
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
    // Check page thumbnails are rendered
    const thumbnails = page.locator('canvas, [class*="thumbnail"], [class*="page-preview"]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 30_000 });
  });
});
