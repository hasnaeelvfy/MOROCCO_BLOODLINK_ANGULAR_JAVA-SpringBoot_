import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HospitalDashboardDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-hospital-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.dashboard.title' | t }}</p>
      <h1>{{ i18n.t('greeting.good', { part: i18n.greetingPart(), name: dashboard()?.hospitalName || i18n.t('greeting.fallbackHospital') }) }}</h1>
      <p class="hp-lead">{{ 'hospital.dashboard.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingDashboard' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <div class="hp-toolbar">
          <a class="hp-btn" routerLink="/hospital/requests/new">{{ 'hospital.dashboard.createPlus' | t }}</a>
          <a class="hp-btn hp-btn--ghost" routerLink="/hospital/requests">{{ 'hospital.dashboard.viewAll' | t }}</a>
        </div>

        <div class="hp-stats">
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ dashboard()?.stats?.activeRequests || 0 }}</strong>
            <span>{{ 'hospital.dashboard.activeRequests' | t }}</span>
            <small>{{ 'hospital.dashboard.activeHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">!</div>
            <strong>{{ dashboard()?.stats?.criticalRequests || 0 }}</strong>
            <span>{{ 'hospital.dashboard.critical' | t }}</span>
            <small>{{ 'hospital.dashboard.criticalHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">↗</div>
            <strong>{{ dashboard()?.stats?.donorsResponded || 0 }}</strong>
            <span>{{ 'hospital.dashboard.donorsResponded' | t }}</span>
            <small>{{ 'hospital.dashboard.donorsRespondedHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">✓</div>
            <strong>{{ dashboard()?.stats?.fulfilledRequests || 0 }}</strong>
            <span>{{ 'hospital.dashboard.fulfilled' | t }}</span>
            <small>{{ 'hospital.dashboard.fulfilledHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ dashboard()?.stats?.cancelledRequests || 0 }}</strong>
            <span>{{ 'hospital.dashboard.cancelled' | t }}</span>
            <small>{{ 'hospital.dashboard.cancelledHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">↗</div>
            <strong>{{ dashboard()?.stats?.completedDonations || 0 }}</strong>
            <span>{{ 'hospital.dashboard.completedDonations' | t }}</span>
            <small>{{ 'hospital.dashboard.completedDonationsHint' | t }}</small>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'hospital.requests.title' | t }}</h2>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.requestId' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.units' | t }}</th>
                  <th>{{ 'table.urgency' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.donors' | t }}</th>
                  <th>{{ 'table.created' | t }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of dashboard()?.recentRequests ?? []; track item.id) {
                  <tr>
                    <td>{{ item.publicCode }}</td>
                    <td>{{ item.bloodType }}</td>
                    <td>{{ item.matchCounts.accepted }}/{{ item.units }}</td>
                    <td>{{ i18n.enumLabel('urgency', item.urgency) }}</td>
                    <td><span class="hp-pill" [class.hp-pill--ok]="item.status === 'FULFILLED'" [class.hp-pill--warn]="item.urgency === 'CRITICAL'">{{ i18n.requestDisplay(item.displayStatus) }}</span></td>
                    <td>{{ 'common.acceptedCount' | t:{ n: item.matchCounts.accepted } }}</td>
                    <td>{{ i18n.formatDate(item.createdAt) }}</td>
                    <td><a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', item.id]">{{ 'common.view' | t }}</a></td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="hp-empty">{{ 'hospital.dashboard.emptyCreate' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="hp-panel">
          <h2>{{ 'hospital.dashboard.recentActivity' | t }}</h2>
          @for (item of dashboard()?.recentNotifications ?? []; track item.id) {
            <div class="hp-note-card">
              <strong>{{ i18n.notificationTitle(item.kind, item.title) }}</strong>
              <p class="hp-note">{{ i18n.notificationBody(item.kind, item.body) }}</p>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'hospital.dashboard.emptyActivity' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class HospitalPageComponent {
  private readonly api = inject(HospitalApiService);
  readonly i18n = inject(I18nService);
  readonly dashboard = signal<HospitalDashboardDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.dashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
