import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HospitalApiService } from '../../core/api/hospital-api.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { BLOOD_GROUPS, canonicalBloodType, RH_FACTORS, Urgency } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-request-create-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="hp-page">
      <div class="hp-form">
        <p class="hp-kicker">{{ 'request.create.kicker' | t:{ n: step } }}</p>
        <h1>{{ stepTitle() }}</h1>
        <p class="hp-lead">{{ 'request.create.lead' | t }}</p>
        <div class="hp-steps">
          @for (item of [1, 2, 3, 4]; track item) {
            <i [class.is-on]="step >= item"></i>
          }
        </div>

        @if (!createdCode) {
          <article class="hp-panel">
            @if (step === 1) {
              <div class="hp-grid">
                <div class="hp-field"><label>{{ 'form.bloodGroup' | t }}</label><select [(ngModel)]="group" name="group">@for (item of groups; track item) { <option [value]="item">{{ item }}</option> }</select></div>
                <div class="hp-field"><label>{{ 'form.rhFactor' | t }}</label><select [(ngModel)]="rh" name="rh">@for (item of rhFactors; track item) { <option [value]="item">{{ item }}</option> }</select></div>
                <div class="hp-field"><label>{{ 'form.unitsNeeded' | t }}</label><input type="number" min="1" [(ngModel)]="units" name="units" /><span class="field-error">{{ errors.units }}</span></div>
                <div class="hp-field">
                  <label>{{ 'table.urgency' | t }}</label>
                  <select [(ngModel)]="urgency" name="urgency">
                    <option value="STANDARD">{{ 'urgency.STANDARD' | t }}</option>
                    <option value="URGENT">{{ 'urgency.URGENT' | t }}</option>
                    <option value="CRITICAL">{{ 'urgency.CRITICAL' | t }}</option>
                  </select>
                </div>
              </div>
            } @else if (step === 2) {
              <div class="hp-field"><label>{{ 'form.reference' | t }}</label><input [(ngModel)]="reference" name="reference" placeholder="OR-7741" /><span class="hp-note">{{ 'form.noPatientName' | t }}</span></div>
              <div class="hp-field"><label>{{ 'form.requiredBefore' | t }}</label><input type="datetime-local" [(ngModel)]="neededBefore" name="neededBefore" /><span class="field-error">{{ errors.neededBefore }}</span></div>
              <div class="hp-field"><label>{{ 'form.reason' | t }}</label><input [(ngModel)]="reason" name="reason" /></div>
              <div class="hp-field"><label>{{ 'form.notes' | t }}</label><textarea [(ngModel)]="notes" name="notes"></textarea></div>
            } @else if (step === 3) {
              <div class="hp-metric"><span>{{ 'auth.role.hospital' | t }}</span><b>{{ hospital.profile()?.name || ('common.emDash' | t) }}</b></div>
              <div class="hp-metric"><span>{{ 'request.create.cityRegion' | t }}</span><b>{{ hospital.profile()?.city }} · {{ hospital.profile()?.region }}</b></div>
              <div class="hp-metric"><span>{{ 'request.create.approxLocation' | t }}</span><b>{{ hospital.profile()?.address }}</b></div>
              <p class="hp-note">{{ 'request.create.locationFromProfile' | t }}</p>
            } @else {
              <div class="hp-metric"><span>{{ 'bloodType' | t }}</span><b>{{ group }}{{ rh }}</b></div>
              <div class="hp-metric"><span>{{ 'units.label' | t }}</span><b>{{ units }}</b></div>
              <div class="hp-metric"><span>{{ 'table.urgency' | t }}</span><b>{{ i18n.enumLabel('urgency', urgency) }}</b></div>
              <div class="hp-metric"><span>{{ 'form.requiredBefore' | t }}</span><b>{{ neededBefore }}</b></div>
              <div class="hp-metric"><span>{{ 'auth.role.hospital' | t }}</span><b>{{ hospital.profile()?.name }}</b></div>
              <div class="hp-metric"><span>{{ 'emergency.location' | t }}</span><b>{{ hospital.profile()?.city }}</b></div>
            }
            <div class="hp-actions" style="margin-top:18px">
              @if (step > 1) { <button class="hp-btn hp-btn--ghost" type="button" (click)="step = step - 1">{{ 'back' | t }}</button> }
              @if (step < 4) { <button class="hp-btn" type="button" (click)="next()">{{ 'continue' | t }}</button> }
              @else { <button class="hp-btn" type="button" [disabled]="busy" (click)="submit()">{{ 'hospital.requestCreate.submit' | t }}</button> }
              <a class="hp-btn hp-btn--ghost" routerLink="/hospital/requests">{{ 'common.cancel' | t }}</a>
            </div>
          </article>
        } @else {
          <article class="hp-panel hp-success">
            <i></i>
            <h2>{{ 'request.create.submitted' | t:{ code: createdCode } }}</h2>
            <p class="hp-note">{{ 'request.create.submittedNote' | t }}</p>
          </article>
        }
      </div>
    </section>
  `
})
export class RequestCreatePageComponent {
  readonly hospital = inject(HospitalApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly i18n = inject(I18nService);
  readonly groups = BLOOD_GROUPS;
  readonly rhFactors = RH_FACTORS;
  step = 1;
  group = 'O';
  rh = '−';
  units = 2;
  urgency: Urgency = 'URGENT';
  neededBefore = '';
  reference = '';
  reason = '';
  notes = '';
  busy = false;
  createdCode = '';
  createdId: number | null = null;
  errors = { units: '', neededBefore: '' };

  constructor() {
    this.hospital.loadProfile().subscribe();
  }

  stepTitle(): string {
    return [
      this.i18n.t('request.create.step.blood'),
      this.i18n.t('request.create.step.details'),
      this.i18n.t('request.create.step.location'),
      this.i18n.t('request.create.step.review')
    ][this.step - 1];
  }

  next(): void {
    this.errors = { units: '', neededBefore: '' };
    if (this.step === 1 && this.units < 1) this.errors.units = this.i18n.t('validation.units.min');
    if (this.step === 1 && this.units > 20) this.errors.units = this.i18n.t('validation.units.max');
    if (this.step === 2 && !this.neededBefore) this.errors.neededBefore = this.i18n.t('validation.neededBefore');
    if (Object.values(this.errors).some(Boolean)) return;
    this.step += 1;
  }

  submit(): void {
    if (!this.hospital.profile()) {
      this.toast.show(this.i18n.t('toast.noHospitalProfile'), 'error');
      return;
    }
    this.busy = true;
    this.hospital.createRequest({
      bloodType: canonicalBloodType(`${this.group}${this.rh}`),
      units: Number(this.units),
      urgency: this.urgency,
      neededBefore: this.neededBefore,
      notes: this.notes,
      reference: this.reference,
      reason: this.reason,
      contactName: this.hospital.profile()?.contact || undefined,
      contactPhone: this.hospital.profile()?.phone,
      contactMethod: 'phone'
    }).subscribe({
      next: (created) => {
        this.createdCode = created.publicCode;
        this.createdId = created.id;
        this.toast.show(this.i18n.t('toast.requestCreated', { code: created.publicCode }), 'success');
        setTimeout(() => void this.router.navigate(['/hospital/requests', created.id]), 1600);
      },
      error: (error) => {
        this.busy = false;
        this.toast.show(httpErrorMessage(error), 'error');
      }
    });
  }
}
