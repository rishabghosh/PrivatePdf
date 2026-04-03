import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Crop PDF', () => {
  test('page loads with crop heading', async ({ page }) => {
    await navigateToTool(page, 'crop-pdf');
    await expect(page.locator('h1')).toContainText(/crop/i);
  });

  test('upload PDF and see crop interface', async ({ page }) => {
    await navigateToTool(page, 'crop-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('crop PDF and download result', async ({ page }) => {
    await navigateToTool(page, 'crop-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
