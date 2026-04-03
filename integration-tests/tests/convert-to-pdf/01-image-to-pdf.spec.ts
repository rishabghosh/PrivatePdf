import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Images to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'image-to-pdf');
    await expect(page.locator('h1').first()).toContainText(/image.*pdf/i);
  });

  test('upload image and convert to PDF', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'image-to-pdf');
    await uploadFile(page, fixtures.sampleJpg);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });

  test('upload multiple images', async ({ page }) => {
    await navigateToTool(page, 'image-to-pdf');
    await uploadFile(page, [fixtures.sampleJpg, fixtures.samplePng]);
    await expectFileUploaded(page);
  });
});
