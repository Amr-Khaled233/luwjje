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
}

/**
 * From / to / Apply, pushed into the URL so the period survives a refresh and
 * can be linked to. Used by every page that is about a stretch of time.
 */
export function PeriodPicker({ range }: { range: AnalyticsRange }) {
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

  return (
    // Wraps on a phone: the two dates share a row and shrink to fit, and Apply
    // drops to a full-width line beneath them rather than overflowing.
    <div className={cn('flex w-full flex-wrap items-end gap-2 sm:w-auto', pending && 'opacity-60')}>
      <label className="flex min-w-0 flex-1 flex-col sm:flex-none">
        <span className="label-caps mb-1 text-secondary">{d.analytics.from}</span>
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 w-full border border-outline-variant bg-background px-3 text-body-sm transition-colors focus:border-navy focus:outline-none"
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col sm:flex-none">
        <span className="label-caps mb-1 text-secondary">{d.analytics.to}</span>
        <input
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="h-11 w-full border border-outline-variant bg-background px-3 text-body-sm transition-colors focus:border-navy focus:outline-none"
        />
      </label>
      <Button
        variant="secondary"
        onClick={() =>
          startTransition(() => router.push(`${pathname}?from=${from}&to=${to}`))
        }
        disabled={!from || !to}
        className="w-full sm:w-auto"
      >
        {d.analytics.apply}
      </Button>
    </div>
  );
}

/** The period the panels below are computed over, and the two exports of it. */
export function AnalyticsHeader({ range }: { range: AnalyticsRange }) {
  const { d } = useDash();

  /** The exports cover whatever period is on screen. */
  const exportQuery = `from=${range.from}&to=${range.to}`;

  return (
    <PageHeader
      title={d.analytics.title}
      actions={
        <div className="flex flex-col gap-3">
          <PeriodPicker range={range} />

          {/* Two files: how it went, and what was ordered. Full width and
              stacked on a phone, side by side from sm up. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/dashboard/report?report=summary&${exportQuery}`)}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              {d.report.downloadAnalytics}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open(`/api/dashboard/report?report=orders&${exportQuery}`)}
              className="w-full sm:w-auto"
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
