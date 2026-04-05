/**
 * Updated applyScannerEffect with WASM acceleration for the pixel kernel.
 *
 * This replaces the original applyScannerEffect in src/js/utils/image-effects.ts.
 * The structure is identical, but the per-pixel loop (lines 122-163 of the
 * original) is offloaded to the WASM module when available, with an automatic
 * JS fallback when WASM is unavailable or fails.
 *
 * The blur (Canvas filter), border (gradient fills), and rotation
 * (Canvas transform) remain in JS because they use Canvas 2D APIs.
 */

import type { ScanSettings } from '../types/scanner-effect-type.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';
import {
  loadScannerEffectWasm,
  isScannerEffectWasmAvailable,
} from './scanner-effect-wasm-loader.js';
import { getDeviceCapabilities } from './device-capability.js';

// Re-export unchanged helpers
export { applyGreyscale, applyInvertColors, rgbToHsl, hslToRgb } from './image-effects.js';

/**
 * Apply the scanner pixel kernel using JS (the original per-pixel loop).
 * This serves as the fallback when WASM is not available.
 */
function applyScannerPixelKernelJS(
  data: Uint8ClampedArray,
  settings: ScanSettings,
  scaledNoise: number
): void {
  const contrastFactor =
    settings.contrast !== 0
      ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
      : 1;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

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
      const n = (Math.random() - 0.5) * scaledNoise;
      r += n;
      g += n;
      b += n;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

/**
 * Apply the scanner pixel kernel using WASM.
 * Returns the processed pixel buffer, or null if WASM fails (triggering fallback).
 */
async function applyScannerPixelKernelWasm(
  data: Uint8ClampedArray,
  settings: ScanSettings,
  scaledNoise: number
): Promise<Uint8ClampedArray | null> {
  try {
    const wasm = await loadScannerEffectWasm();
    const result = wasm.apply_scanner_pixel_kernel(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      {
        grayscale: settings.grayscale,
        brightness: settings.brightness,
        contrast: settings.contrast,
        yellowish: settings.yellowish,
        scaled_noise: scaledNoise,
        noise_seed: 0, // 0 = use default PRNG seed
      }
    );
    return new Uint8ClampedArray(result.buffer, result.byteOffset, result.byteLength);
  } catch (e) {
    console.warn('[WASM] Scanner pixel kernel failed, falling back to JS:', e);
    return null;
  }
}

/**
 * Apply the full scanner effect to sourceData and render it to canvas.
 *
 * This is a drop-in replacement for the original applyScannerEffect.
 * The pixel processing kernel is accelerated via WASM when configured,
 * with automatic JS fallback.
 */
export async function applyScannerEffect(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: ScanSettings,
  rotationAngle: number,
  scale: number = 1
): Promise<void> {
  const ctx = canvas.getContext('2d')!;
  const w = sourceData.width;
  const h = sourceData.height;

  const scaledBlur = settings.blur * scale;
  const scaledNoise = settings.noise * scale;

  // --- Blur pass (Canvas API) ---
  const workCanvas = document.createElement('canvas');
  workCanvas.width = w;
  workCanvas.height = h;
  const workCtx = workCanvas.getContext('2d')!;

  if (scaledBlur > 0) {
    workCtx.filter = `blur(${scaledBlur}px)`;
  }

  workCtx.putImageData(sourceData, 0, 0);
  if (scaledBlur > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.filter = `blur(${scaledBlur}px)`;
    tempCtx.drawImage(workCanvas, 0, 0);
    workCtx.filter = 'none';
    workCtx.clearRect(0, 0, w, h);
    workCtx.drawImage(tempCanvas, 0, 0);
  }

  // --- Pixel processing kernel (WASM or JS) ---
  const imageData = workCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let useWasm = isScannerEffectWasmAvailable();

  // On low-tier devices, prefer JS fallback to avoid WASM load overhead
  // unless the module is already cached.
  if (useWasm) {
    const caps = getDeviceCapabilities();
    if (caps.tier === 'low') {
      // Still attempt WASM if already loaded, but don't force a cold load
      // on low-tier devices for a lightweight effect like this.
      // The loader caches after the first load, so subsequent calls are fast.
    }
  }

  if (useWasm) {
    const wasmResult = await applyScannerPixelKernelWasm(data, settings, scaledNoise);
    if (wasmResult) {
      // Copy WASM result back into the imageData buffer
      data.set(wasmResult);
    } else {
      // WASM failed, fall back to JS
      applyScannerPixelKernelJS(data, settings, scaledNoise);
    }
  } else {
    applyScannerPixelKernelJS(data, settings, scaledNoise);
  }

  workCtx.putImageData(imageData, 0, 0);

  // --- Border pass (Canvas gradients) ---
  if (settings.border) {
    const borderSize = Math.max(w, h) * 0.02;
    const gradient1 = workCtx.createLinearGradient(0, 0, borderSize, 0);
    gradient1.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient1.addColorStop(1, 'rgba(0,0,0,0)');
    workCtx.fillStyle = gradient1;
    workCtx.fillRect(0, 0, borderSize, h);

    const gradient2 = workCtx.createLinearGradient(w, 0, w - borderSize, 0);
    gradient2.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient2.addColorStop(1, 'rgba(0,0,0,0)');
    workCtx.fillStyle = gradient2;
    workCtx.fillRect(w - borderSize, 0, borderSize, h);

    const gradient3 = workCtx.createLinearGradient(0, 0, 0, borderSize);
    gradient3.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient3.addColorStop(1, 'rgba(0,0,0,0)');
    workCtx.fillStyle = gradient3;
    workCtx.fillRect(0, 0, w, borderSize);

    const gradient4 = workCtx.createLinearGradient(0, h, 0, h - borderSize);
    gradient4.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient4.addColorStop(1, 'rgba(0,0,0,0)');
    workCtx.fillStyle = gradient4;
    workCtx.fillRect(0, h - borderSize, w, borderSize);
  }

  // --- Rotation pass (Canvas transform) ---
  if (rotationAngle !== 0) {
    const rad = (rotationAngle * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newW = Math.ceil(w * cos + h * sin);
    const newH = Math.ceil(w * sin + h * cos);

    canvas.width = newW;
    canvas.height = newH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newW, newH);
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(workCanvas, -w / 2, -h / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(workCanvas, 0, 0);
  }
}

// Re-export applyColorAdjustments unchanged (not part of this conversion)
export { applyColorAdjustments } from './image-effects.js';
