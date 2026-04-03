import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Timestamp PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'timestamp-pdf');
    await expect(page.locator('h1')).toContainText(/timestamp/i);
  });

  test('upload PDF and see timestamp options', async ({ page }) => {
    await navigateToTool(page, 'timestamp-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('timestamp PDF and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'timestamp-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
