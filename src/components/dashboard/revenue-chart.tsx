'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';
import { CHART, axisTick, ChartTooltip, ChartTable, ViewToggle } from './chart-parts';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { formatPrice } from '@/lib/utils';

interface Point {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

/**
 * One series, one axis: revenue over time. Order count rides along in the
 * tooltip as context — plotting it would mean a second y-scale, which invents
 * a correlation that is not in the data.
 */
export function RevenueChart({
  data,
  currencySymbol,
  days,
}: {
  data: Point[];
  currencySymbol: string;
  days: number;
}) {
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  const { locale, d: dict } = useDash();
  const a = dict.analytics;

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const peak = data.reduce((best, d) => (d.revenue > best.revenue ? d : best), data[0]);

  // Thin out ticks so labels never collide on longer ranges. Phones show
  // roughly half as many before they start overlapping.
  const [dense, setDense] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const sync = () => setDense(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  const tickInterval = Math.max(0, Math.floor(data.length / (dense ? 4 : 8)));

  const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 md:mb-6 md:gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-title-md md:text-headline-sm">{a.revenue}</h2>
          <p className="mt-1.5 text-body-sm text-secondary">
            {fmt(a.revenueAcross, { amount: formatPrice(total, currencySymbol, locale), days })}
            {peak && ` · ${fmt(a.peak, { date: shortDate(peak.date) })}`}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      {view === 'table' ? (
        <ChartTable
          columns={[a.dateCol, `${a.revenue} (${currencySymbol})`, a.ordersCol]}
          rows={data.map((d) => [
            format(new Date(d.date), 'd MMM yyyy'),
            d.revenue.toFixed(2),
            d.orders,
          ])}
        />
      ) : (
        // Height includes the x-axis band so the card never scrolls internally.
        <div className="h-[240px] w-full sm:h-[280px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.ink} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={CHART.ink} stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke={CHART.grid}
                strokeWidth={1}
                vertical={false}
                /* solid hairlines — dashing reads as "projection" */
              />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                interval={tickInterval}
                tickMargin={10}
                minTickGap={16}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                // A 64px gutter is a fifth of a 360px phone; abbreviate
                // harder there so the plot keeps the room.
                width={dense ? 44 : 64}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(dense ? 0 : 1)}k` : String(v)
                }
              />
              <Tooltip
                cursor={{ stroke: CHART.ink, strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  if (!point) return null;
                  return (
                    <ChartTooltip
                      active={active}
                      label={format(new Date(point.date), 'EEEE d MMMM')}
                      rows={[
                        {
                          key: 'revenue',
                          label: a.revenue,
                          value: formatPrice(point.revenue, currencySymbol, locale),
                        },
                        { key: 'orders', label: a.orders, value: String(point.orders) },
                      ]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART.ink}
                strokeWidth={2}
                fill="url(#revenueFill)"
                dot={false}
                activeDot={{ r: 4, fill: CHART.ink, stroke: CHART.surface, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
