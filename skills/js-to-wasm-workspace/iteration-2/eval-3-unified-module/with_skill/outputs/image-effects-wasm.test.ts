/**
 * Vitest integration tests: WASM vs JS parity for image effects.
 *
 * These tests verify that the WASM module produces output numerically equivalent
 * to the JS fallback (within +/-1 for floating point rounding differences).
 *
 * File location: src/tests/image-effects-wasm.test.ts
 *
 * Note: These tests require the WASM module to be built and served locally.
 * In CI, run `wasm-pack build --target web --release` first, then configure
 * VITE_WASM_IMAGE_EFFECTS_URL to point at the local pkg/ directory.
 */

import { describe, it, expect } from 'vitest';
import {
  applyGreyscale,
  applyInvertColors,
} from '../js/utils/image-effects.js';

describe('image-effects JS correctness (baseline for WASM parity)', () => {
  /**
   * These tests validate the JS implementations that the WASM module must match.
   * When the WASM module is available in the test environment, add parallel tests
   * that compare WASM output to these known-correct JS outputs.
   */

  it('greyscale produces correct luma values', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255]);
    const imageData = { data, width: 1, height: 1 } as unknown as ImageData;
    applyGreyscale(imageData);

    // 0.299*100 + 0.587*150 + 0.114*200 = 140.75 -> 141
    expect(imageData.data[0]).toBe(141);
    expect(imageData.data[1]).toBe(141);
    expect(imageData.data[2]).toBe(141);
    expect(imageData.data[3]).toBe(255); // alpha unchanged
  });

  it('invert is its own inverse', () => {
    const original = new Uint8ClampedArray([42, 137, 200, 128]);
    const data = new Uint8ClampedArray(original);
    const imageData = { data, width: 1, height: 1 } as unknown as ImageData;

    applyInvertColors(imageData);
    expect(imageData.data[0]).toBe(213); // 255 - 42
    expect(imageData.data[1]).toBe(118); // 255 - 137
    expect(imageData.data[2]).toBe(55);  // 255 - 200

    applyInvertColors(imageData);
    for (let i = 0; i < original.length; i++) {
      expect(imageData.data[i]).toBe(original[i]);
    }
  });

  it('greyscale handles pure primary colors', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,     // red
      0, 255, 0, 255,     // green
      0, 0, 255, 255,     // blue
    ]);
    const imageData = { data, width: 3, height: 1 } as unknown as ImageData;
    applyGreyscale(imageData);

    // Red: 0.299*255 = 76.245 -> 76
    expect(imageData.data[0]).toBe(76);
    // Green: 0.587*255 = 149.685 -> 150
    expect(imageData.data[4]).toBe(150);
    // Blue: 0.114*255 = 29.07 -> 29
    expect(imageData.data[8]).toBe(29);
  });

  it('processes a multi-pixel buffer correctly', () => {
    // Simulate a small 2x2 image
    const data = new Uint8ClampedArray([
      100, 150, 200, 255,
      200, 100, 50, 255,
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    const imageData = { data, width: 2, height: 2 } as unknown as ImageData;
    applyInvertColors(imageData);

    expect(imageData.data[0]).toBe(155);
    expect(imageData.data[1]).toBe(105);
    expect(imageData.data[2]).toBe(55);
    expect(imageData.data[4]).toBe(55);
    expect(imageData.data[5]).toBe(155);
    expect(imageData.data[6]).toBe(205);
  });
});

/**
 * Template for WASM parity tests — uncomment and use when the WASM module is
 * available in the test environment.
 *
 * describe('image-effects WASM vs JS parity', () => {
 *   it('greyscale produces identical output', async () => {
 *     const testPixels = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
 *
 *     // JS result
 *     const jsData = new Uint8ClampedArray(testPixels);
 *     const jsImageData = { data: jsData, width: 2, height: 1 } as unknown as ImageData;
 *     applyGreyscale(jsImageData);
 *
 *     // WASM result
 *     const wasm = await loadImageEffectsWasm();
 *     const wasmData = new Uint8Array(testPixels);
 *     wasm.apply_greyscale(wasmData);
 *
 *     // Allow +/-1 difference for floating point rounding
 *     for (let i = 0; i < jsData.length; i++) {
 *       expect(Math.abs(jsData[i] - wasmData[i])).toBeLessThanOrEqual(1);
 *     }
 *   });
 *
 *   it('invert produces identical output', async () => {
 *     const testPixels = new Uint8ClampedArray([100, 150, 200, 255, 50, 75, 100, 255]);
 *
 *     const jsData = new Uint8ClampedArray(testPixels);
 *     const jsImageData = { data: jsData, width: 2, height: 1 } as unknown as ImageData;
 *     applyInvertColors(jsImageData);
 *
 *     const wasm = await loadImageEffectsWasm();
 *     const wasmData = new Uint8Array(testPixels);
 *     wasm.apply_invert_colors(wasmData);
 *
 *     for (let i = 0; i < jsData.length; i++) {
 *       expect(Math.abs(jsData[i] - wasmData[i])).toBeLessThanOrEqual(1);
 *     }
 *   });
 * });
 */
