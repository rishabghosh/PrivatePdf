/**
 * Comprehensive fixture generator for PrivatePDF integration tests.
 *
 * Run: node helpers/generate-all-fixtures.mjs
 *
 * Generates ALL fixture files including images, documents, and special PDFs.
 * Extends the original generate-fixtures.mjs with programmatic binary fixtures.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '..', 'fixtures');

// ─── Utility ────────────────────────────────────────────────────────────

function writeFixture(fileName, data) {
  const filePath = path.join(FIXTURES, fileName);
  if (Buffer.isBuffer(data)) {
    fs.writeFileSync(filePath, data);
  } else {
    fs.writeFileSync(filePath, data, typeof data === 'string' ? 'utf8' : undefined);
  }
  const stat = fs.statSync(filePath);
  console.log(`  Created: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`);
}

function exists(fileName) {
  return fs.existsSync(path.join(FIXTURES, fileName));
}

// ─── PDF Helpers (from original generate-fixtures.mjs) ──────────────────

async function createPdf(pageCount, fileName, options = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([612, 792]);
    const { width, height } = page.getSize();

    page.drawText(`Page ${i} of ${pageCount}`, {
      x: 50, y: height - 50, size: 24, font, color: rgb(0, 0, 0),
    });
    page.drawText(`Test document: ${fileName}`, {
      x: 50, y: height - 80, size: 14, font, color: rgb(0.3, 0.3, 0.3),
    });

    const lines = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
      'Duis aute irure dolor in reprehenderit in voluptate velit.',
      'Excepteur sint occaecat cupidatat non proident.',
    ];
    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: 50, y: height - 120 - idx * 20, size: 12, font, color: rgb(0.1, 0.1, 0.1),
      });
    });

    if (options.color) {
      page.drawRectangle({
        x: 50, y: 100, width: width - 100, height: 100,
        color: rgb((i * 37 % 255) / 255, (i * 73 % 255) / 255, (i * 113 % 255) / 255),
      });
    }
  }

  if (options.title) doc.setTitle(options.title);
  if (options.author) doc.setAuthor(options.author);
  if (options.subject) doc.setSubject(options.subject);
  if (options.keywords) doc.setKeywords(options.keywords);

  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
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
  writeFixture(fileName, Buffer.from(bytes));
}

async function createPdfWithBlankPages(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 10; i++) {
    const page = doc.addPage([612, 792]);
    if (i % 3 !== 0) {
      page.drawText(`Page ${i} - Has Content`, { x: 50, y: 700, size: 18, font, color: rgb(0, 0, 0) });
    }
  }
  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

async function createPdfWithTables(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  const headers = ['Name', 'Age', 'City', 'Score'];
  const rows = [['Alice', '30', 'New York', '95'], ['Bob', '25', 'London', '87'], ['Charlie', '35', 'Tokyo', '92'], ['Diana', '28', 'Paris', '88']];
  const startX = 50;
  let y = 700;
  const colWidth = 120;
  headers.forEach((h, i) => {
    page.drawText(h, { x: startX + i * colWidth, y, size: 14, font, color: rgb(0, 0, 0.5) });
  });
  y -= 25;
  rows.forEach((row) => {
    row.forEach((cell, i) => {
      page.drawText(cell, { x: startX + i * colWidth, y, size: 12, font, color: rgb(0, 0, 0) });
    });
    y -= 20;
  });
  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

async function createFormPdf(fileName) {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Test Form', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  const nameField = form.createTextField('name');
  nameField.setText('');
  nameField.addToPage(page, { x: 50, y: 620, width: 250, height: 30 });
  const emailField = form.createTextField('email');
  emailField.setText('');
  emailField.addToPage(page, { x: 50, y: 570, width: 250, height: 30 });
  const checkbox = form.createCheckBox('agree');
  checkbox.addToPage(page, { x: 50, y: 520, width: 20, height: 20 });
  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

// ─── Image Fixtures ─────────────────────────────────────────────────────

function createJpeg(fileName) {
  // Minimal valid 1x1 red JPEG
  const bytes = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
    0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
    0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
    0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
    0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
    0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
    0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
    0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
    0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
    0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9,
  ]);
  writeFixture(fileName, bytes);
}

function createPng(fileName) {
  // Minimal 1x1 red PNG
  const bytes = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    // IHDR chunk
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    // IDAT chunk (compressed 1x1 RGB red pixel)
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00,
    0x00, 0x03, 0x00, 0x01, 0x36, 0x28, 0x19, 0x00,
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82,
  ]);
  writeFixture(fileName, bytes);
}

function createWebp(fileName) {
  // Minimal 1x1 WebP (VP8 lossy)
  // RIFF header + WEBP + VP8 chunk with minimal 1x1 image
  const vp8Data = Buffer.from([
    0x9D, 0x01, 0x2A, 0x01, 0x00, 0x01, 0x00, 0x01,
    0x40, 0x25, 0xA4, 0x00, 0x03, 0x70, 0x00, 0xFE,
    0xFB, 0x94, 0x00, 0x00,
  ]);
  const fileSize = 4 + 8 + vp8Data.length; // "WEBP" + VP8 chunk header + data
  const buf = Buffer.alloc(8 + fileSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(fileSize, 4);
  buf.write('WEBP', 8);
  buf.write('VP8 ', 12);
  buf.writeUInt32LE(vp8Data.length, 16);
  vp8Data.copy(buf, 20);
  writeFixture(fileName, buf);
}

function createBmp(fileName) {
  // Minimal 1x1 24-bit BMP
  const pixelDataOffset = 54;
  const pixelRowSize = 4; // 3 bytes + 1 padding to align to 4
  const fileSize = pixelDataOffset + pixelRowSize;
  const buf = Buffer.alloc(fileSize);
  // BMP file header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6); // reserved
  buf.writeUInt32LE(pixelDataOffset, 10);
  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14); // header size
  buf.writeInt32LE(1, 18); // width
  buf.writeInt32LE(1, 22); // height
  buf.writeUInt16LE(1, 26); // planes
  buf.writeUInt16LE(24, 28); // bits per pixel
  buf.writeUInt32LE(0, 30); // compression (none)
  buf.writeUInt32LE(pixelRowSize, 34); // image size
  buf.writeInt32LE(2835, 38); // X pixels per meter
  buf.writeInt32LE(2835, 42); // Y pixels per meter
  buf.writeUInt32LE(0, 46); // colors in table
  buf.writeUInt32LE(0, 50); // important colors
  // Pixel data (BGR): red pixel
  buf[54] = 0x00; // Blue
  buf[55] = 0x00; // Green
  buf[56] = 0xFF; // Red
  buf[57] = 0x00; // Padding
  writeFixture(fileName, buf);
}

function createTiff(fileName) {
  // Minimal 1x1 RGB TIFF (little-endian)
  const buf = Buffer.alloc(128);
  let offset = 0;

  // Header
  buf.write('II', 0); // Little-endian
  buf.writeUInt16LE(42, 2); // TIFF magic
  buf.writeUInt32LE(8, 4); // Offset to first IFD

  // IFD at offset 8
  const ifdOffset = 8;
  const numEntries = 8;
  buf.writeUInt16LE(numEntries, ifdOffset);

  let entryOffset = ifdOffset + 2;
  function writeEntry(tag, type, count, value) {
    buf.writeUInt16LE(tag, entryOffset);
    buf.writeUInt16LE(type, entryOffset + 2);
    buf.writeUInt32LE(count, entryOffset + 4);
    buf.writeUInt32LE(value, entryOffset + 8);
    entryOffset += 12;
  }

  writeEntry(256, 3, 1, 1);   // ImageWidth = 1
  writeEntry(257, 3, 1, 1);   // ImageLength = 1
  writeEntry(258, 3, 1, 8);   // BitsPerSample = 8
  writeEntry(259, 3, 1, 1);   // Compression = None
  writeEntry(262, 3, 1, 2);   // PhotometricInterpretation = RGB
  writeEntry(273, 3, 1, 120); // StripOffsets = 120
  writeEntry(278, 3, 1, 1);   // RowsPerStrip = 1
  writeEntry(279, 3, 1, 3);   // StripByteCounts = 3

  // Next IFD offset = 0 (no more IFDs)
  buf.writeUInt32LE(0, entryOffset);

  // Pixel data at offset 120: single red pixel (RGB)
  buf[120] = 0xFF; // R
  buf[121] = 0x00; // G
  buf[122] = 0x00; // B

  writeFixture(fileName, buf.slice(0, 123));
}

function createHeic(fileName) {
  // Minimal HEIC/HEIF file type box stub
  // This is just enough to be recognized as HEIC by file type detection
  const ftypBox = Buffer.from([
    0x00, 0x00, 0x00, 0x1C, // box size = 28
    0x66, 0x74, 0x79, 0x70, // "ftyp"
    0x68, 0x65, 0x69, 0x63, // major brand "heic"
    0x00, 0x00, 0x00, 0x00, // minor version
    0x68, 0x65, 0x69, 0x63, // compatible brand "heic"
    0x68, 0x65, 0x76, 0x63, // compatible brand "hevc"
    0x6D, 0x69, 0x66, 0x31, // compatible brand "mif1"
  ]);
  writeFixture(fileName, ftypBox);
}

function createPsd(fileName) {
  // Minimal PSD file: signature + header for 1x1 RGB image
  const buf = Buffer.alloc(64);
  buf.write('8BPS', 0);           // Signature
  buf.writeUInt16BE(1, 4);        // Version
  buf.fill(0, 6, 12);             // Reserved (6 bytes)
  buf.writeUInt16BE(3, 12);       // Channels = 3 (RGB)
  buf.writeUInt32BE(1, 14);       // Height = 1
  buf.writeUInt32BE(1, 18);       // Width = 1
  buf.writeUInt16BE(8, 22);       // Depth = 8 bits
  buf.writeUInt16BE(3, 24);       // Color mode = RGB
  // Color mode data section (length = 0)
  buf.writeUInt32BE(0, 26);
  // Image resources section (length = 0)
  buf.writeUInt32BE(0, 30);
  // Layer and mask section (length = 0)
  buf.writeUInt32BE(0, 34);
  // Image data: compression = raw (0), then 3 bytes (R, G, B)
  buf.writeUInt16BE(0, 38);       // Compression = raw
  buf[40] = 0xFF;                 // Red channel
  buf[41] = 0x00;                 // Green channel
  buf[42] = 0x00;                 // Blue channel
  writeFixture(fileName, buf.slice(0, 43));
}

// ─── ZIP-based Document Fixtures ────────────────────────────────────────

function createZipFixture(fileName, files) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(FIXTURES, fileName);
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      const stat = fs.statSync(filePath);
      console.log(`  Created: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`);
      resolve();
    });
    archive.on('error', reject);
    archive.pipe(output);

    for (const [name, content] of Object.entries(files)) {
      if (name === '__store__') continue;
      archive.append(content, { name });
    }

    // For EPUB/ODT: mimetype must be stored uncompressed as first entry
    // archiver handles ordering, but we handle this by appending it first
    archive.finalize();
  });
}

function createOdfFixture(fileName, mimeType, contentXml) {
  return createZipFixture(fileName, {
    'mimetype': mimeType,
    'META-INF/manifest.xml': `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="${mimeType}"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`,
    'content.xml': contentXml,
  });
}

async function generateDocx() {
  await createZipFixture('sample.docx', {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Test document for PDF conversion.</w:t></w:r></w:p>
    <w:p><w:r><w:t>This is a sample Word document with multiple paragraphs.</w:t></w:r></w:p>
  </w:body>
</w:document>`,
  });
}

async function generateXlsx() {
  await createZipFixture('sample.xlsx', {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>Value</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Test</t></is></c><c r="B2"><v>42</v></c></row>
  </sheetData>
</worksheet>`,
  });
}

async function generatePptx() {
  await createZipFixture('sample.pptx', {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    'ppt/_rels/presentation.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`,
    'ppt/presentation.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst>
</p:presentation>`,
    'ppt/slides/slide1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>
    <p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
      <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="2743200"/></a:xfrm></p:spPr>
      <p:txBody><a:bodyPr/><a:p><a:r><a:t>Test Slide</a:t></a:r></a:p></p:txBody>
    </p:sp>
  </p:spTree></p:cSld>
</p:sld>`,
  });
}

async function generateOdt() {
  await createOdfFixture('sample.odt', 'application/vnd.oasis.opendocument.text',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body><office:text>
    <text:p>Test document for PDF conversion.</text:p>
    <text:p>This is a sample ODT document.</text:p>
  </office:text></office:body>
</office:document-content>`);
}

async function generateOds() {
  await createOdfFixture('sample.ods', 'application/vnd.oasis.opendocument.spreadsheet',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body><office:spreadsheet>
    <table:table table:name="Sheet1">
      <table:table-row><table:table-cell><text:p>Name</text:p></table:table-cell><table:table-cell><text:p>Value</text:p></table:table-cell></table:table-row>
      <table:table-row><table:table-cell><text:p>Test</text:p></table:table-cell><table:table-cell><text:p>42</text:p></table:table-cell></table:table-row>
    </table:table>
  </office:spreadsheet></office:body>
</office:document-content>`);
}

async function generateOdp() {
  await createOdfFixture('sample.odp', 'application/vnd.oasis.opendocument.presentation',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body><office:presentation>
    <draw:page draw:name="Slide1" presentation:presentation-page-layout-name="AL1T0">
      <draw:frame draw:name="Title" presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="5cm" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0">
        <draw:text-box><text:p>Test Presentation</text:p></draw:text-box>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document-content>`);
}

async function generateOdg() {
  await createOdfFixture('sample.odg', 'application/vnd.oasis.opendocument.graphics',
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2">
  <office:body><office:drawing>
    <draw:page draw:name="Page1">
      <draw:rect svg:x="2cm" svg:y="2cm" svg:width="10cm" svg:height="5cm">
        <text:p>Test Drawing</text:p>
      </draw:rect>
    </draw:page>
  </office:drawing></office:body>
</office:document-content>`);
}

async function generateEpub() {
  await createZipFixture('sample.epub', {
    'mimetype': 'application/epub+zip',
    'META-INF/container.xml': `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    'content.opf': `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-epub-001</dc:identifier>
    <dc:title>Test EPUB</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2025-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine><itemref idref="ch1"/></spine>
</package>`,
    'chapter1.xhtml': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter 1</title></head>
<body><h1>Chapter 1</h1><p>Test content for EPUB conversion to PDF.</p></body></html>`,
    'nav.xhtml': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Navigation</title></head>
<body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol></nav></body></html>`,
  });
}

async function generateCbz() {
  // CBZ is just a ZIP of images - include the generated JPEG
  const jpgPath = path.join(FIXTURES, 'sample.jpg');
  if (!fs.existsSync(jpgPath)) {
    createJpeg('sample.jpg');
  }
  const jpgData = fs.readFileSync(jpgPath);
  await createZipFixture('sample.cbz', {
    'page001.jpg': jpgData,
  });
}

async function generateXps() {
  await createZipFixture('sample.xps', {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="fdseq" ContentType="application/vnd.ms-package.xps-fixeddocumentsequence+xml"/>
  <Default Extension="fdoc" ContentType="application/vnd.ms-package.xps-fixeddocument+xml"/>
  <Default Extension="fpage" ContentType="application/vnd.ms-package.xps-fixedpage+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Type="http://schemas.microsoft.com/xps/2005/06/fixedrepresentation" Target="/FixedDocumentSequence.fdseq"/>
</Relationships>`,
    'FixedDocumentSequence.fdseq': `<?xml version="1.0" encoding="UTF-8"?>
<FixedDocumentSequence xmlns="http://schemas.microsoft.com/xps/2005/06">
  <DocumentReference Source="/Documents/1/FixedDocument.fdoc"/>
</FixedDocumentSequence>`,
    'Documents/1/FixedDocument.fdoc': `<?xml version="1.0" encoding="UTF-8"?>
<FixedDocument xmlns="http://schemas.microsoft.com/xps/2005/06">
  <PageContent Source="/Documents/1/Pages/1.fpage"/>
</FixedDocument>`,
    'Documents/1/Pages/1.fpage': `<?xml version="1.0" encoding="UTF-8"?>
<FixedPage xmlns="http://schemas.microsoft.com/xps/2005/06" Width="816" Height="1056">
  <Glyphs OriginX="96" OriginY="96" FontRenderingEmSize="16" UnicodeString="Test XPS Document"/>
</FixedPage>`,
  });
}

async function generatePages() {
  // Apple Pages is an iWork ZIP bundle
  await createZipFixture('sample.pages', {
    'Index/Document.iwa': Buffer.from('Test Pages document stub'),
    'Metadata/BuildVersionHistory.plist': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>com.apple.iWork.Pages</key><string>14.0</string></dict></plist>`,
    'Metadata/Properties.plist': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict></dict></plist>`,
  });
}

// ─── Non-ZIP Document Stubs ─────────────────────────────────────────────

function createFb2(fileName) {
  writeFixture(fileName, `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <author><first-name>Test</first-name><last-name>Author</last-name></author>
      <book-title>Test Book</book-title>
      <lang>en</lang>
    </title-info>
  </description>
  <body>
    <section><title><p>Chapter 1</p></title>
      <p>Test content for FB2 conversion to PDF.</p>
    </section>
  </body>
</FictionBook>`);
}

function createMobi(fileName) {
  // Minimal PDB/PRC header that identifies as MOBI
  const buf = Buffer.alloc(78);
  // Database name (32 bytes, null-padded)
  buf.write('Test Book', 0);
  // Attributes
  buf.writeUInt16BE(0, 32);
  // Version
  buf.writeUInt16BE(0, 34);
  // Creation/modification timestamps
  buf.writeUInt32BE(0, 36);
  buf.writeUInt32BE(0, 40);
  // Last backup
  buf.writeUInt32BE(0, 44);
  // Modification number
  buf.writeUInt32BE(0, 48);
  // App info / sort info
  buf.writeUInt32BE(0, 52);
  buf.writeUInt32BE(0, 56);
  // Type = "BOOK"
  buf.write('BOOK', 60);
  // Creator = "MOBI"
  buf.write('MOBI', 64);
  // Unique ID seed
  buf.writeUInt32BE(1, 68);
  // Next record list
  buf.writeUInt32BE(0, 72);
  // Number of records
  buf.writeUInt16BE(0, 76);
  writeFixture(fileName, buf);
}

function createOle2Stub(fileName) {
  // Minimal OLE2 Compound Binary File header
  // This creates a file that begins with the OLE2 signature
  const buf = Buffer.alloc(512);
  // OLE2 signature (magic bytes)
  const sig = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  sig.copy(buf, 0);
  // Minor version
  buf.writeUInt16LE(0x003E, 24);
  // Major version = 3
  buf.writeUInt16LE(0x0003, 26);
  // Byte order = little-endian
  buf.writeUInt16LE(0xFFFE, 28);
  // Sector size power = 9 (512 bytes)
  buf.writeUInt16LE(0x0009, 30);
  // Mini sector size power = 6 (64 bytes)
  buf.writeUInt16LE(0x0006, 32);
  // Fill rest with 0xFF (free sectors)
  buf.fill(0xFF, 76, 512);
  writeFixture(fileName, buf);
}

// ─── Special PDF Fixtures ───────────────────────────────────────────────

async function createEncryptedPdf(fileName) {
  // pdf-lib doesn't support encryption directly.
  // Try using qpdf if available, otherwise create a stub.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('This document should be encrypted with password: test123', {
    x: 50, y: 700, size: 14, font, color: rgb(0, 0, 0),
  });
  const bytes = await doc.save();
  const tempPath = path.join(FIXTURES, '_temp_encrypt.pdf');
  fs.writeFileSync(tempPath, bytes);

  try {
    execSync(`qpdf --encrypt test123 test123 256 -- "${tempPath}" "${path.join(FIXTURES, fileName)}"`, { stdio: 'pipe' });
    fs.unlinkSync(tempPath);
    console.log(`  Created: ${fileName} (encrypted with qpdf, password: test123)`);
  } catch {
    // qpdf not available - save unencrypted PDF as fallback
    // Tests may fail on decryption but at least the file exists for upload
    fs.renameSync(tempPath, path.join(FIXTURES, fileName));
    console.log(`  Created: ${fileName} (WARNING: not actually encrypted - qpdf not found)`);
  }
}

async function createPdfWithAttachments(fileName) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('PDF with Attachments', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  page.drawText('This PDF contains an embedded file attachment.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  // Attach a text file
  await doc.attach(
    Buffer.from('This is an attached text file for testing.'),
    'attachment.txt',
    { mimeType: 'text/plain', description: 'Test attachment' }
  );

  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

async function createRestrictedPdf(fileName) {
  // Create a basic PDF - true restrictions require encryption
  // This serves as a placeholder fixture
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('Restricted PDF', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  page.drawText('This document has usage restrictions.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  const bytes = await doc.save();
  const tempPath = path.join(FIXTURES, '_temp_restrict.pdf');
  fs.writeFileSync(tempPath, bytes);

  try {
    // Use qpdf with owner password only (no user password) to set restrictions
    execSync(`qpdf --encrypt "" owner123 256 --print=none --modify=none -- "${tempPath}" "${path.join(FIXTURES, fileName)}"`, { stdio: 'pipe' });
    fs.unlinkSync(tempPath);
    console.log(`  Created: ${fileName} (restricted with qpdf)`);
  } catch {
    fs.renameSync(tempPath, path.join(FIXTURES, fileName));
    console.log(`  Created: ${fileName} (WARNING: not actually restricted - qpdf not found)`);
  }
}

async function createPdfWithLayers(fileName) {
  // Create a basic PDF with text mentioning layers
  // True OCG layers are complex - this is a valid PDF for upload testing
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  page.drawText('PDF with Layers', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  page.drawText('Layer 1: Text content', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Layer 2: Annotations', { x: 50, y: 640, size: 12, font, color: rgb(0.5, 0.0, 0.0) });
  page.drawRectangle({ x: 50, y: 500, width: 200, height: 100, color: rgb(0.8, 0.9, 1.0) });
  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

async function createDigitallySignedPdf(fileName) {
  // Create a PDF with a signature field (empty - not actually signed)
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('Digitally Signed Document', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  page.drawText('This document contains a signature field.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

  // Add a text field as placeholder (pdf-lib doesn't support signature fields directly)
  const sigField = form.createTextField('signature');
  sigField.setText('Signed by Test User');
  sigField.addToPage(page, { x: 50, y: 550, width: 250, height: 50 });

  const bytes = await doc.save();
  writeFixture(fileName, Buffer.from(bytes));
}

function createTestCert(fileName) {
  // Try to generate a self-signed PKCS#12 certificate with openssl
  const certPath = path.join(FIXTURES, fileName);
  try {
    const tmpKey = path.join(FIXTURES, '_tmp_key.pem');
    const tmpCert = path.join(FIXTURES, '_tmp_cert.pem');
    execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${tmpKey}" -out "${tmpCert}" -days 365 -nodes -subj "/CN=Test/O=PrivatePDF Test"`, { stdio: 'pipe' });
    execSync(`openssl pkcs12 -export -out "${certPath}" -inkey "${tmpKey}" -in "${tmpCert}" -passout pass:test123`, { stdio: 'pipe' });
    fs.unlinkSync(tmpKey);
    fs.unlinkSync(tmpCert);
    console.log(`  Created: ${fileName} (PKCS#12 cert, password: test123)`);
  } catch {
    // openssl not available - create a minimal stub
    const buf = Buffer.alloc(32);
    buf.writeUInt8(0x30, 0); // ASN.1 SEQUENCE
    buf.writeUInt8(0x80, 1); // indefinite length
    writeFixture(fileName, buf);
    console.log(`  Created: ${fileName} (WARNING: stub only - openssl not found)`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating ALL test fixtures...\n');
  fs.mkdirSync(FIXTURES, { recursive: true });

  // ── Standard PDFs ──
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
    title: 'Metadata Test Document', author: 'Test Author',
    subject: 'Testing metadata editing', keywords: ['test', 'metadata', 'pdf'],
  });
  await createPdf(3, 'annotated.pdf', { title: 'Annotated PDF' });
  await createPdf(2, 'scanned-image.pdf', { title: 'Scanned Document' });
  await createPdf(1, 'corrupted.pdf');

  // ── Special PDFs ──
  console.log('\nSpecial PDF fixtures:');
  await createEncryptedPdf('encrypted.pdf');
  await createPdfWithAttachments('with-attachments.pdf');
  await createRestrictedPdf('restricted.pdf');
  await createPdfWithLayers('with-layers.pdf');
  await createDigitallySignedPdf('digitally-signed.pdf');
  createTestCert('test-cert.p12');

  // ── Text/data fixtures ──
  console.log('\nText/data fixtures:');
  writeFixture('sample.txt', 'Hello, World!\nThis is a test text file for conversion to PDF.\nLine 3.\nLine 4.\nLine 5.');
  writeFixture('sample.csv', 'Name,Age,City\nAlice,30,New York\nBob,25,London\nCharlie,35,Tokyo');
  writeFixture('sample.json', JSON.stringify({ name: 'Test', items: [1, 2, 3], nested: { key: 'value' } }, null, 2));
  writeFixture('sample.xml', '<?xml version="1.0"?>\n<root>\n  <item id="1">First</item>\n  <item id="2">Second</item>\n</root>');
  writeFixture('sample.md', '# Test Markdown\n\n## Section 1\n\nThis is a **bold** and *italic* test.\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("hello");\n```');
  writeFixture('sample.rtf', '{\\rtf1\\ansi{\\fonttbl{\\f0 Times New Roman;}}\\pard\\f0\\fs24 Hello, this is a test RTF document.\\par}');

  // SVG
  writeFixture('sample.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect width="200" height="200" fill="#4F46E5"/>
  <text x="100" y="110" text-anchor="middle" fill="white" font-size="16">Test SVG</text>
</svg>`);

  // Email
  writeFixture('sample.eml', `From: sender@example.com
To: recipient@example.com
Subject: Test Email for PDF Conversion
Date: Thu, 01 Jan 2025 12:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="UTF-8"

This is a test email body for converting to PDF.
It contains multiple lines of text.

Best regards,
Test Sender`);

  // ── Image fixtures ──
  console.log('\nImage fixtures:');
  createJpeg('sample.jpg');
  createPng('sample.png');
  createWebp('sample.webp');
  createBmp('sample.bmp');
  createTiff('sample.tiff');
  createHeic('sample.heic');
  createPsd('sample.psd');

  // ── Office document fixtures (ZIP-based) ──
  console.log('\nOffice document fixtures:');
  await generateDocx();
  await generateXlsx();
  await generatePptx();
  await generateOdt();
  await generateOds();
  await generateOdp();
  await generateOdg();

  // ── Ebook/archive fixtures ──
  console.log('\nEbook/archive fixtures:');
  await generateEpub();
  await generateCbz();
  await generateXps();
  await generatePages();
  createFb2('sample.fb2');
  createMobi('sample.mobi');

  // ── OLE2-based document stubs ──
  console.log('\nOLE2 document stubs:');
  createOle2Stub('sample.wpd');
  createOle2Stub('sample.wps');
  createOle2Stub('sample.pub');
  createOle2Stub('sample.vsd');
  createOle2Stub('sample.msg');

  console.log('\nDone! All fixtures generated.');

  // Verify
  const files = fs.readdirSync(FIXTURES).filter(f => f !== '.gitkeep');
  console.log(`\nTotal fixture files: ${files.length}`);
}

main().catch(console.error);
