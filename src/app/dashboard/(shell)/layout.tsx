import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate. The middleware is a convenience; this is the real one.
  if (!(await isDashboardUser())) redirect('/dashboard/login');

  const settings = await getSettings();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar storeName={settings.storeName} />
      <div className="min-w-0 flex-1 md:pl-[280px]">
        <div className="px-margin-mobile py-8 md:px-10 md:py-10">{children}</div>
      </div>
    </div>
  );
}
