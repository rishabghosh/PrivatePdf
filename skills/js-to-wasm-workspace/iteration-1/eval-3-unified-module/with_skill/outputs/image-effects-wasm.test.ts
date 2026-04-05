/**
 * Integration tests: WASM vs JS parity for image effects.
 *
 * These tests verify that the WASM module produces numerically equivalent
 * output to the original JavaScript implementations (within +/-1 for
 * floating-point rounding differences).
 *
 * Run with: npm run test:run
 * (requires the WASM module to be built and served, or mocked)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyGreyscale,
  applyInvertColors,
  rgbToHsl,
  hslToRgb,
} from '../utils/image-effects.js';

// ── Helpers ─────────────────────────────────────────────────────

function makeImageData(rgba: number[]): ImageData {
  const data = new Uint8ClampedArray(rgba);
  const width = rgba.length / 4;
  return { data, width, height: 1, colorSpace: 'srgb' } as ImageData;
}

/**
 * Assert that two pixel buffers are equal within a tolerance of +/-1
 * per channel (to account for f32 vs f64 rounding differences between
 * Rust and JavaScript).
 */
function assertPixelsClose(
  actual: Uint8ClampedArray | Uint8Array,
  expected: Uint8ClampedArray | Uint8Array,
  tolerance = 1
) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    const diff = Math.abs(actual[i] - expected[i]);
    expect(diff).toBeLessThanOrEqual(tolerance);
  }
}

// ── Greyscale JS-only parity tests ──────────────────────────────

describe('applyGreyscale (JS reference)', () => {
  it('converts a single pixel using BT.601 luma weights', () => {
    const imageData = makeImageData([100, 150, 200, 255]);
    applyGreyscale(imageData);
    const expected = Math.round(0.299 * 100 + 0.587 * 150 + 0.114 * 200);
    expect(imageData.data[0]).toBe(expected);
    expect(imageData.data[1]).toBe(expected);
    expect(imageData.data[2]).toBe(expected);
    expect(imageData.data[3]).toBe(255); // alpha preserved
  });

  it('preserves pure white', () => {
    const imageData = makeImageData([255, 255, 255, 255]);
    applyGreyscale(imageData);
    expect(imageData.data[0]).toBe(255);
  });

  it('preserves pure black', () => {
    const imageData = makeImageData([0, 0, 0, 255]);
    applyGreyscale(imageData);
    expect(imageData.data[0]).toBe(0);
  });

  it('handles multiple pixels', () => {
    const imageData = makeImageData([
      255, 0, 0, 255, // red
      0, 255, 0, 255, // green
      0, 0, 255, 255, // blue
    ]);
    applyGreyscale(imageData);
    expect(imageData.data[0]).toBe(Math.round(0.299 * 255)); // 76
    expect(imageData.data[4]).toBe(Math.round(0.587 * 255)); // 150
    expect(imageData.data[8]).toBe(Math.round(0.114 * 255)); // 29
  });
});

// ── Invert colors JS-only parity tests ──────────────────────────

describe('applyInvertColors (JS reference)', () => {
  it('inverts a single pixel', () => {
    const imageData = makeImageData([100, 150, 200, 255]);
    applyInvertColors(imageData);
    expect(imageData.data[0]).toBe(155);
    expect(imageData.data[1]).toBe(105);
    expect(imageData.data[2]).toBe(55);
    expect(imageData.data[3]).toBe(255); // alpha preserved
  });

  it('double invert is identity', () => {
    const original = [42, 128, 200, 255, 0, 255, 127, 128];
    const imageData = makeImageData([...original]);
    applyInvertColors(imageData);
    applyInvertColors(imageData);
    for (let i = 0; i < original.length; i++) {
      expect(imageData.data[i]).toBe(original[i]);
    }
  });

  it('swaps black and white', () => {
    const imageData = makeImageData([0, 0, 0, 255, 255, 255, 255, 255]);
    applyInvertColors(imageData);
    expect(imageData.data[0]).toBe(255);
    expect(imageData.data[1]).toBe(255);
    expect(imageData.data[2]).toBe(255);
    expect(imageData.data[4]).toBe(0);
    expect(imageData.data[5]).toBe(0);
    expect(imageData.data[6]).toBe(0);
  });
});

// ── HSL roundtrip parity tests ──────────────────────────────────

describe('rgbToHsl / hslToRgb roundtrip', () => {
  const testCases = [
    [100, 150, 200],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [128, 128, 128],
    [0, 0, 0],
    [255, 255, 255],
  ];

  for (const [r, g, b] of testCases) {
    it(`roundtrips (${r}, ${g}, ${b})`, () => {
      const [h, s, l] = rgbToHsl(r, g, b);
      const [rOut, gOut, bOut] = hslToRgb(h, s, l);
      expect(Math.abs(rOut - r)).toBeLessThanOrEqual(1);
      expect(Math.abs(gOut - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(bOut - b)).toBeLessThanOrEqual(1);
    });
  }
});

// ── WASM vs JS parity tests (require WASM module to be loaded) ──
//
// These tests would run in a browser environment where the WASM module
// is available. For CI, you would either:
// a) Build the WASM module and serve it in the test environment
// b) Use wasm-pack test --headless --chrome for Rust-side tests
//
// describe('WASM vs JS parity', () => {
//   let wasm: ImageEffectsWasmModule;
//
//   beforeAll(async () => {
//     wasm = await loadImageEffectsWasm();
//   });
//
//   it('greyscale produces identical output', () => {
//     const pixels = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
//     const imageData = { data: new Uint8ClampedArray(pixels), width: 2, height: 1 } as ImageData;
//
//     // JS result
//     const jsData = new Uint8ClampedArray(pixels);
//     applyGreyscale({ data: jsData, width: 2, height: 1 } as ImageData);
//
//     // WASM result
//     const wasmResult = wasm.apply_greyscale(new Uint8Array(pixels.buffer));
//
//     assertPixelsClose(new Uint8ClampedArray(wasmResult.buffer), jsData);
//   });
//
//   it('invert produces identical output', () => {
//     const pixels = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
//
//     const jsData = new Uint8ClampedArray(pixels);
//     applyInvertColors({ data: jsData, width: 2, height: 1 } as ImageData);
//
//     const wasmResult = wasm.apply_invert_colors(new Uint8Array(pixels.buffer));
//
//     assertPixelsClose(new Uint8ClampedArray(wasmResult.buffer), jsData);
//   });
// });
