import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'forgot' | t }}</p>
        <h1>{{ 'auth.resetPassword' | t }}</h1>
        <p class="note">{{ 'auth.resetLeadReal' | t }}</p>
        <article class="glass app-card request">
          @if (step === 'request') {
            <div class="field"><label>{{ 'form.email' | t }}</label><input [(ngModel)]="email" name="email" type="email" /><span class="field-error">{{ error }}</span></div>
            <div class="actions">
              <button class="button" type="button" (click)="requestReset()">{{ 'auth.sendReset' | t }}</button>
              <a class="button button--ghost" routerLink="/sign-in">{{ 'back' | t }}</a>
            </div>
          } @else if (step === 'reset') {
            <p class="note">{{ 'auth.resetTokenHint' | t }}</p>
            <div class="field"><label>{{ 'auth.resetToken' | t }}</label><input [(ngModel)]="token" name="token" /></div>
            <div class="field"><label>{{ 'hospital.settings.newPassword' | t }}</label><input type="password" [(ngModel)]="password" name="password" /></div>
            <div class="field"><label>{{ 'form.confirmPassword' | t }}</label><input type="password" [(ngModel)]="confirm" name="confirm" /><span class="field-error">{{ error }}</span></div>
            <div class="actions">
              <button class="button" type="button" (click)="submitReset()">{{ 'hospital.settings.updatePassword' | t }}</button>
              <a class="button button--ghost" routerLink="/sign-in">{{ 'back' | t }}</a>
            </div>
          } @else {
            <h3>{{ 'auth.passwordUpdated' | t }}</h3>
            <p class="note">{{ 'auth.passwordUpdatedLead' | t }}</p>
            <a class="button" routerLink="/sign-in">{{ 'signIn' | t }}</a>
          }
        </article>
      </div>
    </main>
  `
})
export class ForgotPasswordPageComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(I18nService);
  email = '';
  token = '';
  password = '';
  confirm = '';
  error = '';
  step: 'request' | 'reset' | 'done' = 'request';

  requestReset(): void {
    this.error = '';
    if (!this.email.trim()) {
      this.error = this.i18n.t('validation.email');
      return;
    }
    this.auth.forgotPassword(this.email.trim()).subscribe({
      next: () => {
        this.step = 'reset';
        this.toast.show(this.i18n.t('auth.resetRequested'), 'success');
      },
      error: (error) => {
        this.error = httpErrorMessage(error);
      }
    });
  }

  submitReset(): void {
    this.error = '';
    if (!this.token.trim()) {
      this.error = this.i18n.t('auth.resetTokenRequired');
      return;
    }
    if (this.password.length < 8) {
      this.error = this.i18n.t('validation.password.min8');
      return;
    }
    if (this.password !== this.confirm) {
      this.error = this.i18n.t('validation.password.mismatch');
      return;
    }
    this.auth.resetPassword(this.token.trim(), this.password).subscribe({
      next: () => {
        this.step = 'done';
        this.toast.show(this.i18n.t('toast.passwordUpdated'), 'success');
      },
      error: (error) => {
        this.error = httpErrorMessage(error);
      }
    });
  }
}
