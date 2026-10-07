import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatchDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-hospital-matches-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.matches.kicker' | t }}</p>
      <h1>{{ 'hospital.matches.title' | t }}</h1>
      <p class="hp-lead">{{ 'hospital.matches.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingMatches' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          @for (item of matches(); track item.id) {
            <div class="hp-match">
              <div>
                <strong>{{ item.donorName || item.donorPublicCode }}</strong>
                <p class="hp-note">{{ i18n.enumLabel('compatibility', item.compatibility) }} · {{ item.publicRequestCode }}{{ item.donorPhone ? ' · ' + item.donorPhone : '' }}{{ item.matchScore != null ? ' · ' + ('matching.score' | t:{ n: item.matchScore }) : '' }}</p>
              </div>
              <span>{{ i18n.formatDistance(item.distanceKm) }}</span>
              <span>{{ item.available ? ('available' | t) : ('notAvailable' | t) }}</span>
              <span class="hp-pill" [class.hp-pill--ok]="item.status === 'ACCEPTED'" [class.hp-pill--warn]="item.urgency === 'CRITICAL' || item.urgency === 'URGENT'">{{ item.status === 'PENDING' ? (item.urgency === 'STANDARD' ? ('matchStatus.PENDING' | t) : i18n.enumLabel('urgency', item.urgency)) : i18n.enumLabel('matchStatus', item.status) }}</span>
              @if ((item.status === 'ACCEPTED' || item.status === 'CONTACTED' || item.status === 'SCHEDULED' || item.status === 'COMPLETED') && item.donorId) {
                <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/donors', item.donorId]">{{ 'nav.profile' | t }}</a>
              }
              <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/matching', item.requestId]">{{ 'common.view' | t }}</a>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'hospital.matches.emptyCreate' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class HospitalMatchesPageComponent {
  private readonly api = inject(HospitalApiService);
  readonly i18n = inject(I18nService);
  readonly matches = signal<MatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.matches().subscribe({
      next: (items) => {
        this.matches.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
