import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminOverviewDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.dashboard.title' | t }}</p>
      <h1>{{ i18n.t('greeting.good', { part: i18n.greetingPart(), name: i18n.t('auth.role.administrator') }) }}</h1>
      <p class="hp-lead">{{ 'admin.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingOverview' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else if (overview()) {
        <div class="hp-toolbar">
          <a class="hp-btn" routerLink="/admin/hospitals">{{ 'admin.reviewHospitals' | t }}</a>
          <a class="hp-btn hp-btn--ghost" routerLink="/admin/requests">{{ 'admin.requests.title' | t }}</a>
          <a class="hp-btn hp-btn--ghost" routerLink="/admin/audit-log">{{ 'admin.audit.title' | t }}</a>
        </div>

        <div class="hp-stats">
          <article class="hp-stat">
            <div class="hp-stat__icon">!</div>
            <strong>{{ overview()!.pendingVerifications }}</strong>
            <span>{{ 'admin.pendingReviews' | t }}</span>
            <small>{{ 'admin.hospitals.title' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">✓</div>
            <strong>{{ overview()!.verifiedHospitals ?? 0 }}</strong>
            <span>{{ 'admin.stat.verifiedHospitals' | t }}</span>
            <small>{{ 'admin.stat.suspendedHospitals' | t }} · {{ overview()!.suspendedHospitals ?? 0 }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ overview()!.activeDonors ?? 0 }}</strong>
            <span>{{ 'admin.stat.activeDonors' | t }}</span>
            <small>{{ 'admin.stat.eligibleDonors' | t }} · {{ overview()!.eligibleDonors ?? 0 }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">↗</div>
            <strong>{{ overview()!.activeRequests }}</strong>
            <span>{{ 'hospital.dashboard.activeRequests' | t }}</span>
            <small>{{ 'admin.fulfilled' | t }} · {{ overview()!.fulfilledRequests }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ overview()!.pendingMatches ?? 0 }}</strong>
            <span>{{ 'admin.stat.pendingMatches' | t }}</span>
            <small>{{ 'admin.stat.acceptedMatches' | t }} · {{ overview()!.acceptedMatches ?? 0 }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">✓</div>
            <strong>{{ overview()!.completedDonations ?? 0 }}</strong>
            <span>{{ 'admin.stat.completedDonations' | t }}</span>
            <small>{{ 'admin.stat.donors' | t }} · {{ overview()!.donors }}</small>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'admin.overview.snapshot' | t }}</h2>
          <div class="hp-metric"><span>{{ 'admin.hospitals.title' | t }}</span><b>{{ overview()!.hospitals }}</b></div>
          <div class="hp-metric"><span>{{ 'admin.stat.rejectedHospitals' | t }}</span><b>{{ overview()!.rejectedHospitals ?? 0 }}</b></div>
          <div class="hp-metric"><span>{{ 'admin.stat.cancelledRequests' | t }}</span><b>{{ overview()!.cancelledRequests ?? 0 }}</b></div>
          <div class="hp-metric"><span>{{ 'admin.stat.expiredRequests' | t }}</span><b>{{ overview()!.expiredRequests ?? 0 }}</b></div>
        </article>
      }
    </section>
  `
})
export class AdminPageComponent {
  private readonly api = inject(AdminApiService);
  readonly i18n = inject(I18nService);
  readonly overview = signal<AdminOverviewDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.overview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
