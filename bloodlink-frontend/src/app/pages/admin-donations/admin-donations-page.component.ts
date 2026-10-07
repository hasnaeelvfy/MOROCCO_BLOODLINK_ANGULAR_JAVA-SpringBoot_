import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DonationDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-donations-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.donations.kicker' | t }}</p>
      <h1>{{ 'admin.donations.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--2">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.date' | t }}</th>
                  <th>{{ 'table.hospital' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.units' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.requestId' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of donations(); track item.id) {
                  <tr>
                    <td>{{ i18n.formatDate(item.date) }}</td>
                    <td>{{ item.hospital }}</td>
                    <td>{{ item.bloodType }}</td>
                    <td>{{ item.units }}</td>
                    <td><span class="hp-pill" [class.hp-pill--ok]="item.status === 'completed'">{{ i18n.enumLabel('matchStatus', item.status) }}</span></td>
                    <td>{{ item.publicRequestCode || ('common.emDash' | t) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="hp-empty">{{ 'admin.donations.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminDonationsPageComponent {
  private readonly api = inject(AdminApiService);
  readonly i18n = inject(I18nService);
  readonly donations = signal<DonationDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.donations(this.query).subscribe({
      next: (items) => {
        this.donations.set(items);
        this.loading.set(false);
        this.error.set('');
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
