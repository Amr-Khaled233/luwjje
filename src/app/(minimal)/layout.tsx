import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LanguageSwitcher } from '@/components/storefront/language-switcher';
import { TrackPageView } from '@/components/storefront/track-page-view';
import { getSettings } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

/**
 * Reduced chrome for cart / checkout — logo, the language, and a single way
 * back. Reduced, not different: the shopper can still switch language here,
 * and the pages are counted like every other page on the site.
 */
export default async function MinimalLayout({ children }: { children: React.ReactNode }) {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);

  return (
    <div className="theme-dark flex min-h-screen flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant">
        <div className="container-luwjje flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="font-display text-[26px] leading-none">
            {settings.storeName}
          </Link>
          <div className="flex items-center gap-5 sm:gap-6">
            {settings.enableArabic && <LanguageSwitcher locale={locale} />}
            <Link
              href="/shop"
              className="group flex items-center gap-2 text-label-md text-secondary transition-colors hover:text-on-surface"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-scandi group-hover:-translate-x-1 rtl:rotate-180" />
              <span className="max-sm:sr-only">{t.minimal.returnToShop}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-outline-variant py-8">
        <div className="container-luwjje flex flex-wrap items-center justify-between gap-4 text-body-sm text-tertiary">
          <span>
            © {new Date().getFullYear()} {settings.storeName}
          </span>
          <div className="flex gap-6">
            <Link href="/pages/privacy-policy" className="hover:text-on-surface">
              {t.minimal.privacy}
            </Link>
            <Link href="/pages/terms" className="hover:text-on-surface">
              {t.minimal.terms}
            </Link>
            <a href={`mailto:${settings.supportEmail}`} className="hover:text-on-surface">
              {settings.supportEmail}
            </a>
          </div>
        </div>
      </footer>

      {/*
        The bag and the payment step are the two pages the funnel is about.
        They were the only shopper-facing pages not counted, which is why
        those steps never moved.
      */}
      <TrackPageView />
    </div>
  );
}
