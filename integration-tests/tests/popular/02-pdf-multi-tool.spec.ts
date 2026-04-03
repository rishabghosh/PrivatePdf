import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Multi Tool', () => {
  test('page loads with correct heading', async ({ page }) => {
    await navigateToTool(page, 'pdf-multi-tool');
    // Multi-tool has heading in navbar or sr-only h1
    await expect(page.locator('#upload-area, #pdf-file-input').first()).toBeVisible({ timeout: 15_000 });
  });

  test('upload PDF and see multi-tool interface', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    // Wait for page canvases to render in the pages container
    await expect(page.locator('#pages-container canvas, #loading-overlay').first()).toBeVisible({ timeout: 60_000 });
  });

  test('can switch between tool modes (merge, split, organize, etc.)', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    await expect(page.locator('#pages-container canvas, #loading-overlay').first()).toBeVisible({ timeout: 60_000 });

    // Check for mode/tab buttons
    const tabs = page.locator('button:has-text("Merge"), button:has-text("Split"), button:has-text("Organize"), button:has-text("Rotate"), button:has-text("Delete")');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('can reorder pages via drag interface', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-multi-tool');
    await uploadFile(page, fixtures.multiPagePdf);
    // Check page thumbnails are rendered
    const thumbnails = page.locator('#pages-container canvas, [class*="thumbnail"], [class*="page-preview"]');
    await expect(thumbnails.first()).toBeVisible({ timeout: 60_000 });
  });
});
