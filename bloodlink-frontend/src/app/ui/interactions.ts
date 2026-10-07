import { prefersReducedMotion } from '../core/motion';

type Disposer = () => void;

/** Adds `.visible` to `.reveal` elements as they scroll into view. */
function initScrollReveal(): Disposer {
  const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));

  if (prefersReducedMotion()) {
    for (const target of targets) target.classList.add('visible');
    return () => undefined;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );

  for (const target of targets) observer.observe(target);
  return () => observer.disconnect();
}

/** Cursor-following nudge on primary actions. Mouse only, and never on touch. */
function initMagneticButtons(): Disposer {
  if (prefersReducedMotion()) return () => undefined;

  const cleanups: Disposer[] = [];

  for (const element of Array.from(document.querySelectorAll<HTMLElement>('.magnetic'))) {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = element.getBoundingClientRect();
      const dx = (event.clientX - box.left - box.width / 2) * 0.12;
      const dy = (event.clientY - box.top - box.height / 2) * 0.16;
      element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    };
    const onLeave = () => {
      element.style.transform = '';
    };

    element.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}

/** Condenses the floating nav on scroll and wires the mobile menu. */
function initNavigation(): Disposer {
  const wrap = document.querySelector<HTMLElement>('.nav-wrap');
  const links = document.querySelector<HTMLElement>('.nav-links');
  const toggle = document.querySelector<HTMLButtonElement>('.menu');

  const onScroll = () => wrap?.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeMenu = () => {
    links?.classList.remove('mobile-open');
    toggle?.setAttribute('aria-expanded', 'false');
  };

  const onToggle = () => {
    const open = links?.classList.toggle('mobile-open') ?? false;
    toggle?.setAttribute('aria-expanded', String(open));
  };

  toggle?.addEventListener('click', onToggle);
  links?.addEventListener('click', closeMenu);

  return () => {
    removeEventListener('scroll', onScroll);
    toggle?.removeEventListener('click', onToggle);
    links?.removeEventListener('click', closeMenu);
  };
}

export function initUiInteractions(): Disposer {
  const disposers = [initScrollReveal(), initMagneticButtons(), initNavigation()];
  return () => disposers.forEach((dispose) => dispose());
}
