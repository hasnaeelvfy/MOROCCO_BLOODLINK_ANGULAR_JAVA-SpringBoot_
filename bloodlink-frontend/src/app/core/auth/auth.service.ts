import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
import { AuthResponse, CurrentUserResponse, DonorRegisterRequest, HospitalRegisterRequest, LoginRequest } from './auth.models';
import { AppLocale } from '../../i18n/locale';
import { I18nService } from '../../i18n/i18n.service';

const TOKEN_KEY = 'bloodlink.accessToken';
const AUTH_PREFIX = `${API_BASE_URL}/api/v1/auth`;

export interface AccountSettings {
  locale: string;
  notifyInvitations: boolean;
  notifyStatus: boolean;
  notifyReminders: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);

  readonly token = signal<string | null>(this.readToken());
  readonly currentUser = signal<CurrentUserResponse | null>(null);
  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly isHospitalAuthenticated = computed(
    () => this.isAuthenticated() && this.currentUser()?.role === 'HOSPITAL'
  );
  readonly isDonorAuthenticated = computed(
    () => this.isAuthenticated() && this.currentUser()?.role === 'DONOR'
  );
  readonly isAdminAuthenticated = computed(
    () => this.isAuthenticated() && this.currentUser()?.role === 'ADMIN'
  );
  readonly session = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    const role =
      user.role === 'HOSPITAL' ? 'hospital' : user.role === 'ADMIN' ? 'admin' : 'donor';
    return { role, email: user.email };
  });

  registerHospital(request: HospitalRegisterRequest): Observable<CurrentUserResponse> {
    return this.http.post<AuthResponse>(`${AUTH_PREFIX}/register/hospital`, request).pipe(
      switchMap((response) => this.completeAuthentication(response))
    );
  }

  registerDonor(request: DonorRegisterRequest): Observable<CurrentUserResponse> {
    return this.http.post<AuthResponse>(`${AUTH_PREFIX}/register/donor`, request).pipe(
      switchMap((response) => this.completeAuthentication(response))
    );
  }

  login(request: LoginRequest): Observable<CurrentUserResponse> {
    return this.http.post<AuthResponse>(`${AUTH_PREFIX}/login`, request).pipe(
      switchMap((response) => this.completeAuthentication(response))
    );
  }

  loadCurrentUser(): Observable<CurrentUserResponse> {
    return this.http.get<CurrentUserResponse>(`${AUTH_PREFIX}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
      })
    );
  }

  restoreSession(): Observable<boolean> {
    if (!this.token()) {
      return of(false);
    }
    return this.loadCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  ensureHospitalSession(): Observable<boolean> {
    if (this.isHospitalAuthenticated()) {
      return of(true);
    }
    if (!this.token()) {
      return of(false);
    }
    return this.restoreSession().pipe(map(() => this.isHospitalAuthenticated()));
  }

  ensureDonorSession(): Observable<boolean> {
    if (this.isDonorAuthenticated()) {
      return of(true);
    }
    if (!this.token()) {
      return of(false);
    }
    return this.restoreSession().pipe(map(() => this.isDonorAuthenticated()));
  }

  ensureAdminSession(): Observable<boolean> {
    if (this.isAdminAuthenticated()) {
      return of(true);
    }
    if (!this.token()) {
      return of(false);
    }
    return this.restoreSession().pipe(map(() => this.isAdminAuthenticated()));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.put<void>(`${AUTH_PREFIX}/password`, { currentPassword, newPassword });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${AUTH_PREFIX}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${AUTH_PREFIX}/reset-password`, { token, newPassword });
  }

  settings(): Observable<AccountSettings> {
    return this.http.get<AccountSettings>(`${AUTH_PREFIX}/settings`);
  }

  updateSettings(body: Partial<AccountSettings>): Observable<AccountSettings> {
    return this.http.put<AccountSettings>(`${AUTH_PREFIX}/settings`, body);
  }

  persistLocale(locale: AppLocale): void {
    if (!this.isAuthenticated()) {
      return;
    }
    this.updateSettings({ locale }).subscribe({ error: () => undefined });
  }

  homePath(): string {
    if (this.isHospitalAuthenticated()) return '/hospital';
    if (this.isAdminAuthenticated()) return '/admin';
    if (this.isDonorAuthenticated()) return '/donor';
    return '/';
  }

  logout(): void {
    this.http.post<void>(`${AUTH_PREFIX}/logout`, {}).subscribe({ error: () => undefined });
    this.clearSession();
  }

  private completeAuthentication(response: AuthResponse): Observable<CurrentUserResponse> {
    if (!response.accessToken) {
      return throwError(() => new Error('Missing access token'));
    }
    this.persistToken(response.accessToken);
    return this.loadCurrentUser().pipe(
      tap(() => this.persistLocale(this.i18n.locale()))
    );
  }

  private persistToken(accessToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    this.token.set(accessToken);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.currentUser.set(null);
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}
