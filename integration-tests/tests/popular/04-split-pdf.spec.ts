import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Split PDF', () => {
  test('page loads with split heading', async ({ page }) => {
    await navigateToTool(page, 'split-pdf');
    await expect(page.locator('h1').first()).toContainText(/split/i);
  });

  test('upload PDF and see page range options', async ({ page }) => {
    await navigateToTool(page, 'split-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('split PDF with page range and download', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'split-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    // Fill in the page range (required before processing)
    const rangeInput = page.locator('#page-range-input, input[id*="range"], input[placeholder*="1"]').first();
    await rangeInput.fill('1-5');

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });

  test('split large PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'split-pdf');
    await uploadFile(page, fixtures.largePdf);
    await expectFileUploaded(page);

    // Fill in page range
    const rangeInput = page.locator('#page-range-input, input[id*="range"], input[placeholder*="1"]').first();
    await rangeInput.fill('1-50');

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
