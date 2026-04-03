import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Blank Page', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-blank-page');
    await expect(page.locator('h1')).toContainText(/blank.*page/i);
  });

  test('add blank page to PDF and download', async ({ page }) => {
    await navigateToTool(page, 'add-blank-page');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
