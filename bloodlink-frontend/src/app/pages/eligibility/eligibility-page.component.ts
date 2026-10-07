import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { EligibilityResult } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-eligibility-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <div class="hp-form">
        <p class="hp-kicker">{{ 'eligibility.kicker' | t:{ n: step } }}</p>
        <h1>{{ 'eligibility.pageTitle' | t }}</h1>
        <p class="hp-lead">{{ 'eligibility.disclaimerShort' | t }}</p>
        <div class="hp-progress" style="margin-bottom:18px"><i [style.width.%]="step * 25"></i></div>
        <article class="hp-panel">
          @if (!result) {
            @if (step === 1) {
              <div class="hp-grid">
                <div class="hp-field"><label>{{ 'form.ageFromDob' | t }}</label><input type="number" [ngModel]="age" name="age" readonly /></div>
                <div class="hp-field"><label>{{ 'form.weightKg' | t }}</label><input type="number" [(ngModel)]="weight" name="weight" /></div>
              </div>
              <div class="hp-field"><label>{{ 'form.lastDonation' | t }}</label><input type="date" [(ngModel)]="lastDonation" name="lastDonation" /></div>
              @if (!dateOfBirth) {
                <p class="hp-note">{{ 'eligibility.saveDob' | t }}</p>
              }
            } @else if (step === 2) {
              <div class="hp-field">
                <label>{{ 'form.generalHealth' | t }}</label>
                <select [(ngModel)]="generalHealth" name="health">
                  <option value="good">{{ 'eligibility.health.good' | t }}</option>
                  <option value="fair">{{ 'eligibility.health.fair' | t }}</option>
                  <option value="poor">{{ 'eligibility.health.poor' | t }}</option>
                </select>
              </div>
              <label class="hp-note"><input type="checkbox" [(ngModel)]="currentIllness" /> {{ 'eligibility.illness' | t }}</label>
              <label class="hp-note"><input type="checkbox" [(ngModel)]="medication" /> {{ 'eligibility.medication' | t }}</label>
            } @else if (step === 3) {
              <label class="hp-note"><input type="checkbox" [(ngModel)]="recentSurgery" /> {{ 'eligibility.surgery' | t }}</label>
              <label class="hp-note"><input type="checkbox" [(ngModel)]="recentTravel" /> {{ 'eligibility.travel' | t }}</label>
              <label class="hp-note"><input type="checkbox" [(ngModel)]="pregnancy" /> {{ 'eligibility.pregnancy' | t }}</label>
            } @else {
              <h2>{{ 'register.review' | t }}</h2>
              <div class="hp-metric"><span>{{ 'eligibility.ageWeight' | t }}</span><b>{{ age }} · {{ 'common.weightKg' | t:{ n: weight } }}</b></div>
              <div class="hp-metric"><span>{{ 'form.lastDonation' | t }}</span><b>{{ lastDonation ? i18n.formatDate(lastDonation) : ('common.emDash' | t) }}</b></div>
              <div class="hp-metric"><span>{{ 'form.generalHealth' | t }}</span><b>{{ i18n.t('eligibility.health.' + generalHealth) }}</b></div>
            }
            <div class="hp-actions" style="margin-top:18px">
              @if (step > 1) { <button class="hp-btn hp-btn--ghost" type="button" (click)="step = step - 1">{{ 'back' | t }}</button> }
              @if (step < 4) { <button class="hp-btn" type="button" (click)="step = step + 1">{{ 'continue' | t }}</button> }
              @else { <button class="hp-btn" type="button" (click)="evaluate()">{{ 'eligibility.seeResult' | t }}</button> }
            </div>
          } @else {
            <span class="hp-pill" [class.hp-pill--ok]="result === 'eligible'" [class.hp-pill--warn]="result === 'review'">{{ 'eligibility.resultBadge' | t }}</span>
            <h2>{{ resultTitle() }}</h2>
            @for (reason of reasons; track reason) {
              <p class="hp-note">{{ i18n.eligibilityReason(reason) }}</p>
            }
            <p class="hp-note">{{ 'eligibility.disclaimerLong' | t }}</p>
            <div class="hp-actions" style="margin-top:18px">
              <a class="hp-btn" routerLink="/donor">{{ 'dashboard' | t }}</a>
              <button class="hp-btn hp-btn--ghost" type="button" (click)="result = null; step = 1">{{ 'eligibility.repeat' | t }}</button>
            </div>
          }
        </article>
      </div>
    </section>
  `
})
export class EligibilityPageComponent {
  private readonly api = inject(DonorApiService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  step = 1;
  age = 0;
  weight = 62;
  dateOfBirth = '';
  lastDonation = '';
  generalHealth: 'good' | 'fair' | 'poor' = 'good';
  currentIllness = false;
  medication = false;
  recentSurgery = false;
  recentTravel = false;
  pregnancy = false;
  result: EligibilityResult | null = null;
  reasons: string[] = [];

  constructor() {
    this.api.loadProfile().subscribe({
      next: (profile) => {
        this.age = profile.age ?? 0;
        this.weight = profile.weightKg ?? 62;
        this.dateOfBirth = profile.dateOfBirth ?? '';
        this.lastDonation = profile.lastDonation ?? '';
      }
    });
  }

  resultTitle(): string {
    if (this.result === 'eligible') return this.i18n.t('eligibility.preliminaryEligible');
    if (this.result === 'review') return this.i18n.t('eligibility.needsReview');
    return this.i18n.t('eligibility.ineligible');
  }

  evaluate(): void {
    if (!this.dateOfBirth) {
      this.toast.show(this.i18n.t('toast.dobRequiredForScreening'), 'error');
      return;
    }
    this.api.evaluate({
      age: this.age,
      weight: this.weight,
      lastDonation: this.lastDonation || undefined,
      generalHealth: this.generalHealth,
      currentIllness: this.currentIllness,
      medication: this.medication,
      recentSurgery: this.recentSurgery,
      recentTravel: this.recentTravel,
      pregnancy: this.pregnancy
    }).subscribe({
      next: (response) => {
        this.result = response.result;
        this.reasons = response.reasons ?? [];
        this.age = response.age ?? this.age;
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }
}
