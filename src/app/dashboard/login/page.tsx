import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/dashboard/login-form';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (await isDashboardUser()) redirect(searchParams.next ?? '/dashboard');

  const settings = await getSettings();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-margin-mobile">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <Link href="/" className="font-display text-[32px] leading-none">
            {settings.storeName}
          </Link>
          <p className="label-caps mt-3 text-secondary">Dashboard</p>
        </div>

        <div className="border border-outline-variant bg-surface-lowest p-8">
          <h1 className="font-display text-headline-sm">Enter password</h1>
          <p className="mt-2 text-body-sm text-secondary">
            This area manages the store. It is not a customer account.
          </p>
          <LoginForm next={searchParams.next ?? '/dashboard'} />
        </div>

        <p className="mt-8 text-center text-body-sm text-tertiary">
          <Link href="/" className="link-underline">
            Back to the store
          </Link>
        </p>
      </div>
    </div>
  );
}
