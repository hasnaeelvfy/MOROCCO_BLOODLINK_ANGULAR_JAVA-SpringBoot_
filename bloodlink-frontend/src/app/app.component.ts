import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AmbientBackgroundComponent } from './components/ambient-background/ambient-background.component';
import { AuthService } from './core/auth/auth.service';
import { I18nService } from './i18n/i18n.service';
import { LandingComponent } from './pages/landing/landing.component';
import { RouteTransitionComponent } from './ui/route-transition.component';
import { UiOverlayComponent } from './ui/overlay.component';

@Component({
  selector: 'app-root',
  imports: [AmbientBackgroundComponent, RouterOutlet, RouteTransitionComponent, UiOverlayComponent, LandingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthService);
  readonly isHome = signal(true);

  constructor() {
    this.auth.restoreSession().subscribe();
    this.i18n.applyDocument();
    this.isHome.set(this.pathIsHome(typeof location !== 'undefined' ? location.pathname : '/'));
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      const home = this.pathIsHome(event.urlAfterRedirects);
      this.isHome.set(home);
      if (!home) document.body.classList.remove('intro-lock');
    });
  }

  home(): boolean {
    return this.isHome();
  }

  private pathIsHome(value: string): boolean {
    const path = (value || '/').split('?')[0].split('#')[0].replace(/\/+$/, '');
    return path === '' || path === '/';
  }
}
