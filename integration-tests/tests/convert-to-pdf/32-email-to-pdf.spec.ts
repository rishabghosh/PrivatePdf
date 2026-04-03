import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Email to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'email-to-pdf');
    await expect(page.locator('h1')).toContainText(/email.*pdf/i);
  });

  test('convert EML to PDF', async ({ page }) => {
    await navigateToTool(page, 'email-to-pdf');
    await uploadFile(page, fixtures.sampleEml);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
