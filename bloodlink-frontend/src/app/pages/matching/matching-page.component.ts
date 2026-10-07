import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BloodRequestDto, MatchDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-matching-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'matching.kicker' | t }}</p>
      <h1>{{ request()?.publicCode || requestId }}</h1>
      <p class="hp-lead">{{ 'matching.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingMatches' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <div class="hp-stats">
          <article class="hp-stat"><strong>{{ counts().total }}</strong><span>{{ 'matching.found' | t }}</span><small>{{ 'matching.foundHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ counts().total }}</strong><span>{{ 'matching.notified' | t }}</span><small>{{ 'matching.notifiedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ counts().accepted }}</strong><span>{{ 'donor.dashboard.accepted' | t }}</span><small>{{ 'matching.acceptedHint' | t }}</small></article>
          <article class="hp-stat"><strong>{{ counts().completed }}</strong><span>{{ 'matchStatus.COMPLETED' | t }}</span><small>{{ 'matching.completedHint' | t }}</small></article>
        </div>
        <article class="hp-panel">
          @for (item of matches(); track item.id) {
            <div class="hp-match">
              <div>
                <strong>{{ item.donorName || item.donorPublicCode }}</strong>
                <p class="hp-note">{{ i18n.enumLabel('compatibility', item.compatibility) }}{{ item.donorPhone ? ' · ' + item.donorPhone : '' }}{{ item.donorCin ? ' · ' + item.donorCin : '' }}{{ item.matchScore != null ? ' · ' + ('matching.score' | t:{ n: item.matchScore || 0 }) : '' }}</p>
              </div>
              <span>{{ i18n.formatDistance(item.distanceKm) }}</span>
              <span>{{ item.available ? ('available' | t) : ('notAvailable' | t) }}</span>
              <span class="hp-pill" [class.hp-pill--ok]="item.status === 'ACCEPTED' || item.status === 'COMPLETED'" [class.hp-pill--warn]="item.urgency === 'CRITICAL'">{{ i18n.enumLabel('matchStatus', item.status) }}</span>
              <span class="hp-note">{{ i18n.enumLabel('layer', item.layer) }}</span>
              @if (canManage(item) && item.donorId) {
                <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/donors', item.donorId]">{{ 'matching.openProfile' | t }}</a>
                <button class="hp-btn hp-btn--ghost" type="button" (click)="contact(item)">{{ 'matching.contact' | t }}</button>
                <input class="hp-field" type="datetime-local" [(ngModel)]="scheduleAt[item.id]" />
                <button class="hp-btn hp-btn--ghost" type="button" (click)="schedule(item)">{{ 'matching.schedule' | t }}</button>
                <button class="hp-btn" type="button" (click)="complete(item)">{{ 'matching.confirmDonation' | t }}</button>
                <button class="hp-btn hp-btn--ghost" type="button" (click)="cancel(item, false)">{{ 'matching.cancelDonation' | t }}</button>
              }
            </div>
          } @empty {
            <p class="hp-empty">{{ 'matching.emptySuitable' | t }}</p>
          }
        </article>
      }
      <div class="hp-toolbar" style="margin-top:16px">
        <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', requestId]">{{ 'matching.backToRequest' | t }}</a>
      </div>
    </section>
  `
})
export class MatchingPageComponent {
  private readonly api = inject(HospitalApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('requestId') ?? '';
  readonly request = signal<BloodRequestDto | null>(null);
  readonly matches = signal<MatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  scheduleAt: Record<number, string> = {};

  constructor() {
    this.reload();
  }

  counts() {
    const list = this.matches();
    return {
      total: list.length,
      pending: list.filter((item) => item.status === 'PENDING').length,
      accepted: list.filter((item) => item.status === 'ACCEPTED' || item.status === 'CONTACTED' || item.status === 'SCHEDULED').length,
      declined: list.filter((item) => item.status === 'DECLINED').length,
      completed: list.filter((item) => item.status === 'COMPLETED').length
    };
  }

  canManage(item: MatchDto): boolean {
    return item.status === 'ACCEPTED' || item.status === 'CONTACTED' || item.status === 'SCHEDULED';
  }

  contact(item: MatchDto): void {
    this.api.contactMatch(item.id).subscribe({
      next: () => this.reload(),
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  schedule(item: MatchDto): void {
    const value = this.scheduleAt[item.id];
    if (!value) {
      this.toast.show(this.i18n.t('matching.scheduleRequired'), 'error');
      return;
    }
    this.api.scheduleMatch(item.id, value).subscribe({
      next: () => this.reload(),
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  async complete(item: MatchDto): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('matching.confirmDonation'),
      body: this.i18n.t('matching.confirmDonationBody')
    });
    if (!ok) return;
    this.api.completeMatch(item.id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('matching.donationRecorded'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  async cancel(item: MatchDto, noShow: boolean): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('matching.cancelDonation'),
      body: this.i18n.t('matching.cancelDonationBody'),
      danger: true
    });
    if (!ok) return;
    this.api.cancelDonation(item.id, undefined, noShow).subscribe({
      next: () => this.reload(),
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(): void {
    this.api.request(this.requestId).subscribe({
      next: (item) => this.request.set(item),
      error: () => this.request.set(null)
    });
    this.api.requestMatches(this.requestId).subscribe({
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
