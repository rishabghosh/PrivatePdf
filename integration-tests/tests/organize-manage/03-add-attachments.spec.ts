import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Add Attachments', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'add-attachments');
    await expect(page.locator('h1')).toContainText(/attachment/i);
  });

  test('upload PDF and add attachment', async ({ page }) => {
    await navigateToTool(page, 'add-attachments');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);
  });
});
