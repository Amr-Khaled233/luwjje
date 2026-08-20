'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Download } from 'lucide-react';
import { PageHeader } from './admin-ui';
import { Button } from '@/components/ui/button';
import { useDash } from './dashboard-i18n';
import { cn } from '@/lib/utils';

export interface AnalyticsRange {
  /** Inclusive, yyyy-mm-dd. */
  from: string;
  to: string;
  /** Set when the range came from a preset rather than the two date fields. */
  days: number | null;
}

const PRESETS = [7, 30, 90];

/**
 * The period every panel below is computed over, and the two exports of it.
 *
 * Presets and a pair of dates rather than one or the other: "last 30 days" is
 * what you want most mornings, and "1 to 15 March" is what you want when
 * someone asks about a specific fortnight.
 */
export function AnalyticsHeader({ range }: { range: AnalyticsRange }) {
  const { d } = useDash();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();

  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);

  React.useEffect(() => {
    setFrom(range.from);
    setTo(range.to);
  }, [range.from, range.to]);

  const go = (query: string) =>
    startTransition(() => router.push(`${pathname}?${query}`));

  const label = { d7: d.ranges.d7, d30: d.ranges.d30, d90: d.ranges.d90 };

  /** The query the exports use — whatever is currently on screen. */
  const exportQuery = range.days
    ? `days=${range.days}`
    : `from=${range.from}&to=${range.to}`;

  return (
    <PageHeader
      title={d.analytics.title}
      description={d.analytics.description}
      actions={
        <div className={cn('flex flex-col gap-3', pending && 'opacity-60')}>
          <div className="flex flex-wrap items-end gap-2">
            {/* Presets. */}
            <div className="flex border border-outline-variant">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => go(`days=${n}`)}
                  aria-pressed={range.days === n}
                  className={cn(
                    'label-caps px-3 py-2.5 transition-colors duration-200 ease-scandi',
                    range.days === n
                      ? 'bg-navy text-background'
                      : 'text-secondary hover:bg-surface-low hover:text-on-surface',
                  )}
                >
                  {label[`d${n}` as keyof typeof label]}
                </button>
              ))}
            </div>

            {/* Or a period of your own. */}
            <div className="flex items-end gap-2">
              <label className="flex flex-col">
                <span className="label-caps mb-1 text-secondary">{d.analytics.from}</span>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-11 border border-outline-variant bg-background px-3 text-body-sm transition-colors focus:border-navy focus:outline-none"
                />
              </label>
              <label className="flex flex-col">
                <span className="label-caps mb-1 text-secondary">{d.analytics.to}</span>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-11 border border-outline-variant bg-background px-3 text-body-sm transition-colors focus:border-navy focus:outline-none"
                />
              </label>
              <Button
                variant="secondary"
                onClick={() => go(`from=${from}&to=${to}`)}
                disabled={!from || !to}
              >
                {d.analytics.apply}
              </Button>
            </div>
          </div>

          {/* Two files: how it went, and what was ordered. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/dashboard/report?report=summary&${exportQuery}`)}
            >
              <Download className="h-4 w-4" />
              {d.report.downloadAnalytics}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/dashboard/report?report=orders&${exportQuery}`)}
            >
              <Download className="h-4 w-4" />
              {d.report.downloadOrders}
            </Button>
          </div>
        </div>
      }
    />
  );
}
