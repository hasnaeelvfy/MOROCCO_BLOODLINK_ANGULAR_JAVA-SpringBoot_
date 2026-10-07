import { Component, inject, signal } from '@angular/core';
import { AuditLogDto } from '../../core/api/api.models';
import { AdminApiService } from '../../core/api/admin-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-admin-audit-page',
  imports: [TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'admin.audit.kicker' | t }}</p>
      <h1>{{ 'admin.audit.title' | t }}</h1>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loading' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.created' | t }}</th>
                  <th>{{ 'table.actor' | t }}</th>
                  <th>{{ 'table.action' | t }}</th>
                  <th>{{ 'table.target' | t }}</th>
                  <th>{{ 'table.details' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of logs(); track item.id) {
                  <tr>
                    <td>{{ i18n.formatDateTime(item.createdAt) }}</td>
                    <td>{{ item.actorEmail || ('common.emDash' | t) }}</td>
                    <td>{{ i18n.auditAction(item.action) }}</td>
                    <td>{{ item.targetType }}{{ item.targetId != null ? ' #' + item.targetId : '' }}</td>
                    <td>{{ item.details || ('common.emDash' | t) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="hp-empty">{{ 'admin.audit.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class AdminAuditPageComponent {
  private readonly api = inject(AdminApiService);
  readonly i18n = inject(I18nService);
  readonly logs = signal<AuditLogDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.api.audit().subscribe({
      next: (items) => {
        this.logs.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(httpErrorMessage(error));
        this.loading.set(false);
      }
    });
  }
}
