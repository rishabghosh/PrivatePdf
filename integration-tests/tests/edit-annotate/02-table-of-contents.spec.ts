import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Table of Contents', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'table-of-contents');
    await expect(page.locator('h1')).toContainText(/table of contents/i);
  });

  test('upload PDF and see TOC options', async ({ page }) => {
    await navigateToTool(page, 'table-of-contents');
    await uploadFile(page, fixtures.bookmarkedPdf);
    await expectFileUploaded(page);
  });

  test('generate TOC and download', async ({ page }) => {
    await navigateToTool(page, 'table-of-contents');
    await uploadFile(page, fixtures.bookmarkedPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
