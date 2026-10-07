import { Component, inject, signal } from '@angular/core';
import { DonationDto } from '../../core/api/api.models';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-history-page',
  imports: [TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'history' | t }}</p>
      <h1>{{ 'history.recordTitle' | t }}</h1>
      <p class="hp-lead">{{ 'history.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingHistory' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <div class="hp-stats">
          <article class="hp-stat">
            <div class="hp-stat__icon">↗</div>
            <strong>{{ donations().length }}</strong>
            <span>{{ 'donor.profile.completedDonations' | t }}</span>
            <small>{{ 'history.completedHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ profile()?.acceptedRequests || 0 }}</strong>
            <span>{{ 'donor.profile.acceptedRequests' | t }}</span>
            <small>{{ 'history.acceptedHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">●</div>
            <strong>{{ profile()?.lastDonation ? i18n.formatDate(profile()?.lastDonation) : ('common.emDash' | t) }}</strong>
            <span>{{ 'lastDonation' | t }}</span>
            <small>{{ 'history.lastHint' | t }}</small>
          </article>
          <article class="hp-stat">
            <div class="hp-stat__icon">✓</div>
            <strong>{{ profile()?.nextEligible ? i18n.formatDate(profile()?.nextEligible) : ('common.emDash' | t) }}</strong>
            <span>{{ 'nextEligible' | t }}</span>
            <small>{{ 'history.nextHint' | t }}</small>
          </article>
        </div>
        <article class="hp-panel">
          <h2>{{ 'history.pastDonations' | t }}</h2>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.date' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.units' | t }}</th>
                  <th>{{ 'table.hospital' | t }}</th>
                  <th>{{ 'donor.invitations.request' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of donations(); track item.id) {
                  <tr>
                    <td>{{ i18n.formatDate(item.date) }}</td>
                    <td>{{ item.bloodType }}</td>
                    <td>{{ item.units }}</td>
                    <td>{{ item.hospital }}</td>
                    <td>{{ item.publicRequestCode || ('common.emDash' | t) }}</td>
                    <td><span class="hp-pill" [class.hp-pill--ok]="item.status === 'completed'">{{ i18n.enumLabel('matchStatus', item.status) }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="hp-empty">{{ 'donor.history.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class HistoryPageComponent {
  private readonly api = inject(DonorApiService);
  readonly i18n = inject(I18nService);
  readonly donations = signal<DonationDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly profile = this.api.profile;

  constructor() {
    this.api.loadProfile().subscribe();
    this.api.history().subscribe({
      next: (items) => {
        this.donations.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
