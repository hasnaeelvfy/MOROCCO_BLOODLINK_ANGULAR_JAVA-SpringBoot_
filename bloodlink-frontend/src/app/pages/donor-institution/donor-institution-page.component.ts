import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InstitutionProfileDto, mediaUrl, verificationLabel } from '../../core/api/api.models';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ProfilePhotoComponent } from '../../ui/profile-photo.component';

@Component({
  selector: 'app-donor-institution-page',
  imports: [RouterLink, ProfilePhotoComponent, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'auth.role.hospital' | t }}</p>
      <h1>{{ profile()?.name || ('hospital.profile.title' | t) }}</h1>
      <p class="hp-lead">{{ 'donor.institution.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingHospital' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else if (profile()) {
        <article class="hp-profile-head">
          <app-profile-photo class="hp-avatar" [url]="mediaUrl(profile()!.logoUrl)" [alt]="profile()!.name" [initials]="profile()!.name.slice(0, 2)" />
          <div>
            <div class="hp-toolbar">
              <h2>{{ profile()!.name }}</h2>
              @if (profile()!.verification === 'verified') {
                <span class="hp-pill hp-pill--ok">{{ 'verification.verifiedInstitution' | t }}</span>
              } @else {
                <span class="hp-pill hp-pill--warn">{{ verificationLabel(profile()!.verification) }}</span>
              }
            </div>
            <p class="hp-note">{{ i18n.institutionType(profile()!.type) }} · {{ profile()!.city }}, {{ profile()!.region }}</p>
            <p class="hp-note">{{ profile()!.address }}</p>
            @if (profile()!.registeredAt) {
              <p class="hp-note">{{ 'donor.institution.since' | t:{ date: i18n.formatDate(profile()!.registeredAt) } }}</p>
            }
          </div>
        </article>

        <div class="hp-stats">
          <article class="hp-stat"><strong>{{ profile()!.stats.activeRequests }}</strong><span>{{ 'hospital.dashboard.activeRequests' | t }}</span><small>{{ 'donor.institution.activeHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ profile()!.stats.fulfilledRequests }}</strong><span>{{ 'donor.institution.completedRequests' | t }}</span><small>{{ 'donor.institution.completedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ profile()!.stats.completedDonations }}</strong><span>{{ 'donor.profile.completedDonations' | t }}</span><small>{{ 'donor.institution.donationsHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ profile()!.stats.donorsResponded }}</strong><span>{{ 'hospital.profile.donorResponses' | t }}</span><small>{{ 'donor.institution.responsesHint' | t }}</small></article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'donor.institution.contactLocation' | t }}</h2>
          <div class="hp-metric"><span>{{ 'phone' | t }}</span><b>{{ profile()!.phone || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'email' | t }}</span><b>{{ profile()!.email || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'form.website' | t }}</span><b>{{ profile()!.website || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'form.workingHours' | t }}</span><b>{{ profile()!.workingHours || ('donor.institution.hoursUnpublished' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'donor.institution.registration' | t }}</span><b>{{ profile()!.registrationNumber || ('common.emDash' | t) }}</b></div>
        </article>

        <article class="hp-panel">
          <h2>{{ 'about' | t }}</h2>
          @if (profile()!.description) {
            <p class="hp-note">{{ profile()!.description }}</p>
          } @else {
            <p class="hp-empty">{{ 'donor.institution.noDescription' | t }}</p>
          }
        </article>

        <article class="hp-panel">
          <h2>{{ 'donor.institution.groupsRequested' | t }}</h2>
          @if (profile()!.requestedBloodGroups.length) {
            <p class="hp-note">{{ profile()!.requestedBloodGroups.join(', ') }}</p>
          } @else {
            <p class="hp-empty">{{ 'donor.institution.noRequests' | t }}</p>
          }
        </article>

        <article class="hp-panel">
          <h2>{{ 'donor.institution.activeRequests' | t }}</h2>
          @for (request of profile()!.activeRequests; track request.id) {
            <div class="hp-note-card">
              <strong>{{ 'donor.institution.requestLine' | t:{ bloodType: request.bloodType, units: i18n.units(request.units), urgency: i18n.enumLabel('urgency', request.urgency) } }}</strong>
              <p class="hp-note">{{ 'donor.institution.neededLine' | t:{ code: request.publicCode, date: i18n.formatDateTime(request.neededBefore) } }}</p>
              <a class="hp-btn hp-btn--ghost" routerLink="/donor/invitations">{{ 'donor.institution.openInvitations' | t }}</a>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'donor.institution.emptyActive' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class DonorInstitutionPageComponent {
  private readonly api = inject(DonorApiService);
  readonly hospitalId = inject(ActivatedRoute).snapshot.paramMap.get('hospitalId') ?? '';
  readonly profile = signal<InstitutionProfileDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly mediaUrl = mediaUrl;
  readonly verificationLabel = verificationLabel;
  readonly i18n = inject(I18nService);

  constructor() {
    this.api.hospitalProfile(this.hospitalId).subscribe({
      next: (item) => {
        this.profile.set(item);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
