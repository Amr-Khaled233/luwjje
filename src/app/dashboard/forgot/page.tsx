import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ForgotForm } from '@/components/dashboard/forgot-form';
import { AuthShell } from '@/components/dashboard/auth-shell';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  // Already signed in: there is nothing to recover.
  if (await isDashboardUser()) redirect('/dashboard');

  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const d = getDashboardDictionary(locale);

  return (
    <AuthShell
      storeName={settings.storeName}
      locale={locale}
      eyebrow={d.login.eyebrow}
      footer={
        <Link href="/dashboard/login" className="link-underline">
          {d.reset.backToLogin}
        </Link>
      }
    >
      <ForgotForm
        labels={{
          title: d.reset.requestTitle,
          intro: d.reset.requestIntro,
          send: d.reset.send,
          sending: d.reset.sending,
          sentTitle: d.reset.sentTitle,
          sentBody: d.reset.sentBody,
          sentAgain: d.reset.sentAgain,
          undelivered: d.reset.undelivered,
        }}
      />
    </AuthShell>
  );
}
