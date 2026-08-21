import { StatCard, Panel } from '@/components/dashboard/admin-ui';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { AnalyticsHeader } from '@/components/dashboard/analytics-header';
import { RevenueTable } from '@/components/dashboard/revenue-table';
import { RankedTable } from '@/components/dashboard/ranked-table';
import { OrderStatusPanel } from '@/components/dashboard/order-status-panel';
import {
  getOverviewStats,
  getRevenueSeries,
  getTopPerformers,
  getCategoryPerformance,
  getOrderStatusBreakdown,
  periodFromDays,
  type Period,
} from '@/lib/analytics';
import { startOfDay, endOfDay, format } from 'date-fns';
import { formatPrice, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const locale = await getLocale();
  const d = getDashboardDictionary(locale);

  // No period asked for, or one that will not parse, opens on the last thirty
  // days rather than on an empty page.
  const day = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null;

  const fromDate = day(searchParams.from);
  const toDate = day(searchParams.to);

  let period: Period;
  if (fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
    const [a, b] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    period = { start: startOfDay(a), end: endOfDay(b) };
  } else {
    period = periodFromDays(30);
  }

  // Every panel is about the same chosen period, so each one names it by its
  // dates. "The last N days" would be a lie for a range picked by hand.
  const periodLabel = `${formatDate(period.start, locale)} — ${formatDate(period.end, locale)}`;

  const [stats, series, topProducts, categories, statuses] = await Promise.all([
    getOverviewStats(period),
    getRevenueSeries(period),
    getTopPerformers(period, 8),
    getCategoryPerformance(period),
    getOrderStatusBreakdown(),
  ]);

  const symbol = stats.currencySymbol;
  const aov = stats.orderCount ? stats.sales / stats.orderCount : 0;

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsHeader
        range={{
          from: format(period.start, 'yyyy-MM-dd'),
          to: format(period.end, 'yyyy-MM-dd'),
        }}
      />

      {/* Three figures, three columns — nothing is left standing in a gap. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={d.analytics.revenue} value={formatPrice(stats.sales, symbol)} />
        <StatCard label={d.analytics.orders} value={String(stats.orderCount)} />
        <StatCard label={d.analytics.averageOrderValue} value={formatPrice(aov, symbol)} />
      </div>

      <Panel bodyClassName="p-4 md:p-6">
        <RevenueTable data={series} currencySymbol={symbol} periodLabel={periodLabel} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel bodyClassName="p-4 md:p-6">
          <RankedTable
            title={d.analytics.topProducts}
            subtitle={fmt(d.analytics.unitsSoldIn, { period: periodLabel })}
            valueLabel={d.analytics.units}
            data={topProducts.map((p) => ({
              name: p.name,
              value: p.units,
              secondary: formatPrice(p.revenue, symbol),
            }))}
            secondaryLabel={d.analytics.revenue}
          />
        </Panel>

        {/* Same three columns in the same order as Top Products, so the two
            panels can be read side by side without re-learning them. */}
        <Panel bodyClassName="p-4 md:p-6">
          <RankedTable
            title={d.analytics.topCategories}
            subtitle={fmt(d.analytics.revenueIn, { period: periodLabel })}
            valueLabel={d.analytics.units}
            data={categories.map((c) => ({
              name: c.name,
              value: c.units,
              secondary: formatPrice(c.revenue, symbol),
            }))}
            secondaryLabel={d.analytics.revenue}
          />
        </Panel>

        <Panel title={d.analytics.ordersByStatus} bodyClassName="p-6">
          <OrderStatusPanel data={statuses} />
        </Panel>
      </div>
    </div>
  );
}
