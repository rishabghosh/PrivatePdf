import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('PDF Layers / OCG', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-layers');
    await expect(page.locator('h1')).toContainText(/layer/i);
  });

  test('upload PDF and see layer controls', async ({ page }) => {
    await navigateToTool(page, 'pdf-layers');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });
});
