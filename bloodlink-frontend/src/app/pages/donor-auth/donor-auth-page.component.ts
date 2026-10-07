import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-donor-auth-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'auth.donorAccess' | t }}</p>
        <h1>{{ 'auth.donor.landing.title' | t }}</h1>
        <p class="note">{{ 'auth.donorLandingNote' | t }}</p>
        <article class="glass app-card request">
          <p class="note">{{ 'auth.donorLandingHint' | t }}</p>
          <a class="button" routerLink="/donor/register">{{ 'continue' | t }}</a>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/donor/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
      </div>
    </main>
  `
})
export class DonorAuthPageComponent {}
