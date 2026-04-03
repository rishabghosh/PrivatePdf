import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('XML to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'xml-to-pdf');
    await expect(page.locator('h1')).toContainText(/xml.*pdf/i);
  });

  test('convert XML to PDF', async ({ page }) => {
    await navigateToTool(page, 'xml-to-pdf');
    await uploadFile(page, fixtures.sampleXml);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
