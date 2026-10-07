import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { cityIdOf } from '../../data/morocco-geo';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { REGIONS, citiesForRegion, regionOfCity } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-donor-register-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'register.donor.title' | t }} · {{ 'auth.stepOf' | t:{ current: step, total: 2 } }}</p>
        <h1>{{ stepTitle() }}</h1>
        <p class="note">{{ 'auth.registerDonorLead' | t }}</p>
        <div class="progress-track"><i [style.width.%]="step * 50"></i></div>
        <article class="glass app-card request">
          @if (step === 1) {
            <div class="app-grid">
              <div class="field"><label>{{ 'form.firstName' | t }}</label><input [(ngModel)]="firstName" name="firstName" /><span class="field-error">{{ errors.firstName }}</span></div>
              <div class="field"><label>{{ 'form.lastName' | t }}</label><input [(ngModel)]="lastName" name="lastName" /><span class="field-error">{{ errors.lastName }}</span></div>
              <div class="field"><label>{{ 'form.phoneNumber' | t }}</label><input [(ngModel)]="phone" name="phone" /><span class="field-error">{{ errors.phone }}</span></div>
              <div class="field"><label>{{ 'form.email' | t }}</label><input type="email" [(ngModel)]="email" name="email" /><span class="field-error">{{ errors.email }}</span></div>
              <div class="field"><label>{{ 'form.cinFull' | t }}</label><input [(ngModel)]="cin" name="cin" placeholder="BE123456" maxlength="10" autocomplete="off" /><span class="field-error">{{ errors.cin }}</span></div>
              <div class="field">
                <label>{{ 'form.regionJiha' | t }}</label>
                <select [(ngModel)]="region" name="region" (ngModelChange)="onRegionChange()">
                  @for (item of regions; track item) { <option [value]="item">{{ item }}</option> }
                </select>
              </div>
              <div class="field">
                <label>{{ 'form.city' | t }}</label>
                <select [(ngModel)]="city" name="city">
                  @for (item of cities; track item) { <option [value]="item">{{ item }}</option> }
                </select>
              </div>
            </div>
          } @else {
            <div class="app-grid">
              <div class="field"><label>{{ 'form.password' | t }}</label><input type="password" [(ngModel)]="password" name="password" /><span class="field-error">{{ errors.password }}</span></div>
              <div class="field"><label>{{ 'form.confirmPassword' | t }}</label><input type="password" [(ngModel)]="confirm" name="confirm" /><span class="field-error">{{ errors.confirm }}</span></div>
            </div>
          }
          <div class="actions">
            @if (step > 1) { <button class="button button--ghost" type="button" (click)="step = step - 1">{{ 'back' | t }}</button> }
            @if (step < 2) { <button class="button" type="button" (click)="next()">{{ 'continue' | t }}</button> }
            @else { <button class="button" type="button" [disabled]="busy" (click)="complete()">{{ 'createAccount' | t }}</button> }
          </div>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/donor/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
      </div>
    </main>
  `
})
export class DonorRegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly regions = REGIONS;
  step = 1;
  firstName = '';
  lastName = '';
  phone = '';
  email = '';
  cin = '';
  region = regionOfCity('Casablanca');
  city = 'Casablanca';
  password = '';
  confirm = '';
  busy = false;
  errors = { firstName: '', lastName: '', phone: '', email: '', cin: '', password: '', confirm: '' };

  stepTitle(): string {
    return this.step === 1 ? this.i18n.t('register.personalInfo') : this.i18n.t('register.accountSecurity');
  }

  get cities(): string[] {
    return citiesForRegion(this.region);
  }

  onRegionChange(): void {
    const next = this.cities;
    if (!next.includes(this.city)) this.city = next[0] ?? '';
  }

  next(): void {
    this.errors = { firstName: '', lastName: '', phone: '', email: '', cin: '', password: '', confirm: '' };
    if (!this.firstName.trim()) this.errors.firstName = this.i18n.t('validation.required');
    if (!this.lastName.trim()) this.errors.lastName = this.i18n.t('validation.required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) this.errors.email = this.i18n.t('validation.email');
    if (!/^\+?\d{8,15}$/.test(this.phone.replace(/\s/g, ''))) this.errors.phone = this.i18n.t('validation.phone');
    if (!/^[A-Za-z]{1,2}\d{5,8}$/.test(this.cin.replace(/\s/g, ''))) this.errors.cin = this.i18n.t('validation.cin');
    if (Object.values(this.errors).some(Boolean)) return;
    this.step = 2;
  }

  complete(): void {
    this.errors = { firstName: '', lastName: '', phone: '', email: '', cin: '', password: '', confirm: '' };
    if (this.password.length < 8) this.errors.password = this.i18n.t('validation.password.min8');
    if (this.password !== this.confirm) this.errors.confirm = this.i18n.t('validation.password.mismatch');
    if (Object.values(this.errors).some(Boolean)) return;
    this.busy = true;
    this.auth.registerDonor({
      email: this.email.trim(),
      password: this.password,
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phone: this.phone.trim(),
      cin: this.cin.trim().toUpperCase(),
      cityId: cityIdOf(this.city)
    }).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.donorRegistered'), 'success');
        void this.router.navigateByUrl('/donor');
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.toast.show(httpErrorMessage(error), 'error');
      }
    });
  }
}
