import { Component, computed, inject } from '@angular/core';
import { PublicApiService, PublicBloodRequest } from '../../core/api/public-api.service';
import { I18nService } from '../../i18n/i18n.service';
import { isRtl } from '../../i18n/locale';

@Component({
  selector: 'app-urgent-ticker',
  template: `
    @if (feed.hasActive()) {
      <div class="urgent-ticker" role="status" aria-live="polite">
        <div class="urgent-ticker__track" [style.animation-duration.s]="duration()">
          @for (item of loop(); track item.key) {
            <span class="urgent-ticker__item" [attr.dir]="rtl() ? 'rtl' : 'ltr'">{{ item.line }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .urgent-ticker {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 40;
      overflow: hidden;
      height: 38px;
      background: linear-gradient(90deg, #5c0d1c 0%, #ed3650 45%, #9b1630 100%);
      border-bottom: 1px solid rgba(255, 186, 194, 0.35);
      color: #fff7f8;
      box-shadow: 0 10px 28px rgba(237, 54, 80, 0.28);
      direction: ltr;
    }
    .urgent-ticker__track {
      display: flex;
      align-items: center;
      width: max-content;
      height: 100%;
      animation: urgent-scroll 80s linear infinite;
    }
    .urgent-ticker:hover .urgent-ticker__track {
      animation-play-state: paused;
    }
    .urgent-ticker__item {
      display: inline-flex;
      align-items: center;
      flex: none;
      height: 100%;
      padding: 0 28px;
      font-size: 0.82rem;
      line-height: 38px;
      letter-spacing: 0;
      text-transform: none;
      white-space: nowrap;
      color: #fff7f8;
      border-inline-end: 1px solid rgba(255, 255, 255, 0.18);
    }
    .urgent-ticker__item[dir='rtl'] {
      font-family: 'Cairo', 'Noto Naskh Arabic', var(--font-body);
    }
    @keyframes urgent-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .urgent-ticker__track { animation: none; }
    }
  `]
})
export class UrgentTickerComponent {
  readonly i18n = inject(I18nService);
  readonly rtl = computed(() => isRtl(this.i18n.locale()));
  readonly loop = computed(() => {
    this.i18n.locale();
    const items = this.feed.requests();
    return [0, 1].flatMap((copy) =>
      items.map((item) => ({
        key: `${copy}-${item.id}`,
        line: this.line(item)
      }))
    );
  });
  readonly duration = computed(() => Math.max(80, this.feed.requests().length * 14));

  constructor(readonly feed: PublicApiService) {}

  private line(item: PublicBloodRequest): string {
    return this.i18n.t('ticker.line', {
      urgency: this.urgencyLabel(item.urgency),
      bloodType: item.bloodType,
      units: String(item.units).padStart(2, '0'),
      unit: this.i18n.t('units.label'),
      city: this.i18n.cityName(item.city),
      code: item.publicCode,
      status: this.statusLabel(item)
    });
  }

  private urgencyLabel(urgency: string): string {
    if (urgency === 'CRITICAL') return this.i18n.t('urgency.criticalRequest');
    if (urgency === 'URGENT') return this.i18n.t('urgency.urgentRequest');
    return this.i18n.t('urgency.activeRequest');
  }

  private statusLabel(item: PublicBloodRequest): string {
    const code = (item.status || '').trim().toUpperCase();
    if (code === 'SEARCHING') return this.i18n.t('ticker.searching');
    if (code === 'PARTIAL') return this.i18n.t('requestStatus.PARTIAL');
    if (code === 'PAUSED') return this.i18n.t('requestStatus.PAUSED');
    if (code === 'FULFILLED') return this.i18n.t('requestStatus.FULFILLED');
    if (code === 'CANCELLED') return this.i18n.t('requestStatus.CANCELLED');
    if (code === 'EXPIRED') return this.i18n.t('requestStatus.EXPIRED');
    return this.i18n.requestDisplay(item.displayStatus);
  }
}
