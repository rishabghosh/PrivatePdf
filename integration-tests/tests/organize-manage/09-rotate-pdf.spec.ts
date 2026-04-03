import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Rotate PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'rotate-pdf');
    await expect(page.locator('h1')).toContainText(/rotate/i);
  });

  test('upload PDF and see rotation options', async ({ page }) => {
    await navigateToTool(page, 'rotate-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('rotate PDF and download', async ({ page }) => {
    await navigateToTool(page, 'rotate-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
