import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DonorApiService } from '../../core/api/donor-api.service';
import { DonorProfileDto } from '../../core/api/api.models';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { BLOOD_TYPES, BloodType, canonicalBloodType, cityIdOf, displayBloodType, REGIONS, Region, citiesForRegion, regionOfCity } from '../../mock/models';
import { ProfilePhotoComponent } from '../../ui/profile-photo.component';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-donor-profile-page',
  imports: [FormsModule, ProfilePhotoComponent, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'donor.profile.kicker' | t }}</p>
      <h1>{{ 'donor.profile.title' | t }}</h1>
      <p class="hp-lead">{{ 'donor.profile.lead' | t }}</p>
      @if (loading) {
        <p class="hp-note">{{ 'common.loadingProfile' | t }}</p>
      } @else if (loadError) {
        <p class="hp-empty">{{ loadError }}</p>
      } @else {
        <article class="hp-profile-head">
          <app-profile-photo class="hp-avatar" [url]="avatarUrl" [alt]="firstName" [initials]="initials()" [authenticated]="true" />
          <div>
            <div class="hp-toolbar">
              <h2>{{ firstName }} {{ lastName }}</h2>
              <span class="hp-pill" [class.hp-pill--ok]="eligibility === 'eligible'" [class.hp-pill--warn]="eligibility === 'review'">
                {{ eligibilityLabel() }}
              </span>
            </div>
            <p class="hp-note">{{ bloodType }} · {{ city }}, {{ region }}</p>
            @if (nextEligible) {
              <p class="hp-note">{{ 'donor.profile.nextEligibleDate' | t:{ date: i18n.formatDate(nextEligible) } }}</p>
            }
            <label class="hp-btn hp-btn--ghost" style="margin-top:12px;display:inline-block">
              {{ 'form.updatePhoto' | t }}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onAvatar($event)" />
            </label>
          </div>
        </article>

        <div class="hp-stats">
          <article class="hp-stat"><strong>{{ completedDonations }}</strong><span>{{ 'donor.profile.completedDonations' | t }}</span><small>{{ 'donor.profile.completedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ acceptedRequests }}</strong><span>{{ 'donor.profile.acceptedRequests' | t }}</span><small>{{ 'donor.profile.acceptedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ lastDonation ? i18n.formatDate(lastDonation) : ('common.emDash' | t) }}</strong><span>{{ 'lastDonation' | t }}</span><small>{{ 'donor.profile.lastDonationHint' | t }}</small></article>
          <article class="hp-stat">
            <strong>{{ reliabilityPercent == null ? ('common.emDash' | t) : ('common.percent' | t:{ n: reliabilityPercent }) }}</strong>
            <span>{{ 'donor.profile.reliability' | t }}</span>
            <small>{{ reliabilityPercent == null ? ('donor.profile.reliabilityEmpty' | t) : reliabilityFormula }}</small>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'donor.profile.impact' | t }}</h2>
          <p class="hp-note">{{ 'donor.profile.impactNote' | t:{ count: donationCountLabel() } }}</p>
        </article>

        <div class="hp-form">
          <article class="hp-panel">
            <h2>{{ 'donor.profile.personalDetails' | t }}</h2>
            <div class="hp-grid">
              <div class="hp-field"><label>{{ 'form.firstName' | t }}</label><input [(ngModel)]="firstName" name="firstName" /></div>
              <div class="hp-field"><label>{{ 'form.lastName' | t }}</label><input [(ngModel)]="lastName" name="lastName" /></div>
              <div class="hp-field"><label>{{ 'phone' | t }}</label><input [(ngModel)]="phone" name="phone" /><span class="field-error">{{ errors.phone }}</span></div>
              <div class="hp-field"><label>{{ 'form.cinFull' | t }}</label><input [(ngModel)]="cin" name="cin" placeholder="BE123456" maxlength="10" autocomplete="off" /><span class="field-error">{{ errors.cin }}</span></div>
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
              <div class="hp-field">
                <label>{{ 'bloodType' | t }}</label>
                <select [(ngModel)]="bloodType" name="bloodType">@for (item of types; track item) { <option [value]="item">{{ item }}</option> }</select>
              </div>
              <div class="hp-field"><label>{{ 'form.dateOfBirth' | t }}</label><input type="date" [(ngModel)]="dateOfBirth" name="dob" /><span class="field-error">{{ errors.dob }}</span></div>
              <div class="hp-field"><label>{{ 'form.weightKg' | t }}</label><input type="number" [(ngModel)]="weightKg" name="weight" /><span class="field-error">{{ errors.weight }}</span></div>
              <div class="hp-field"><label>{{ 'form.heightCm' | t }}</label><input type="number" [(ngModel)]="heightCm" name="height" /><span class="field-error">{{ errors.height }}</span></div>
              <div class="hp-field"><label>{{ 'form.lastDonation' | t }}</label><input type="date" [(ngModel)]="lastDonation" name="lastDonation" /><span class="field-error">{{ errors.lastDonation }}</span></div>
            </div>
            <div class="hp-field">
              <label>{{ 'form.preferredContact' | t }}</label>
              <select [(ngModel)]="preferredContact" name="contact">
                <option value="app">{{ 'preferredContact.inApp' | t }}</option>
                <option value="phone">{{ 'preferredContact.phone' | t }}</option>
                <option value="email">{{ 'preferredContact.email' | t }}</option>
              </select>
            </div>
            <label class="hp-note"><input type="checkbox" [(ngModel)]="locationConsent" /> {{ 'form.locationShare' | t }}</label>
            <div class="hp-actions" style="margin-top:18px">
              <button class="hp-btn" type="button" (click)="save()">{{ 'common.saveProfile' | t }}</button>
              @if (locationConsent) {
                <button class="hp-btn hp-btn--ghost" type="button" (click)="askLocation()">{{ 'form.allowLocation' | t }}</button>
              }
            </div>
            @if (geoNote) { <p class="hp-note">{{ geoNote }}</p> }
          </article>
        </div>
      }
    </section>
  `
})
export class DonorProfilePageComponent {
  private readonly api = inject(DonorApiService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly regions = REGIONS;
  readonly types = BLOOD_TYPES;
  loading = true;
  loadError = '';
  firstName = '';
  lastName = '';
  phone = '';
  region: Region = regionOfCity('Casablanca');
  city = 'Casablanca';
  bloodType: BloodType = 'O+';
  dateOfBirth = '';
  weightKg = 60;
  heightCm: number | null = null;
  lastDonation = '';
  preferredContact: 'app' | 'phone' | 'email' = 'app';
  locationConsent = false;
  cin = '';
  geoNote = '';
  latitude: number | null = null;
  longitude: number | null = null;
  avatarUrl: string | null = null;
  eligibility: string | null = null;
  nextEligible: string | null = null;
  completedDonations = 0;
  acceptedRequests = 0;
  reliabilityPercent: number | null = null;
  reliabilityFormula: string | null = null;
  errors = { phone: '', weight: '', height: '', cin: '', dob: '', lastDonation: '' };

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
    return ((this.firstName?.[0] || '') + (this.lastName?.[0] || '') || 'D').toUpperCase();
  }

  eligibilityLabel(): string {
    if (this.eligibility === 'eligible') return this.i18n.t('eligibility.eligible');
    if (this.eligibility === 'review') return this.i18n.t('eligibility.needsReview');
    if (this.eligibility === 'ineligible') return this.i18n.t('eligibility.ineligible');
    return this.i18n.t('eligibility.incomplete');
  }

  donationCountLabel(): string {
    return this.completedDonations === 1
      ? this.i18n.t('donor.dashboard.donationEvent', { n: this.completedDonations })
      : this.i18n.t('donor.dashboard.donationEvents', { n: this.completedDonations });
  }

  onRegionChange(): void {
    const next = this.cities;
    if (!next.includes(this.city)) this.city = next[0] ?? '';
  }

  onAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadAvatar(file).subscribe({
      next: (profile) => {
        this.apply(profile);
        this.toast.show(this.i18n.t('toast.profilePhotoUpdated'), 'success');
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  save(): void {
    this.errors = { phone: '', weight: '', height: '', cin: '', dob: '', lastDonation: '' };
    if (!/^\+?\d{8,15}$/.test(this.phone.replace(/\s/g, ''))) this.errors.phone = this.i18n.t('validation.phone');
    if (this.weightKg < 45 || this.weightKg > 200) this.errors.weight = this.i18n.t('validation.weight');
    if (this.heightCm != null && (this.heightCm < 140 || this.heightCm > 220)) this.errors.height = this.i18n.t('validation.height');
    if (!/^[A-Za-z]{1,2}[A-Za-z0-9]{5,10}$/.test(this.cin.replace(/\s/g, ''))) this.errors.cin = this.i18n.t('validation.cin');
    if (this.dateOfBirth && new Date(this.dateOfBirth) > new Date()) this.errors.dob = this.i18n.t('validation.dob.future');
    if (this.lastDonation && new Date(this.lastDonation) > new Date()) this.errors.lastDonation = this.i18n.t('validation.donation.future');
    if (this.dateOfBirth && this.lastDonation && this.lastDonation < this.dateOfBirth) this.errors.lastDonation = this.i18n.t('validation.donation.beforeBirth');
    if (Object.values(this.errors).some(Boolean)) return;
    this.api.updateProfile({
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phone: this.phone,
      cityId: cityIdOf(this.city),
      cin: this.cin.trim().toUpperCase(),
      bloodType: canonicalBloodType(this.bloodType),
      dateOfBirth: this.dateOfBirth || undefined,
      weightKg: Number(this.weightKg),
      heightCm: this.heightCm == null ? undefined : Number(this.heightCm),
      lastDonation: this.lastDonation || undefined,
      preferredContact: this.preferredContact,
      locationConsent: this.locationConsent,
      latitude: this.latitude ?? undefined,
      longitude: this.longitude ?? undefined
    }).subscribe({
      next: (profile) => {
        this.apply(profile);
        this.toast.show(this.i18n.t('toast.profileSaved'), 'success');
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  askLocation(): void {
    if (!navigator.geolocation) {
      this.geoNote = this.i18n.t('donor.profile.geoUnavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = Math.round(position.coords.latitude * 100) / 100;
        this.longitude = Math.round(position.coords.longitude * 100) / 100;
        this.locationConsent = true;
        this.geoNote = this.i18n.t('donor.profile.geoCaptured');
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.geoNote = this.i18n.t('donor.profile.geoDenied');
        } else {
          this.geoNote = this.i18n.t('donor.profile.geoCityFallback');
        }
      }
    );
  }

  private apply(profile: DonorProfileDto): void {
    this.firstName = profile.firstName;
    this.lastName = profile.lastName;
    this.phone = profile.phone;
    this.city = profile.city;
    this.region = regionOfCity(profile.city);
    this.bloodType = profile.bloodType ? displayBloodType(profile.bloodType) : 'O+';
    this.dateOfBirth = profile.dateOfBirth ?? '';
    this.weightKg = profile.weightKg ?? 60;
    this.heightCm = profile.heightCm;
    this.lastDonation = profile.lastDonation ?? '';
    this.preferredContact = profile.preferredContact ?? 'app';
    this.locationConsent = profile.locationConsent;
    this.latitude = profile.approxLatitude;
    this.longitude = profile.approxLongitude;
    this.cin = profile.cin;
    this.geoNote = profile.locationRecorded ? this.i18n.t('donor.profile.geoSaved') : '';
    this.avatarUrl = profile.avatarUrl;
    this.eligibility = profile.eligibility;
    this.nextEligible = profile.nextEligible;
    this.completedDonations = profile.completedDonations ?? 0;
    this.acceptedRequests = profile.acceptedRequests ?? 0;
    this.reliabilityPercent = profile.reliabilityPercent;
    this.reliabilityFormula = profile.reliabilityFormula;
    this.loading = false;
    this.loadError = '';
  }
}
