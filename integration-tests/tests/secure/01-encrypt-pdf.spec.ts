import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Encrypt PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'encrypt-pdf');
    await expect(page.locator('h1')).toContainText(/encrypt/i);
  });

  test('upload PDF and see password fields', async ({ page }) => {
    await navigateToTool(page, 'encrypt-pdf');
    await uploadFile(page, fixtures.samplePdf);
    // Should show password input fields
    await expect(page.locator('input[type="password"], input[id*="password"]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('encrypt PDF with password and download', async ({ page }) => {
    await navigateToTool(page, 'encrypt-pdf');
    await uploadFile(page, fixtures.samplePdf);

    // Fill in password
    const passwordInput = page.locator('input[type="password"], input[id*="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill('test123');

    // Fill confirm password if present
    const confirmInput = page.locator('input[type="password"], input[id*="confirm"]').nth(1);
    if (await confirmInput.isVisible().catch(() => false)) {
      await confirmInput.fill('test123');
    }

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
