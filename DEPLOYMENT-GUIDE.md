# Deployment Guide — Cloudflare Pages & Vercel

## Option A: Cloudflare Pages (Recommended)

Cloudflare Pages offers free unlimited bandwidth, a global CDN, free SSL, and excellent
performance — ideal for a static site like this.

### Step 1: Push to GitHub

```bash
# Fork BentoPDF on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/your-pdf-tools.git
cd your-pdf-tools

# Copy your customized files over the fork
# (index.html, LICENSE-ATTRIBUTION.md, etc.)

git add .
git commit -m "Custom landing page + branding"
git push origin main
```

### Step 2: Connect to Cloudflare Pages

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create**
2. Select **Pages** → **Connect to Git**
3. Authorize Cloudflare to access your GitHub account
4. Select your repository
5. Configure build settings:

| Setting | Value |
|---------|-------|
| **Framework preset** | None |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (default) |
| **Node.js version** | `22` |

6. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_BRAND_NAME` | `YourBrandName` |
| `VITE_FOOTER_TEXT` | `Your files never leave your device` |
| `NODE_VERSION` | `22` |

7. Click **Save and Deploy**

### Step 3: Custom Domain (Optional but Recommended)

1. Buy a domain (Cloudflare Registrar, Namecheap, or GoDaddy)
   - Suggestions: `privatepdf.in`, `localpdf.tools`, `securepdf.io`, `pdfprivacy.com`
2. In Cloudflare Pages → Your project → **Custom domains**
3. Add your domain → Cloudflare auto-configures DNS and SSL
4. SSL is automatic and free — no configuration needed

### Step 4: Important Cloudflare Settings

Go to your Cloudflare dashboard for the domain:

**Speed → Optimization:**
- Enable Auto Minify (HTML, CSS, JS)
- Enable Brotli compression
- Enable Early Hints
- Enable HTTP/3

**Caching:**
- Set Browser Cache TTL to 1 month for static assets
- Wasm files are large (5-15MB each) — they benefit hugely from caching

**Security Headers (for SharedArrayBuffer — needed for LibreOffice Wasm):**

BentoPDF already includes an nginx.conf with these headers. For Cloudflare Pages,
create a `_headers` file in your `public/` directory:

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
```

Or create a `public/_headers` file and the build will copy it to `dist/`.

### Auto-Deploy on Push

Once connected, every `git push` to `main` triggers an automatic build and deploy.
Typical build time: 2-4 minutes.

---

## Option B: Vercel

### Step 1: Connect Repository

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

4. Add the same environment variables as above
5. Click **Deploy**

### Step 2: Custom Domain

1. Go to your project → **Settings** → **Domains**
2. Add your domain
3. Update DNS records as instructed (or use Vercel's nameservers)

### Step 3: Headers for SharedArrayBuffer

Create a `vercel.json` in your project root:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

### Vercel Limitations (Free Tier)
- 100GB bandwidth/month (usually enough for early stage)
- Serverless function limits (not relevant since everything is static)
- Commercial use allowed on free tier

---

## Option C: GitHub Pages (Free, No Third Party)

1. In your fork: **Settings** → **Pages** → Source: **GitHub Actions**
2. **Settings** → **Secrets** → **Variables** → Add `BASE_URL` = `/your-repo-name`
3. Add environment variables for branding in the workflow file
4. **Actions** → Enable → Run "Deploy static content to Pages"
5. Site live at: `https://YOUR_USERNAME.github.io/your-repo-name`

**Limitation**: GitHub Pages doesn't support custom headers (COOP/COEP),
so LibreOffice Wasm (Office-to-PDF conversion) won't work. All other tools work fine.

---

## Post-Deployment Checklist

After deploying to any platform:

- [ ] Visit your site and test 3-4 tools (merge, compress, split, PDF to JPG)
- [ ] Open DevTools → Network tab → verify NO outgoing requests with your PDF data
- [ ] Test on mobile (responsive design)
- [ ] Run Google PageSpeed Insights → target 90+ score
- [ ] Submit sitemap to Google Search Console: `https://yourdomain.com/sitemap.xml`
- [ ] Submit to Bing Webmaster Tools
- [ ] Test the PWA install prompt (should appear in Chrome address bar)
- [ ] Verify COOP/COEP headers (check in DevTools → Network → response headers)

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BRAND_NAME` | No | Custom brand name (replaces "BentoPDF" everywhere) |
| `VITE_BRAND_LOGO` | No | Path to custom logo SVG/PNG |
| `VITE_FOOTER_TEXT` | No | Custom footer text |
| `VITE_USE_CDN` | No | Set to `true` to load Wasm from jsDelivr CDN |
| `SIMPLE_MODE` | No | Set to `true` for lightweight UI |
| `BASE_URL` | No | Subdirectory path (e.g., `/pdf/`) |
| `DISABLE_TOOLS` | No | Comma-separated list of tools to hide |
| `NODE_VERSION` | Yes | Set to `22` for Cloudflare/Vercel |

---

## Estimated Monthly Costs

| Platform | Hosting | Domain | SSL | Total |
|----------|---------|--------|-----|-------|
| Cloudflare Pages | ₹0 (unlimited) | ₹50/mo (~₹600/yr) | ₹0 (auto) | **₹50/mo** |
| Vercel | ₹0 (100GB/mo) | ₹50/mo | ₹0 (auto) | **₹50/mo** |
| GitHub Pages | ₹0 (100GB/mo) | ₹50/mo | ₹0 (auto) | **₹50/mo** |

All three options cost essentially nothing. Choose Cloudflare for the best performance
and unlimited bandwidth.
