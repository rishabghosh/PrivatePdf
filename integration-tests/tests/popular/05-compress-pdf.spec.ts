import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Compress PDF', () => {
  test('page loads with compress heading', async ({ page }) => {
    await navigateToTool(page, 'compress-pdf');
    await expect(page.locator('h1')).toContainText(/compress/i);
  });

  test('upload PDF and see compression options', async ({ page }) => {
    await navigateToTool(page, 'compress-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });

  test('compress PDF and download result', async ({ page }) => {
    await navigateToTool(page, 'compress-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('compress large PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'compress-pdf');
    await uploadFile(page, fixtures.largePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
