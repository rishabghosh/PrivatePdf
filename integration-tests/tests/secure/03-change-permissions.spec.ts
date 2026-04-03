import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Change Permissions', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'change-permissions');
    await expect(page.locator('h1')).toContainText(/permission/i);
  });

  test('upload PDF and see permission options', async ({ page }) => {
    await navigateToTool(page, 'change-permissions');
    await uploadFile(page, fixtures.samplePdf);
    // Should show permission checkboxes/toggles
    await expect(page.locator('input[type="checkbox"], input[type="password"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('change permissions and download', async ({ page }) => {
    await navigateToTool(page, 'change-permissions');
    await uploadFile(page, fixtures.samplePdf);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
