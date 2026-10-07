import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-sign-in-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'signIn' | t }}</p>
        <h1>{{ 'auth.workspace.title' | t }}</h1>
        <p class="note">{{ 'auth.chooseWorkspaceLead' | t }}</p>
        <article class="glass app-card request">
          <h3>{{ 'auth.role.donor' | t }}</h3>
          <p class="note">{{ 'auth.donorWorkspaceLead' | t }}</p>
          <a class="button" routerLink="/donor/auth">{{ 'continue' | t }}</a>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/donor/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
        <article class="glass app-card request" style="margin-top:16px">
          <h3>{{ 'auth.role.hospital' | t }}</h3>
          <p class="note">{{ 'auth.hospitalWorkspaceLead' | t }}</p>
          <a class="button" routerLink="/hospital/auth">{{ 'continue' | t }}</a>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/hospital/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
      </div>
    </main>
  `
})
export class SignInPageComponent {}
