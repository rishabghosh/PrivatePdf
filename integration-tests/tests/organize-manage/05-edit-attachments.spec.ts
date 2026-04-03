import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Edit Attachments', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'edit-attachments');
    await expect(page.locator('h1').first()).toContainText(/edit.*attachment/i);
  });

  test('upload PDF and see attachment list', async ({ page }) => {
    await navigateToTool(page, 'edit-attachments');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });
});
