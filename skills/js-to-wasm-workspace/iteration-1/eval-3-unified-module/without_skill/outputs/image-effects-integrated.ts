/**
 * image-effects-integrated.ts
 *
 * Drop-in replacement for `src/js/utils/image-effects.ts` that delegates
 * pixel-level work to the `bentopdf-image-effects` WASM module when it is
 * available, and falls back to the original pure-JS implementations when it
 * is not (e.g. WASM failed to load or the device doesn't support it).
 *
 * Every public function preserves the exact same signature, so call-sites
 * (`scanner-effect-page.ts`, `adjust-colors-page.ts`, workflow nodes, etc.)
 * need zero changes.
 */

import type { ScanSettings } from '../types/scanner-effect-type.js';
import type { AdjustColorsSettings } from '../types/adjust-colors-type.js';
import {
  loadImageEffectsWasm,
  isImageEffectsWasmLoaded,
  type ImageEffectsWasm,
} from './image-effects-wasm-loader.js';

// ---------------------------------------------------------------------------
// Eager (but non-blocking) preload — kicks off the fetch as soon as this
// module is first imported. The rest of the code never `await`s this at the
// top level, so it cannot block rendering.
// ---------------------------------------------------------------------------
let wasmInstance: ImageEffectsWasm | null = null;

loadImageEffectsWasm()
  .then((instance) => {
    wasmInstance = instance;
  })
  .catch((err) => {
    console.warn(
      '[image-effects] WASM module unavailable, using JS fallback:',
      err,
    );
  });

// ---------------------------------------------------------------------------
// Pure-JS fallbacks (original implementations, kept for resilience)
// ---------------------------------------------------------------------------

function jsGreyscale(data: Uint8ClampedArray): void {
  for (let j = 0; j < data.length; j += 4) {
    const grey = Math.round(
      0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2],
    );
    data[j] = grey;
    data[j + 1] = grey;
    data[j + 2] = grey;
  }
}

function jsInvertColors(data: Uint8ClampedArray): void {
  for (let j = 0; j < data.length; j += 4) {
    data[j] = 255 - data[j];
    data[j + 1] = 255 - data[j + 1];
    data[j + 2] = 255 - data[j + 2];
  }
}

// ---------------------------------------------------------------------------
// Public API — signature-compatible with the originals
// ---------------------------------------------------------------------------

export function applyGreyscale(imageData: ImageData): void {
  if (wasmInstance) {
    // WASM mutates the buffer in-place via shared memory view.
    const view = new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength,
    );
    wasmInstance.apply_greyscale(view);
  } else {
    jsGreyscale(imageData.data);
  }
}

export function applyInvertColors(imageData: ImageData): void {
  if (wasmInstance) {
    const view = new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength,
    );
    wasmInstance.apply_invert_colors(view);
  } else {
    jsInvertColors(imageData.data);
  }
}

// ---------------------------------------------------------------------------
// RGB <-> HSL helpers (unchanged — these are called individually by other
// code, not on bulk pixel buffers, so WASM wouldn't help)
// ---------------------------------------------------------------------------

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [h, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// ---------------------------------------------------------------------------
// Scanner effect — canvas ops stay in JS, pixel loop delegates to WASM
// ---------------------------------------------------------------------------

export function applyScannerEffect(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: ScanSettings,
  rotationAngle: number,
  scale: number = 1,
): void {
  const ctx = canvas.getContext('2d')!;
  const w = sourceData.width;
  const h = sourceData.height;

  const scaledBlur = settings.blur * scale;
  const scaledNoise = settings.noise * scale;

  // ---- blur (Canvas 2D API — stays in JS) ----
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

  const imageData = workCtx.getImageData(0, 0, w, h);

  // ---- pixel-level effects — delegate to WASM when available ----
  if (wasmInstance) {
    const view = new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength,
    );
    const noiseSeed = scaledNoise > 0 ? (Math.random() * 0xffff_ffff) >>> 0 : 0;
    wasmInstance.apply_scanner_pixels(
      view,
      settings.grayscale,
      settings.brightness,
      settings.contrast,
      settings.yellowish,
      scaledNoise,
      noiseSeed,
    );
  } else {
    // Pure-JS fallback (original logic)
    const data = imageData.data;
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

  workCtx.putImageData(imageData, 0, 0);

  // ---- border (Canvas 2D API — stays in JS) ----
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

  // ---- rotation (Canvas 2D API — stays in JS) ----
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

// ---------------------------------------------------------------------------
// Color adjustments — pixel loop delegates to WASM
// ---------------------------------------------------------------------------

export function applyColorAdjustments(
  sourceData: ImageData,
  canvas: HTMLCanvasElement,
  settings: AdjustColorsSettings,
): void {
  const ctx = canvas.getContext('2d')!;
  const w = sourceData.width;
  const h = sourceData.height;

  canvas.width = w;
  canvas.height = h;

  const imageData = new ImageData(
    new Uint8ClampedArray(sourceData.data),
    w,
    h,
  );

  if (wasmInstance) {
    const view = new Uint8Array(
      imageData.data.buffer,
      imageData.data.byteOffset,
      imageData.data.byteLength,
    );
    wasmInstance.apply_color_adjustments(
      view,
      settings.brightness,
      settings.contrast,
      settings.saturation,
      settings.hueShift,
      settings.temperature,
      settings.tint,
      settings.gamma,
      settings.sepia,
    );
  } else {
    // Pure-JS fallback (original logic)
    const data = imageData.data;
    const contrastFactor =
      settings.contrast !== 0
        ? (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))
        : 1;
    const gammaCorrection = settings.gamma !== 1.0 ? 1 / settings.gamma : 1;
    const sepiaAmount = settings.sepia / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (settings.brightness !== 0) {
        const adj = settings.brightness * 2.55;
        r += adj;
        g += adj;
        b += adj;
      }
      if (settings.contrast !== 0) {
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;
      }
      if (settings.saturation !== 0 || settings.hueShift !== 0) {
        const [hue, sat, lig] = rgbToHsl(
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b)),
        );
        let newHue = hue;
        if (settings.hueShift !== 0) {
          newHue = (hue + settings.hueShift / 360) % 1;
          if (newHue < 0) newHue += 1;
        }
        let newSat = sat;
        if (settings.saturation !== 0) {
          const satAdj = settings.saturation / 100;
          newSat =
            satAdj > 0 ? sat + (1 - sat) * satAdj : sat * (1 + satAdj);
          newSat = Math.max(0, Math.min(1, newSat));
        }
        [r, g, b] = hslToRgb(newHue, newSat, lig);
      }
      if (settings.temperature !== 0) {
        const t = settings.temperature / 50;
        r += 30 * t;
        b -= 30 * t;
      }
      if (settings.tint !== 0) {
        const t = settings.tint / 50;
        g += 30 * t;
      }
      if (settings.gamma !== 1.0) {
        r =
          Math.pow(Math.max(0, Math.min(255, r)) / 255, gammaCorrection) * 255;
        g =
          Math.pow(Math.max(0, Math.min(255, g)) / 255, gammaCorrection) * 255;
        b =
          Math.pow(Math.max(0, Math.min(255, b)) / 255, gammaCorrection) * 255;
      }
      if (settings.sepia > 0) {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r + (sr - r) * sepiaAmount;
        g = g + (sg - g) * sepiaAmount;
        b = b + (sb - b) * sepiaAmount;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
