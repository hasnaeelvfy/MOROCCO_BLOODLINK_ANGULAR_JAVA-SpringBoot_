import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BloodRequestDto, MatchDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-request-detail-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingRequest' | t }}</p>
      } @else if (error()) {
        <h1>{{ 'request.detail.notFound' | t }}</h1>
        <p class="hp-empty">{{ error() }}</p>
        <a class="hp-btn" routerLink="/hospital/requests">{{ 'request.detail.backToRequests' | t }}</a>
      } @else {
        @if (request(); as item) {
        <p class="hp-kicker">{{ item.publicCode }}</p>
        <h1>{{ i18n.requestDisplay(item.displayStatus) }}</h1>
        <p class="hp-lead">
          {{ 'request.detail.lead' | t:{ bloodType: item.bloodType, units: item.units, remaining: item.unitsRemaining } }}
        </p>
        <div class="hp-toolbar">
          @if (item.editable) {
            <a class="hp-btn" [routerLink]="['/hospital/requests', item.id, 'edit']">{{ 'request.detail.edit' | t }}</a>
            <button class="hp-btn hp-btn--danger" type="button" (click)="cancel()">{{ 'request.detail.cancel' | t }}</button>
          }
          <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/matching', item.id]">{{ 'request.detail.openMatching' | t }}</a>
          <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/messages', item.id]">{{ 'chat.title' | t }}</a>
        </div>

        <div class="hp-split">
          <article class="hp-panel">
            <h2>{{ 'request.detail.overview' | t }}</h2>
            <div class="hp-metric"><span>{{ 'table.requestId' | t }}</span><b>{{ item.publicCode }}</b></div>
            <div class="hp-metric"><span>{{ 'bloodType' | t }}</span><b>{{ item.bloodType }}</b></div>
            <div class="hp-metric"><span>{{ 'request.detail.unitsRequired' | t }}</span><b>{{ item.units }}</b></div>
            <div class="hp-metric"><span>{{ 'request.detail.unitsFulfilled' | t }}</span><b>{{ item.unitsFulfilled }}</b></div>
            <div class="hp-metric"><span>{{ 'request.detail.unitsRemaining' | t }}</span><b>{{ item.unitsRemaining }}</b></div>
            <div class="hp-metric"><span>{{ 'table.urgency' | t }}</span><b>{{ i18n.enumLabel('urgency', item.urgency) }}</b></div>
            <div class="hp-metric"><span>{{ 'table.status' | t }}</span><b>{{ i18n.requestDisplay(item.displayStatus) }}</b></div>
            <div class="hp-metric"><span>{{ 'table.created' | t }}</span><b>{{ i18n.formatDateTime(item.createdAt) }}</b></div>
            <div class="hp-metric"><span>{{ 'form.requiredBefore' | t }}</span><b>{{ i18n.formatDateTime(item.neededBefore) }}</b></div>
            <div class="hp-metric"><span>{{ 'emergency.location' | t }}</span><b>{{ item.hospital }} · {{ item.city }}</b></div>
          </article>
          <article class="hp-panel">
            <h2>{{ 'request.detail.matchingProgress' | t }}</h2>
            <div class="hp-progress"><i [style.width.%]="progress()"></i></div>
            <div class="hp-metric"><span>{{ 'request.detail.suitableFound' | t }}</span><b>{{ item.matchCounts.total }}</b></div>
            <div class="hp-metric"><span>{{ 'matching.notified' | t }}</span><b>{{ item.matchCounts.total }}</b></div>
            <div class="hp-metric"><span>{{ 'donor.dashboard.accepted' | t }}</span><b>{{ item.matchCounts.accepted }}</b></div>
            <div class="hp-metric"><span>{{ 'decline' | t }}</span><b>{{ item.matchCounts.declined }}</b></div>
            <div class="hp-metric"><span>{{ 'matchStatus.PENDING' | t }}</span><b>{{ item.matchCounts.pending }}</b></div>
            <p class="hp-note">{{ 'request.detail.parallelNote' | t }}</p>
          </article>
        </div>

        <article class="hp-panel">
          <h2>{{ 'request.detail.donorMatching' | t }}</h2>
          @for (match of matches(); track match.id) {
            <div class="hp-match">
              <div>
                <strong>{{ match.donorName || match.donorPublicCode }}</strong>
                <p class="hp-note">{{ i18n.enumLabel('compatibility', match.compatibility) }}{{ match.donorPhone ? ' · ' + match.donorPhone : '' }}{{ match.donorCin ? ' · ' + match.donorCin : '' }}</p>
              </div>
              <span>{{ i18n.formatDistance(match.distanceKm) }}</span>
              <span>{{ match.available ? ('available' | t) : ('notAvailable' | t) }}</span>
              <span class="hp-pill">{{ i18n.enumLabel('matchStatus', match.status) }}</span>
              <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/matching', item.id]">{{ 'common.details' | t }}</a>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'request.detail.emptyMatches' | t }}</p>
          }
        </article>
        }
      }
    </section>
  `
})
export class RequestDetailPageComponent {
  private readonly api = inject(HospitalApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly id = this.route.snapshot.paramMap.get('requestId') ?? '';
  readonly request = signal<BloodRequestDto | null>(null);
  readonly matches = signal<MatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.reload();
  }

  progress(): number {
    const item = this.request();
    if (!item || !item.units) return 0;
    return Math.min(100, Math.round((item.unitsFulfilled / item.units) * 100));
  }

  async cancel(): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('dialog.request.cancel.title'),
      body: this.i18n.t('dialog.request.cancel.body'),
      danger: true
    });
    if (!ok) return;
    this.api.cancelRequest(this.id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.requestCancelled'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(): void {
    this.api.request(this.id).subscribe({
      next: (item) => {
        this.request.set(item);
        this.loading.set(false);
        this.error.set('');
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
    this.api.requestMatches(this.id).subscribe({
      next: (items) => this.matches.set(items),
      error: () => this.matches.set([])
    });
  }
}
