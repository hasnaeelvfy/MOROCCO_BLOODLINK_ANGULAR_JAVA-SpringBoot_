import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { BrandMarkComponent } from '../brand-mark/brand-mark.component';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-site-nav',
  imports: [BrandMarkComponent, RouterLink, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './site-nav.component.html'
})
export class SiteNavComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly url = signal(this.router.url);
  readonly isHome = computed(() => this.url() === '/' || this.url().startsWith('/#'));
  readonly session = this.auth.session;

  home(): boolean {
    return this.isHome();
  }

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.url.set(event.urlAfterRedirects);
    });
  }

  signOut(event: Event): void {
    event.preventDefault();
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
