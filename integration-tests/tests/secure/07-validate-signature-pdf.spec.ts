import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Validate Signature', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'validate-signature-pdf');
    await expect(page.locator('h1')).toContainText(/validate.*signature/i);
  });

  test('upload signed PDF and see validation results', async ({ page }) => {
    await navigateToTool(page, 'validate-signature-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });
});
