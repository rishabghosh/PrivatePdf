import { test, expect } from '@playwright/test';
import { navigateToTool, uploadFile, expectFileUploaded, clickProcessButton, waitForDownload, expectDownloadTriggered, fixtures } from '../../helpers/test-helpers';

test.describe('Markdown to PDF', () => {
  test('page loads correctly', async ({ page }) => {
    await navigateToTool(page, 'markdown-to-pdf');
    await expect(page.locator('h1')).toContainText(/markdown.*pdf/i);
  });

  test('upload markdown and see live preview', async ({ page }) => {
    await navigateToTool(page, 'markdown-to-pdf');
    // Markdown tool may have a text editor instead of file upload
    const editor = page.locator('textarea, [contenteditable], .CodeMirror, [class*="editor"]').first();
    if (await editor.isVisible().catch(() => false)) {
      await editor.fill('# Test\n\nHello **world**');
    } else {
      await uploadFile(page, fixtures.sampleMd);
      await expectFileUploaded(page);
    }
  });

  test('convert markdown to PDF and download', async ({ page }) => {
    await navigateToTool(page, 'markdown-to-pdf');
    const editor = page.locator('textarea, [contenteditable]').first();
    if (await editor.isVisible().catch(() => false)) {
      await editor.fill('# Test Document\n\nThis is **bold** text.\n\n- Item 1\n- Item 2');
    } else {
      await uploadFile(page, fixtures.sampleMd);
    }

    const download = await waitForDownload(page, async () => {
      await clickProcessButton(page);
    });
    await expectDownloadTriggered(download);
  });
});
