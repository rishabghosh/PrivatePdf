import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Remove Annotations', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'remove-annotations');
    await expect(page.locator('h1').first()).toContainText(/annotation/i);
  });

  test('upload annotated PDF and remove annotations', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'remove-annotations');
    await uploadFile(page, fixtures.annotatedPdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
