import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('MOBI to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'mobi-to-pdf');
    await expect(page.locator('h1')).toContainText(/mobi.*pdf/i);
  });

  test('convert MOBI to PDF', async ({ page }) => {
    await navigateToTool(page, 'mobi-to-pdf');
    await uploadFile(page, fixtures.sampleMobi);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
