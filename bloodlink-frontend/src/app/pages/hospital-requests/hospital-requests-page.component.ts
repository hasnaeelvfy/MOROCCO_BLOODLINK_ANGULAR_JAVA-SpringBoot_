import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BloodRequestDto } from '../../core/api/api.models';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { BLOOD_TYPES, BloodType, canonicalBloodType, Urgency } from '../../mock/models';
import { DialogService } from '../../ui/dialog.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-hospital-requests-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.requests.kicker' | t }}</p>
      <h1>{{ 'hospital.requests.title' | t }}</h1>
        <p class="hp-lead">{{ 'hospital.requests.lead' | t }}</p>
      <div class="hp-toolbar">
        <a class="hp-btn" routerLink="/hospital/requests/new">{{ 'hospital.requests.createPlus' | t }}</a>
      </div>
      @if (loading()) {
        <p class="hp-note">{{ 'common.loadingRequests' | t }}</p>
      } @else if (error()) {
        <p class="hp-empty">{{ error() }}</p>
      } @else {
        <article class="hp-panel">
          <div class="hp-filters">
            <div class="hp-field"><label>{{ 'common.search' | t }}</label><input [(ngModel)]="query" name="q" placeholder="BL-…" /></div>
            <div class="hp-field">
              <label>{{ 'bloodType' | t }}</label>
              <select [(ngModel)]="bloodType" name="bt"><option value="">{{ 'common.filter.all' | t }}</option>@for (item of types; track item) { <option [value]="item">{{ item }}</option> }</select>
            </div>
            <div class="hp-field">
              <label>{{ 'table.urgency' | t }}</label>
              <select [(ngModel)]="urgency" name="urgency">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="STANDARD">{{ 'urgency.STANDARD' | t }}</option>
                <option value="URGENT">{{ 'urgency.URGENT' | t }}</option>
                <option value="CRITICAL">{{ 'urgency.CRITICAL' | t }}</option>
              </select>
            </div>
            <div class="hp-field">
              <label>{{ 'table.status' | t }}</label>
              <select [(ngModel)]="status" name="status">
                <option value="">{{ 'common.filter.all' | t }}</option>
                <option value="searching">{{ 'requestStatus.SEARCHING' | t }}</option>
                <option value="responding">{{ 'requestStatus.RESPONDING' | t }}</option>
                <option value="partial">{{ 'requestStatus.PARTIAL' | t }}</option>
                <option value="fulfilled">{{ 'requestStatus.FULFILLED' | t }}</option>
                <option value="cancelled">{{ 'requestStatus.CANCELLED' | t }}</option>
                <option value="expired">{{ 'requestStatus.EXPIRED' | t }}</option>
              </select>
            </div>
            <div class="hp-field"><label>{{ 'form.createdFrom' | t }}</label><input type="date" [(ngModel)]="from" name="from" /></div>
          </div>

          <div class="hp-table-wrap">
            <table class="hp-table">
              <thead>
                <tr>
                  <th>{{ 'table.requestId' | t }}</th>
                  <th>{{ 'table.bloodType' | t }}</th>
                  <th>{{ 'table.unitsNeeded' | t }}</th>
                  <th>{{ 'table.urgency' | t }}</th>
                  <th>{{ 'table.status' | t }}</th>
                  <th>{{ 'table.donors' | t }}</th>
                  <th>{{ 'table.created' | t }}</th>
                  <th>{{ 'table.actions' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of filtered(); track item.id) {
                  <tr>
                    <td>{{ item.publicCode }}</td>
                    <td>{{ item.bloodType }}</td>
                    <td>{{ 'hospital.requests.unitsCell' | t:{ units: item.units, n: item.unitsRemaining } }}</td>
                    <td>{{ i18n.enumLabel('urgency', item.urgency) }}</td>
                    <td><span class="hp-pill">{{ i18n.requestDisplay(item.displayStatus) }}</span></td>
                    <td>{{ 'common.acceptedMatched' | t:{ accepted: item.matchCounts.accepted, total: item.matchCounts.total } }}</td>
                    <td>{{ i18n.formatDate(item.createdAt) }}</td>
                    <td>
                      <div class="hp-actions">
                        <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', item.id]">{{ 'common.view' | t }}</a>
                        @if (item.editable) {
                          <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', item.id, 'edit']">{{ 'common.edit' | t }}</a>
                          <button class="hp-btn hp-btn--danger" type="button" (click)="cancel(item.id)">{{ 'common.cancel' | t }}</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="hp-empty">{{ 'hospital.requests.empty' | t }}</td></tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `
})
export class HospitalRequestsPageComponent {
  readonly types = BLOOD_TYPES;
  private readonly api = inject(HospitalApiService);
  private readonly dialog = inject(DialogService);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly items = signal<BloodRequestDto[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  query = '';
  bloodType: BloodType | '' = '';
  urgency: Urgency | '' = '';
  status = '';
  from = '';

  readonly filtered = computed(() => {
    const q = this.query.trim().toLowerCase();
    return this.items().filter((item) => {
      if (this.bloodType && canonicalBloodType(item.bloodType) !== canonicalBloodType(this.bloodType)) return false;
      if (this.urgency && item.urgency !== this.urgency) return false;
      if (this.from && item.createdAt.slice(0, 10) < this.from) return false;
      if (this.status && !item.displayStatus.toLowerCase().includes(this.status)) return false;
      if (q && !item.publicCode.toLowerCase().includes(q) && !item.bloodType.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  constructor() {
    this.reload();
  }

  async cancel(id: number): Promise<void> {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('dialog.request.cancel.title'),
      body: this.i18n.t('dialog.request.cancel.listBody'),
      danger: true
    });
    if (!ok) return;
    this.api.cancelRequest(id).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.requestCancelled'), 'success');
        this.reload();
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  private reload(): void {
    this.api.requests().subscribe({
      next: (items) => {
        this.items.set(items);
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
