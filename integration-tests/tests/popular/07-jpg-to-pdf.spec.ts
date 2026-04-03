import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('JPG to PDF', () => {
  test('page loads with JPG to PDF heading', async ({ page }) => {
    await navigateToTool(page, 'jpg-to-pdf');
    await expect(page.locator('h1')).toContainText(/jpg.*pdf/i);
  });

  test('upload JPG and see preview', async ({ page }) => {
    await navigateToTool(page, 'jpg-to-pdf');
    await uploadFile(page, fixtures.sampleJpg);
    await expectFileUploaded(page);
  });

  test('convert JPG to PDF and download', async ({ page }) => {
    await navigateToTool(page, 'jpg-to-pdf');
    await uploadFile(page, fixtures.sampleJpg);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('upload multiple JPGs', async ({ page }) => {
    await navigateToTool(page, 'jpg-to-pdf');
    await uploadFile(page, [fixtures.sampleJpg, fixtures.sampleJpg]);
    await expectFileUploaded(page);
  });
});
