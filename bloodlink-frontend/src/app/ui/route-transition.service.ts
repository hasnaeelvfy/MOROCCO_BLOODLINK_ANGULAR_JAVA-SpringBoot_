import { Injectable, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { prefersReducedMotion } from '../core/motion';

function isWorkspacePath(path: string): boolean {
  if (
    path.startsWith('/hospital/auth') ||
    path.startsWith('/hospital/register') ||
    path.startsWith('/hospital/sign-in') ||
    path.startsWith('/donor/auth') ||
    path.startsWith('/donor/register') ||
    path.startsWith('/donor/sign-in')
  ) {
    return false;
  }
  return (
    path === '/hospital' ||
    path.startsWith('/hospital/') ||
    path === '/donor' ||
    path.startsWith('/donor/')
  );
}

@Injectable({ providedIn: 'root' })
export class RouteTransitionService {
  readonly active = signal(false);
  private playing = false;
  private first = true;
  private lastUrl = '';

  constructor(router: Router) {
    router.events.subscribe((event) => {
      if (!(event instanceof NavigationStart)) return;
      if (this.first) {
        this.first = false;
        this.lastUrl = event.url;
        return;
      }
      const nextPath = event.url.split('?')[0];
      const prevPath = this.lastUrl.split('?')[0];
      this.lastUrl = event.url;
      if (nextPath === prevPath) return;
      if (isWorkspacePath(prevPath) && isWorkspacePath(nextPath)) return;
      this.play();
    });
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.active.set(true);
    const duration = prefersReducedMotion() ? 400 : 3000;
    setTimeout(() => {
      this.active.set(false);
      this.playing = false;
    }, duration);
  }
}
