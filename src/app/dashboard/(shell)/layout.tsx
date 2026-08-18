import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardI18nProvider } from '@/components/dashboard/dashboard-i18n';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate. The middleware is a convenience; this is the real one.
  if (!(await isDashboardUser())) redirect('/dashboard/login');

  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const dictionary = getDashboardDictionary(locale);

  return (
    <DashboardI18nProvider locale={locale} dictionary={dictionary}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar storeName={settings.storeName} locale={locale} />
        {/* pt-14 on phones clears the fixed dashboard top bar. */}
        <div className="min-w-0 flex-1 md:ps-[280px]">
          <div className="px-margin-mobile pb-12 pt-[calc(3.5rem+1.5rem)] md:px-10 md:py-10">
            {children}
          </div>
        </div>
      </div>
    </DashboardI18nProvider>
  );
}
