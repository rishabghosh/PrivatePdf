import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('EPUB to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'epub-to-pdf');
    await expect(page.locator('h1')).toContainText(/epub.*pdf/i);
  });

  test('convert EPUB to PDF', async ({ page }) => {
    await navigateToTool(page, 'epub-to-pdf');
    await uploadFile(page, fixtures.sampleEpub);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
