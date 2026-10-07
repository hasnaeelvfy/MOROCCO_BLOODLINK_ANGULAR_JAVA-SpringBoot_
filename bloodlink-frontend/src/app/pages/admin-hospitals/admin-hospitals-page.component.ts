import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminHospitalSummaryDto, verificationLabel } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-admin-hospitals-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.hospitals.kicker' | t }}</p>
      <h1>{{ 'admin.hospitals.queue' | t }}</h1>
      <p class="hp-lead">{{ 'admin.hospitals.lead' | t }}</p>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingHospitals' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--2">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
            <div class="hp-field">
              <label>{{ 'table.status' | t }}</label>
              <select [(ngModel)]="verification" name="verification" (ngModelChange)="reload()">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="PENDING">{{ 'verification.pending' | t }}</option>
                <option value="VERIFIED">{{ 'verification.verified' | t }}</option>
                <option value="REJECTED">{{ 'verification.rejected' | t }}</option>
                <option value="SUSPENDED">{{ 'verification.suspended' | t }}</option>
              </select>
            </div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'admin.hospitals.title' | t }}</th>
                  <th>{{ 'city' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'phone' | t }}</th>
                  <th>{{ 'table.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of hospitals(); track item.id) {
                  <tr>
                    <td>
                      <strong>{{ item.name }}</strong>
                      <div class="hp-note">{{ item.registrationNumber || ('admin.hospitals.noRegistration' | t) }}</div>
                    </td>
                    <td>{{ item.city }}</td>
                    <td>
                      <span class="hp-pill" [class.hp-pill--ok]="item.verification === 'verified'" [class.hp-pill--warn]="item.verification === 'pending'">{{ verificationLabel(item.verification) }}</span>
                      @if (item.verificationReason) {
                        <div class="hp-note">{{ item.verificationReason }}</div>
                      }
                    </td>
                    <td>{{ item.phone }}</td>
                    <td>
                      <div class="hp-actions">
                        @if (item.verification === 'pending') {
                          <button class="hp-btn" type="button" (click)="act(item, 'verify')">{{ 'admin.hospitals.approve' | t }}</button>
                          <button class="hp-btn hp-btn--danger" type="button" (click)="act(item, 'reject')">{{ 'admin.hospitals.reject' | t }}</button>
                        }
                        @if (item.verification === 'verified') {
                          <button class="hp-btn hp-btn--ghost" type="button" (click)="act(item, 'suspend')">{{ 'admin.hospitals.suspend' | t }}</button>
                        }
                        @if (item.verification === 'suspended' || item.verification === 'rejected') {
                          <button class="hp-btn" type="button" (click)="act(item, 'reactivate')">{{ 'admin.hospitals.reactivate' | t }}</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="hp-empty">{{ 'admin.hospitals.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminHospitalsPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly hospitals = signal<AdminHospitalSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly verificationLabel = verificationLabel;
  query = '';
  verification = '';

  constructor() {
    this.reload();
  }

  async act(item: AdminHospitalSummaryDto, action: 'verify' | 'reject' | 'suspend' | 'reactivate'): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t(`dialog.admin.${action}.title`),
      body: this.i18n.t(`dialog.admin.${action}.body`),
      danger: action === 'reject' || action === 'suspend'
    });
    if (!ok) return;
    const request =
      action === 'verify' ? this.api.verify(item.id)
      : action === 'reject' ? this.api.reject(item.id)
      : action === 'suspend' ? this.api.suspendHospital(item.id)
      : this.api.reactivateHospital(item.id);
    request.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.hospitalVerificationUpdated'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  reload(): void {
    this.api.hospitals(this.query, this.verification).subscribe({
      next: (items) => {
        this.hospitals.set(items);
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
