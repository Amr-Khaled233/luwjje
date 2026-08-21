'use client';

import * as React from 'react';
import { StatTable } from './stat-table';
import { useDash } from './dashboard-i18n';

interface Row {
  name: string;
  value: number;
  secondary?: string;
}

/**
 * A ranked list — best sellers, strongest categories — as a table.
 *
 * The order of the rows carries the ranking, which is what a bar chart was
 * drawing; the figures beside them are then plainly readable instead of
 * needing a hover to give up their value.
 */
export function RankedTable({
  title,
  subtitle,
  data,
  valueLabel,
  secondaryLabel,
}: {
  title: string;
  subtitle?: string;
  data: Row[];
  valueLabel: string;
  /** Already formatted by the caller — money knows its own currency. */
  secondaryLabel?: string;
}) {
  const { d } = useDash();

  return (
    <div>
      <header className="mb-5 md:mb-6">
        <h2 className="font-display text-title-md md:text-headline-sm">{title}</h2>
        {subtitle && <p className="mt-1.5 text-body-sm text-secondary">{subtitle}</p>}
      </header>

      {data.length === 0 ? (
        <p className="text-body-sm text-secondary">{d.analytics.noData}</p>
      ) : (
        <StatTable
          columns={[d.analytics.nameCol, valueLabel, ...(secondaryLabel ? [secondaryLabel] : [])]}
          rows={data.map((row) => [
            row.name,
            row.value.toLocaleString(),
            ...(secondaryLabel ? [row.secondary ?? '—'] : []),
          ])}
        />
      )}
    </div>
  );
}
