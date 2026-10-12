/**
 * The public origin of the store, without a trailing slash — the one place
 * every absolute link (order emails, password resets, marketing links, search
 * metadata, the sitemap) gets its domain from.
 *
 *   1. NEXT_PUBLIC_SITE_URL, when set — e.g. https://luwjje.com
 *   2. On Vercel, the project's production domain. Vercel fills
 *      VERCEL_PROJECT_PRODUCTION_URL with the custom domain once one is
 *      connected, so links follow the real domain even if (1) is forgotten.
 *   3. Locally, http://localhost:3000.
 *
 * One exception to (1): a leftover `*.vercel.app` value never beats a custom
 * domain that is actually connected — so a stale setting from before the move
 * to luwjje.com cannot keep sending people to the old address.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '');
  const customDomain = production && !production.endsWith('.vercel.app') ? production : null;

  if (configured) {
    if (customDomain && isVercelAppUrl(configured)) return `https://${customDomain}`;
    return configured;
  }
  if (production) return `https://${production}`;
  return 'http://localhost:3000';
}

function isVercelAppUrl(url: string) {
  try {
    return new URL(url).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}
