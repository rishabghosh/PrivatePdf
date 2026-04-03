import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Adjust Colors', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'adjust-colors');
    await expect(page.locator('h1')).toContainText(/adjust|color/i);
  });

  test('upload PDF and see color adjustment sliders', async ({ page }) => {
    await navigateToTool(page, 'adjust-colors');
    await uploadFile(page, fixtures.colorPdf);
    await expectFileUploaded(page);
  });

  test('adjust colors and download', async ({ page }) => {
    await navigateToTool(page, 'adjust-colors');
    await uploadFile(page, fixtures.colorPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
