import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConnectedDonorProfileDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ProfilePhotoComponent } from '../../ui/profile-photo.component';

@Component({
  selector: 'app-hospital-donor-page',
  imports: [RouterLink, ProfilePhotoComponent, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.donor.kicker' | t }}</p>
      <h1>{{ profile()?.fullName || ('donor.profile.title' | t) }}</h1>
      <p class="hp-lead">{{ 'hospital.donor.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingDonor' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else if (profile()) {
        <article class="hp-profile-head">
          <app-profile-photo class="hp-avatar" [url]="profile()!.avatarUrl" [alt]="profile()!.fullName" [initials]="profile()!.fullName.slice(0, 2)" [authenticated]="true" />
          <div>
            <div class="hp-toolbar">
              <h2>{{ profile()!.fullName }}</h2>
              <span class="hp-pill">{{ profile()!.publicCode }}</span>
            </div>
            <p class="hp-note">{{ profile()!.bloodType || ('hospital.donor.bloodTypeUnset' | t) }} · {{ profile()!.city }}, {{ profile()!.region }}</p>
            <p class="hp-note">{{ 'hospital.donor.eligibilityLine' | t:{ value: i18n.enumLabel('eligibility', profile()!.eligibility) } }}</p>
          </div>
        </article>

        <div class="hp-stats">
          <article class="hp-stat"><strong>{{ profile()!.completedDonations }}</strong><span>{{ 'donor.profile.completedDonations' | t }}</span><small>{{ 'hospital.donor.completedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ profile()!.acceptedRequests }}</strong><span>{{ 'donor.profile.acceptedRequests' | t }}</span><small>{{ 'hospital.donor.acceptedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ profile()!.lastDonation ? i18n.formatDate(profile()!.lastDonation) : ('common.emDash' | t) }}</strong><span>{{ 'lastDonation' | t }}</span><small>{{ 'hospital.donor.lastHint' | t }}</small></article>
          <article class="hp-stat">
            <strong>{{ profile()!.reliabilityPercent == null ? ('common.emDash' | t) : ('common.percent' | t:{ n: profile()!.reliabilityPercent ?? 0 }) }}</strong>
            <span>{{ 'donor.profile.reliability' | t }}</span>
            <small>{{ profile()!.reliabilityPercent == null ? ('hospital.donor.reliabilityEmpty' | t) : profile()!.reliabilityFormula }}</small>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'hospital.donor.contact' | t }}</h2>
          <div class="hp-metric"><span>{{ 'phone' | t }}</span><b>{{ profile()!.phone || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'form.cin' | t }}</span><b>{{ profile()!.cin || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'nextEligible' | t }}</span><b>{{ profile()!.nextEligible ? i18n.formatDate(profile()!.nextEligible) : ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'hospital.donor.currentMatch' | t }}</span><b>{{ profile()!.currentMatchStatus ? i18n.enumLabel('matchStatus', profile()!.currentMatchStatus) : ('common.emDash' | t) }}</b></div>
          @if (profile()!.currentRequestId) {
            <div class="hp-actions" style="margin-top:16px">
              <a class="hp-btn" [routerLink]="['/hospital/messages', profile()!.currentRequestId]">{{ 'donor.invitations.openMessages' | t }}</a>
              <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/matching', profile()!.currentRequestId]">{{ 'request.detail.openMatching' | t }}</a>
            </div>
          }
        </article>

        <article class="hp-panel">
          <h2>{{ 'hospital.donor.historyWithHospital' | t }}</h2>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.date' | t }}</th>
                  <th>{{ 'table.bloodRequest' | t }}</th>
                  <th>{{ 'table.bloodGroup' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.hospital' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of profile()!.donationsWithThisHospital; track row.id) {
                  <tr>
                    <td>{{ i18n.formatDate(row.date) }}</td>
                    <td>{{ row.publicRequestCode || ('common.emDash' | t) }}</td>
                    <td>{{ row.bloodType }}</td>
                    <td>{{ i18n.enumLabel('matchStatus', row.status) }}</td>
                    <td>{{ row.hospital }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="hp-empty">{{ 'hospital.donor.emptyDonations' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class HospitalDonorPageComponent {
  private readonly api = inject(HospitalApiService);
  readonly donorId = inject(ActivatedRoute).snapshot.paramMap.get('donorId') ?? '';
  readonly profile = signal<ConnectedDonorProfileDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly i18n = inject(I18nService);

  constructor() {
    this.api.donorProfile(this.donorId).subscribe({
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
