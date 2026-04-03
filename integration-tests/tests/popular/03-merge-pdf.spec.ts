import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Merge PDF', () => {
  test('page loads with merge heading', async ({ page }) => {
    await navigateToTool(page, 'merge-pdf');
    await expect(page.locator('h1')).toContainText(/merge/i);
  });

  test('upload multiple PDFs and see file list', async ({ page }) => {
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);
    // File list should show both files
    await expect(page.locator('#file-list li, .file-item')).toHaveCount(2, { timeout: 15_000 });
  });

  test('can switch between file mode and page mode', async ({ page }) => {
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const fileModeBtn = page.locator('#file-mode-btn');
    const pageModeBtn = page.locator('#page-mode-btn');
    await expect(fileModeBtn).toBeVisible();
    await expect(pageModeBtn).toBeVisible();

    await pageModeBtn.click();
    await expect(page.locator('#page-mode-panel')).toBeVisible();
    await fileModeBtn.click();
    await expect(page.locator('#file-mode-panel')).toBeVisible();
  });

  test('merge two PDFs and download result', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('merge large PDF files', async ({ page }) => {
    test.slow(); // Large file test
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, [fixtures.largePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });

  test('add more files after initial upload', async ({ page }) => {
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    // Click add more
    const addMoreBtn = page.locator('#add-more-btn');
    if (await addMoreBtn.isVisible().catch(() => false)) {
      await addMoreBtn.click();
    }
  });

  test('clear all files', async ({ page }) => {
    await navigateToTool(page, 'merge-pdf');
    await uploadFile(page, [fixtures.samplePdf, fixtures.multiPagePdf]);
    await expectFileUploaded(page);

    const clearBtn = page.locator('#clear-files-btn');
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await expect(page.locator('#drop-zone')).toBeVisible();
    }
  });
});
