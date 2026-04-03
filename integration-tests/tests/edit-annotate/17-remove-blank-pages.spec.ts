import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Remove Blank Pages', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'remove-blank-pages');
    await expect(page.locator('h1').first()).toContainText(/blank/i);
  });

  test('upload PDF with blank pages and detect them', async ({ page }) => {
    await navigateToTool(page, 'remove-blank-pages');
    await uploadFile(page, fixtures.blankPagesPdf);
    await expectFileUploaded(page);
  });

  test('remove blank pages and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'remove-blank-pages');
    await uploadFile(page, fixtures.blankPagesPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
