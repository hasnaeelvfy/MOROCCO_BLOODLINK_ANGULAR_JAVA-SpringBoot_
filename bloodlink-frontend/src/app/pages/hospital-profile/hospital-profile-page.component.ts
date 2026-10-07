import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { HospitalProfileDto, HospitalStatsDto, mediaUrl, verificationLabel } from '../../core/api/api.models';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { INSTITUTION_TYPES, REGIONS, Region, citiesForRegion, cityIdOf, regionOfCity } from '../../mock/models';
import { ProfilePhotoComponent } from '../../ui/profile-photo.component';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-hospital-profile-page',
  imports: [FormsModule, ProfilePhotoComponent, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.profile.kicker' | t }}</p>
      <h1>{{ 'hospital.profile.title' | t }}</h1>
      <p class="hp-lead">{{ 'hospital.profile.lead' | t }}</p>
      @if (loading) {
        <p class="hp-note">{{ 'common.loadingProfile' | t }}</p>
      } @else if (loadError) {
        <p class="hp-empty">{{ loadError }}</p>
      } @else {
        <article class="hp-profile-head">
          <app-profile-photo class="hp-avatar" [url]="logoUrl" [alt]="name" [initials]="initials()" />
          <div>
            <div class="hp-toolbar">
              <h2>{{ name || ('auth.role.hospital' | t) }}</h2>
              <span class="hp-pill" [class.hp-pill--ok]="verification === 'verified'" [class.hp-pill--warn]="verification === 'pending'">
                {{ verificationLabel(verification) }}
              </span>
            </div>
            <p class="hp-note">{{ i18n.institutionType(type) }} · {{ city }}, {{ region }}</p>
            <p class="hp-note">{{ address }}</p>
            @if (registeredAt) {
              <p class="hp-note">{{ 'hospital.profile.registeredOn' | t:{ date: i18n.formatDate(registeredAt) } }}</p>
            }
            <label class="hp-btn hp-btn--ghost" style="margin-top:12px;display:inline-block">
              {{ 'form.updateLogo' | t }}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onLogo($event)" />
            </label>
          </div>
        </article>

        <div class="hp-stats">
          <article class="hp-stat"><strong>{{ stats?.totalRequests || 0 }}</strong><span>{{ 'hospital.profile.totalRequests' | t }}</span><small>{{ 'hospital.profile.totalHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ stats?.activeRequests || 0 }}</strong><span>{{ 'hospital.profile.active' | t }}</span><small>{{ 'hospital.profile.activeHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ stats?.fulfilledRequests || 0 }}</strong><span>{{ 'hospital.profile.completed' | t }}</span><small>{{ 'hospital.profile.completedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ stats?.cancelledRequests || 0 }}</strong><span>{{ 'hospital.profile.cancelled' | t }}</span><small>{{ 'hospital.profile.cancelledHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ stats?.donorsResponded || 0 }}</strong><span>{{ 'hospital.profile.donorResponses' | t }}</span><small>{{ 'hospital.profile.donorResponsesHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ stats?.completedDonations || 0 }}</strong><span>{{ 'hospital.profile.completedDonations' | t }}</span><small>{{ 'hospital.profile.completedDonationsHint' | t }}</small></article>
        </div>

        <div class="hp-form">
          <article class="hp-panel">
            <h2>{{ 'hospital.profile.institutionDetails' | t }}</h2>
            <div class="hp-grid" style="margin-top:16px">
              <div class="hp-field"><label>{{ 'form.hospitalName' | t }}</label><input [(ngModel)]="name" name="name" /></div>
              <div class="hp-field">
                <label>{{ 'form.hospitalType' | t }}</label>
                <select [(ngModel)]="type" name="type">@for (item of types; track item) { <option [value]="item">{{ i18n.institutionType(item) }}</option> }</select>
              </div>
              <div class="hp-field"><label>{{ 'form.officialEmail' | t }}</label><input type="email" [(ngModel)]="email" name="email" /><span class="field-error">{{ errors.email }}</span></div>
              <div class="hp-field"><label>{{ 'phone' | t }}</label><input [(ngModel)]="phone" name="phone" /><span class="field-error">{{ errors.phone }}</span></div>
              <div class="hp-field"><label>{{ 'form.registrationNumber' | t }}</label><input [(ngModel)]="registrationNumber" name="reg" /></div>
              <div class="hp-field"><label>{{ 'form.website' | t }}</label><input [(ngModel)]="website" name="website" placeholder="https://" /><span class="field-error">{{ errors.website }}</span></div>
              <div class="hp-field">
                <label>{{ 'form.regionJiha' | t }}</label>
                <select [(ngModel)]="region" name="region" (ngModelChange)="onRegionChange()">
                  @for (item of regions; track item) { <option [value]="item">{{ item }}</option> }
                </select>
              </div>
              <div class="hp-field">
                <label>{{ 'city' | t }}</label>
                <select [(ngModel)]="city" name="city">@for (item of cities; track item) { <option [value]="item">{{ item }}</option> }</select>
              </div>
            </div>
            <div class="hp-field"><label>{{ 'form.address' | t }}</label><input [(ngModel)]="address" name="address" /></div>
            <div class="hp-field"><label>{{ 'form.workingHours' | t }}</label><input [(ngModel)]="workingHours" name="hours" /></div>
            <div class="hp-field"><label>{{ 'form.description' | t }}</label><textarea [(ngModel)]="description" name="description" rows="4"></textarea></div>
            <div class="hp-grid">
              <div class="hp-field"><label>{{ 'form.authorizedContact' | t }}</label><input [(ngModel)]="contact" name="contact" /></div>
              <div class="hp-field"><label>{{ 'form.position' | t }}</label><input [(ngModel)]="position" name="position" /></div>
            </div>
            <div class="hp-actions">
              <button class="hp-btn" type="button" (click)="save()">{{ 'common.saveProfile' | t }}</button>
            </div>
          </article>
        </div>
      }
    </section>
  `
})
export class HospitalProfilePageComponent {
  private readonly api = inject(HospitalApiService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly types = INSTITUTION_TYPES;
  readonly regions = REGIONS;
  readonly verificationLabel = verificationLabel;
  loading = true;
  loadError = '';
  verification = 'pending';
  logoUrl: string | null = null;
  registeredAt: string | null = null;
  stats: HospitalStatsDto | null = null;
  name = '';
  type = 'Public hospital';
  email = '';
  phone = '';
  registrationNumber = '';
  website = '';
  region: Region = regionOfCity('Casablanca');
  city = 'Casablanca';
  address = '';
  contact = '';
  position = '';
  description = '';
  workingHours = '';
  errors = { email: '', phone: '', website: '' };

  constructor() {
    this.api.loadProfile().subscribe({
      next: (profile) => this.apply(profile),
      error: (error) => {
        this.loadError = httpErrorMessage(error);
        this.toast.show(this.loadError, 'error');
        this.loading = false;
      }
    });
  }

  get cities(): string[] {
    return citiesForRegion(this.region);
  }

  initials(): string {
    return (this.name || 'H').slice(0, 2).toUpperCase();
  }

  onRegionChange(): void {
    const next = this.cities;
    if (!next.includes(this.city)) this.city = next[0] ?? '';
  }

  onLogo(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadLogo(file).subscribe({
      next: (profile) => {
        this.apply(profile);
        this.toast.show(this.i18n.t('toast.hospitalLogoUpdated'), 'success');
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  save(): void {
    this.errors = { email: '', phone: '', website: '' };
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) this.errors.email = this.i18n.t('validation.email');
    if (!/^\+?\d{8,15}$/.test(this.phone.replace(/\s/g, ''))) this.errors.phone = this.i18n.t('validation.phone');
    if (this.website && !/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(this.website.trim())) {
      this.errors.website = this.i18n.t('validation.website');
    }
    if (Object.values(this.errors).some(Boolean)) return;
    this.api.updateProfile({
      name: this.name,
      type: this.type,
      email: this.email,
      phone: this.phone,
      registrationNumber: this.registrationNumber || undefined,
      website: this.website || undefined,
      cityId: cityIdOf(this.city),
      address: this.address,
      contact: this.contact,
      position: this.position,
      description: this.description || undefined,
      workingHours: this.workingHours || undefined
    }).subscribe({
      next: (profile) => {
        this.apply(profile);
        this.toast.show(this.i18n.t('toast.hospitalProfileUpdated'), 'success');
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private apply(profile: HospitalProfileDto): void {
    this.verification = profile.verification;
    this.name = profile.name;
    this.type = profile.type || 'Public hospital';
    this.email = profile.email ?? '';
    this.phone = profile.phone;
    this.registrationNumber = profile.registrationNumber ?? '';
    this.website = profile.website ?? '';
    this.city = profile.city;
    this.region = regionOfCity(profile.city);
    this.address = profile.address;
    this.contact = profile.contact ?? '';
    this.position = profile.position ?? '';
    this.description = profile.description ?? '';
    this.workingHours = profile.workingHours ?? '';
    this.registeredAt = profile.registeredAt;
    this.logoUrl = mediaUrl(profile.logoUrl);
    this.stats = profile.stats;
    this.loading = false;
    this.loadError = '';
  }
}
