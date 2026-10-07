import { Component, signal } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-safety-page',
  imports: [TranslatePipe],
  template: `
    <main class="app-page" id="about">
      <p class="eyebrow">{{ 'pages.safety.title' | t }}</p>
      <h1>{{ 'pages.safety.headline' | t }}</h1>
      <article class="glass request app-card">
        <div class="cascade-steps">
          <div class="cascade-step"><b>{{ 'pages.safety.notMedical.title' | t }}</b>{{ 'pages.safety.notMedical.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.safety.eligibility.title' | t }}</b>{{ 'pages.safety.eligibility.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.safety.verified.title' | t }}</b>{{ 'pages.safety.verified.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.safety.duty.title' | t }}</b>{{ 'pages.safety.duty.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.safety.privacy.title' | t }}</b>{{ 'pages.safety.privacy.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.safety.location.title' | t }}</b>{{ 'pages.safety.location.body' | t }}</div>
        </div>
      </article>

      <article class="glass request app-card" style="margin-top:16px">
        <span class="demo-pill">{{ consent() ? ('pages.safety.consentRecorded' | t) : ('pages.safety.consentRequired' | t) }}</span>
        <h3>{{ 'pages.safety.consent' | t }}</h3>
        <p class="note">{{ 'pages.safety.consentLead' | t }}</p>
        <button class="button" type="button" (click)="giveConsent()">{{ 'pages.safety.recordConsent' | t }}</button>
      </article>

      <article class="glass request app-card" style="margin-top:16px">
        <h3>{{ 'pages.safety.verificationStatus' | t }}</h3>
        <dl class="stat-row">
          <div><dt>{{ 'pages.safety.hospitalVerification' | t }}</dt><dd>{{ 'pages.safety.hospitalVerificationValue' | t }}</dd></div>
          <div><dt>{{ 'pages.safety.requestVerification' | t }}</dt><dd>{{ 'pages.safety.requestVerificationValue' | t }}</dd></div>
          <div><dt>{{ 'pages.safety.donorScreening' | t }}</dt><dd>{{ 'pages.safety.donorScreeningValue' | t }}</dd></div>
        </dl>
      </article>
    </main>
  `
})
export class SafetyPageComponent {
  readonly consent = signal(localStorage.getItem('bloodlink.consent') === '1');

  giveConsent(): void {
    localStorage.setItem('bloodlink.consent', '1');
    this.consent.set(true);
  }
}
