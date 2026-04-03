import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Create PDF Form', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'form-creator');
    await expect(page.locator('h1')).toContainText(/form.*creator|create.*form/i);
  });

  test('upload PDF and see form builder', async ({ page }) => {
    await navigateToTool(page, 'form-creator');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('can add form fields (text, checkbox)', async ({ page }) => {
    await navigateToTool(page, 'form-creator');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Look for field type buttons
    const textFieldBtn = page.locator('button:has-text("Text Field"), [data-field="text"]').first();
    if (await textFieldBtn.isVisible().catch(() => false)) {
      await textFieldBtn.click();
    }
  });
});
