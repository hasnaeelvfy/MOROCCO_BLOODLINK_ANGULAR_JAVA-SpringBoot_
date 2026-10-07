import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandMarkComponent } from '../../components/brand-mark/brand-mark.component';
import { DonorApiService } from '../../core/api/donor-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-donor-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './donor-portal.component.html',
  styleUrl: '../hospital-portal/hospital-portal.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DonorPortalComponent {
  readonly apiAuth = inject(AuthService);
  readonly donorApi = inject(DonorApiService);
  private readonly router = inject(Router);
  menuOpen = false;

  constructor() {
    this.donorApi.loadProfile().subscribe();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
    });
  }

  firstName(): string {
    return (this.donorApi.profile()?.firstName ?? '').trim();
  }

  signOut(): void {
    this.apiAuth.logout();
    void this.router.navigateByUrl('/donor/sign-in');
  }
}
