'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRICE_RANGES = [
  { value: '0-100', label: 'Under $100' },
  { value: '100-250', label: '$100 – $250' },
  { value: '250-500', label: '$250 – $500' },
  { value: '500-+', label: '$500 and above' },
];

const SORTS = [
  { value: 'best', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const id = React.useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-reset h-11 cursor-pointer border border-outline-variant bg-background pl-4 pr-9 text-label-md text-on-surface transition-colors focus:border-navy focus:outline-none"
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}

export function ShopFilterBar({
  colors,
  categories,
  className,
}: {
  colors: { name: string; hex: string }[];
  categories: { name: string; slug: string }[];
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

  const active = {
    color: searchParams.get('color') ?? '',
    category: searchParams.get('category') ?? '',
    price: searchParams.get('price') ?? '',
    sort: searchParams.get('sort') ?? 'best',
    q: searchParams.get('q') ?? '',
  };

  const chips = [
    active.q && { key: 'q', label: `Search: ${active.q}` },
    active.color && { key: 'color', label: active.color },
    active.category && {
      key: 'category',
      label: categories.find((c) => c.slug === active.category)?.name ?? active.category,
    },
    active.price && {
      key: 'price',
      label: PRICE_RANGES.find((p) => p.value === active.price)?.label ?? active.price,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className={cn('border-y border-outline-variant', className)}>
      <div
        className={cn(
          'flex flex-col gap-4 py-5 transition-opacity md:flex-row md:items-center md:justify-between',
          pending && 'opacity-50',
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps mr-1 hidden text-secondary md:inline">Filter</span>
          <FilterSelect
            label="Colour"
            value={active.color}
            options={colors.map((c) => ({ value: c.name, label: c.name }))}
            onChange={(v) => setParam('color', v)}
          />
          <FilterSelect
            label="Category"
            value={active.category}
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
            onChange={(v) => setParam('category', v)}
          />
          <FilterSelect
            label="Price"
            value={active.price}
            options={PRICE_RANGES}
            onChange={(v) => setParam('price', v)}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="label-caps hidden text-secondary md:inline">Sort by</span>
          <FilterSelect
            label="Best Selling"
            value={active.sort}
            options={SORTS}
            onChange={(v) => setParam('sort', v)}
          />
        </div>
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
            className="label-caps ml-2 text-secondary underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
