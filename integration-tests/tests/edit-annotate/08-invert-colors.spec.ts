import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Invert Colors', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'invert-colors');
    await expect(page.locator('h1')).toContainText(/invert/i);
  });

  test('upload PDF and see preview', async ({ page }) => {
    await navigateToTool(page, 'invert-colors');
    await uploadFile(page, fixtures.colorPdf);
    await expectFileUploaded(page);
  });

  test('invert colors and download', async ({ page }) => {
    await navigateToTool(page, 'invert-colors');
    await uploadFile(page, fixtures.colorPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
