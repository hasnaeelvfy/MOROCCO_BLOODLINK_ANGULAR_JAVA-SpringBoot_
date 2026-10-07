import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-about-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <p class="eyebrow">{{ 'pages.about.kicker' | t }}</p>
      <h1>{{ 'pages.about.headline' | t }}</h1>
      <p class="note">{{ 'pages.about.lead' | t }}</p>
      <div class="steps">
        <div class="step"><div class="num">01</div><h3>{{ 'pages.about.step1.title' | t }}</h3><p>{{ 'pages.about.step1.body' | t }}</p></div>
        <div class="step"><div class="num">02</div><h3>{{ 'pages.about.step2.title' | t }}</h3><p>{{ 'pages.about.step2.body' | t }}</p></div>
        <div class="step"><div class="num">03</div><h3>{{ 'pages.about.step3.title' | t }}</h3><p>{{ 'pages.about.step3.body' | t }}</p></div>
        <div class="step"><div class="num">04</div><h3>{{ 'pages.about.step4.title' | t }}</h3><p>{{ 'pages.about.step4.body' | t }}</p></div>
      </div>
      <div class="actions" style="margin-top:28px">
        <a class="button" routerLink="/donor/auth">{{ 'cta.becomeDonor' | t }}</a>
        <a class="button button--ghost" routerLink="/hospital/auth">{{ 'cta.findBloodSupport' | t }}</a>
      </div>
    </main>
  `
})
export class AboutPageComponent {}
