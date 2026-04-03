import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Edit Metadata', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'edit-metadata');
    await expect(page.locator('h1').first()).toContainText(/edit.*metadata/i);
  });

  test('upload PDF and edit metadata', async ({ page }) => {
    test.slow();
    await navigateToTool(page, 'edit-metadata');
    await uploadFile(page, fixtures.metadataPdf);
    await expectFileUploaded(page);

    // Try editing a metadata field
    const titleInput = page.locator('input[name="title"], input[id*="title"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Updated Title');
    }

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
