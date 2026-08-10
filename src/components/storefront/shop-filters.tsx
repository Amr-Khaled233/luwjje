'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
}: {
  placeholder: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
  includeBlank?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-reset h-11 cursor-pointer border border-outline-variant bg-background text-label-md text-on-surface transition-colors focus:border-navy focus:outline-none ltr:pl-4 ltr:pr-9 rtl:pl-9 rtl:pr-4"
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

  return (
    <div className={cn('border-y border-outline-variant', className)}>
      <div
        className={cn(
          'flex flex-col gap-4 py-5 transition-opacity md:flex-row md:items-center md:justify-between',
          pending && 'opacity-50',
        )}
      >
        {hasFilters ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-caps hidden text-secondary md:inline ltr:mr-1 rtl:ml-1">
              {t.shop.filter}
            </span>
            {colors.length > 0 && (
              <FilterSelect
                placeholder={t.shop.colour}
                value={active.color}
                options={colors}
                onChange={(v) => setParam('color', v)}
              />
            )}
            {categories.length > 0 && (
              <FilterSelect
                placeholder={t.shop.category}
                value={active.category}
                options={categories}
                onChange={(v) => setParam('category', v)}
              />
            )}
            {priceRanges.length > 0 && (
              <FilterSelect
                placeholder={t.shop.price}
                value={active.price}
                options={priceRanges}
                onChange={(v) => setParam('price', v)}
              />
            )}
          </div>
        ) : (
          <span />
        )}

        {showSort && (
          <div className="flex items-center gap-3">
            <span className="label-caps hidden text-secondary md:inline">{t.shop.sortBy}</span>
            {/* No blank option: sorting always has a value, so a placeholder
                would duplicate whichever sort is the default. */}
            <FilterSelect
              placeholder={t.shop.sortBy}
              value={active.sort}
              options={SORTS}
              onChange={(v) => setParam('sort', v)}
              includeBlank={false}
            />
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant py-4">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setParam(c.key, '')}
              className="label-caps inline-flex items-center gap-2 border border-outline-variant px-3 py-1.5 text-secondary transition-colors hover:border-navy hover:text-on-surface"
            >
              {c.label}
              <X className="h-3 w-3" />
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
    </div>
  );
}
