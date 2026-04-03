import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('RTF to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'rtf-to-pdf');
    await expect(page.locator('h1')).toContainText(/rtf.*pdf/i);
  });

  test('convert RTF to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'rtf-to-pdf');
    await uploadFile(page, fixtures.sampleRtf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
