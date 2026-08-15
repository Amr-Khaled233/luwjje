import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display, IBM_Plex_Sans_Arabic, Amiri } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { getSettings } from '@/lib/settings';
import { getI18n, getLocale } from '@/i18n/server';
import { DIRECTION, pick } from '@/i18n/config';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

// Latin faces have no Arabic coverage, so the Arabic side needs its own pair:
// Amiri carries the same editorial weight as Playfair, IBM Plex Sans Arabic
// the same neutrality as Inter.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-arabic-sans',
  display: 'swap',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-arabic-display',
  display: 'swap',
});

/**
 * `viewportFit: 'cover'` lets the page reach under a notch; the `pb-safe`
 * utility then keeps fixed bars clear of the home indicator. Zoom is left
 * unrestricted on purpose — pinching to read a product detail is legitimate,
 * and `maximumScale: 1` would take that away.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8f9ff',
};

export async function generateMetadata(): Promise<Metadata> {
  const [s, locale] = await Promise.all([getSettings(), getLocale()]);

  const title = pick(locale, s.metaTitle || s.storeName, s.metaTitleAr);
  const description = pick(locale, s.metaDescription, s.metaDescriptionAr);

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    title: { default: title, template: `%s — ${s.storeName}` },
    description,
    openGraph: {
      type: 'website',
      siteName: s.storeName,
      locale: locale === 'ar' ? 'ar_EG' : 'en_US',
      title,
      description,
      images: s.ogImageUrl ? [{ url: s.ogImageUrl }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();

  return (
    <html
      lang={locale}
      dir={DIRECTION[locale]}
      className={`${inter.variable} ${playfair.variable} ${plexArabic.variable} ${amiri.variable}`}
      // Consumed by CSS to swap the font stacks without touching a class name.
      data-locale={locale}
    >
      <body>
        <Providers dismissLabel={t.nav.close}>{children}</Providers>
      </body>
    </html>
  );
}
