'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The table every figure on Analytics is read from.
 *
 * `border-collapse` gives a complete grid — every internal divider is painted,
 * which `border-separate` was dropping between the last two columns. The one
 * thing collapse breaks is the sticky header: a collapsed border does not
 * travel with a sticky cell, so the rule under the heading is drawn with an
 * inset shadow instead, which does stick.
 *
 * Vertical dividers are drawn on the start side of every column but the first
 * (`border-s`), and every cell is `text-start`, so in Arabic the whole thing
 * mirrors: the column begins at the right and its value sits at the right,
 * not stranded at the far edge.
 */
const HEADER = 'label-caps sticky top-0 z-10 whitespace-nowrap bg-surface-low px-3 py-3 text-start text-secondary shadow-[inset_0_-1px_0_#c4c7c9] md:px-4';
const CELL = 'px-3 py-3 align-middle text-body-sm text-start md:px-4 md:py-4 md:text-body-md';
const DIVIDER = 'border-s border-outline-variant';

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
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {columns.map((c) => (
            <col key={c} style={{ width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, j) => (
              <th key={c} scope="col" className={cn(HEADER, j > 0 && DIVIDER)}>
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
                    CELL,
                    i < rows.length - 1 && 'border-b border-outline-variant',
                    j > 0 && DIVIDER,
                    // A long name wraps; figures keep their line and align on
                    // their digits.
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
