import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import arMA from '../../assets/i18n/ar-MA.json';
import en from '../../assets/i18n/en.json';
import fr from '../../assets/i18n/fr.json';
import { localizedCityName } from '../data/morocco-geo';
import {
  AppLocale,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  htmlLang,
  intlLocale,
  isRtl,
  parseStoredLocale
} from './locale';

type Dict = Record<string, string>;

const CATALOGS: Record<AppLocale, Dict> = {
  'ar-MA': arMA as Dict,
  fr: fr as Dict,
  en: en as Dict
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  static instance: I18nService | null = null;
  readonly locale = signal<AppLocale>(this.read());

  constructor() {
    I18nService.instance = this;
    this.applyDocument();
  }

  t(key: string, params?: Record<string, string | number>): string {
    const locale = this.locale();
    const value = CATALOGS[locale][key] ?? CATALOGS.en[key] ?? key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''));
  }

  set(locale: AppLocale): void {
    this.locale.set(locale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* private mode */
    }
    this.applyDocument();
  }

  applyDocument(): void {
    const locale = this.locale();
    const dir = isRtl(locale) ? 'rtl' : 'ltr';
    document.documentElement.lang = htmlLang(locale);
    document.documentElement.dir = dir;
    document.body?.classList.toggle('is-rtl', dir === 'rtl');
    document.body?.classList.toggle('is-ltr', dir === 'ltr');
  }

  formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
    if (!value) return this.t('common.emDash');
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return this.t('common.emDash');
    return new Intl.DateTimeFormat(intlLocale(this.locale()), options ?? { dateStyle: 'medium' }).format(date);
  }

  formatDateTime(value: string | Date | null | undefined): string {
    return this.formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  }

  formatTime(value: string | Date | null | undefined): string {
    return this.formatDate(value, { hour: '2-digit', minute: '2-digit' });
  }

  formatNumber(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) return this.t('common.emDash');
    return new Intl.NumberFormat(intlLocale(this.locale())).format(value);
  }

  formatDistance(km: number | null | undefined): string {
    if (km == null) return this.t('distance.cityLevelMatch');
    if (km <= 1) return this.t('distance.sameCity');
    return this.t('distance.kmAway', { n: Math.round(km) });
  }

  units(count: number | null | undefined): string {
    return this.t('units.count', { n: this.formatNumber(count ?? 0) });
  }

  enumLabel(prefix: 'matchStatus' | 'requestStatus' | 'urgency' | 'verification' | 'eligibility' | 'compatibility' | 'layer', value: string | null | undefined): string {
    if (!value) return this.t('common.emDash');
    const aliases: Record<string, string> = {
      'Exact match': 'exact',
      Compatible: 'compatible',
      Incompatible: 'incompatible',
      City: 'city',
      Region: 'region',
      National: 'national',
      completed: 'COMPLETED',
      active: 'active',
      deactivated: 'deactivated'
    };
    const normalized = aliases[value.trim()] ?? value.trim();
    const key = `${prefix}.${normalized}`;
    const translated = this.t(key);
    if (translated !== key) return translated;
    const upper = `${prefix}.${normalized.toUpperCase()}`;
    const upperTranslated = this.t(upper);
    if (upperTranslated !== upper) return upperTranslated;
    const lower = `${prefix}.${normalized.toLowerCase()}`;
    const lowerTranslated = this.t(lower);
    if (lowerTranslated !== lower) return lowerTranslated;
    return this.requestDisplay(normalized);
  }

  institutionType(value: string | null | undefined): string {
    const map: Record<string, string> = {
      'Public hospital': 'institutionType.publicHospital',
      'Private hospital': 'institutionType.privateHospital',
      Clinic: 'institutionType.clinic',
      'Blood center': 'institutionType.bloodCenter',
      'Other authorized healthcare facility': 'institutionType.otherAuthorized',
      Hospital: 'auth.role.hospital'
    };
    const key = map[(value ?? '').trim()];
    return key ? this.t(key) : value || this.t('auth.role.hospital');
  }

  roleLabel(role: string | null | undefined): string {
    const value = (role ?? '').trim().toLowerCase();
    if (value === 'donor') return this.t('auth.role.donor');
    if (value === 'hospital') return this.t('auth.role.hospital');
    if (value === 'admin' || value === 'administrator') return this.t('auth.role.administrator');
    return value || this.t('common.emDash');
  }

  accountStatus(status: string | null | undefined): string {
    const value = (status ?? '').trim().toLowerCase();
    if (value === 'active') return this.t('accountStatus.active');
    if (value === 'deactivated') return this.t('accountStatus.deactivated');
    if (value === 'suspended') return this.t('accountStatus.suspended');
    return value || this.t('common.emDash');
  }

  greetingPart(): string {
    const hour = new Date().getHours();
    if (hour < 12) return this.t('greeting.morning');
    if (hour < 18) return this.t('greeting.afternoon');
    return this.t('greeting.evening');
  }

  auditAction(action: string | null | undefined): string {
    const value = (action ?? '').trim();
    const map: Record<string, string> = {
      'Activated user': 'audit.activatedUser',
      'Deactivated user': 'audit.deactivatedUser',
      'Approved hospital': 'audit.approvedHospital',
      'Rejected hospital': 'audit.rejectedHospital',
      'Created blood request': 'audit.createdRequest',
      'Updated blood request': 'audit.updatedRequest',
      'Registered donor': 'audit.registeredDonor',
      'Submitted hospital registration': 'audit.submittedHospital',
      'Initialized BloodLink records': 'audit.initialized'
    };
    if (value.startsWith('Set request ')) {
      return this.t('audit.setRequest', { status: this.requestDisplay(value.slice(12)) });
    }
    const key = map[value];
    return key ? this.t(key) : value;
  }

  cityName(name: string | null | undefined): string {
    return localizedCityName(name, this.locale());
  }

  requestDisplay(displayOrStatus: string | null | undefined): string {
    const value = (displayOrStatus ?? '').trim();
    const map: Record<string, string> = {
      Cancelled: 'requestStatus.CANCELLED',
      Fulfilled: 'requestStatus.FULFILLED',
      Expired: 'requestStatus.EXPIRED',
      Paused: 'requestStatus.PAUSED',
      'Partially fulfilled': 'requestStatus.PARTIAL',
      'Donors responding': 'requestStatus.RESPONDING',
      'Searching for donors': 'requestStatus.SEARCHING',
      'Searching for compatible donors': 'requestStatus.SEARCHING',
      'Search radius expanding': 'ticker.searching',
      Open: 'requestStatus.OPEN',
      SEARCHING: 'requestStatus.SEARCHING',
      PARTIAL: 'requestStatus.PARTIAL',
      FULFILLED: 'requestStatus.FULFILLED',
      CANCELLED: 'requestStatus.CANCELLED',
      EXPIRED: 'requestStatus.EXPIRED',
      PAUSED: 'requestStatus.PAUSED',
      OPEN: 'requestStatus.OPEN',
      RESPONDING: 'requestStatus.RESPONDING',
      COMPLETED: 'requestStatus.COMPLETED'
    };
    const key = map[value] ?? map[value.replace(/\b\w/g, (c) => c.toUpperCase())];
    if (key) return this.t(key);
    const folded = value.toLowerCase();
    const insensitive = Object.entries(map).find(([label]) => label.toLowerCase() === folded);
    return insensitive ? this.t(insensitive[1]) : value || this.t('common.emDash');
  }

  notificationTitle(kind: string | null | undefined, fallback?: string): string {
    const key = `notification.title.${(kind ?? '').toLowerCase()}`;
    const translated = this.t(key);
    return translated !== key ? translated : fallback || this.t('notifications');
  }

  notificationBody(kind: string | null | undefined, fallback?: string): string {
    const key = `notification.body.${(kind ?? '').toLowerCase()}`;
    const translated = this.t(key);
    return translated !== key ? translated : fallback || '';
  }

  eligibilityReason(code: string): string {
    const key = `eligibility.reason.${code}`;
    const translated = this.t(key);
    return translated !== key ? translated : code;
  }

  httpError(error: HttpErrorResponse): string {
    if (error.status === 0) return this.t('errors.network');
    const body = error.error as { code?: string; message?: string; details?: Record<string, string> } | null;
    const code = typeof body?.code === 'string' ? body.code : '';
    if (code) {
      const key = `errors.${code}`;
      const translated = this.t(key);
      if (translated !== key) return translated;
    }
    const details = body?.details ? Object.values(body.details).filter(Boolean).join(' ') : '';
    if (error.status === 400) return details || this.t('errors.badRequest');
    if (error.status === 401) return this.t('errors.INVALID_CREDENTIALS');
    if (error.status === 403) return this.t('errors.UNAUTHORIZED_ACTION');
    if (error.status === 409) return this.t('errors.conflict');
    return this.t('errors.generic');
  }

  private read(): AppLocale {
    try {
      return parseStoredLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
      return DEFAULT_LOCALE;
    }
  }
}
