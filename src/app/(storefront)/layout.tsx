import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { TrackPageView } from '@/components/storefront/track-page-view';
import { getSettings } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        storeName={settings.storeName}
        locale={locale}
        t={t}
        showSearch={settings.showSearch}
        showLanguageSwitcher={settings.enableArabic}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <TrackPageView />
    </div>
  );
}
