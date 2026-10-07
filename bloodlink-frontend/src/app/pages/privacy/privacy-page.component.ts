import { Component } from '@angular/core';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-privacy-page',
  imports: [TranslatePipe],
  template: `
    <main class="app-page">
      <p class="eyebrow">{{ 'pages.privacy.title' | t }}</p>
      <h1>{{ 'pages.privacy.headline' | t }}</h1>
      <p class="note">{{ 'pages.privacy.lead' | t }}</p>
      <article class="glass request app-card">
        <div class="cascade-steps">
          <div class="cascade-step"><b>{{ 'pages.privacy.collected.title' | t }}</b>{{ 'pages.privacy.collected.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.usage.title' | t }}</b>{{ 'pages.privacy.usage.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.donor.title' | t }}</b>{{ 'pages.privacy.donor.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.hospital.title' | t }}</b>{{ 'pages.privacy.hospital.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.emergency.title' | t }}</b>{{ 'pages.privacy.emergency.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.sharing.title' | t }}</b>{{ 'pages.privacy.sharing.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.retention.title' | t }}</b>{{ 'pages.privacy.retention.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.rights.title' | t }}</b>{{ 'pages.privacy.rights.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.consent.title' | t }}</b>{{ 'pages.privacy.consent.body' | t }}</div>
          <div class="cascade-step"><b>{{ 'pages.privacy.contact.title' | t }}</b>{{ 'pages.privacy.contact.body' | t }}</div>
        </div>
      </article>
    </main>
  `
})
export class PrivacyPageComponent {}
