export type DeviceTier = 'low' | 'medium' | 'high';

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
