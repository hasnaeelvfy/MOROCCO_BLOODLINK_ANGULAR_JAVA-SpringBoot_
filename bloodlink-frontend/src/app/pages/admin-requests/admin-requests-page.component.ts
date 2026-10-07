import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BloodRequestDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-admin-requests-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.requests.kicker' | t }}</p>
      <h1>{{ 'admin.requests.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--3">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
            <div class="hp-field">
              <label>{{ 'table.status' | t }}</label>
              <select [(ngModel)]="status" name="status" (ngModelChange)="reload()">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="SEARCHING">{{ 'requestStatus.SEARCHING' | t }}</option>
                <option value="PARTIAL">{{ 'requestStatus.PARTIAL' | t }}</option>
                <option value="FULFILLED">{{ 'requestStatus.FULFILLED' | t }}</option>
                <option value="CANCELLED">{{ 'requestStatus.CANCELLED' | t }}</option>
                <option value="EXPIRED">{{ 'requestStatus.EXPIRED' | t }}</option>
                <option value="PAUSED">{{ 'requestStatus.PAUSED' | t }}</option>
              </select>
            </div>
            <div class="hp-field">
              <label>{{ 'table.bloodType' | t }}</label>
              <input [(ngModel)]="bloodType" name="bloodType" (ngModelChange)="reload()" />
            </div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.requestId' | t }}</th>
                  <th>{{ 'table.hospital' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.urgency' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of requests(); track item.id) {
                  <tr>
                    <td>{{ item.publicCode }}</td>
                    <td>{{ item.hospital }}</td>
                    <td>{{ item.bloodType }}</td>
                    <td>{{ i18n.enumLabel('urgency', item.urgency) }}</td>
                    <td><span class="hp-pill">{{ i18n.requestDisplay(item.status) }}</span></td>
                    <td>
                      @if (item.status !== 'FULFILLED' && item.status !== 'CANCELLED') {
                        <button class="hp-btn hp-btn--danger" type="button" (click)="cancel(item)">{{ 'common.cancel' | t }}</button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="hp-empty">{{ 'admin.requests.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminRequestsPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly requests = signal<BloodRequestDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';
  status = '';
  bloodType = '';

  constructor() {
    this.reload();
  }

  async cancel(item: BloodRequestDto): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('dialog.admin.request.cancel.title'),
      body: this.i18n.t('dialog.admin.request.cancel.body'),
      danger: true
    });
    if (!ok) return;
    this.api.cancelRequest(item.id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.requestCancelled'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  reload(): void {
    this.api.requests(this.query, this.status, this.bloodType).subscribe({
      next: (items) => {
        this.requests.set(items);
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
