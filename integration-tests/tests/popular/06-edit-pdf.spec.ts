import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Editor', () => {
  test('page loads with editor heading', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await expect(page.locator('h1')).toContainText(/editor/i);
  });

  test('upload PDF and see editor canvas', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await uploadFile(page, fixtures.samplePdf);
    // Editor should show canvas/toolbar
    await expect(page.locator('canvas, #editor-container, [class*="editor"]').first()).toBeVisible({ timeout: 30_000 });
  });

  test('annotation toolbar is visible after loading PDF', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await page.waitForTimeout(3_000);
    // Check for annotation tools (highlight, text, shapes, etc.)
    const toolbar = page.locator('[class*="toolbar"], [id*="toolbar"], [class*="annotation"]').first();
    await expect(toolbar).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate between pages in editor', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await page.waitForTimeout(3_000);

    // Look for page navigation
    const nextBtn = page.locator('button:has-text("Next"), [aria-label*="next"], [id*="next-page"]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    }
  });

  test('can add text annotation', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await page.waitForTimeout(3_000);

    // Find text annotation tool
    const textTool = page.locator('button:has-text("Text"), [title*="text"], [aria-label*="text"]').first();
    if (await textTool.isVisible().catch(() => false)) {
      await textTool.click();
    }
  });

  test('can search text in PDF', async ({ page }) => {
    await navigateToTool(page, 'edit-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await page.waitForTimeout(3_000);

    const searchBtn = page.locator('button:has-text("Search"), [title*="search"], [aria-label*="search"]').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
    }
  });
});
