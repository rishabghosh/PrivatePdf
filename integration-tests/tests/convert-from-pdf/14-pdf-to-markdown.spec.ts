import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to Markdown', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-markdown');
    await expect(page.locator('h1').first()).toContainText(/pdf.*markdown/i);
  });

  test('convert PDF to Markdown and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-to-markdown');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
