export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = 'luwjje_locale';

export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the Arabic value when the locale is Arabic and the field is filled,
 * otherwise falls back to the base field — so a half-translated catalogue
 * still renders something sensible rather than a blank.
 */
export function pick(locale: Locale, base: string | null | undefined, arabic?: string | null) {
  if (locale === 'ar' && arabic && arabic.trim()) return arabic;
  return base ?? '';
}
