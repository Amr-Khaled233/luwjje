import { StatCard, Panel } from '@/components/dashboard/admin-ui';
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
} from '@/lib/analytics';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;

  const [stats, series, topProducts, categories, statuses] = await Promise.all([
    getOverviewStats(days),
    getRevenueSeries(days),
    getTopPerformers(days, 8),
    getCategoryPerformance(days),
    getOrderStatusBreakdown(),
  ]);

  const symbol = stats.currencySymbol;
  const aov = stats.orderCount ? stats.sales / stats.orderCount : 0;

  return (
    <div className="flex flex-col gap-8">
      <AnalyticsHeader days={days} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(stats.sales, symbol)}
          change={stats.salesChange}
          hint="vs previous period"
        />
        <StatCard
          label="Orders"
          value={String(stats.orderCount)}
          change={stats.ordersChange}
          hint="vs previous period"
        />
        <StatCard label="Average order value" value={formatPrice(aov, symbol)} />
        <StatCard
          label="Conversion rate"
          value={`${stats.conversion.toFixed(2)}%`}
          change={stats.conversionChange}
          hint={`${stats.sessions} sessions`}
        />
      </div>

      <Panel bodyClassName="p-4 md:p-6">
        <RevenueChart data={series} currencySymbol={symbol} days={days} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel bodyClassName="p-4 md:p-6">
          <RankedBarChart
            title="Top Products"
            subtitle={`Units sold in the last ${days} days`}
            valueLabel="Units"
            data={topProducts.map((p) => ({
              name: p.name,
              value: p.units,
              secondary: formatPrice(p.revenue, symbol),
            }))}
            secondaryLabel="Revenue"
          />
        </Panel>

        <Panel bodyClassName="p-4 md:p-6">
          <RankedBarChart
            title="Top Categories"
            subtitle={`Revenue in the last ${days} days`}
            valueLabel={`Revenue (${symbol})`}
            data={categories.map((c) => ({
              name: c.name,
              value: c.revenue,
              secondary: `${c.units} units`,
            }))}
            secondaryLabel="Units"
            format="currency"
            currencySymbol={symbol}
          />
        </Panel>

        <Panel title="Orders by status" bodyClassName="p-6">
          <OrderStatusPanel data={statuses} />
        </Panel>
      </div>
    </div>
  );
}
