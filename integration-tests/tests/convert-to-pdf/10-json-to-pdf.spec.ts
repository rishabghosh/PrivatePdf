import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('JSON to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'json-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/json.*pdf/i);
  });

  test('convert JSON to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'json-to-pdf');
    await uploadFile(page, fixtures.sampleJson);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
