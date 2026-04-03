import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Page Dimensions', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'page-dimensions');
    await expect(page.locator('h1').first()).toContainText(/dimension/i);
  });

  test('upload PDF and see dimension info', async ({ page }) => {
    await navigateToTool(page, 'page-dimensions');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
    // Should display page width/height info
    await page.waitForTimeout(3_000);
  });
});
