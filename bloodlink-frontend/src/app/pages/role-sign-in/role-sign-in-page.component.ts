import { Component, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { httpErrorMessage } from '../../core/http-error';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { UserRole } from '../../mock/models';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-role-sign-in-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <main class="app-page">
      <div class="form-shell">
        <p class="eyebrow">{{ 'auth.roleSignIn.eyebrow' | t:{ role: heading() } }}</p>
        <h1>{{ 'auth.welcomeBack' | t }}</h1>
        <p class="note">{{ 'auth.signInToBloodLink' | t }}</p>
        <article class="glass app-card request">
          <div class="field"><label>{{ 'form.email' | t }}</label><input [(ngModel)]="email" name="email" type="email" /></div>
          <div class="field"><label>{{ 'form.password' | t }}</label><input [(ngModel)]="password" name="password" type="password" /><span class="field-error">{{ error }}</span></div>
          <button class="button" type="button" [disabled]="busy" (click)="submit()">{{ 'continue' | t }}</button>
          <p class="auth-foot">
            <a routerLink="/forgot-password">{{ 'forgot' | t }}</a>
            @if (role !== 'admin') {
              · <a [routerLink]="role === 'hospital' ? '/hospital/register' : '/donor/register'">{{ 'createAccount' | t }}</a>
            }
          </p>
        </article>
      </div>
    </main>
  `
})
export class RoleSignInPageComponent {
  readonly i18n = inject(I18nService);
  readonly role: UserRole = inject(ActivatedRoute).snapshot.data['role'] ?? 'donor';
  heading(): string {
    this.i18n.locale();
    if (this.role === 'hospital') return this.i18n.t('auth.role.hospital');
    if (this.role === 'admin') return this.i18n.t('auth.role.administrator');
    return this.i18n.t('auth.role.donor');
  }
  private readonly apiAuth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  email = '';
  password = '';
  busy = false;
  error = '';

  submit(): void {
    this.error = '';
    this.busy = true;
    if (this.role === 'hospital') {
      this.apiAuth.login({ email: this.email.trim(), password: this.password }).subscribe({
        next: (user) => {
          if (user.role !== 'HOSPITAL') {
            this.apiAuth.logout();
            this.error = this.i18n.t('auth.errors.wrongRole.hospital');
            this.busy = false;
            return;
          }
          this.toast.show(this.i18n.t('toast.signedIn'), 'success');
          void this.router.navigateByUrl('/hospital');
        },
        error: (httpError: HttpErrorResponse) => {
          this.error = httpErrorMessage(httpError);
          this.busy = false;
        }
      });
      return;
    }
    if (this.role === 'donor') {
      this.apiAuth.login({ email: this.email.trim(), password: this.password }).subscribe({
        next: (user) => {
          if (user.role !== 'DONOR') {
            this.apiAuth.logout();
            this.error = this.i18n.t('auth.errors.wrongRole.donor');
            this.busy = false;
            return;
          }
          this.toast.show(this.i18n.t('toast.signedIn'), 'success');
          void this.router.navigateByUrl('/donor');
        },
        error: (httpError: HttpErrorResponse) => {
          this.error = httpErrorMessage(httpError);
          this.busy = false;
        }
      });
      return;
    }
    this.apiAuth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (user) => {
        if (user.role !== 'ADMIN') {
          this.apiAuth.logout();
          this.error = this.i18n.t('auth.errors.wrongRole.admin');
          this.busy = false;
          return;
        }
        this.toast.show(this.i18n.t('toast.signedIn'), 'success');
        void this.router.navigateByUrl('/admin');
      },
      error: (httpError: HttpErrorResponse) => {
        this.error = httpErrorMessage(httpError);
        this.busy = false;
      }
    });
  }
}
