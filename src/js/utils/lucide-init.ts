import { isLowTier } from './device-capability.js';

function initLucide() {
  import('lucide').then(({ createIcons, icons }) => {
    createIcons({ icons });
  });
}

if (isLowTier()) {
  // On low-tier devices, defer icons until first user interaction
  const trigger = () => initLucide();
  document.addEventListener('click', trigger, { once: true });
  document.addEventListener('touchstart', trigger, { once: true });
  document.addEventListener('keydown', trigger, { once: true });
} else if (typeof requestIdleCallback === 'function') {
  // On other devices, defer until browser is idle
  requestIdleCallback(() => initLucide());
} else {
  window.addEventListener('load', () => setTimeout(initLucide, 0));
}
