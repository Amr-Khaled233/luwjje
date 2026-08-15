'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap, useExitAnimation } from '@/components/ui/motion';
import type { Dictionary } from '@/i18n/dictionaries';

export interface FilterOption {
  value: string;
  label: string;
  hex?: string;
}

/**
 * A select whose blank option is the *placeholder*. The real options must
 * never repeat it — an earlier version listed "Best Selling" as both the
 * placeholder and the first sort value, so it appeared twice.
 */
function FilterSelect({
  placeholder,
  value,
  options,
  onChange,
  includeBlank = true,
  className,
}: {
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  includeBlank?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-reset h-11 w-full cursor-pointer border border-outline-variant bg-background text-label-md text-on-surface transition-colors focus:border-navy focus:outline-none ltr:pl-4 ltr:pr-9 rtl:pl-9 rtl:pr-4"
      >
        {includeBlank && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-secondary ltr:right-3 rtl:left-3"
      />
    </div>
  );
}

export function ShopFilterBar({
  t,
  colors,
  categories,
  priceRanges,
  showSort,
  className,
}: {
  t: Dictionary;
  colors: FilterOption[];
  categories: FilterOption[];
  priceRanges: FilterOption[];
  showSort: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  useScrollLock(sheetOpen);
  const sheetRef = useFocusTrap(sheetOpen);
  const sheet = useExitAnimation(sheetOpen, 260);

  React.useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete('page'); // any filter change resets pagination
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const SORTS: FilterOption[] = [
    { value: 'best', label: t.shop.sort.best },
    { value: 'price-asc', label: t.shop.sort.priceAsc },
    { value: 'price-desc', label: t.shop.sort.priceDesc },
    { value: 'newest', label: t.shop.sort.newest },
  ];

  const active = {
    color: searchParams.get('color') ?? '',
    category: searchParams.get('category') ?? '',
    price: searchParams.get('price') ?? '',
    sort: searchParams.get('sort') ?? 'best',
    q: searchParams.get('q') ?? '',
  };

  const chips = [
    active.q && { key: 'q', label: `${t.shop.searchLabel}: ${active.q}` },
    active.color && {
      key: 'color',
      label: colors.find((c) => c.value === active.color)?.label ?? active.color,
    },
    active.category && {
      key: 'category',
      label: categories.find((c) => c.value === active.category)?.label ?? active.category,
    },
    active.price && {
      key: 'price',
      label: priceRanges.find((p) => p.value === active.price)?.label ?? active.price,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  const hasFilters = colors.length > 0 || categories.length > 0 || priceRanges.length > 0;

  /** The three filter selects, shared by the desktop bar and the phone sheet. */
  const selects = (stacked: boolean) => (
    <>
      {colors.length > 0 && (
        <FilterSelect
          placeholder={t.shop.colour}
          value={active.color}
          options={colors}
          onChange={(v) => setParam('color', v)}
          className={stacked ? 'w-full' : 'w-auto'}
        />
      )}
      {categories.length > 0 && (
        <FilterSelect
          placeholder={t.shop.category}
          value={active.category}
          options={categories}
          onChange={(v) => setParam('category', v)}
          className={stacked ? 'w-full' : 'w-auto'}
        />
      )}
      {priceRanges.length > 0 && (
        <FilterSelect
          placeholder={t.shop.price}
          value={active.price}
          options={priceRanges}
          onChange={(v) => setParam('price', v)}
          className={stacked ? 'w-full' : 'w-auto'}
        />
      )}
    </>
  );

  // Only the three filter selects count towards the badge — sort is not a filter.
  const activeCount = [active.color, active.category, active.price].filter(Boolean).length;

  return (
    <div className={cn('border-y border-outline-variant', className)}>
      {/*
        One row that reflows rather than two rows swapped by breakpoint: the
        sort select must exist exactly once in the DOM, or "Best Selling"
        appears twice to a screen reader and to anything reading the markup.

        Phone: a button that opens the filters in a sheet, with sort beside it.
        Tablet and up: the three selects inline, sort pushed to the far end.
      */}
      <div
        className={cn(
          'flex items-center gap-3 py-4 transition-opacity duration-200 md:justify-between md:py-5',
          pending && 'opacity-50',
        )}
      >
        {hasFilters && (
          <>
            <button
              onClick={() => setSheetOpen(true)}
              className="label-caps inline-flex h-11 flex-1 items-center justify-center gap-2 border border-outline-variant text-on-surface transition-colors active:bg-surface-low md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t.shop.filter}
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center bg-navy px-1 text-[10px] leading-none text-background">
                  {activeCount}
                </span>
              )}
            </button>

            <div className="hidden flex-wrap items-center gap-3 md:flex">
              <span className="label-caps text-secondary ltr:mr-1 rtl:ml-1">{t.shop.filter}</span>
              {selects(false)}
            </div>
          </>
        )}

        {showSort && (
          <div
            className={cn(
              'flex items-center gap-3 md:shrink-0',
              hasFilters ? 'flex-1 md:flex-none' : 'w-full md:w-auto',
            )}
          >
            <span className="label-caps hidden text-secondary md:inline">{t.shop.sortBy}</span>
            {/* No blank option: sorting always has a value, so a placeholder
                would duplicate whichever sort is the default. */}
            <FilterSelect
              placeholder={t.shop.sortBy}
              value={active.sort}
              options={SORTS}
              onChange={(v) => setParam('sort', v)}
              includeBlank={false}
              className="flex-1 md:w-auto md:flex-none"
            />
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant py-3 md:py-4">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setParam(c.key, '')}
              className="label-caps inline-flex max-w-full items-center gap-2 border border-outline-variant px-3 py-1.5 text-secondary transition-colors hover:border-navy hover:text-on-surface"
            >
              <span className="truncate">{c.label}</span>
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          <button
            onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
            className="label-caps text-secondary underline-offset-4 hover:underline ltr:ml-2 rtl:mr-2"
          >
            {t.shop.clearAll}
          </button>
        </div>
      )}

      {/* --------------------------------------------------- phone filter sheet */}
      {sheet.mounted && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className={cn(
              'scrim absolute inset-0',
              sheet.closing ? 'animate-fade-out' : 'animate-fade-in',
            )}
            onClick={() => setSheetOpen(false)}
          />
          {/* Rises from the bottom edge — the reachable half of a phone. */}
          <div
            ref={sheetRef}
            className={cn(
              'absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto overscroll-contain border-t border-outline-variant bg-background px-margin-mobile pb-safe pt-5',
              sheet.closing ? 'animate-fade-out' : 'animate-fade-up',
            )}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-title-md">{t.shop.filter}</h2>
              <button
                className="tap-target -me-2.5"
                onClick={() => setSheetOpen(false)}
                aria-label={t.nav.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">{selects(true)}</div>

            <div className="mt-6 flex gap-3 pb-5">
              {activeCount > 0 && (
                <button
                  onClick={() => {
                    startTransition(() => router.push(pathname, { scroll: false }));
                    setSheetOpen(false);
                  }}
                  className="label-caps h-12 flex-1 border border-navy text-navy transition-colors active:bg-surface-low"
                >
                  {t.shop.clearAll}
                </button>
              )}
              <button
                onClick={() => setSheetOpen(false)}
                className="label-caps h-12 flex-1 border border-navy bg-navy text-background transition-transform active:scale-[0.98]"
              >
                {t.shop.showResults}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
