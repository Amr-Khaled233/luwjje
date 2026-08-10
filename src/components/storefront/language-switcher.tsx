'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { setLocale } from '@/app/actions/locale';
import { LOCALE_LABEL, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({
  locale,
  className,
  withIcon = true,
}: {
  locale: Locale;
  className?: string;
  withIcon?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const next: Locale = locale === 'en' ? 'ar' : 'en';

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        })
      }
      disabled={pending}
      // The label names the language you are switching *to*, in that language.
      aria-label={`Switch to ${LOCALE_LABEL[next]}`}
      className={cn(
        'flex items-center gap-1.5 text-label-md text-secondary transition-colors hover:text-on-surface disabled:opacity-50',
        className,
      )}
    >
      {withIcon && <Globe className="h-4 w-4" />}
      <span className={next === 'ar' ? 'font-sans' : undefined}>{LOCALE_LABEL[next]}</span>
    </button>
  );
}
