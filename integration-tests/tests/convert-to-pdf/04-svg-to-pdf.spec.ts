import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('SVG to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'svg-to-pdf');
    await expect(page.locator('h1')).toContainText(/svg.*pdf/i);
  });

  test('convert SVG to PDF', async ({ page }) => {
    await navigateToTool(page, 'svg-to-pdf');
    await uploadFile(page, fixtures.sampleSvg);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
