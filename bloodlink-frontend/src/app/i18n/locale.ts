export const APP_LOCALES = ['ar-MA', 'fr', 'en'] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = 'ar-MA';
export const LOCALE_STORAGE_KEY = 'bloodlink.locale';

export const LOCALE_OPTIONS: { code: AppLocale; label: string }[] = [
  { code: 'ar-MA', label: 'العربية المغربية / Darija' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' }
];

export function isRtl(locale: AppLocale): boolean {
  return locale === 'ar-MA';
}

export function htmlLang(locale: AppLocale): string {
  if (locale === 'ar-MA') return 'ar';
  if (locale === 'fr') return 'fr';
  return 'en';
}

export function intlLocale(locale: AppLocale): string {
  if (locale === 'ar-MA') return 'ar-MA';
  if (locale === 'fr') return 'fr-MA';
  return 'en-GB';
}

export function parseStoredLocale(value: string | null | undefined): AppLocale {
  const raw = (value ?? '').trim();
  if (raw === 'ar-MA' || raw === 'darija' || raw === 'ar' || raw === 'ar-ma') return 'ar-MA';
  if (raw === 'fr') return 'fr';
  if (raw === 'en') return 'en';
  return DEFAULT_LOCALE;
}

export function hasExplicitStoredLocale(): boolean {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    return raw !== null && raw.trim() !== '';
  } catch {
    return false;
  }
}
