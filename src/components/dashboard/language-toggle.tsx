'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { setLocale } from '@/app/actions/locale';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

/**
 * Both languages side by side with the current one filled, so the operator can
 * see at a glance which language the dashboard is in.
 *
 * On a phone that context is not worth the width — the surrounding page is
 * already visibly in one language — so only the language you would switch *to*
 * is shown, matching the storefront switcher. Done in CSS rather than by
 * branching on a breakpoint in JS, which would need a resize listener and
 * would render the wrong half on the server.
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
              'label-caps flex-1 px-3 py-2.5 transition-colors duration-200 ease-scandi disabled:cursor-wait',
              active
                ? 'bg-navy text-background max-md:hidden'
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
