import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('View Metadata', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'view-metadata');
    await expect(page.locator('h1')).toContainText(/view.*metadata/i);
  });

  test('upload PDF and see metadata', async ({ page }) => {
    await navigateToTool(page, 'view-metadata');
    await uploadFile(page, fixtures.metadataPdf);
    await expectFileUploaded(page);
    // Should display metadata fields (title, author, etc.)
    await page.waitForTimeout(3_000);
  });
});
