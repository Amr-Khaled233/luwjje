import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LoginForm } from '@/components/dashboard/login-form';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { DIRECTION } from '@/i18n/config';

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

  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const d = getDashboardDictionary(locale).login;

  return (
    <div
      dir={DIRECTION[locale]}
      lang={locale}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-margin-mobile"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <Link href="/" className="font-display text-[32px] leading-none">
            {settings.storeName}
          </Link>
          <p className="label-caps mt-3 text-secondary">{d.eyebrow}</p>
        </div>

        <div className="border border-outline-variant bg-surface-lowest p-8">
          <h1 className="font-display text-headline-sm">{d.heading}</h1>
          <p className="mt-2 text-body-sm text-secondary">{d.intro}</p>
          <LoginForm
            next={searchParams.next ?? '/dashboard'}
            labels={{
              password: d.password,
              show: d.show,
              hide: d.hide,
              submit: d.submit,
              checking: d.checking,
            }}
          />
        </div>

        <p className="mt-8 text-center text-body-sm text-tertiary">
          <Link href="/" className="link-underline">
            {d.back}
          </Link>
        </p>
      </div>
    </div>
  );
}
