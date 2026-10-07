import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatchDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-matches-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.matches.kicker' | t }}</p>
      <h1>{{ 'admin.matches.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--2">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
            <div class="hp-field">
              <label>{{ 'table.status' | t }}</label>
              <select [(ngModel)]="status" name="status" (ngModelChange)="reload()">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="PENDING">{{ 'matchStatus.PENDING' | t }}</option>
                <option value="ACCEPTED">{{ 'matchStatus.ACCEPTED' | t }}</option>
                <option value="CONTACTED">{{ 'matchStatus.CONTACTED' | t }}</option>
                <option value="SCHEDULED">{{ 'matchStatus.SCHEDULED' | t }}</option>
                <option value="COMPLETED">{{ 'matchStatus.COMPLETED' | t }}</option>
                <option value="DECLINED">{{ 'matchStatus.DECLINED' | t }}</option>
                <option value="CANCELLED">{{ 'matchStatus.CANCELLED' | t }}</option>
              </select>
            </div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.donor' | t }}</th>
                  <th>{{ 'table.requestId' | t }}</th>
                  <th>{{ 'table.hospital' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of matches(); track item.id) {
                  <tr>
                    <td>{{ item.donorName || item.donorPublicCode }}</td>
                    <td>{{ item.publicRequestCode }}</td>
                    <td>{{ item.hospital }}</td>
                    <td><span class="hp-pill">{{ i18n.enumLabel('matchStatus', item.status) }}</span></td>
                    <td>{{ item.bloodType }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="hp-empty">{{ 'admin.matches.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminMatchesPageComponent {
  private readonly api = inject(AdminApiService);
  readonly i18n = inject(I18nService);
  readonly matches = signal<MatchDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';
  status = '';

  constructor() {
    this.reload();
  }

  reload(): void {
    this.api.matches(this.query, this.status).subscribe({
      next: (items) => {
        this.matches.set(items);
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
