import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-donor-settings-page',
  imports: [FormsModule, TranslatePipe],
  template: `
    <section class="hp-page">
      <p class="hp-kicker">{{ 'hospital.settings.workspace' | t }}</p>
      <h1>{{ 'donor.settings.title' | t }}</h1>
      <p class="hp-lead">{{ 'donor.settings.lead' | t }}</p>
      <div class="hp-form">
        <article class="hp-panel">
          <h2>{{ 'hospital.settings.notifications' | t }}</h2>
          <label class="hp-note"><input type="checkbox" [(ngModel)]="invitations" /> {{ 'donor.settings.invitations' | t }}</label>
          <label class="hp-note"><input type="checkbox" [(ngModel)]="statusUpdates" /> {{ 'donor.settings.statusUpdates' | t }}</label>
          <label class="hp-note"><input type="checkbox" [(ngModel)]="reminders" /> {{ 'donor.settings.reminders' | t }}</label>
          <div class="hp-actions" style="margin-top:16px">
            <button class="hp-btn" type="button" (click)="savePrefs()">{{ 'common.savePreferences' | t }}</button>
          </div>
        </article>
        <article class="hp-panel">
          <h2>{{ 'hospital.settings.security' | t }}</h2>
          <div class="hp-field"><label>{{ 'hospital.settings.currentPassword' | t }}</label><input type="password" [(ngModel)]="currentPassword" name="current" /></div>
          <div class="hp-field"><label>{{ 'hospital.settings.newPassword' | t }}</label><input type="password" [(ngModel)]="password" name="password" /></div>
          <div class="hp-field"><label>{{ 'form.confirmPassword' | t }}</label><input type="password" [(ngModel)]="confirm" name="confirm" /><span class="field-error">{{ error }}</span></div>
          <div class="hp-actions">
            <button class="hp-btn" type="button" (click)="updatePassword()">{{ 'hospital.settings.updatePassword' | t }}</button>
          </div>
        </article>
      </div>
    </section>
  `
})
export class DonorSettingsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  invitations = true;
  statusUpdates = true;
  reminders = true;
  currentPassword = '';
  password = '';
  confirm = '';
  error = '';

  constructor() {
    this.auth.settings().subscribe({
      next: (settings) => {
        this.invitations = settings.notifyInvitations;
        this.statusUpdates = settings.notifyStatus;
        this.reminders = settings.notifyReminders;
      }
    });
  }

  savePrefs(): void {
    this.auth.updateSettings({
      notifyInvitations: this.invitations,
      notifyStatus: this.statusUpdates,
      notifyReminders: this.reminders
    }).subscribe({
      next: () => this.toast.show(this.i18n.t('toast.preferencesSaved'), 'success'),
      error: (error) => this.toast.show(httpErrorMessage(error), 'error')
    });
  }

  updatePassword(): void {
    this.error = '';
    if (this.password.length < 8) {
      this.error = this.i18n.t('validation.password.min8');
      return;
    }
    if (this.password !== this.confirm) {
      this.error = this.i18n.t('validation.password.mismatch');
      return;
    }
    this.auth.changePassword(this.currentPassword, this.password).subscribe({
      next: () => {
        this.toast.show(this.i18n.t('toast.passwordUpdated'), 'success');
        this.currentPassword = '';
        this.password = '';
        this.confirm = '';
      },
      error: (error) => {
        this.error = httpErrorMessage(error);
      }
    });
  }
}
