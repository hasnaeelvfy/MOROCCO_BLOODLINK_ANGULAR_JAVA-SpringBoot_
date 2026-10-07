import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DonorDashboardDto } from '../../core/api/api.models';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-donor-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'donor.dashboard.title' | t }}</p>
      <h1>{{ greetingLine() }}</h1>
      <p class="hp-lead">{{ 'donor.dashboard.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingDashboard' | t }}</p>
      } @else if (loadError()) {
        <p class="hp-empty">{{ errorText() }}</p>
      } @else {
        <div class="hp-toolbar">
          <button class="hp-btn" type="button" (click)="toggleAvailability()">
            {{ dashboard()?.profile?.available ? ('availability.setUnavailable' | t) : ('availability.setAvailable' | t) }}
          </button>
          <a class="hp-btn hp-btn--ghost" routerLink="/donor/invitations">{{ 'donor.dashboard.viewInvitations' | t }}</a>
          <a class="hp-btn hp-btn--ghost" routerLink="/donor/profile">{{ 'donor.dashboard.editProfile' | t }}</a>
        </div>

        <div class="hp-stats">
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ dashboard()?.stats?.pendingInvitations || 0 }}</strong>
            <span>{{ 'donor.dashboard.openInvitations' | t }}</span>
            <small>{{ 'donor.dashboard.openInvitationsHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">✓</div>
            <strong>{{ dashboard()?.stats?.accepted || 0 }}</strong>
            <span>{{ 'donor.dashboard.accepted' | t }}</span>
            <small>{{ 'donor.dashboard.acceptedHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">↗</div>
            <strong>{{ dashboard()?.stats?.donations || 0 }}</strong>
            <span>{{ 'donor.dashboard.donations' | t }}</span>
            <small>{{ 'donor.dashboard.donationsHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">!</div>
            <strong>{{ eligibilityLabel() }}</strong>
            <span>{{ 'screening' | t }}</span>
            <small>{{ dashboard()?.profile?.nextEligible ? i18n.t('donor.dashboard.nextReview') + ' ' + i18n.formatDate(dashboard()?.profile?.nextEligible) : ('donor.dashboard.preliminaryOnly' | t) }}</small>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'donor.dashboard.impact' | t }}</h2>
          <p class="hp-note">{{ 'donor.dashboard.impactNote' | t:{ count: donationCountLabel() } }}</p>
          @if (dashboard()?.profile?.reliabilityPercent != null) {
            <p class="hp-note">{{ 'donor.dashboard.reliability' | t:{ n: dashboard()?.profile?.reliabilityPercent ?? 0, formula: dashboard()?.profile?.reliabilityFormula ?? '' } }}</p>
          }
        </article>

        <article class="hp-panel">
          <h2>{{ 'availability' | t }}</h2>
          <div class="hp-metric"><span>{{ 'table.status' | t }}</span><b>{{ dashboard()?.profile?.available ? ('available' | t) : ('notAvailable' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'bloodType' | t }}</span><b>{{ dashboard()?.profile?.bloodType || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'donor.dashboard.age' | t }}</span><b>{{ dashboard()?.profile?.age || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'donor.dashboard.weight' | t }}</span><b>{{ dashboard()?.profile?.weightKg ? ('common.weightKg' | t:{ n: dashboard()?.profile?.weightKg ?? 0 }) : ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'donor.dashboard.height' | t }}</span><b>{{ dashboard()?.profile?.heightCm ? ('common.heightCm' | t:{ n: dashboard()?.profile?.heightCm ?? 0 }) : ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'city' | t }}</span><b>{{ dashboard()?.profile?.city || ('common.emDash' | t) }}</b></div>
          <div class="hp-metric"><span>{{ 'donor.dashboard.completeness' | t }}</span><b>{{ 'common.percent' | t:{ n: dashboard()?.profile?.completion || 0 } }}</b></div>
          <div class="hp-progress"><i [style.width.%]="dashboard()?.profile?.completion || 0"></i></div>
          <p class="hp-note">{{ 'availability.help' | t }}</p>
        </article>

        <article class="hp-panel">
          <h2>{{ 'donor.dashboard.requestsNearYou' | t }}</h2>
          @for (item of dashboard()?.pendingInvitations ?? []; track item.id) {
            <div class="hp-note-card">
              <strong>{{ item.bloodType }} · {{ item.hospital }}</strong>
              <p class="hp-note">{{ 'donor.dashboard.inviteLine' | t:{ code: item.publicRequestCode, distance: i18n.formatDistance(item.distanceKm), units: i18n.units(item.units), date: item.neededBefore ? i18n.formatDate(item.neededBefore) : ('common.emDash' | t) } }}</p>
              <div class="hp-actions" style="margin-top:12px">
                <span class="hp-pill" [class.hp-pill--warn]="item.urgency === 'CRITICAL'">{{ i18n.enumLabel('urgency', item.urgency) }}</span>
                <a class="hp-btn" routerLink="/donor/invitations">{{ 'donor.dashboard.respond' | t }}</a>
              </div>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'donor.dashboard.emptyInvitesLong' | t }}</p>
          }
        </article>

        <article class="hp-panel">
          <h2>{{ 'donor.dashboard.recentActivity' | t }}</h2>
          @for (item of dashboard()?.recentNotifications ?? []; track item.id) {
            <div class="hp-note-card">
              <strong>{{ i18n.notificationTitle(item.kind, item.title) }}</strong>
              <p class="hp-note">{{ i18n.notificationBody(item.kind, item.body) }}</p>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'donor.dashboard.emptyActivity' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class DonorPageComponent {
  private readonly api = inject(DonorApiService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly dashboard = signal<DonorDashboardDto | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<HttpErrorResponse | null>(null);

  constructor() {
    this.reload();
  }

  greetingLine(): string {
    this.i18n.locale();
    const name = (this.dashboard()?.profile.firstName ?? '').trim();
    const part = this.i18n.greetingPart();
    return name
      ? this.i18n.t('greeting.good', { part, name })
      : this.i18n.t('greeting.goodPlain', { part });
  }

  errorText(): string {
    this.i18n.locale();
    const error = this.loadError();
    return error ? httpErrorMessage(error) : '';
  }

  firstName(): string {
    return (this.dashboard()?.profile.firstName ?? '').trim();
  }

  eligibilityLabel(): string {
    return this.i18n.enumLabel('eligibility', this.dashboard()?.profile.eligibility);
  }

  donationCountLabel(): string {
    const n = this.dashboard()?.stats?.donations || 0;
    return n === 1 ? this.i18n.t('donor.dashboard.donationEvent', { n }) : this.i18n.t('donor.dashboard.donationEvents', { n });
  }

  toggleAvailability(): void {
    const next = !this.dashboard()?.profile.available;
    this.api.setAvailable(next).subscribe({
      next: () => {
        this.toast.show(next ? this.i18n.t('toast.availableOn') : this.i18n.t('toast.availableOff'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(): void {
    this.api.dashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.loadError.set(null);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadError.set(error);
        this.loading.set(false);
      }
    });
  }
}
