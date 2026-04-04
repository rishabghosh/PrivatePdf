# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BentoPDF is a privacy-first, 100% client-side PDF toolkit with 117+ tools. Built with vanilla TypeScript + Lit Web Components, bundled with Vite. All PDF processing happens in the browser — no server uploads. Licensed AGPL-3.0 with dual commercial licensing.

## Commands

```bash
# Development
npm run dev              # Vite dev server (localhost:5173, COOP/COEP headers enabled)
npm run build            # Full build: tsc → vite build → i18n pages → sitemap
npm run preview          # Preview dist/ locally
npm run serve            # Build + preview on port 3000

# Testing
npm test                 # Vitest in watch mode
npm run test:run         # Single run
npm run test:coverage    # Coverage report (80% threshold on lines/functions/branches/statements)

# Code quality
npm run lint             # ESLint (flat config, typescript-eslint + prettier)
npm run lint:fix         # Auto-fix
npm run format           # Prettier

# Build variants
npm run build:production # CDN WASM URLs + docs included
SIMPLE_MODE=true npm run build  # Minimal UI for embedded deployments
```

## Architecture

### Multi-Entry Static Site (not a traditional SPA)
Each tool has its own HTML page (`src/pages/{tool}.html`) with dedicated JS (`src/js/logic/{tool}-page.ts`). Vite builds 70+ separate HTML entry points. The `flattenPagesPlugin` in vite.config.ts moves `src/pages/*.html` to the dist root.

### Key Source Paths
- `src/js/main.ts` — Entry point. Initializes i18n, applies translations, registers keyboard shortcuts (lazy-loaded)
- `src/js/config/tools.ts` — All 117 tool definitions with categories, icons, shortcuts
- `src/js/logic/` — Tool page implementations (one file per tool)
- `src/js/utils/` — Shared utilities (device capability, PDF loading, compression, OCR, WASM loaders)
- `src/js/handlers/fileHandler.ts` — File upload pipeline
- `src/js/workflow/` — Visual node-based workflow engine (Rete.js)
- `src/partials/` — Handlebars partials (navbar, footer, head) used across all HTML pages
- `public/workers/` — Web Workers for background processing (merge, extract, etc.)
- `cloudflare/` — Cloudflare Workers (CORS proxy, WASM proxy)
- `scripts/` — Build scripts (i18n generation, sitemap, release versioning)

### Lazy Loading Strategy
Critical to bundle size. `main.ts` intentionally avoids importing `pdfjs-dist`, `lucide`, `qpdf-wasm`, and `helpers.ts` at module level — these are loaded dynamically on demand. The `config/tools.ts` (127 tools) is also lazy-loaded. When adding new imports to main.ts or frequently-loaded modules, use dynamic `import()` to avoid growing the initial bundle.

### Device-Adaptive Rendering
`src/js/utils/device-capability.ts` classifies devices into low/medium/high tiers based on hardware. This drives render scale, batch sizes, WASM preloading decisions, and compression settings throughout the app.

### WASM Module Loading
Three AGPL-licensed WASM modules loaded from jsDelivr CDN at runtime (not bundled):
- **PyMuPDF** — PDF→text/markdown/images
- **Ghostscript** — PDF/A conversion, font-to-outline
- **CPDF (CoherentPDF)** — Advanced merge/split/bookmarks

URLs configured via `VITE_WASM_*` env vars. On low-tier devices, WASM loading is deferred until actually needed.

### i18n
17 languages supported. `scripts/generate-i18n-pages.mjs` generates per-language copies of all HTML pages at build time. A custom Vite plugin (`language-router`) handles `/en/`, `/fr/`, etc. URL prefixes in dev and preview.

### Custom Vite Plugins (vite.config.ts)
- `language-router` — Language-prefixed URL routing + CORS proxy middleware
- `flatten-pages` — Moves `src/pages/` HTML to dist root
- `rewrite-html-paths` — Rewrites paths when deployed under a subdirectory (BASE_URL)

### Path Aliases
- `@/*` → `./src/*`
- `@/types` → `./src/js/types/index.ts`

### Required Browser Headers
Dev and preview servers set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` — required for SharedArrayBuffer (used by WASM modules and Web Workers).

## Testing

Tests use Vitest with jsdom environment. Setup file at `src/tests/setup.ts` mocks `DOMMatrix`, `ResizeObserver`, `matchMedia`, and `IntersectionObserver`. Test files go in `src/**/*.{test,spec}.{js,ts}`.

## Environment Variables

Copy `.env.example` to `.env.production`. Key variables:
- `VITE_WASM_PYMUPDF_URL`, `VITE_WASM_GS_URL`, `VITE_WASM_CPDF_URL` — WASM module CDN URLs
- `VITE_CORS_PROXY_URL` / `VITE_CORS_PROXY_SECRET` — Digital signature certificate proxy
- `VITE_BRAND_NAME`, `VITE_BRAND_LOGO`, `VITE_FOOTER_TEXT` — White-label branding
- `SIMPLE_MODE=true` — Minimal embedded UI (replaces index.html with simple-index.html)
- `BASE_URL` — Subdirectory deployment path
- `DISABLE_TOOLS` — Comma-separated tool IDs to hide at build time

## Deployment

Primary target is Cloudflare Pages (`wrangler.jsonc` at root). Also supports Docker (Node 20 Alpine multi-stage), GitHub Pages, Netlify, and Vercel. Build outputs static files to `dist/`. The build requires `NODE_OPTIONS='--max-old-space-size=4096'` due to the large number of entry points.
