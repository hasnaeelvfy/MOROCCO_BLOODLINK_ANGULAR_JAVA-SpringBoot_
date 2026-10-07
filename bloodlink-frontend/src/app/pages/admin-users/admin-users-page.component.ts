import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUserSummaryDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.users.kicker' | t }}</p>
      <h1>{{ 'admin.users.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters hp-filters--2">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" (ngModelChange)="reload()" /></div>
            <div class="hp-field">
              <label>{{ 'form.role' | t }}</label>
              <select [(ngModel)]="role" name="role" (ngModelChange)="reload()">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="DONOR">{{ 'auth.role.donor' | t }}</option>
                <option value="HOSPITAL">{{ 'auth.role.hospital' | t }}</option>
                <option value="ADMIN">{{ 'auth.role.administrator' | t }}</option>
              </select>
            </div>
          </div>
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'admin.users.title' | t }}</th>
                  <th>{{ 'form.email' | t }}</th>
                  <th>{{ 'form.role' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of users(); track item.id) {
                  <tr>
                    <td>{{ item.displayName }}</td>
                    <td>{{ item.email }}</td>
                    <td>{{ i18n.roleLabel(item.role) }}</td>
                    <td><span class="hp-pill" [class.hp-pill--ok]="item.status === 'ACTIVE'">{{ i18n.accountStatus(item.status) }}</span></td>
                    <td>
                      @if (item.role !== 'ADMIN') {
                        <div class="hp-actions">
                          @if (item.status === 'ACTIVE') {
                            <button class="hp-btn hp-btn--ghost" type="button" (click)="setStatus(item, 'deactivate')">{{ 'admin.users.deactivate' | t }}</button>
                            <button class="hp-btn hp-btn--ghost" type="button" (click)="setStatus(item, 'suspend')">{{ 'admin.users.suspend' | t }}</button>
                          } @else {
                            <button class="hp-btn" type="button" (click)="setStatus(item, 'reactivate')">{{ 'admin.users.activate' | t }}</button>
                          }
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="hp-empty">{{ 'admin.users.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminUsersPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly users = signal<AdminUserSummaryDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';
  role = '';

  constructor() {
    this.reload();
  }

  async setStatus(item: AdminUserSummaryDto, action: 'deactivate' | 'suspend' | 'reactivate'): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t(`dialog.admin.user.${action}.title`),
      body: this.i18n.t(`dialog.admin.user.${action}.body`),
      danger: action !== 'reactivate'
    });
    if (!ok) return;
    const request =
      action === 'deactivate' ? this.api.deactivateUser(item.id)
      : action === 'suspend' ? this.api.suspendUser(item.id)
      : this.api.reactivateUser(item.id);
    request.subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.userStatusUpdated'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  reload(): void {
    this.api.users(this.query, this.role).subscribe({
      next: (items) => {
        this.users.set(items);
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
