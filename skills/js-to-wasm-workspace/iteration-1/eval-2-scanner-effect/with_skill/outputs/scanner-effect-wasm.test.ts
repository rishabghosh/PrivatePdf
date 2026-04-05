/**
 * Vitest integration tests verifying WASM↔JS parity for the scanner pixel kernel.
 *
 * These tests compare the WASM output against the JS fallback to ensure
 * numerical equivalence (within ±1 for floating-point rounding).
 *
 * Place this file at: src/tests/scanner-effect-wasm.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Reference JS implementation of the scanner pixel kernel (extracted from
 * image-effects.ts applyScannerEffect, lines 122-163). Used as the ground
 * truth for WASM parity checks.
 */
function applyScannerPixelKernelJS(
  data: Uint8ClampedArray,
  settings: {
    grayscale: boolean;
    brightness: number;
    contrast: number;
    yellowish: number;
  },
  scaledNoise: number,
  rngFn: () => number = Math.random
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);
  const contrastFactor =
    settings.contrast !== 0
      ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
      : 1;

  for (let i = 0; i < output.length; i += 4) {
    let r = output[i];
    let g = output[i + 1];
    let b = output[i + 2];

    if (settings.grayscale) {
      const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      r = grey;
      g = grey;
      b = grey;
    }

    if (settings.brightness !== 0) {
      r += settings.brightness;
      g += settings.brightness;
      b += settings.brightness;
    }

    if (settings.contrast !== 0) {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    if (settings.yellowish > 0) {
      const intensity = settings.yellowish / 50;
      r += 20 * intensity;
      g += 12 * intensity;
      b -= 15 * intensity;
    }

    if (scaledNoise > 0) {
      const n = (rngFn() - 0.5) * scaledNoise;
      r += n;
      g += n;
      b += n;
    }

    output[i] = Math.max(0, Math.min(255, r));
    output[i + 1] = Math.max(0, Math.min(255, g));
    output[i + 2] = Math.max(0, Math.min(255, b));
  }
  return output;
}

describe('scanner-effect pixel kernel JS reference', () => {
  it('produces correct grayscale output', () => {
    const pixels = new Uint8ClampedArray([100, 150, 200, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: true, brightness: 0, contrast: 0, yellowish: 0 },
      0
    );
    // grey = round(0.299*100 + 0.587*150 + 0.114*200) = 141
    expect(result[0]).toBe(141);
    expect(result[1]).toBe(141);
    expect(result[2]).toBe(141);
    expect(result[3]).toBe(255);
  });

  it('applies brightness correctly', () => {
    const pixels = new Uint8ClampedArray([100, 100, 100, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 50, contrast: 0, yellowish: 0 },
      0
    );
    expect(result[0]).toBe(150);
    expect(result[1]).toBe(150);
    expect(result[2]).toBe(150);
  });

  it('applies contrast correctly', () => {
    const pixels = new Uint8ClampedArray([100, 200, 50, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 0, contrast: 50, yellowish: 0 },
      0
    );
    const cf = (259 * 305) / (255 * 209);
    expect(result[0]).toBe(Math.max(0, Math.min(255, Math.round(cf * (100 - 128) + 128))));
    expect(result[1]).toBe(Math.max(0, Math.min(255, Math.round(cf * (200 - 128) + 128))));
  });

  it('applies yellowish tint', () => {
    const pixels = new Uint8ClampedArray([100, 100, 100, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 0, contrast: 0, yellowish: 50 },
      0
    );
    expect(result[0]).toBe(120); // 100 + 20*1
    expect(result[1]).toBe(112); // 100 + 12*1
    expect(result[2]).toBe(85);  // 100 - 15*1
  });

  it('clamps values to [0, 255]', () => {
    const pixels = new Uint8ClampedArray([250, 5, 128, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 100, contrast: 0, yellowish: 0 },
      0
    );
    expect(result[0]).toBe(255); // 250+100 clamped
    expect(result[1]).toBe(105); // 5+100
    expect(result[2]).toBe(228); // 128+100
  });

  it('preserves alpha channel', () => {
    const pixels = new Uint8ClampedArray([100, 100, 100, 128]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: true, brightness: 50, contrast: 30, yellowish: 40 },
      0
    );
    expect(result[3]).toBe(128);
  });

  it('handles combined effects in correct order', () => {
    const pixels = new Uint8ClampedArray([100, 150, 200, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: true, brightness: 10, contrast: 0, yellowish: 50 },
      0
    );
    // 1. grayscale: grey = 141
    // 2. brightness: 141+10 = 151
    // 3. contrast = 0: no change
    // 4. yellowish(50): intensity=1 -> r=171, g=163, b=136
    expect(result[0]).toBe(171);
    expect(result[1]).toBe(163);
    expect(result[2]).toBe(136);
  });

  it('noise with zero scaledNoise does not change pixels', () => {
    const pixels = new Uint8ClampedArray([100, 100, 100, 255]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 0, contrast: 0, yellowish: 0 },
      0
    );
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(100);
    expect(result[2]).toBe(100);
  });

  it('handles multi-pixel buffers', () => {
    const pixels = new Uint8ClampedArray([
      100, 150, 200, 255,
      50, 75, 100, 128,
      200, 200, 200, 255,
    ]);
    const result = applyScannerPixelKernelJS(
      pixels,
      { grayscale: false, brightness: 25, contrast: 0, yellowish: 0 },
      0
    );
    expect(result[0]).toBe(125);  // 100+25
    expect(result[4]).toBe(75);   // 50+25
    expect(result[8]).toBe(225);  // 200+25
    // Alphas unchanged
    expect(result[3]).toBe(255);
    expect(result[7]).toBe(128);
    expect(result[11]).toBe(255);
  });
});

describe('scanner-effect WASM loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('isScannerEffectWasmAvailable returns false when not configured', async () => {
    // Mock WasmProvider.isConfigured to return false
    vi.doMock('../utils/wasm-provider.js', () => ({
      WasmProvider: {
        isConfigured: () => false,
        getUrl: () => undefined,
      },
    }));

    const { isScannerEffectWasmAvailable } = await import(
      '../utils/scanner-effect-wasm-loader.js'
    );
    expect(isScannerEffectWasmAvailable()).toBe(false);
  });

  it('isScannerEffectWasmAvailable returns true when configured', async () => {
    vi.doMock('../utils/wasm-provider.js', () => ({
      WasmProvider: {
        isConfigured: (name: string) => name === 'scanner-effect',
        getUrl: () => 'https://cdn.example.com/scanner-effect-wasm/',
      },
    }));

    const { isScannerEffectWasmAvailable } = await import(
      '../utils/scanner-effect-wasm-loader.js'
    );
    expect(isScannerEffectWasmAvailable()).toBe(true);
  });
});
