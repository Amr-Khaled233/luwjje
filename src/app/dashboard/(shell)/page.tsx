import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { PageHeader, StatCard, Panel, ProgressBar } from '@/components/dashboard/admin-ui';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { RangePicker } from '@/components/dashboard/range-picker';
import { DownloadReportButton } from '@/components/dashboard/download-report';
import {
  getOverviewStats,
  getRevenueSeries,
  getLowStockVariants,
  getTopPerformers,
} from '@/lib/analytics';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const days = [7, 30, 90].includes(Number(searchParams.days)) ? Number(searchParams.days) : 30;

  const [stats, series, lowStock, top] = await Promise.all([
    getOverviewStats(days),
    getRevenueSeries(days),
    getLowStockVariants(5),
    getTopPerformers(days, 3),
  ]);

  const symbol = stats.currencySymbol;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description={`Everything at a glance for the last ${days} days. Figures are read live from the store database.`}
        actions={
          <>
            <RangePicker
              value={String(days)}
              options={[
                { value: '7', label: 'Last 7 Days' },
                { value: '30', label: 'Last 30 Days' },
                { value: '90', label: 'Last 90 Days' },
              ]}
            />
            <DownloadReportButton days={days} />
          </>
        }
      />

      {/* ------------------------------------------------------- stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Sales"
          value={formatPrice(stats.sales, symbol)}
          change={stats.salesChange}
          hint="vs previous period"
        />
        <StatCard
          label="Active Orders"
          value={String(stats.activeOrders)}
          change={stats.ordersChange}
          hint="pending, paid or shipped"
        />
        <StatCard
          label="Inventory Level"
          value={`${stats.inventoryLevel.toFixed(0)}%`}
          hint={`${stats.lowStockCount} SKUs at or below their low-stock mark`}
        />
        <StatCard
          label="Conversion Rate"
          value={`${stats.conversion.toFixed(2)}%`}
          change={stats.conversionChange}
          hint={`${stats.sessions} sessions`}
        />
      </div>

      {/* ----------------------------------------------------- bento layout */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-8" bodyClassName="p-4 md:p-6">
          <RevenueChart data={series} currencySymbol={symbol} days={days} />
        </Panel>

        <div className="flex flex-col gap-4 xl:col-span-4">
          {/* low stock */}
          <Panel
            title="Low Stock"
            action={
              <Link
                href="/dashboard/stock?filter=low"
                className="label-caps group flex items-center gap-1.5 text-secondary transition-colors hover:text-on-surface"
              >
                View all
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {lowStock.length === 0 ? (
              <p className="p-6 text-body-sm text-secondary">
                Every SKU is above its low-stock mark.
              </p>
            ) : (
              <ul>
                {lowStock.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-4 border-b border-outline-variant px-6 py-4 last:border-b-0"
                  >
                    {v.image ? (
                      <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-surface-low">
                        <Image src={v.image} alt="" fill sizes="44px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-11 shrink-0 bg-surface-container" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md">{v.productName}</p>
                      <p className="mt-0.5 truncate text-body-sm text-secondary">
                        {v.colorName}
                        {v.size && ` · ${v.size}`}
                      </p>
                      <p className="mt-0.5 truncate text-body-sm text-tertiary">{v.sku}</p>
                    </div>
                    <span
                      className={`shrink-0 text-body-md ${v.stock === 0 ? 'text-error' : 'text-on-surface'}`}
                    >
                      {v.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* top performers */}
          <Panel title="Top Performers" bodyClassName="p-6">
            {top.length === 0 ? (
              <p className="text-body-sm text-secondary">No sales in this period yet.</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {top.map((p, i) => (
                  <li key={p.id || i}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-label-md">{p.name}</span>
                      <span className="shrink-0 text-body-sm text-secondary">{p.units} sold</span>
                    </div>
                    <ProgressBar value={p.share} className="mt-3" />
                    <p className="mt-2 text-body-sm text-tertiary">
                      {formatPrice(p.revenue, symbol)} revenue
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
