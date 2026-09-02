import { Package, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Where the order is, as a row of steps: Being prepared → Shipped → Delivered.
 * Everything up to and including the current status is lit; the rest waits.
 * A cancelled order leaves the linear flow, so it gets its own notice rather
 * than a half-filled track that would imply it is still on its way.
 *
 * Labels come straight from the order dictionary, so the wording matches the
 * status badge and stays translated. Direction-agnostic: the progress line
 * grows from the inline-start edge, which the surrounding `dir` flips for RTL.
 */
const STEPS = [
  { key: 'PENDING', Icon: Package },
  { key: 'SHIPPED', Icon: Truck },
  { key: 'DELIVERED', Icon: CheckCircle2 },
] as const;

export function OrderProgress({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 border border-error/40 bg-error/5 px-4 py-3 text-error">
        <XCircle className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-body-md font-medium">{labels.CANCELLED ?? 'Cancelled'}</span>
      </div>
    );
  }

  const currentIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status),
  );
  const lastIndex = STEPS.length - 1;

  return (
    <div className="relative px-2">
      {/* Base track and the lit progress line, both between circle centres. */}
      <div className="absolute inset-x-7 top-5 h-0.5 bg-outline-variant" aria-hidden />
      <div
        className="absolute top-5 h-0.5 bg-navy transition-[width] duration-500 ease-scandi"
        style={{
          insetInlineStart: '1.75rem',
          width: `calc((100% - 3.5rem) * ${currentIndex} / ${lastIndex})`,
        }}
        aria-hidden
      />

      <ol className="relative flex justify-between">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const current = i === currentIndex;
          const Icon = step.Icon;
          return (
            <li key={step.key} className="flex w-16 flex-col items-center gap-2">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  done
                    ? 'border-navy bg-navy text-background'
                    : 'border-outline-variant bg-background text-secondary',
                  current && 'ring-2 ring-navy/30 ring-offset-2 ring-offset-background',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span
                className={cn(
                  'text-center text-label-sm leading-tight',
                  done ? 'text-on-surface' : 'text-secondary',
                )}
              >
                {labels[step.key] ?? step.key}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
