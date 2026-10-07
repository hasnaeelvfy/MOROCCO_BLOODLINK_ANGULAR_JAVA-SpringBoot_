/**
 * Viewport tiers drive both layout and 3D scene configuration, so the
 * breakpoints live here rather than being duplicated in CSS and TypeScript.
 */
export type ViewportTier = 'mobile' | 'tablet' | 'desktop';

export const MOBILE_MAX = 700;
export const TABLET_MAX = 1100;

export function getViewportTier(width: number = innerWidth): ViewportTier {
  if (width <= MOBILE_MAX) return 'mobile';
  if (width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

/** Notifies only when the tier actually changes, not on every resize pixel. */
export function onViewportTierChange(callback: (tier: ViewportTier) => void): () => void {
  let current = getViewportTier();
  const handler = () => {
    const next = getViewportTier();
    if (next === current) return;
    current = next;
    callback(next);
  };
  addEventListener('resize', handler, { passive: true });
  return () => removeEventListener('resize', handler);
}

/** Rough device-capability signal used to scale particle counts and pixel ratio. */
export function isLowPowerDevice(): boolean {
  const cores = navigator.hardwareConcurrency ?? 4;
  return cores <= 4 || getViewportTier() === 'mobile';
}
