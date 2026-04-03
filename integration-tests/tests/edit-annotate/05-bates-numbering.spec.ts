import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Bates Numbering', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'bates-numbering');
    await expect(page.locator('h1')).toContainText(/bates/i);
  });

  test('upload PDF and see bates options', async ({ page }) => {
    await navigateToTool(page, 'bates-numbering');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('add bates numbers and download', async ({ page }) => {
    await navigateToTool(page, 'bates-numbering');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
