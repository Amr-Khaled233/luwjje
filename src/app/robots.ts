import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

/**
 * Search engines may read the shop, never the back office or a customer's
 * private order and checkout pages.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/api/', '/cart', '/checkout', '/order/', '/orders'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
