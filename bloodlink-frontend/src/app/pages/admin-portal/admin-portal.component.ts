import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandMarkComponent } from '../../components/brand-mark/brand-mark.component';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../i18n/i18n.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './admin-portal.component.html',
  styleUrl: '../hospital-portal/hospital-portal.component.css',
  encapsulation: ViewEncapsulation.None
})
export class AdminPortalComponent {
  readonly apiAuth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  menuOpen = false;

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
    });
  }

  displayName(): string {
    return this.apiAuth.currentUser()?.email || this.i18n.t('auth.role.administrator');
  }

  signOut(): void {
    this.apiAuth.logout();
    void this.router.navigateByUrl('/admin/sign-in');
  }
}
