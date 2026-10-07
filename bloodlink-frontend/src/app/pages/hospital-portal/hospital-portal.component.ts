import { Component, ViewEncapsulation, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrandMarkComponent } from '../../components/brand-mark/brand-mark.component';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-hospital-portal',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandMarkComponent, LanguageSwitcherComponent, TranslatePipe],
  templateUrl: './hospital-portal.component.html',
  styleUrl: './hospital-portal.component.css',
  encapsulation: ViewEncapsulation.None
})
export class HospitalPortalComponent {
  readonly apiAuth = inject(AuthService);
  readonly hospitalApi = inject(HospitalApiService);
  private readonly router = inject(Router);
  menuOpen = false;

  constructor() {
    this.hospitalApi.loadProfile().subscribe();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      this.menuOpen = false;
    });
  }

  signOut(): void {
    this.apiAuth.logout();
    void this.router.navigateByUrl('/hospital/sign-in');
  }
}
