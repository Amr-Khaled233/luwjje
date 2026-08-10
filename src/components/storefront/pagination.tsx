'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageCount,
  previousLabel,
  nextLabel,
  className,
}: {
  page: number;
  pageCount: number;
  previousLabel: string;
  nextLabel: string;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(
          'flex h-11 w-11 items-center justify-center border border-outline-variant transition-colors hover:border-navy',
          page <= 1 && 'pointer-events-none opacity-30',
        )}
        aria-label={previousLabel}
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
      </Link>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && (
            <span className="px-2 text-body-sm text-tertiary">…</span>
          )}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'flex h-11 w-11 items-center justify-center border text-label-md transition-colors',
              p === page
                ? 'border-navy bg-navy text-background'
                : 'border-outline-variant hover:border-navy',
            )}
          >
            {p}
          </Link>
        </span>
      ))}

      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= pageCount}
        tabIndex={page >= pageCount ? -1 : undefined}
        className={cn(
          'flex h-11 w-11 items-center justify-center border border-outline-variant transition-colors hover:border-navy',
          page >= pageCount && 'pointer-events-none opacity-30',
        )}
        aria-label={nextLabel}
      >
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </Link>
    </nav>
  );
}
