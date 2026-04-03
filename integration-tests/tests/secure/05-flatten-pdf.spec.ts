import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Flatten PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'flatten-pdf');
    await expect(page.locator('h1').first()).toContainText(/flatten/i);
  });

  test('flatten PDF with form fields and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'flatten-pdf');
    await uploadFile(page, fixtures.formPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
