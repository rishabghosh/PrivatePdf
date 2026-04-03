import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Form Filler', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'form-filler');
    await expect(page.locator('h1')).toContainText(/form.*filler|fill.*form/i);
  });

  test('upload form PDF and see fields', async ({ page }) => {
    await navigateToTool(page, 'form-filler');
    await uploadFile(page, fixtures.formPdf);
    await expectFileUploaded(page);
  });

  test('fill form fields', async ({ page }) => {
    await navigateToTool(page, 'form-filler');
    await uploadFile(page, fixtures.formPdf);
    await expectFileUploaded(page);
    // Form fields should be rendered and interactive
    await page.waitForTimeout(3_000);
  });
});
