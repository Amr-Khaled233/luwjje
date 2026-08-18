import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { ResetForm } from '@/components/dashboard/reset-form';
import { AuthShell } from '@/components/dashboard/auth-shell';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { checkResetToken } from '@/lib/password-reset';
import { getSettings } from '@/lib/settings';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  if (await isDashboardUser()) redirect('/dashboard');

  const [settings, locale] = await Promise.all([getSettings(), getLocale()]);
  const d = getDashboardDictionary(locale);

  // Validated before the form is even drawn, so a dead link says so straight
  // away instead of after the visitor has typed a password twice.
  const state = await checkResetToken(searchParams.token);

  const footer = (
    <Link href="/dashboard/login" className="link-underline">
      {d.reset.backToLogin}
    </Link>
  );

  if (state !== 'valid') {
    const message =
      state === 'expired'
        ? d.reset.linkExpired
        : state === 'used'
          ? d.reset.linkUsed
          : d.reset.linkInvalid;

    return (
      <AuthShell
        storeName={settings.storeName}
        locale={locale}
        eyebrow={d.login.eyebrow}
        footer={footer}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <div>
            <h1 className="font-display text-title-md sm:text-headline-sm">
              {d.reset.requestTitle}
            </h1>
            <p className="mt-2 text-body-sm text-error">{message}</p>
          </div>
        </div>
        <Link
          href="/dashboard/forgot"
          className="label-caps mt-6 flex h-12 w-full items-center justify-center border border-navy text-navy transition-colors hover:bg-navy hover:text-background"
        >
          {d.reset.askAgain}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      storeName={settings.storeName}
      locale={locale}
      eyebrow={d.login.eyebrow}
      footer={footer}
    >
      <ResetForm
        token={searchParams.token ?? ''}
        labels={{
          title: d.reset.chooseTitle,
          intro: d.reset.chooseIntro,
          newPassword: d.reset.newPassword,
          confirmPassword: d.reset.confirmPassword,
          minLength: d.reset.minLength,
          save: d.reset.save,
          saving: d.reset.saving,
          doneTitle: d.reset.doneTitle,
          doneBody: d.reset.doneBody,
          signIn: d.login.submit,
          show: d.login.show,
          hide: d.login.hide,
        }}
      />
    </AuthShell>
  );
}
