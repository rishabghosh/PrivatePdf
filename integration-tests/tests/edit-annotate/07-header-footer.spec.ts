import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Header & Footer', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'header-footer');
    await expect(page.locator('h1').first()).toContainText(/header|footer/i);
  });

  test('upload PDF and see header/footer options', async ({ page }) => {
    await navigateToTool(page, 'header-footer');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('add header and footer then download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'header-footer');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
