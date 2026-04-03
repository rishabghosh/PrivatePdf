/**
 * Generate test fixture files for PrivatePDF integration tests.
 *
 * Run: node helpers/generate-fixtures.mjs
 *
 * This creates sample PDFs and other test files in the fixtures/ directory.
 * For large PDFs, it generates multi-page documents using pdf-lib.
 * Non-PDF fixtures (images, documents) should be added manually or
 * downloaded from a fixtures repository.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', 'fixtures');

async function createPdf(pageCount, fileName, options = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    // Add page number and content
    page.drawText(`Page ${i} of ${pageCount}`, {
      x: 50,
      y: height - 50,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Test document: ${fileName}`, {
      x: 50,
      y: height - 80,
      size: 14,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Add some body text for content
    const lines = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
      'Duis aute irure dolor in reprehenderit in voluptate velit.',
      'Excepteur sint occaecat cupidatat non proident.',
    ];
    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: 50,
        y: height - 120 - idx * 20,
        size: 12,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });

    // Add a colored rectangle for visual content
    if (options.color) {
      page.drawRectangle({
        x: 50,
        y: 100,
        width: width - 100,
        height: 100,
        color: rgb(
          (i * 37 % 255) / 255,
          (i * 73 % 255) / 255,
          (i * 113 % 255) / 255
        ),
      });
    }
  }

  if (options.title) {
    doc.setTitle(options.title);
  }
  if (options.author) {
    doc.setAuthor(options.author);
  }
  if (options.subject) {
    doc.setSubject(options.subject);
  }
  if (options.keywords) {
    doc.setKeywords(options.keywords);
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURES, fileName), bytes);
  console.log(`  Created: ${fileName} (${pageCount} pages, ${(bytes.length / 1024).toFixed(1)} KB)`);
}

async function createPdfWithBookmarks(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const chapters = ['Introduction', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Conclusion'];
  for (const chapter of chapters) {
    const page = doc.addPage([612, 792]);
    page.drawText(chapter, { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
    page.drawText('Content for ' + chapter, { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURES, fileName), bytes);
  console.log(`  Created: ${fileName} (${chapters.length} pages, ${(bytes.length / 1024).toFixed(1)} KB)`);
}

async function createPdfWithBlankPages(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= 10; i++) {
    const page = doc.addPage([612, 792]);
    if (i % 3 !== 0) {
      // Add content only on non-blank pages
      page.drawText(`Page ${i} - Has Content`, { x: 50, y: 700, size: 18, font, color: rgb(0, 0, 0) });
    }
    // Pages 3, 6, 9 are "blank"
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURES, fileName), bytes);
  console.log(`  Created: ${fileName} (10 pages with blanks, ${(bytes.length / 1024).toFixed(1)} KB)`);
}

async function createPdfWithTables(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);

  // Draw a simple table
  const headers = ['Name', 'Age', 'City', 'Score'];
  const rows = [
    ['Alice', '30', 'New York', '95'],
    ['Bob', '25', 'London', '87'],
    ['Charlie', '35', 'Tokyo', '92'],
    ['Diana', '28', 'Paris', '88'],
  ];

  const startX = 50;
  let y = 700;
  const colWidth = 120;

  // Draw headers
  headers.forEach((h, i) => {
    page.drawText(h, { x: startX + i * colWidth, y, size: 14, font, color: rgb(0, 0, 0.5) });
  });
  y -= 25;

  // Draw rows
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      page.drawText(cell, { x: startX + i * colWidth, y, size: 12, font, color: rgb(0, 0, 0) });
    });
    y -= 20;
  });

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURES, fileName), bytes);
  console.log(`  Created: ${fileName} (table data, ${(bytes.length / 1024).toFixed(1)} KB)`);
}

async function createFormPdf(fileName) {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  page.drawText('Test Form', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });

  // Add form fields
  const nameField = form.createTextField('name');
  nameField.setText('');
  nameField.addToPage(page, { x: 50, y: 620, width: 250, height: 30 });

  const emailField = form.createTextField('email');
  emailField.setText('');
  emailField.addToPage(page, { x: 50, y: 570, width: 250, height: 30 });

  const checkbox = form.createCheckBox('agree');
  checkbox.addToPage(page, { x: 50, y: 520, width: 20, height: 20 });

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURES, fileName), bytes);
  console.log(`  Created: ${fileName} (form fields, ${(bytes.length / 1024).toFixed(1)} KB)`);
}

function createTextFixture(fileName, content) {
  fs.writeFileSync(path.join(FIXTURES, fileName), content);
  console.log(`  Created: ${fileName}`);
}

function createMinimalSvg(fileName) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect width="200" height="200" fill="#4F46E5"/>
  <text x="100" y="110" text-anchor="middle" fill="white" font-size="16">Test SVG</text>
</svg>`;
  fs.writeFileSync(path.join(FIXTURES, fileName), svg);
  console.log(`  Created: ${fileName}`);
}

function createMinimalEml(fileName) {
  const eml = `From: sender@example.com
To: recipient@example.com
Subject: Test Email for PDF Conversion
Date: Thu, 01 Jan 2025 12:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

This is a test email body for converting to PDF.
It contains multiple lines of text.

Best regards,
Test Sender`;
  fs.writeFileSync(path.join(FIXTURES, fileName), eml);
  console.log(`  Created: ${fileName}`);
}

// ─── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Generating test fixtures...\n');

  // Ensure fixtures dir exists
  fs.mkdirSync(FIXTURES, { recursive: true });

  // PDFs
  console.log('PDF fixtures:');
  await createPdf(1, 'sample.pdf', { title: 'Sample PDF', author: 'Test', color: true });
  await createPdf(10, 'multi-page-10.pdf', { title: 'Multi Page', color: true });
  await createPdf(100, 'large-100-pages.pdf', { title: 'Large PDF', color: true });
  await createPdf(500, 'huge-500-pages.pdf', { title: 'Huge PDF', color: true });
  await createPdf(3, 'color-document.pdf', { title: 'Color Test', color: true });
  await createPdfWithBookmarks('bookmarked.pdf');
  await createPdfWithBlankPages('with-blank-pages.pdf');
  await createPdfWithTables('with-tables.pdf');
  await createFormPdf('form-fields.pdf');
  await createPdf(5, 'with-metadata.pdf', {
    title: 'Metadata Test Document',
    author: 'Test Author',
    subject: 'Testing metadata editing',
    keywords: ['test', 'metadata', 'pdf'],
  });
  await createPdf(3, 'annotated.pdf', { title: 'Annotated PDF' });
  await createPdf(2, 'scanned-image.pdf', { title: 'Scanned Document' });
  await createPdf(1, 'corrupted.pdf'); // We'll note this isn't truly corrupted - for basic test

  console.log('\nText/data fixtures:');
  createTextFixture('sample.txt', 'Hello, World!\nThis is a test text file for conversion to PDF.\nLine 3.\nLine 4.\nLine 5.');
  createTextFixture('sample.csv', 'Name,Age,City\nAlice,30,New York\nBob,25,London\nCharlie,35,Tokyo');
  createTextFixture('sample.json', JSON.stringify({ name: 'Test', items: [1, 2, 3], nested: { key: 'value' } }, null, 2));
  createTextFixture('sample.xml', '<?xml version="1.0"?>\n<root>\n  <item id="1">First</item>\n  <item id="2">Second</item>\n</root>');
  createTextFixture('sample.md', '# Test Markdown\n\n## Section 1\n\nThis is a **bold** and *italic* test.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("hello");\n```');
  createTextFixture('sample.rtf', '{\\rtf1\\ansi{\\fonttbl{\\f0 Times New Roman;}}\\pard\\f0\\fs24 Hello, this is a test RTF document.\\par}');
  createMinimalSvg('sample.svg');
  createMinimalEml('sample.eml');

  console.log('\nImage fixtures:');
  console.log('  NOTE: Binary image fixtures (jpg, png, webp, bmp, heic, tiff, psd) must be');
  console.log('  provided manually. Place them in integration-tests/fixtures/');
  console.log('  Required files: sample.jpg, sample.png, sample.webp, sample.bmp,');
  console.log('  sample.heic, sample.tiff, sample.psd');

  console.log('\nDocument fixtures:');
  console.log('  NOTE: Office document fixtures must be provided manually.');
  console.log('  Required files: sample.docx, sample.xlsx, sample.pptx, sample.odt,');
  console.log('  sample.ods, sample.odp, sample.odg, sample.xps, sample.epub,');
  console.log('  sample.mobi, sample.fb2, sample.cbz, sample.wpd, sample.wps,');
  console.log('  sample.pages, sample.pub, sample.vsd, sample.msg');

  console.log('\nSecurity fixtures:');
  console.log('  NOTE: Encrypted/signed PDFs and certificates must be provided manually.');
  console.log('  Required files: encrypted.pdf (password: "test123"), restricted.pdf,');
  console.log('  with-attachments.pdf, with-layers.pdf, digitally-signed.pdf, test-cert.p12');

  console.log('\nDone! Auto-generated fixtures are ready.');
  console.log('Remember to add binary/office fixtures manually before running tests.');
}

main().catch(console.error);
