import { requestCache as cache } from './request-cache';
import { prisma } from './prisma';
import { pick, type Locale } from '@/i18n/config';

type Settings = Awaited<ReturnType<typeof readSettings>>;

async function readSettings() {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: { id: 'singleton' } });
}

/**
 * Schema defaults, used only when the database cannot be reached. Every page
 * pulls settings for its metadata and chrome, so a momentary blip would
 * otherwise 500 the whole storefront rather than degrade.
 */
function fallbackSettings(): Settings {
  return {
    id: 'singleton',
    dashboardPasswordHash: null,
    storeName: 'luwjje',
    tagline: '',
    taglineAr: '',
    logoUrl: '',
    supportEmail: '',
    supportPhone: '',
    defaultLocale: 'en',
    enableArabic: true,
    currencyCode: 'EGP',
    currencySymbol: 'EGP',
    currencySymbolAr: 'ج.م',
    freeShippingOver: 0,
    defaultShippingRate: 0,
    lowStockThreshold: 5,
    showColorFilter: true,
    showCategoryFilter: true,
    showPriceFilter: true,
    showSortFilter: true,
    showSearch: true,
    instagramUrl: '',
    pinterestUrl: '',
    tiktokUrl: '',
    facebookUrl: '',
    whatsappUrl: '',
    metaTitle: 'luwjje',
    metaTitleAr: '',
    metaDescription: '',
    metaDescriptionAr: '',
    ogImageUrl: '',
    newsletterHeading: 'Newsletter',
    newsletterHeadingAr: '',
    newsletterBody: '',
    newsletterBodyAr: '',
    updatedAt: new Date(),
  };
}

/**
 * Storefront-wide settings. Created on first read so the site never
 * hard-fails on a fresh database, and degrades to defaults rather than
 * throwing if the database is briefly unreachable.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    return await readSettings();
  } catch (error) {
    console.error('getSettings: falling back to defaults —', error);
    return fallbackSettings();
  }
});

/** The currency symbol for the current language. */
export async function getCurrencySymbol(locale: Locale) {
  const s = await getSettings();
  return locale === 'ar' ? s.currencySymbolAr || s.currencySymbol : s.currencySymbol;
}

export const getFooterPages = cache(async () => {
  return prisma.page.findMany({
    where: { published: true, showInFooter: true },
    orderBy: { position: 'asc' },
    select: { slug: true, title: true, titleAr: true },
  });
});

export const getPaletteSwatches = cache(async () => {
  return prisma.paletteSwatch.findMany({ orderBy: { position: 'asc' } });
});

/** Banners currently in their scheduled window, in the visitor's language. */
export async function getActiveBanners(slot: 'HERO' | 'OFFER', locale: Locale) {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: { slot, active: true },
    orderBy: { position: 'asc' },
  });

  return banners
    .filter((b) => (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now))
    .map((b) => ({
      id: b.id,
      eyebrow: pick(locale, b.eyebrow, b.eyebrowAr),
      heading: pick(locale, b.heading, b.headingAr),
      subheading: pick(locale, b.subheading, b.subheadingAr),
      body: pick(locale, b.body, b.bodyAr),
      ctaLabel: pick(locale, b.ctaLabel, b.ctaLabelAr),
      ctaHref: b.ctaHref,
      imageUrl: b.imageUrl,
      badge: pick(locale, b.badge, b.badgeAr),
      endsAt: b.endsAt,
    }));
}
