'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The single filter row for a dashboard page — every panel below re-renders
 * against the same slice rather than carrying its own control.
 */
export function RangePicker({
  value,
  options,
  param = 'days',
}: {
  value: string;
  options: { value: string; label: string }[];
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn('relative', pending && 'opacity-60')}>
      <label htmlFor="range-picker" className="sr-only">
        Date range
      </label>
      <select
        id="range-picker"
        value={value}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set(param, e.target.value);
          startTransition(() => router.push(`${pathname}?${params.toString()}`));
        }}
        className="select-reset h-11 cursor-pointer border border-outline-variant bg-background ps-4 pe-9 text-label-md transition-colors focus:border-navy focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}
