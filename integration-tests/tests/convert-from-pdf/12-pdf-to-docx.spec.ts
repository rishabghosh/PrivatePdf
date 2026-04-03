import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('PDF to Word (DOCX)', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-docx');
    await expect(page.locator('h1')).toContainText(/pdf.*word|pdf.*docx/i);
  });

  test('convert PDF to DOCX and download', async ({ page }) => {
    await navigateToTool(page, 'pdf-to-docx');
    await uploadFile(page, fixtures.samplePdf);
    await expectFileUploaded(page);

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
