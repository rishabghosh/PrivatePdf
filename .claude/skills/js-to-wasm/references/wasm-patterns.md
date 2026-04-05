# BentoPDF WASM Architecture Reference

This documents the existing WASM integration patterns in BentoPDF. New WASM modules
should follow these patterns for consistency.

## Table of Contents

1. [Module Registry](#module-registry)
2. [WasmProvider Configuration](#wasmprovider-configuration)
3. [Loader Pattern](#loader-pattern)
4. [Device-Adaptive Loading](#device-adaptive-loading)
5. [Web Worker Integration](#web-worker-integration)
6. [Build & Deployment](#build--deployment)

---

## Module Registry

BentoPDF has three existing WASM modules:

| Module | Package | Purpose | Loading Pattern |
|--------|---------|---------|-----------------|
| PyMuPDF | `@bentopdf/pymupdf-wasm@0.11.16` | PDF→text/markdown/images, compression, format conversion | Dynamic `import()` of ES module |
| Ghostscript | `@bentopdf/gs-wasm` | PDF/A conversion, font-to-outline | Emscripten module + `locateFile()` |
| CPDF | `coherentpdf` | Merge/split/bookmarks/metadata | Script tag injection (`importScripts` in workers) |

All are loaded from jsDelivr CDN at runtime, never bundled.

## WasmProvider Configuration

**File:** `src/js/utils/wasm-provider.ts`

Central config manager. Handles:
- Reading `VITE_WASM_*` env vars with CDN fallbacks
- User overrides via localStorage (`bentopdf:wasm-providers` key)
- URL validation (10s timeout, CORS checks, content-type verification)

### Adding a new module

1. Add to `WasmPackage` type union:
```typescript
export type WasmPackage = 'pymupdf' | 'ghostscript' | 'cpdf' | 'your-module';
```

2. Add CDN default:
```typescript
const CDN_DEFAULTS: Record<WasmPackage, string> = {
  // ...existing...
  'your-module': 'https://cdn.jsdelivr.net/npm/@bentopdf/your-module-wasm/',
};
```

3. Add env var mapping:
```typescript
const ENV_DEFAULTS: Record<WasmPackage, string> = {
  // ...existing...
  'your-module': envOrDefault(import.meta.env.VITE_WASM_YOUR_MODULE_URL, CDN_DEFAULTS['your-module']),
};
```

### Key API

```typescript
WasmProvider.getUrl(packageName: WasmPackage): string | undefined
WasmProvider.setUrl(packageName: WasmPackage, url: string): void
WasmProvider.removeUrl(packageName: WasmPackage): void
WasmProvider.isConfigured(packageName: WasmPackage): boolean
WasmProvider.validateUrl(packageName: WasmPackage, url: string): Promise<{valid, message}>
```

## Loader Pattern

Each module has a dedicated loader in `src/js/utils/`. The pattern:

```typescript
// 1. Cached instance + deduplication promise
let cachedModule: ModuleType | null = null;
let loadPromise: Promise<ModuleType> | null = null;

// 2. Async loader with cache-first strategy
export async function loadModule(): Promise<ModuleType> {
  if (cachedModule) return cachedModule;       // Already loaded
  if (loadPromise) return loadPromise;          // Loading in progress — share promise

  loadPromise = (async () => {
    // 3. Check configuration
    if (!WasmProvider.isConfigured('module-name')) {
      throw new Error('Module not configured.');
    }

    // 4. Dynamic import from CDN URL
    const url = WasmProvider.getUrl('module-name')!;
    const module = await import(/* @vite-ignore */ `${url}dist/index.js`);

    // 5. Initialize (module-specific)
    cachedModule = new module.Constructor({ assetPath: `${url}assets/` });
    await cachedModule.load();

    return cachedModule;
  })();

  return loadPromise;
}

// 6. Availability check (no loading)
export function isModuleAvailable(): boolean {
  return WasmProvider.isConfigured('module-name');
}

// 7. Cache clearing (for settings page)
export function clearModuleCache(): void {
  cachedModule = null;
  loadPromise = null;
}
```

### Real examples

- **PyMuPDF** (`pymupdf-loader.ts`): Uses `import()` → `new module.PyMuPDF({assetPath, ghostscriptUrl})` → `.load()`
- **Ghostscript** (`ghostscript-loader.ts`): Fetches `gs.js`, uses Emscripten `locateFile()` for `.wasm`
- **CPDF** (`cpdf-helper.ts`): Injects `<script>` tag, accesses `window.coherentpdf` global

For new Rust/wasm-pack modules, the PyMuPDF pattern (dynamic `import()` of ES module) is the
closest match, since wasm-pack produces an ES module with an `init()` default export.

## Device-Adaptive Loading

**File:** `src/js/utils/device-capability.ts`

Devices classified into `low` / `medium` / `high` tiers based on:
- `navigator.hardwareConcurrency`
- `navigator.deviceMemory`
- `navigator.connection.effectiveType`

WASM behavior per tier:

| Tier | `preloadOnIdle` | `deferUntilUse` | Strategy |
|------|-----------------|-----------------|----------|
| High | `true` | `false` | Preload during idle via `requestIdleCallback` |
| Medium | `false` | `true` | Load on first use, cache |
| Low | `false` | `true` | Load on use; consider JS fallback for large modules |

**File:** `src/js/utils/wasm-preloader.ts`

Background preloader for high-tier devices. Uses `requestIdleCallback` with 5s timeout.
Add new modules to the preload sequence here.

## Web Worker Integration

Workers receive WASM URLs via `postMessage` from the main thread (since workers can't
access `import.meta.env` or `WasmProvider`).

**Pattern (from `merge.worker.js`):**
```javascript
// Main thread
worker.postMessage({ command: 'process', wasmUrl: WasmProvider.getUrl('module') });

// Worker
self.onmessage = async function(e) {
  const { command, wasmUrl } = e.data;
  if (!loaded) {
    self.importScripts(wasmUrl);  // For script-based modules
    // OR: const mod = await import(wasmUrl + 'index.js');  // For ES modules
  }
  // ... process
};
```

For wasm-pack modules in workers, use dynamic `import()` (workers support ES modules
in modern browsers) rather than `importScripts`.

## Build & Deployment

- WASM files are NOT bundled in dist/ — loaded from CDN at runtime
- `optimizeDeps.exclude` in `vite.config.ts` prevents Vite from trying to bundle WASM packages
- Dev/preview servers set COOP/COEP headers (required for `SharedArrayBuffer` used by some WASM modules)
- Add new WASM package names to `optimizeDeps.exclude` in `vite.config.ts`
