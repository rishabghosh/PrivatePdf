import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Extract Attachments', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'extract-attachments');
    await expect(page.locator('h1').first()).toContainText(/extract.*attachment/i);
  });

  test('extract attachments from PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'extract-attachments');
    await uploadFile(page, fixtures.attachmentsPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
