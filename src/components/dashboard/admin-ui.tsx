import * as React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-6 pl-14 md:pl-0', className)}>
      <div>
        <h1 className="font-display text-headline-lg">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-body-md text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  change,
  hint,
  className,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  className?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className={cn('border border-outline-variant bg-surface-lowest p-6', className)}>
      <p className="label-caps text-secondary">{label}</p>
      {/* Sans + proportional figures: a serif display face on a stat value
          reads as decoration, and tabular-nums looks loose at this size. */}
      <p className="mt-4 text-[32px] font-normal leading-none tracking-tight">{value}</p>
      <div className="mt-4 flex items-center gap-2">
        {change !== undefined && (
          <span
            className={cn(
              'flex items-center gap-1 text-body-sm',
              up ? 'text-on-surface' : 'text-error',
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-body-sm text-tertiary">{hint}</span>}
      </div>
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
        <header className="flex items-center justify-between gap-4 border-b border-outline-variant px-6 py-5">
          {title && <h2 className="font-display text-headline-sm">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Horizontally scrollable table wrapper — the page body never scrolls sideways. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full min-w-[720px] border-collapse text-left">{children}</table>
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
        'label-caps whitespace-nowrap bg-surface-low px-4 py-3 text-secondary',
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
        'px-4 py-4 align-middle text-body-md',
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
