import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { BLOOD_TYPES, BloodType, canonicalBloodType, displayBloodType, Urgency } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-request-edit-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <div class="hp-form">
        <p class="hp-kicker">{{ 'hospital.requestEdit.title' | t }}</p>
        <h1>{{ publicCode || id }}</h1>
        <p class="hp-lead">{{ 'request.edit.lead' | t }}</p>
        @if (loading()) {
          <p class="hp-note">{{ 'common.loadingRequest' | t }}</p>
        } @else if (editable) {
          <article class="hp-panel">
            <div class="hp-grid">
              <div class="hp-field">
                <label>{{ 'bloodType' | t }}</label>
                <select [(ngModel)]="bloodType" name="bt">@for (type of types; track type) { <option [value]="type">{{ type }}</option> }</select>
              </div>
              <div class="hp-field"><label>{{ 'form.unitsNeeded' | t }}</label><input type="number" min="1" [(ngModel)]="units" name="units" /></div>
              <div class="hp-field">
                <label>{{ 'table.urgency' | t }}</label>
                <select [(ngModel)]="urgency" name="urgency">
                  <option value="STANDARD">{{ 'urgency.STANDARD' | t }}</option>
                  <option value="URGENT">{{ 'urgency.URGENT' | t }}</option>
                  <option value="CRITICAL">{{ 'urgency.CRITICAL' | t }}</option>
                </select>
              </div>
              <div class="hp-field"><label>{{ 'form.requiredBefore' | t }}</label><input type="datetime-local" [(ngModel)]="neededBefore" name="neededBefore" /></div>
            </div>
            <div class="hp-field"><label>{{ 'form.referenceShort' | t }}</label><input [(ngModel)]="reference" name="reference" /></div>
            <div class="hp-field"><label>{{ 'form.reasonShort' | t }}</label><input [(ngModel)]="reason" name="reason" /></div>
            <div class="hp-field"><label>{{ 'form.notesShort' | t }}</label><textarea [(ngModel)]="notes" name="notes"></textarea></div>
            <div class="hp-actions">
              <button class="hp-btn" type="button" (click)="save()">{{ 'common.saveChanges' | t }}</button>
              <a class="hp-btn hp-btn--ghost" [routerLink]="['/hospital/requests', id]">{{ 'back' | t }}</a>
            </div>
          </article>
        } @else {
          <article class="hp-panel"><p class="hp-note">{{ 'request.edit.locked' | t }}</p></article>
        }
      </div>
    </section>
  `
})
export class RequestEditPageComponent {
  private readonly api = inject(HospitalApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly types = BLOOD_TYPES;
  readonly id = this.route.snapshot.paramMap.get('requestId') ?? '';
  readonly loading = signal(true);
  publicCode = '';
  editable = false;
  bloodType: BloodType = 'O+';
  units = 1;
  urgency: Urgency = 'URGENT';
  neededBefore = '';
  reference = '';
  reason = '';
  notes = '';

  constructor() {
    this.api.request(this.id).subscribe({
      next: (item) => {
        this.publicCode = item.publicCode;
        this.editable = item.editable;
        this.bloodType = displayBloodType(item.bloodType);
        this.units = item.units;
        this.urgency = item.urgency;
        this.neededBefore = item.neededBefore?.slice(0, 16) ?? '';
        this.reference = item.reference ?? '';
        this.reason = item.reason ?? '';
        this.notes = item.notes ?? '';
        this.loading.set(false);
      },
      error: (error) => {
        this.toast.show(httpErrorMessage(error), 'error');
        this.loading.set(false);
      }
    });
  }

  save(): void {
    this.api.updateRequest(this.id, {
      bloodType: canonicalBloodType(this.bloodType),
      units: Number(this.units),
      urgency: this.urgency,
      neededBefore: this.neededBefore,
      reference: this.reference,
      reason: this.reason,
      notes: this.notes
    }).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.requestUpdated'), 'success');
        void this.router.navigate(['/hospital/requests', this.id]);
      },
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }
}
