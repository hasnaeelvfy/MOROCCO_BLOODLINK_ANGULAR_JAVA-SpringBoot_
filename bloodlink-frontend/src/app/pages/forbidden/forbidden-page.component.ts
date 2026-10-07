import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'pages.forbidden.kicker' | t }}</p>
        <h1>{{ 'pages.forbidden.headline' | t }}</h1>
        <p class="note">{{ 'pages.forbidden.leadLong' | t }}</p>
        <div class="actions">
          <a class="button" [routerLink]="homePath()">{{ 'pages.forbidden.goToSpace' | t }}</a>
          <a class="button button--ghost" routerLink="/">{{ 'pages.forbidden.home' | t }}</a>
        </div>
      </div>
    </main>
  `
})
export class ForbiddenPageComponent {
  private readonly apiAuth = inject(AuthService);

  homePath(): string {
    return this.apiAuth.homePath();
  }
}
