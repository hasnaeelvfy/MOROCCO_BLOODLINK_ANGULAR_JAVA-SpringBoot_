import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminDonorSummaryDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-admin-donors-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.donors.kicker' | t }}</p>
      <h1>{{ 'admin.donors.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--2">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
            <div class="hp-field"><label>{{ 'table.bloodType' | t }}</label><input [(ngModel)]="bloodType" name="bloodType" (ngModelChange)="reload()" /></div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'admin.donors.title' | t }}</th>
                  <th>{{ 'city' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.eligibility' | t }}</th>
                  <th>{{ 'admin.stat.completedDonations' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of donors(); track item.id) {
                  <tr>
                    <td>
                      <strong>{{ item.fullName }}</strong>
                      <div class="hp-note">{{ item.email }}</div>
                    </td>
                    <td>{{ item.city }}</td>
                    <td>{{ item.bloodType || ('common.emDash' | t) }}</td>
                    <td>{{ i18n.enumLabel('eligibility', item.eligibility) }}</td>
                    <td>{{ item.completedDonations }}</td>
                    <td><span class="hp-pill" [class.hp-pill--ok]="item.status === 'ACTIVE'">{{ i18n.accountStatus(item.status) }}</span></td>
                    <td>
                      <div class="hp-actions">
                        @if (item.status === 'ACTIVE') {
                          <button class="hp-btn hp-btn--ghost" type="button" (click)="toggle(item, false)">{{ 'admin.users.suspend' | t }}</button>
                        } @else {
                          <button class="hp-btn" type="button" (click)="toggle(item, true)">{{ 'admin.users.activate' | t }}</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="hp-empty">{{ 'admin.donors.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminDonorsPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly donors = signal<AdminDonorSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';
  bloodType = '';

  constructor() {
    this.reload();
  }

  async toggle(item: AdminDonorSummaryDto, activate: boolean): Promise<void> {
    const ok = await this.dialog.confirm({
      title: activate ? this.i18n.t('dialog.admin.user.reactivate.title') : this.i18n.t('dialog.admin.user.suspend.title'),
      body: activate ? this.i18n.t('dialog.admin.user.reactivate.body') : this.i18n.t('dialog.admin.user.suspend.body'),
      danger: !activate
    });
    if (!ok) return;
    const request = activate ? this.api.reactivateDonor(item.id) : this.api.suspendDonor(item.id);
    request.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.userStatusUpdated'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  reload(): void {
    this.api.donors(this.query, this.bloodType).subscribe({
      next: (items) => {
        this.donors.set(items);
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
