'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { setLocale } from '@/app/actions/locale';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Two labelled halves rather than the storefront's single toggle link.
 *
 * On the storefront a shopper reading English only needs to see "العربية" to
 * know where the other language is. Here both are shown with the current one
 * filled, so the operator can see at a glance which language the dashboard is
 * in — the same reason a settings screen shows a segmented control instead of
 * a link that says "switch".
 */
export function DashboardLanguageToggle({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'flex border border-outline-variant transition-opacity',
        pending && 'opacity-60',
        className,
      )}
    >
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            disabled={pending}
            aria-pressed={active}
            className={cn(
              'label-caps flex-1 py-2.5 transition-colors duration-200 ease-scandi disabled:cursor-wait',
              active
                ? 'bg-navy text-background'
                : 'text-secondary hover:bg-surface-low hover:text-on-surface',
              // Arabic reads better in its own body face than in label caps.
              option === 'ar' && 'font-sans',
            )}
          >
            {LOCALE_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}
