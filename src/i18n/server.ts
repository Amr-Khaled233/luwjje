import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { LOCALE_COOKIE, isLocale, type Locale } from './config';
import { getDictionary } from './dictionaries';

/**
 * Resolves the request's language.
 *
 * Order of precedence: the visitor's saved choice, then the store's default
 * from SiteSettings, then English. Arabic is refused entirely when the admin
 * has switched it off, so a disabled language cannot be forced by cookie.
 */
export async function getLocale(): Promise<Locale> {
  const settings = await prisma.siteSettings
    .findUnique({
      where: { id: 'singleton' },
      select: { defaultLocale: true, enableArabic: true },
    })
    .catch(() => null);

  const fallback: Locale = isLocale(settings?.defaultLocale) ? settings!.defaultLocale : 'en';
  if (settings && !settings.enableArabic) return fallback === 'ar' ? 'en' : fallback;

  const chosen = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(chosen) ? chosen : fallback;
}

/** Locale plus its dictionary — what most server components need. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
}
