import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  actions,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-6', className)}>
      <div>
        {/* The title alone. A paragraph explaining the page to the person who
            runs the shop is read once and then in the way of the work. */}
        <h1 className="font-display text-headline-md md:text-headline-lg">{title}</h1>
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  /** A word about what the figure counts. Nothing is drawn without one. */
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('animate-fade-up border border-outline-variant bg-surface-lowest p-5 md:p-6', className)}>
      <p className="label-caps text-secondary">{label}</p>
      {/* Sans + proportional figures: a serif display face on a stat value
          reads as decoration, and tabular-nums looks loose at this size. */}
      <p className="mt-3 text-[26px] font-normal leading-none tracking-tight md:mt-4 md:text-[32px]">{value}</p>
      {/* Only when there is something to say — an empty strip of padding
          under a lone figure makes the card look like it failed to load. */}
      {hint && <p className="mt-4 text-body-sm text-tertiary">{hint}</p>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('border border-outline-variant bg-surface-lowest', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-4 py-4 md:gap-4 md:px-6 md:py-5">
          {title && <h2 className="font-display text-title-md md:text-headline-sm">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn('p-4 md:p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Horizontally scrollable table wrapper — the page body never scrolls sideways.
 *
 * A grid table cannot usefully reflow to 360px, so on phones it keeps its
 * shape and scrolls instead. `overscroll-x-contain` stops that scroll from
 * turning into a browser back-swipe once it reaches the end.
 */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('w-full overflow-x-auto overscroll-x-contain', className)}
      // Keyboard users need to be able to reach the scroll container itself.
      tabIndex={0}
      role="region"
    >
      <table className="w-full min-w-[720px] border-collapse text-start">{children}</table>
    </div>
  );
}

/**
 * Full grid rules. Every cell carries a bottom and an end border; the last
 * column drops its end border so the table's own outline is not doubled.
 * Logical properties (`-e-`) keep the lines on the correct side in RTL.
 */
const cellRules = 'border-b border-e border-outline-variant last:border-e-0';

export function Th({
  children,
  className,
  align = 'start',
}: {
  children?: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
}) {
  return (
    <th
      scope="col"
      className={cn(
        'label-caps whitespace-nowrap bg-surface-low px-3 py-3 text-secondary md:px-4',
        cellRules,
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  colSpan,
  align = 'start',
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
  align?: 'start' | 'end' | 'center';
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-3 py-3 align-middle text-body-sm md:px-4 md:py-4 md:text-body-md',
        cellRules,
        align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1 w-full bg-surface-container', className)}>
      <div
        className="h-1 bg-navy transition-all duration-500 ease-scandi"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
