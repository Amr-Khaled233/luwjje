'use client';

import * as React from 'react';
import { Input, Textarea, FieldLabel, FieldError, FieldHint } from '@/components/ui/field';
import { cn } from '@/lib/utils';

/**
 * An English/Arabic pair behind one label. Only one side is on screen at a
 * time, so a bilingual form stays as short as a monolingual one, and the tab
 * shows a dot when the Arabic side is still empty.
 */
export function BilingualField({
  label,
  hint,
  required,
  rows,
  placeholder,
  placeholderAr,
  english,
  arabic,
  errorEn,
  errorAr,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Renders a textarea instead of a single-line input. */
  rows?: number;
  placeholder?: string;
  placeholderAr?: string;
  english: { value: string; onChange: (v: string) => void };
  arabic: { value: string; onChange: (v: string) => void };
  errorEn?: string;
  errorAr?: string;
  className?: string;
}) {
  const [lang, setLang] = React.useState<'en' | 'ar'>('en');
  const active = lang === 'en' ? english : arabic;
  const error = lang === 'en' ? errorEn : errorAr;

  const shared = {
    value: active.value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      active.onChange(e.target.value),
    dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const),
    placeholder: lang === 'ar' ? placeholderAr : placeholder,
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <FieldLabel required={required} className="mb-0">
          {label}
        </FieldLabel>

        <div className="flex border border-outline-variant">
          {(['en', 'ar'] as const).map((code) => {
            const empty = code === 'ar' && !arabic.value.trim();
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={cn(
                  'label-caps flex items-center gap-1.5 px-2.5 py-1 transition-colors',
                  lang === code ? 'bg-navy text-background' : 'text-secondary hover:text-on-surface',
                )}
              >
                {code === 'en' ? 'EN' : 'ع'}
                {/* A quiet reminder that this side has not been written yet. */}
                {empty && (
                  <span
                    className={cn(
                      'h-1 w-1 rounded-full',
                      lang === code ? 'bg-background/70' : 'bg-outline-variant',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {rows ? <Textarea rows={rows} {...shared} /> : <Input {...shared} />}

      <FieldError>{error}</FieldError>
      {!error && lang === 'ar' && !arabic.value.trim() && (
        <FieldHint>Left blank, Arabic shoppers see the English text.</FieldHint>
      )}
      {!error && lang === 'en' && hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
