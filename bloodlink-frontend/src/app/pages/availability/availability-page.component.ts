import { Component, inject } from '@angular/core';
import { DonorApiService } from '../../core/api/donor-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-availability-page',
  imports: [TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'availability' | t }}</p>
      <h1>{{ api.profile()?.available ? ('availability.titleAvailable' | t) : ('availability.titleUnavailable' | t) }}</h1>
      <p class="hp-lead">{{ 'availability.help' | t }}</p>
      <article class="hp-panel">
        <div class="hp-metric"><span>{{ 'availability.currentStatus' | t }}</span><b>{{ api.profile()?.available ? ('available' | t) : ('notAvailable' | t) }}</b></div>
        <div class="hp-metric"><span>{{ 'bloodType' | t }}</span><b>{{ api.profile()?.bloodType || ('common.emDash' | t) }}</b></div>
        <div class="hp-actions" style="margin-top:18px">
          <button class="hp-btn" type="button" (click)="set(true)">{{ 'availability.setAvailable' | t }}</button>
          <button class="hp-btn hp-btn--ghost" type="button" (click)="set(false)">{{ 'availability.setUnavailable' | t }}</button>
        </div>
      </article>
    </section>
  `
})
export class AvailabilityPageComponent {
  readonly api = inject(DonorApiService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);

  constructor() {
    this.api.loadProfile().subscribe();
  }

  set(available: boolean): void {
    this.api.setAvailable(available).subscribe({
      next: () => this.toast.show(available ? this.i18n.t('toast.availableOn') : this.i18n.t('toast.availableOff'), 'success'),
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }
}
