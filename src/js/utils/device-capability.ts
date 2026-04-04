export type DeviceTier = 'low' | 'medium' | 'high';

export interface RenderCapabilities {
  initialPageCount: number;
  batchSize: number;
  thumbnailScale: number;
  eagerLoadBatches: number;
  lazyLoadMargin: string;
  enablePageRecycling: boolean;
  maxConcurrentCanvases: number;
}

export interface CompressionCapabilities {
  photonScale: number;
  photonQuality: number;
  chunkSize: number;
  preferCondense: boolean;
}

export interface WasmCapabilities {
  preloadOnIdle: boolean;
  deferUntilUse: boolean;
}

export interface OcrCapabilities {
  resolution: number;
  maxConcurrentPages: number;
  useJpegBackground: boolean;
  yieldMs: number;
}

export interface ImageCapabilities {
  maxDimension: number;
  jpegQuality: number;
  pdfToImageScale: number;
}

export interface UploadLimits {
  warnFileSizeMB: number;
  warnTotalSizeMB: number;
  warnPageCount: number;
}

export interface DeviceCapabilities {
  tier: DeviceTier;
  render: RenderCapabilities;
  compression: CompressionCapabilities;
  wasm: WasmCapabilities;
  ocr: OcrCapabilities;
  image: ImageCapabilities;
  upload: UploadLimits;
}

let cached: DeviceTier | null = null;

export function getDeviceTier(): DeviceTier {
  if (cached) return cached;

  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as unknown as { deviceMemory?: number })
    .deviceMemory;
  const conn = (
    navigator as unknown as { connection?: { effectiveType?: string } }
  ).connection;
  const effectiveType = conn?.effectiveType;

  if (
    cores <= 2 ||
    (memory !== undefined && memory <= 2) ||
    effectiveType === '2g' ||
    effectiveType === 'slow-2g'
  ) {
    cached = 'low';
  } else if (cores <= 4 || (memory !== undefined && memory <= 4)) {
    cached = 'medium';
  } else {
    cached = 'high';
  }

  return cached;
}

export const isLowTier = (): boolean => getDeviceTier() === 'low';

const LOW_CAPABILITIES: DeviceCapabilities = {
  tier: 'low',
  render: {
    initialPageCount: 5,
    batchSize: 2,
    thumbnailScale: 0.3,
    eagerLoadBatches: 0,
    lazyLoadMargin: '100px',
    enablePageRecycling: true,
    maxConcurrentCanvases: 10,
  },
  compression: {
    photonScale: 0.8,
    photonQuality: 0.6,
    chunkSize: 1,
    preferCondense: true,
  },
  wasm: {
    preloadOnIdle: false,
    deferUntilUse: true,
  },
  ocr: {
    resolution: 1.0,
    maxConcurrentPages: 1,
    useJpegBackground: true,
    yieldMs: 50,
  },
  image: {
    maxDimension: 1200,
    jpegQuality: 0.5,
    pdfToImageScale: 1.0,
  },
  upload: {
    warnFileSizeMB: 10,
    warnTotalSizeMB: 20,
    warnPageCount: 30,
  },
};

const MEDIUM_CAPABILITIES: DeviceCapabilities = {
  tier: 'medium',
  render: {
    initialPageCount: 10,
    batchSize: 4,
    thumbnailScale: 0.4,
    eagerLoadBatches: 1,
    lazyLoadMargin: '200px',
    enablePageRecycling: true,
    maxConcurrentCanvases: 25,
  },
  compression: {
    photonScale: 1.2,
    photonQuality: 0.7,
    chunkSize: 3,
    preferCondense: false,
  },
  wasm: {
    preloadOnIdle: false,
    deferUntilUse: true,
  },
  ocr: {
    resolution: 1.5,
    maxConcurrentPages: 1,
    useJpegBackground: false,
    yieldMs: 10,
  },
  image: {
    maxDimension: 2500,
    jpegQuality: 0.75,
    pdfToImageScale: 1.5,
  },
  upload: {
    warnFileSizeMB: 20,
    warnTotalSizeMB: 40,
    warnPageCount: 60,
  },
};

const HIGH_CAPABILITIES: DeviceCapabilities = {
  tier: 'high',
  render: {
    initialPageCount: 20,
    batchSize: 8,
    thumbnailScale: 0.5,
    eagerLoadBatches: 2,
    lazyLoadMargin: '300px',
    enablePageRecycling: false,
    maxConcurrentCanvases: 50,
  },
  compression: {
    photonScale: 2.0,
    photonQuality: 0.85,
    chunkSize: Infinity,
    preferCondense: false,
  },
  wasm: {
    preloadOnIdle: true,
    deferUntilUse: false,
  },
  ocr: {
    resolution: 2.0,
    maxConcurrentPages: 2,
    useJpegBackground: false,
    yieldMs: 0,
  },
  image: {
    maxDimension: 0, // unlimited
    jpegQuality: 0.92,
    pdfToImageScale: 2.0,
  },
  upload: {
    warnFileSizeMB: Infinity,
    warnTotalSizeMB: Infinity,
    warnPageCount: Infinity,
  },
};

let cachedCapabilities: DeviceCapabilities | null = null;

export function getDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  const tier = getDeviceTier();
  switch (tier) {
    case 'low':
      cachedCapabilities = LOW_CAPABILITIES;
      break;
    case 'medium':
      cachedCapabilities = MEDIUM_CAPABILITIES;
      break;
    case 'high':
      cachedCapabilities = HIGH_CAPABILITIES;
      break;
  }

  return cachedCapabilities;
}

export function isMobileDevice(): boolean {
  return (
    (navigator.maxTouchPoints > 0 && window.innerWidth < 768) ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}
