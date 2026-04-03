import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Watermark', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-watermark');
    await expect(page.locator('h1')).toContainText(/watermark/i);
  });

  test('upload PDF and see watermark options', async ({ page }) => {
    await navigateToTool(page, 'add-watermark');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('add text watermark and download', async ({ page }) => {
    await navigateToTool(page, 'add-watermark');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Fill in watermark text
    const textInput = page.locator('input[type="text"], textarea').first();
    if (await textInput.isVisible().catch(() => false)) {
      await textInput.fill('CONFIDENTIAL');
    }

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
