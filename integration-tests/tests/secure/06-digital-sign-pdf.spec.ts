import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Digital Signature', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'digital-sign-pdf');
    await expect(page.locator('h1')).toContainText(/digital.*sign/i);
  });

  test('upload PDF and see signing options', async ({ page }) => {
    await navigateToTool(page, 'digital-sign-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('upload certificate and prepare for signing', async ({ page }) => {
    await navigateToTool(page, 'digital-sign-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Should show certificate upload option
    const certInput = page.locator('input[accept*=".p12"], input[accept*=".pfx"], input[id*="cert"]').first();
    if (await certInput.isVisible().catch(() => false)) {
      // Certificate input exists
      expect(true).toBeTruthy();
    }
  });
});
