import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { cityIdOf } from '../../data/morocco-geo';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { INSTITUTION_TYPES, REGIONS, citiesForRegion, regionOfCity } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-hospital-register-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'register.hospital.title' | t }} · {{ 'auth.stepOf' | t:{ current: step, total: 4 } }}</p>
        <h1>{{ stepTitle() }}</h1>
        <p class="note">{{ 'auth.registerHospitalLead' | t }}</p>
        <div class="progress-track"><i [style.width.%]="step * 25"></i></div>
        <article class="glass app-card request">
          @if (step === 1) {
            <div class="field"><label>{{ 'form.officialHospitalName' | t }}</label><input [(ngModel)]="institutionName" name="name" /><span class="field-error">{{ errors.institutionName }}</span></div>
            <div class="app-grid">
              <div class="field">
                <label>{{ 'form.hospitalType' | t }}</label>
                <select [(ngModel)]="institutionType" name="type">@for (item of types; track item) { <option [value]="item">{{ i18n.institutionType(item) }}</option> }</select>
              </div>
              <div class="field"><label>{{ 'form.officialEmail' | t }}</label><input type="email" [(ngModel)]="email" name="email" /><span class="field-error">{{ errors.email }}</span></div>
              <div class="field"><label>{{ 'form.officialPhone' | t }}</label><input [(ngModel)]="phone" name="phone" /><span class="field-error">{{ errors.phone }}</span></div>
              <div class="field"><label>{{ 'form.websiteOptional' | t }}</label><input [(ngModel)]="website" name="website" /></div>
            </div>
            <div class="field"><label>{{ 'form.hospitalIdentification' | t }}</label><input [(ngModel)]="registrationNumber" name="reg" /><span class="field-error">{{ errors.registrationNumber }}</span></div>
            <div class="field"><label>{{ 'form.address' | t }}</label><input [(ngModel)]="address" name="address" /><span class="field-error">{{ errors.address }}</span></div>
            <div class="app-grid">
              <div class="field">
                <label>{{ 'form.regionJiha' | t }}</label>
                <select [(ngModel)]="region" name="region" (ngModelChange)="onRegionChange()">
                  @for (item of regions; track item) { <option [value]="item">{{ item }}</option> }
                </select>
              </div>
              <div class="field">
                <label>{{ 'form.city' | t }}</label>
                <select [(ngModel)]="city" name="city">@for (item of cities; track item) { <option [value]="item">{{ item }}</option> }</select>
              </div>
            </div>
          } @else if (step === 2) {
            <div class="app-grid">
              <div class="field"><label>{{ 'form.firstName' | t }}</label><input [(ngModel)]="firstName" name="firstName" /><span class="field-error">{{ errors.firstName }}</span></div>
              <div class="field"><label>{{ 'form.lastName' | t }}</label><input [(ngModel)]="lastName" name="lastName" /><span class="field-error">{{ errors.lastName }}</span></div>
              <div class="field"><label>{{ 'form.professionalPosition' | t }}</label><input [(ngModel)]="position" name="position" /></div>
              <div class="field"><label>{{ 'form.professionalEmail' | t }}</label><input type="email" [(ngModel)]="contactEmail" name="contactEmail" /></div>
              <div class="field"><label>{{ 'form.professionalPhone' | t }}</label><input [(ngModel)]="contactPhone" name="contactPhone" /></div>
            </div>
          } @else if (step === 3) {
            <div class="app-grid">
              <div class="field"><label>{{ 'form.password' | t }}</label><input type="password" [(ngModel)]="password" name="password" /><span class="field-error">{{ errors.password }}</span></div>
              <div class="field"><label>{{ 'form.confirmPassword' | t }}</label><input type="password" [(ngModel)]="confirm" name="confirm" /><span class="field-error">{{ errors.confirm }}</span></div>
            </div>
          } @else {
            <span class="badge">{{ 'auth.verificationPending' | t }}</span>
            <h3>{{ 'register.review' | t }}</h3>
            <dl class="stat-row">
              <div><dt>{{ 'auth.role.hospital' | t }}</dt><dd>{{ institutionName }}</dd></div>
              <div><dt>{{ 'auth.typeCity' | t }}</dt><dd>{{ i18n.institutionType(institutionType) }} · {{ city }}</dd></div>
              <div><dt>{{ 'auth.contactPerson' | t }}</dt><dd>{{ firstName }} {{ lastName }} · {{ position }}</dd></div>
            </dl>
            <p class="note">{{ 'auth.hospitalSubmitted' | t }}</p>
          }
          <div class="actions">
            @if (step > 1) { <button class="button button--ghost" type="button" (click)="step = step - 1">{{ 'back' | t }}</button> }
            @if (step < 4) { <button class="button" type="button" (click)="next()">{{ 'continue' | t }}</button> }
            @else { <button class="button" type="button" [disabled]="busy" (click)="complete()">{{ 'register.submitHospital' | t }}</button> }
          </div>
          <p class="auth-foot">{{ 'auth.alreadyHaveAccount' | t }} <a routerLink="/hospital/sign-in">{{ 'signIn' | t }}</a></p>
        </article>
      </div>
    </main>
  `
})
export class HospitalRegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly types = INSTITUTION_TYPES;
  readonly regions = REGIONS;
  step = 1;
  institutionName = '';
  institutionType = 'Public hospital';
  email = '';
  phone = '';
  website = '';
  registrationNumber = '';
  address = '';
  region = regionOfCity('Casablanca');
  city = 'Casablanca';
  firstName = '';
  lastName = '';
  position = 'Coordinator';
  contactEmail = '';
  contactPhone = '';
  password = '';
  confirm = '';
  busy = false;
  errors = { institutionName: '', email: '', phone: '', address: '', registrationNumber: '', firstName: '', lastName: '', password: '', confirm: '' };

  stepTitle(): string {
    return [
      this.i18n.t('register.hospitalInfo'),
      this.i18n.t('register.authorizedContact'),
      this.i18n.t('register.accountSecurity'),
      this.i18n.t('register.verification')
    ][this.step - 1];
  }

  get cities(): string[] {
    return citiesForRegion(this.region);
  }

  onRegionChange(): void {
    const next = this.cities;
    if (!next.includes(this.city)) this.city = next[0] ?? '';
  }

  next(): void {
    this.errors = { institutionName: '', email: '', phone: '', address: '', registrationNumber: '', firstName: '', lastName: '', password: '', confirm: '' };
    if (this.step === 1) {
      if (!this.institutionName.trim()) this.errors.institutionName = this.i18n.t('validation.required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) this.errors.email = this.i18n.t('validation.email');
      if (!/^\+?\d{8,15}$/.test(this.phone.replace(/\s/g, ''))) this.errors.phone = this.i18n.t('validation.phone');
      if (!this.address.trim()) this.errors.address = this.i18n.t('validation.required');
      if (!this.registrationNumber.trim()) this.errors.registrationNumber = this.i18n.t('validation.required');
    }
    if (this.step === 2) {
      if (!this.firstName.trim()) this.errors.firstName = this.i18n.t('validation.required');
      if (!this.lastName.trim()) this.errors.lastName = this.i18n.t('validation.required');
    }
    if (this.step === 3) {
      if (this.password.length < 8) this.errors.password = this.i18n.t('validation.password.min8');
      if (this.password !== this.confirm) this.errors.confirm = this.i18n.t('validation.password.mismatch');
    }
    if (Object.values(this.errors).some(Boolean)) return;
    this.step += 1;
  }

  complete(): void {
    this.busy = true;
    this.auth.registerHospital({
      email: this.email.trim(),
      password: this.password,
      hospitalName: this.institutionName.trim(),
      registrationNumber: this.registrationNumber.trim(),
      phone: this.phone.trim(),
      address: this.address.trim(),
      cityId: cityIdOf(this.city)
    }).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.hospitalRegisteredPending'), 'success');
        void this.router.navigateByUrl('/hospital');
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.toast.show(httpErrorMessage(error), 'error');
      }
    });
  }
}
