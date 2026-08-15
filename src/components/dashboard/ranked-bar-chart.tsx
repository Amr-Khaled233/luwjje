'use client';

import * as React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CHART, axisTick, ChartTooltip, ChartTable, ViewToggle } from './chart-parts';
import { useDash } from './dashboard-i18n';

interface Row {
  name: string;
  value: number;
  secondary?: string;
}

/**
 * Horizontal ranked bars. Bar length already encodes magnitude, so every bar
 * shares one colour — a darker-where-bigger ramp would double-encode it and
 * burn the only free channel.
 */
export function RankedBarChart({
  title,
  subtitle,
  data,
  valueLabel,
  secondaryLabel,
  format = 'number',
  currencySymbol = '$',
}: {
  title: string;
  subtitle?: string;
  data: Row[];
  valueLabel: string;
  secondaryLabel?: string;
  /** Serializable — a formatter function cannot cross the server/client boundary. */
  format?: 'number' | 'currency';
  currencySymbol?: string;
}) {
  const [view, setView] = React.useState<'chart' | 'table'>('chart');
  const { d } = useDash();

  // A 140px name gutter swallows a phone; shorten it under 640px.
  const [dense, setDense] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const sync = () => setDense(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const valueFormatter = React.useCallback(
    (v: number) =>
      format === 'currency' ? `${currencySymbol}${v.toLocaleString()}` : v.toLocaleString(),
    [format, currencySymbol],
  );

  if (data.length === 0) {
    return (
      <div>
        <h2 className="font-display text-title-md md:text-headline-sm">{title}</h2>
        <p className="mt-6 text-body-sm text-secondary">{d.analytics.noData}</p>
      </div>
    );
  }

  // 44px per row keeps hit targets comfortable; +48 for the axis band.
  const height = Math.max(200, data.length * 44 + 48);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 md:mb-6 md:gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-title-md md:text-headline-sm">{title}</h2>
          {subtitle && <p className="mt-1.5 text-body-sm text-secondary">{subtitle}</p>}
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      {view === 'table' ? (
        <ChartTable
          columns={[d.analytics.nameCol, valueLabel, ...(secondaryLabel ? [secondaryLabel] : [])]}
          rows={data.map((d) => [
            d.name,
            valueFormatter(d.value),
            ...(secondaryLabel ? [d.secondary ?? '—'] : []),
          ])}
        />
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: dense ? 8 : 24, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid stroke={CHART.grid} strokeWidth={1} horizontal={false} />
              <XAxis
                type="number"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={dense ? 92 : 140}
              />
              <Tooltip
                cursor={{ fill: 'rgba(11, 28, 48, 0.04)' }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as Row | undefined;
                  if (!row) return null;
                  return (
                    <ChartTooltip
                      active={active}
                      label={row.name}
                      rows={[
                        { key: 'value', label: valueLabel, value: valueFormatter(row.value) },
                        ...(row.secondary && secondaryLabel
                          ? [{ key: 'secondary', label: secondaryLabel, value: row.secondary }]
                          : []),
                      ]}
                    />
                  );
                }}
              />
              {/* Square ends: the design system's radius token is 0. */}
              <Bar dataKey="value" fill={CHART.ink} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
