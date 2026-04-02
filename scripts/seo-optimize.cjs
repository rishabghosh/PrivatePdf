#!/usr/bin/env node

/**
 * SEO Optimizer Script
 * 
 * Updates all tool page titles, meta descriptions, canonical URLs,
 * and OG tags across all 117+ pages with your brand name and
 * SEO-optimized copy emphasizing the "no upload" angle.
 * 
 * Usage:
 *   node scripts/seo-optimize.js --brand "YourBrand" --domain "yourdomain.com"
 * 
 * What it does:
 *   1. Replaces "BentoPDF" with your brand name in all titles
 *   2. Adds "No Upload" to page titles for SEO
 *   3. Updates canonical URLs to your domain
 *   4. Updates OG meta tags with your domain
 *   5. Adds privacy-focused meta descriptions
 */

const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const brandName = getArg(args, '--brand') || 'PrivatePDF';
const domain = getArg(args, '--domain') || 'yourdomain.com';

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

console.log(`\n🔧 SEO Optimizer`);
console.log(`   Brand: ${brandName}`);
console.log(`   Domain: ${domain}\n`);

// Directories to process
const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const rootDir = path.join(__dirname, '..');

// SEO-optimized titles for top tools (override defaults)
const customTitles = {
  'merge-pdf': `Merge PDF Online Free — No Upload, 100% Private | ${brandName}`,
  'compress-pdf': `Compress PDF Free — Reduce Size Without Uploading | ${brandName}`,
  'split-pdf': `Split PDF Online Free — No Upload Required | ${brandName}`,
  'pdf-to-jpg': `PDF to JPG Converter — No Upload, Files Stay on Device | ${brandName}`,
  'jpg-to-pdf': `JPG to PDF Converter Free — No Upload Required | ${brandName}`,
  'word-to-pdf': `Word to PDF Converter — No Upload, Browser-Based | ${brandName}`,
  'pdf-to-docx': `PDF to Word Converter Free — No Upload, Private | ${brandName}`,
  'edit-pdf': `Edit PDF Online Free — No Upload, 100% Private | ${brandName}`,
  'sign-pdf': `Sign PDF Online Free — No Upload, Draw Your Signature | ${brandName}`,
  'rotate-pdf': `Rotate PDF Online Free — No Upload Required | ${brandName}`,
  'ocr-pdf': `OCR PDF Free — Extract Text Without Uploading | ${brandName}`,
  'encrypt-pdf': `Encrypt PDF Free — Password Protect Without Uploading | ${brandName}`,
  'decrypt-pdf': `Unlock PDF Free — Remove Password Without Uploading | ${brandName}`,
  'pdf-to-png': `PDF to PNG Converter Free — No Upload Required | ${brandName}`,
  'png-to-pdf': `PNG to PDF Converter Free — No Upload, Private | ${brandName}`,
  'excel-to-pdf': `Excel to PDF Converter — No Upload Required | ${brandName}`,
  'pdf-to-excel': `PDF to Excel Converter Free — No Upload | ${brandName}`,
  'powerpoint-to-pdf': `PowerPoint to PDF — No Upload Required | ${brandName}`,
  'image-to-pdf': `Image to PDF Converter — No Upload, Browser-Based | ${brandName}`,
  'organize-pdf': `Organize PDF Pages — Reorder Without Uploading | ${brandName}`,
  'delete-pages': `Delete PDF Pages Free — No Upload Required | ${brandName}`,
  'extract-pages': `Extract PDF Pages Free — No Upload | ${brandName}`,
  'add-watermark': `Add Watermark to PDF — No Upload Required | ${brandName}`,
  'page-numbers': `Add Page Numbers to PDF — No Upload | ${brandName}`,
  'header-footer': `Add Header Footer to PDF — No Upload | ${brandName}`,
  'remove-restrictions': `Remove PDF Restrictions — No Upload | ${brandName}`,
  'pdf-to-text': `PDF to Text Converter — No Upload Required | ${brandName}`,
  'pdf-to-markdown': `PDF to Markdown — No Upload, Private | ${brandName}`,
  'flatten-pdf': `Flatten PDF Free — No Upload Required | ${brandName}`,
  'repair-pdf': `Repair PDF Free — Fix Corrupted PDFs Without Uploading | ${brandName}`,
};

