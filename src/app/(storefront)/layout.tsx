import { SiteHeader } from '@/components/storefront/site-header';
import { SiteFooter } from '@/components/storefront/site-footer';
import { TrackPageView } from '@/components/storefront/track-page-view';
import { getSettings } from '@/lib/settings';

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader storeName={settings.storeName} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <TrackPageView />
    </div>
  );
}
