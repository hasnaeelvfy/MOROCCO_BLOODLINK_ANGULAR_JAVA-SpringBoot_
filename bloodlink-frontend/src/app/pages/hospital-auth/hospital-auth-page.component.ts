import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-hospital-auth-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'auth.hospitalAccess' | t }}</p>
        <h1>{{ 'auth.hospital.landing.title' | t }}</h1>
        <p class="note">{{ 'auth.hospitalLandingNote' | t }}</p>
        <article class="glass app-card request">
          <p class="note">{{ 'auth.hospitalLandingHint' | t }}</p>
          <a class="button" routerLink="/hospital/register">{{ 'continue' | t }}</a>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/hospital/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
      </div>
    </main>
  `
})
export class HospitalAuthPageComponent {}
