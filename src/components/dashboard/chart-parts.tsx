'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useDash } from './dashboard-i18n';

/**
 * Shared chart tokens. The brand is single-hue by design: bar length and line
 * position carry magnitude, so colour never double-encodes it. Grid and axes
 * are solid hairlines one shade off the surface.
 */
export const CHART = {
  ink: '#0b1c30',
  inkSoft: '#213145',
  grid: '#c4c7c9',
  axis: '#565e74',
  surface: '#ffffff',
  fill: 'rgba(11, 28, 48, 0.07)',
};

export const axisTick = { fill: CHART.axis, fontSize: 12, fontFamily: 'var(--font-inter)' };

/** Sharp-cornered tooltip matching the 1px-outline language. */
export function ChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: React.ReactNode;
  rows: { key: string; label: string; value: string }[];
}) {
  if (!active) return null;
  return (
    <div className="border border-navy bg-surface-lowest px-4 py-3">
      {label && <p className="label-caps mb-2 text-secondary">{label}</p>}
      {rows.map((r) => (
        <p key={r.key} className="flex items-baseline gap-4 text-body-sm">
          <span className="text-secondary">{r.label}</span>
          <span className="ms-auto tabular-nums text-on-surface">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * The WCAG-clean twin every chart ships with — values are never reachable by
 * hover alone.
 */
export function ChartTable({
  columns,
  rows,
  className,
}: {
  columns: string[];
  rows: (string | number)[][];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-h-[280px] w-full overflow-auto overscroll-contain border border-outline-variant md:max-h-[320px]',
        className,
      )}
    >
      <table className="w-full border-collapse text-start text-body-sm">
        <thead className="sticky top-0 bg-surface-lowest">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="label-caps whitespace-nowrap border-b border-outline-variant px-3 py-2.5 text-secondary md:px-4"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    'border-b border-outline-variant px-3 py-2.5 md:px-4',
                    j > 0 && 'tabular-nums',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: 'chart' | 'table';
  onChange: (v: 'chart' | 'table') => void;
}) {
  const { d } = useDash();

  return (
    <div className="flex shrink-0 border border-outline-variant">
      {(['chart', 'table'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={cn(
            'label-caps px-3 py-2 transition-colors duration-200 ease-scandi',
            view === v ? 'bg-navy text-background' : 'text-secondary hover:text-on-surface',
          )}
        >
          {d.analytics[v]}
        </button>
      ))}
    </div>
  );
}
