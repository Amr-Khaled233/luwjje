import * as React from 'react';
import { cn } from '@/lib/utils';

/** White card on parchment, 1px outline, zero radius, zero shadow. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border border-outline-variant bg-surface-lowest', className)}
      {...props}
    />
  );
}

/** Outline-only tag. No fill, label-caps type. */
export function Chip({
  className,
  active,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { active?: boolean }) {
  return (
    <span
      className={cn(
        'label-caps inline-flex items-center border px-3 py-1.5',
        active ? 'border-navy bg-navy text-background' : 'border-outline-variant text-secondary',
        className,
      )}
      {...props}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-6', className)}>
      <div>
        {eyebrow && <p className="label-caps mb-3 text-secondary">{eyebrow}</p>}
        <h2 className="font-display text-headline-md text-on-surface md:text-headline-md">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-outline-variant', className)} />;
}

/** Colour swatch — the one place a full radius is allowed. */
export function ColorDot({
  hex,
  selected,
  size = 'md',
  className,
  title,
}: {
  hex: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}) {
  const dims = { sm: 'h-2.5 w-2.5', md: 'h-4 w-4', lg: 'h-7 w-7' }[size];
  return (
    <span
      title={title}
      className={cn(
        'inline-block rounded-full border',
        dims,
        selected ? 'border-navy ring-1 ring-navy ring-offset-2 ring-offset-background' : 'border-outline-variant',
        className,
      )}
      style={{ backgroundColor: hex }}
    />
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border border-dashed border-outline-variant px-6 py-20 text-center',
        className,
      )}
    >
      <h3 className="font-display text-headline-sm text-on-surface">{title}</h3>
      {body && <p className="mt-2 max-w-md text-body-md text-secondary">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const statusTones: Record<string, string> = {
  PENDING: 'border-outline-soft text-secondary',
  PAID: 'border-navy text-navy',
  SHIPPED: 'border-navy text-navy',
  DELIVERED: 'border-navy bg-navy text-background',
  CANCELLED: 'border-error text-error',
  PUBLISHED: 'border-navy text-navy',
  DRAFT: 'border-outline-variant text-tertiary',
  ACTIVE: 'border-navy text-navy',
  EXPIRED: 'border-outline-variant text-tertiary',
  DISABLED: 'border-outline-variant text-tertiary',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'label-caps inline-flex items-center border px-2.5 py-1',
        statusTones[status] ?? 'border-outline-variant text-secondary',
        className,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
