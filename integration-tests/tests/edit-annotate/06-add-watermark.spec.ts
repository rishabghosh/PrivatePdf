import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Watermark', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-watermark');
    await expect(page.locator('h1').first()).toContainText(/watermark/i);
  });

  test('upload PDF and see watermark options', async ({ page }) => {
    await navigateToTool(page, 'add-watermark');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('add text watermark and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'add-watermark');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Fill in watermark text using the specific input ID
    await page.locator('#watermark-text').fill('CONFIDENTIAL');

    // Wait for process button to become visible after entering text
    await page.locator('#process-btn').click();

    const download = await page.waitForEvent('download', { timeout: 0 });
    await expectDownloadTriggered(download);
  });
});
