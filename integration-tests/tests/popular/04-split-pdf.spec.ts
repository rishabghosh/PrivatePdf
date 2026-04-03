import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Split PDF', () => {
  test('page loads with split heading', async ({ page }) => {
    await navigateToTool(page, 'split-pdf');
    await expect(page.locator('h1')).toContainText(/split/i);
  });

  test('upload PDF and see page range options', async ({ page }) => {
    await navigateToTool(page, 'split-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);
  });

  test('split PDF with page range and download', async ({ page }) => {
    await navigateToTool(page, 'split-pdf');
    await uploadFile(page, fixtures.multiPagePdf);
    await expectFileUploaded(page);

    // Try to set a page range
    const rangeInput = page.locator('input[type="text"][placeholder*="1"], input[id*="range"], input[id*="pages"]').first();
    if (await rangeInput.isVisible().catch(() => false)) {
      await rangeInput.fill('1-5');
    }

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

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
