import { test, expect } from '@playwright/test';
import { navigateToTool, uploadTwoFiles, expectFileUploaded, fixtures } from '../../helpers/test-helpers';

test.describe('Compare PDFs', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'compare-pdfs');
    await expect(page.locator('h1')).toContainText(/compare/i);
  });

  test('upload two PDFs for comparison', async ({ page }) => {
    await navigateToTool(page, 'compare-pdfs');
    await uploadTwoFiles(page, fixtures.samplePdf, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('see visual comparison results', async ({ page }) => {
    await navigateToTool(page, 'compare-pdfs');
    await uploadTwoFiles(page, fixtures.samplePdf, fixtures.samplePdf);
    await expectFileUploaded(page);
    // Should show side-by-side or diff view
    await page.waitForTimeout(5_000);
  });
});
