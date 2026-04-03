import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PowerPoint to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'powerpoint-to-pdf');
    await expect(page.locator('h1')).toContainText(/powerpoint.*pdf/i);
  });

  test('convert PPTX to PDF', async ({ page }) => {
    await navigateToTool(page, 'powerpoint-to-pdf');
    await uploadFile(page, fixtures.samplePptx);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
