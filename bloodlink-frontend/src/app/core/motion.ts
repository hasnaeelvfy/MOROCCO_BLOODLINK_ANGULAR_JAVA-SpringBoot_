/**
 * Reduced-motion preference, resolved once and kept live.
 * Every animated subsystem reads this instead of querying matchMedia itself.
 */
const query = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

let reduced = query?.matches ?? false;

query?.addEventListener?.('change', (event) => {
  reduced = event.matches;
});

export function prefersReducedMotion(): boolean {
  return reduced;
}
