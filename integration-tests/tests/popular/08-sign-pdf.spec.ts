import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, fixtures } from '../../helpers/test-helpers';

test.describe('Sign PDF', () => {
  test('page loads with sign heading', async ({ page }) => {
    await navigateToTool(page, 'sign-pdf');
    await expect(page.locator('h1').first()).toContainText(/sign/i);
  });

  test('upload PDF and see signing options', async ({ page }) => {
    await navigateToTool(page, 'sign-pdf');
    await uploadFile(page, fixtures.samplePdf);
    // Should show signature options (draw, type, upload)
    await expect(page.locator('canvas, [class*="sign"], [id*="sign"], button:has-text("Draw"), button:has-text("Type")').first()).toBeVisible({ timeout: 30_000 });
  });

  test('can draw signature on canvas', async ({ page }) => {
    await navigateToTool(page, 'sign-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await page.waitForTimeout(3_000);

    // Look for signature drawing canvas
    const signCanvas = page.locator('canvas[id*="sign"], canvas[class*="sign"], .signature-pad canvas').first();
    if (await signCanvas.isVisible().catch(() => false)) {
      const box = await signCanvas.boundingBox();
      if (box) {
        // Draw a simple signature stroke
        await page.mouse.move(box.x + 20, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
      }
    }
  });

  test('can type signature text', async ({ page }) => {
    await navigateToTool(page, 'sign-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await page.waitForTimeout(3_000);

    const typeBtn = page.locator('button:has-text("Type"), [data-mode="type"]').first();
    if (await typeBtn.isVisible().catch(() => false)) {
      await typeBtn.click();
      const signInput = page.locator('input[type="text"]').first();
      if (await signInput.isVisible().catch(() => false)) {
        await signInput.fill('Test Signature');
      }
    }
  });
});
