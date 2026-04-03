import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to JPG', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-jpg');
    await expect(page.locator('h1').first()).toContainText(/pdf.*jpg/i);
  });

  test('upload PDF and see conversion options', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-jpg');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('convert PDF to JPG and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-jpg');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });

  test('convert large PDF to JPG', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'pdf-to-jpg');
    await uploadFile(page, fixtures.largePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
