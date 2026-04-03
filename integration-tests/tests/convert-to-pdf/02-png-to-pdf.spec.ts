import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PNG to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'png-to-pdf');
    await expect(page.locator('h1')).toContainText(/png.*pdf/i);
  });

  test('convert PNG to PDF', async ({ page }) => {
    await navigateToTool(page, 'png-to-pdf');
    await uploadFile(page, fixtures.samplePng);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
