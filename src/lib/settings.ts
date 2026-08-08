import { requestCache as cache } from './request-cache';
import { prisma } from './prisma';

/**
 * Storefront-wide settings. Created on first read so the site never
 * hard-fails on a fresh database.
 */
export const getSettings = cache(async () => {
  const existing = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.siteSettings.create({ data: { id: 'singleton' } });
});

export const getFooterPages = cache(async () => {
  return prisma.page.findMany({
    where: { published: true, showInFooter: true },
    orderBy: { position: 'asc' },
    select: { slug: true, title: true },
  });
});

export const getPaletteSwatches = cache(async () => {
  return prisma.paletteSwatch.findMany({ orderBy: { position: 'asc' } });
});

/** Banners currently in their scheduled window for a given slot. */
export async function getActiveBanners(slot: 'HERO' | 'OFFER') {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: { slot, active: true },
    orderBy: { position: 'asc' },
  });
  return banners.filter(
    (b) => (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now),
  );
}
