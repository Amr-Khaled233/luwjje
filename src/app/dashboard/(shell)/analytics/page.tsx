import { StatCard, Panel } from '@/components/dashboard/admin-ui';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { AnalyticsHeader } from '@/components/dashboard/analytics-header';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RankedBarChart } from '@/components/dashboard/ranked-bar-chart';
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
import { startOfDay, endOfDay, differenceInCalendarDays, format } from 'date-fns';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string; from?: string; to?: string };
}) {
  const d = getDashboardDictionary(await getLocale());

  // A period of your own wins over a preset; anything malformed falls back to
  // the last 30 days rather than showing an empty page.
  const day = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null;

  const fromDate = day(searchParams.from);
  const toDate = day(searchParams.to);

  let period: Period;
  let presetDays: number | null;

  if (fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
    const [a, b] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    period = { start: startOfDay(a), end: endOfDay(b) };
    presetDays = null;
  } else {
    presetDays = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;
    period = periodFromDays(presetDays);
  }

  const days = differenceInCalendarDays(period.end, period.start) + 1;

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
          days: presetDays,
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={d.analytics.revenue}
          value={formatPrice(stats.sales, symbol)}
          change={stats.salesChange}
          hint={d.analytics.vsPrevious}
        />
        <StatCard
          label={d.analytics.orders}
          value={String(stats.orderCount)}
          change={stats.ordersChange}
          hint={d.analytics.vsPrevious}
        />
        <StatCard label={d.analytics.averageOrderValue} value={formatPrice(aov, symbol)} />
        <StatCard
          label={d.analytics.conversionRate}
          value={`${stats.conversion.toFixed(2)}%`}
          change={stats.conversionChange}
          hint={fmt(d.analytics.sessions, { n: stats.sessions })}
        />
      </div>

      <Panel bodyClassName="p-4 md:p-6">
        <RevenueChart data={series} currencySymbol={symbol} days={days} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel bodyClassName="p-4 md:p-6">
          <RankedBarChart
            title={d.analytics.topProducts}
            subtitle={fmt(d.analytics.unitsSoldIn, { days })}
            valueLabel={d.analytics.units}
            data={topProducts.map((p) => ({
              name: p.name,
              value: p.units,
              secondary: formatPrice(p.revenue, symbol),
            }))}
            secondaryLabel={d.analytics.revenue}
          />
        </Panel>

        <Panel bodyClassName="p-4 md:p-6">
          <RankedBarChart
            title={d.analytics.topCategories}
            subtitle={fmt(d.analytics.revenueIn, { days })}
            valueLabel={`${d.analytics.revenue} (${symbol})`}
            data={categories.map((c) => ({
              name: c.name,
              value: c.revenue,
              secondary: `${c.units} units`,
            }))}
            secondaryLabel={d.analytics.units}
            format="currency"
            currencySymbol={symbol}
          />
        </Panel>

        <Panel title={d.analytics.ordersByStatus} bodyClassName="p-6">
          <OrderStatusPanel data={statuses} />
        </Panel>
      </div>
    </div>
  );
}
