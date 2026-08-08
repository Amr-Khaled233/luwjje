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

  const total = data.reduce((s, d) => s + d.revenue, 0);
  const peak = data.reduce((best, d) => (d.revenue > best.revenue ? d : best), data[0]);

  // Thin out ticks so labels never collide on longer ranges.
  const tickInterval = Math.max(0, Math.floor(data.length / 8));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-sm">Revenue</h2>
          <p className="mt-1.5 text-body-sm text-secondary">
            {formatPrice(total, currencySymbol)} across the last {days} days
            {peak && ` · peak ${format(new Date(peak.date), 'd MMM')}`}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      {view === 'table' ? (
        <ChartTable
          columns={['Date', `Revenue (${currencySymbol})`, 'Orders']}
          rows={data.map((d) => [
            format(new Date(d.date), 'd MMM yyyy'),
            d.revenue.toFixed(2),
            d.orders,
          ])}
        />
      ) : (
        // Height includes the x-axis band so the card never scrolls internally.
        <div className="h-[320px] w-full">
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
                width={64}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(1)}k` : `${currencySymbol}${v}`
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
                          label: 'Revenue',
                          value: formatPrice(point.revenue, currencySymbol),
                        },
                        { key: 'orders', label: 'Orders', value: String(point.orders) },
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
