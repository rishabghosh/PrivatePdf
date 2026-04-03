import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Decrypt PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'decrypt-pdf');
    await expect(page.locator('h1')).toContainText(/decrypt/i);
  });

  test('upload encrypted PDF and see password prompt', async ({ page }) => {
    await navigateToTool(page, 'decrypt-pdf');
    await uploadFile(page, fixtures.encryptedPdf);
    await expect(page.locator('input[type="password"], input[id*="password"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('decrypt PDF with correct password and download', async ({ page }) => {
    await navigateToTool(page, 'decrypt-pdf');
    await uploadFile(page, fixtures.encryptedPdf);

    const passwordInput = page.locator('input[type="password"], input[id*="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill('test123');

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
