import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Prepare PDF for AI', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'prepare-pdf-for-ai');
    await expect(page.locator('h1').first()).toContainText(/ai|prepare/i);
  });

  test('prepare PDF for AI and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'prepare-pdf-for-ai');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
