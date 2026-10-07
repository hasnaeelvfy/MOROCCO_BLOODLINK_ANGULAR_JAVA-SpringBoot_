import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BloodRequestDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-hospital-messages-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.messages.kicker' | t }}</p>
      <h1>{{ 'hospital.messages.title' | t }}</h1>
      <p class="hp-lead">{{ 'hospital.messages.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingThreads' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          @for (item of threads(); track item.id) {
            <div class="hp-match">
              <div>
                <strong>{{ item.publicCode }}</strong>
                <p class="hp-note">{{ item.bloodType }} · {{ i18n.requestDisplay(item.displayStatus) }}</p>
              </div>
              <span>{{ 'common.acceptedCount' | t:{ n: item.matchCounts.accepted } }}</span>
              <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/messages', item.id]">{{ 'hospital.messages.openThread' | t }}</a>
            </div>
          } @empty {
            <p class="hp-empty">{{ 'hospital.messages.emptyThreads' | t }}</p>
          }
        </article>
      }
    </section>
  `
})
export class HospitalMessagesPageComponent {
  private readonly api = inject(HospitalApiService);
  readonly i18n = inject(I18nService);
  readonly threads = signal<BloodRequestDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.requests().subscribe({
      next: (items) => {
        this.threads.set(items.filter((item) => item.matchCounts.accepted > 0));
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
