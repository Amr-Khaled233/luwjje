import Link from 'next/link';
import { DIRECTION, type Locale } from '@/i18n/config';

/**
 * The frame shared by the three unauthenticated dashboard screens — sign in,
 * request a reset, choose a new password. They are the only pages outside the
 * dashboard shell, so the direction and the wordmark are set here rather than
 * repeated three times.
 */
export function AuthShell({
  storeName,
  locale,
  eyebrow,
  children,
  footer,
}: {
  storeName: string;
  locale: Locale;
  eyebrow: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      dir={DIRECTION[locale]}
      lang={locale}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-margin-mobile py-12"
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center md:mb-10">
          <Link href="/" className="font-display text-[28px] leading-none md:text-[32px]">
            {storeName}
          </Link>
          <p className="label-caps mt-3 text-secondary">{eyebrow}</p>
        </div>

        <div className="animate-fade-up border border-outline-variant bg-surface-lowest p-6 sm:p-8">
          {children}
        </div>

        {footer && <div className="mt-8 text-center text-body-sm text-tertiary">{footer}</div>}
      </div>
    </div>
  );
}
