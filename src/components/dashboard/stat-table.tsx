'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The table every figure on Analytics is read from.
 *
 * `border-separate`, not `border-collapse`: the header is sticky, and a
 * collapsed border does not travel with a sticky cell — which is what left
 * the Revenue table with a header that lost its rules the moment it scrolled,
 * and column dividers that came and went. With separate borders every cell
 * carries its own, so the grid is whole whether or not the body has scrolled,
 * and it mirrors cleanly in Arabic because the sides are logical (`-e`).
 */
export function StatTable({
  columns,
  rows,
  className,
}: {
  columns: string[];
  rows: (string | number)[][];
  className?: string;
}) {
  const width = `${100 / columns.length}%`;

  return (
    <div
      className={cn(
        'max-h-[280px] w-full overflow-auto overscroll-contain border border-outline-variant md:max-h-[320px]',
        className,
      )}
    >
      <table className="w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          {columns.map((c) => (
            <col key={c} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, j) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  'label-caps sticky top-0 z-10 whitespace-nowrap border-b border-outline-variant bg-surface-low px-3 py-3 text-start text-secondary md:px-4',
                  // Vertical divider on the end side of every column but the last.
                  j < columns.length - 1 && 'border-e border-outline-variant',
                )}
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
                    'px-3 py-3 align-middle text-body-sm md:px-4 md:py-4 md:text-body-md',
                    // Row rule under every row but the last.
                    i < rows.length - 1 && 'border-b border-outline-variant',
                    // Column rule on the end side of every column but the last.
                    j < columns.length - 1 && 'border-e border-outline-variant',
                    // A long name wraps; the figures keep their line and align
                    // on their digits.
                    j === 0 ? 'break-words' : 'whitespace-nowrap tabular-nums',
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
