import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { siteUrl } from '@/lib/site-url';

// Built per request: the catalogue changes from the dashboard, and the build
// should never depend on reaching the database for this.
export const dynamic = 'force-dynamic';

/**
 * Every public page a search engine should know about, on the store's real
 * domain: the home page, the shop, each published product, and the content
 * pages that are switched on. A database blip still yields the core pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  try {
    const [settings, products, pages] = await Promise.all([
      getSettings(),
      prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
      prisma.page.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const p of products) {
      entries.push({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    for (const page of pages) {
      // About and Journal have their own addresses, and only count when the
      // owner has them switched on in Settings → Navigation.
      if (page.slug === 'about') {
        if (settings.showAbout) entries.push({ url: `${base}/about`, lastModified: page.updatedAt });
      } else if (page.slug === 'journal') {
        if (settings.showJournal) entries.push({ url: `${base}/journal`, lastModified: page.updatedAt });
      } else {
        entries.push({ url: `${base}/pages/${page.slug}`, lastModified: page.updatedAt });
      }
    }
  } catch (error) {
    console.error('sitemap: listing the core pages only —', error);
  }

  return entries;
}
