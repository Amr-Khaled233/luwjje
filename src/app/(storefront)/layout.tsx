import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { AnnouncementBar } from '@/components/storefront/announcement-bar';
import { TrackPageView } from '@/components/storefront/track-page-view';
import { getSettings } from '@/lib/settings';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, { locale, t }] = await Promise.all([getSettings(), getI18n()]);

  return (
    <div className="theme-dark flex min-h-screen flex-col bg-background text-on-background">
      {settings.showAnnouncement && (
        <AnnouncementBar text={pick(locale, settings.announcementText, settings.announcementTextAr)} />
      )}
      <SiteHeader
        storeName={settings.storeName}
        locale={locale}
        t={t}
        showLanguageSwitcher={settings.enableArabic}
        showAbout={settings.showAbout}
        showJournal={settings.showJournal}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <TrackPageView />
    </div>
  );
}