// Custom meta descriptions for top tools
const customDescriptions = {
  'merge-pdf': `Merge PDF files online for free — 100% private, no upload to any server. Combine multiple PDFs into one using ${brandName}. Works in your browser.`,
  'compress-pdf': `Compress PDF files without uploading. Reduce PDF size up to 90% while keeping quality. Free, private, browser-based. ${brandName}.`,
  'split-pdf': `Split PDF pages online for free. Extract specific pages without uploading your file. 100% private and browser-based. ${brandName}.`,
  'pdf-to-jpg': `Convert PDF to JPG images without uploading. Free, private, no account needed. Files never leave your device. ${brandName}.`,
  'edit-pdf': `Edit PDF files online — add text, images, annotations without uploading. 100% browser-based and private. ${brandName}.`,
  'sign-pdf': `Sign PDF documents online for free. Draw or type your signature without uploading files. Private and secure. ${brandName}.`,
  'ocr-pdf': `OCR PDF — extract text from scanned documents without uploading. Runs entirely in your browser using WebAssembly. ${brandName}.`,
};

let filesUpdated = 0;

// Process all HTML files in src/pages/
if (fs.existsSync(pagesDir)) {
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
  
  for (const file of files) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const toolName = file.replace('.html', '');
    let changed = false;

    // 1. Replace brand name in titles
    if (customTitles[toolName]) {
      // Replace the entire <title> content
      content = content.replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${customTitles[toolName]}</title>`
      );
      changed = true;
    } else {
      // Generic replacement: BentoPDF → brandName
      if (content.includes('BentoPDF') || content.includes('bentopdf.com')) {
        content = content.replace(/\| BentoPDF/g, `| ${brandName}`);
        content = content.replace(/BentoPDF/g, brandName);
        changed = true;
      }
    }

    // 2. Update meta descriptions for top tools
    if (customDescriptions[toolName]) {
      content = content.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${customDescriptions[toolName]}" />`
      );
      changed = true;
    }

    // 3. Update canonical URLs
    content = content.replace(
      /href="https:\/\/www\.bentopdf\.com\//g,
      `href="https://${domain}/`
    );

    // 4. Update OG URLs
    content = content.replace(
      /content="https:\/\/www\.bentopdf\.com\//g,
      `content="https://${domain}/`
    );

    // 5. Update og:site_name
    content = content.replace(
      /<meta\s+property="og:site_name"\s+content="[^"]*"\s*\/?>/g,
      `<meta property="og:site_name" content="${brandName}" />`
    );

    // 6. Update author
    content = content.replace(
      /<meta\s+name="author"\s+content="[^"]*"\s*\/?>/g,
      `<meta name="author" content="${brandName}" />`
    );

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf-8');
      filesUpdated++;
    }
  }
}

// Also update root-level HTML files
const rootFiles = ['about.html', 'contact.html', 'faq.html', 'privacy.html', 'terms.html', 'tools.html', 'licensing.html'];
for (const file of rootFiles) {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    content = content.replace(/\| BentoPDF/g, `| ${brandName}`);
    content = content.replace(/BentoPDF/g, brandName);
    content = content.replace(/href="https:\/\/www\.bentopdf\.com\//g, `href="https://${domain}/`);
    content = content.replace(/content="https:\/\/www\.bentopdf\.com\//g, `content="https://${domain}/`);
    fs.writeFileSync(filePath, content, 'utf-8');
    filesUpdated++;
  }
}

console.log(`✅ Updated ${filesUpdated} files`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Review changes: git diff`);
console.log(`   2. Build: VITE_BRAND_NAME="${brandName}" npm run build`);
console.log(`   3. Deploy to Cloudflare/Vercel`);
console.log(`   4. Submit sitemap to Google Search Console\n`);
