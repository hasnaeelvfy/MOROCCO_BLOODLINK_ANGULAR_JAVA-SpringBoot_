import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'pages.notFound.kicker' | t }}</p>
        <h1>{{ 'pages.notFound.title' | t }}</h1>
        <p class="note">{{ 'pages.notFound.leadLong' | t }}</p>
        <a class="button" routerLink="/">{{ 'pages.notFound.returnHome' | t }}</a>
      </div>
    </main>
  `
})
export class NotFoundPageComponent {}
