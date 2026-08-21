'use client';

import { StatTable } from './stat-table';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { formatPrice, formatDate } from '@/lib/utils';

interface Point {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

/**
 * Revenue day by day, as a table.
 *
 * A drawn curve looked the part but every figure on it had to be hovered for,
 * one point at a time. The numbers are the point, so they are simply listed —
 * readable at a glance, copyable, and identical to what the Excel export
 * contains.
 */
export function RevenueTable({
  data,
  currencySymbol,
  periodLabel,
}: {
  data: Point[];
  currencySymbol: string;
  periodLabel: string;
}) {
  const { locale, d: dict } = useDash();
  const a = dict.analytics;

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const peak = data.reduce((best, d) => (d.revenue > best.revenue ? d : best), data[0]);

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <div>
      <header className="mb-5 md:mb-6">
        <h2 className="font-display text-title-md md:text-headline-sm">{a.revenue}</h2>
        <p className="mt-1.5 text-body-sm text-secondary">
          {fmt(a.revenueAcross, {
            amount: formatPrice(total, currencySymbol, locale),
            period: periodLabel,
          })}
          {peak && total > 0 && ` · ${fmt(a.peak, { date: shortDate(peak.date) })}`}
        </p>
      </header>

      <StatTable
        columns={[a.dateCol, `${a.revenue} (${currencySymbol})`, a.ordersCol]}
        rows={data.map((d) => [
          formatDate(new Date(d.date), locale),
          d.revenue.toFixed(2),
          d.orders,
        ])}
      />
    </div>
  );
}
