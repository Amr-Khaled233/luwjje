/**
 * The public origin of the store, without a trailing slash — the one place
 * every absolute link (order emails, password resets, search metadata, the
 * sitemap) gets its domain from.
 *
 *   1. NEXT_PUBLIC_SITE_URL, when set — e.g. https://luwjje.com
 *   2. On Vercel, the project's production domain. Vercel fills
 *      VERCEL_PROJECT_PRODUCTION_URL with the custom domain once one is
 *      connected, so links follow the real domain even if (1) is forgotten.
 *   3. Locally, http://localhost:3000.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '');
  if (production) return `https://${production}`;

  return 'http://localhost:3000';
}
