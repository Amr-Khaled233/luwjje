'use client';

import * as React from 'react';
import { Th, Td } from './admin-ui';
import { cn } from '@/lib/utils';

/**
 * The table every figure on Analytics is read from.
 *
 * Built on the same `Th`/`Td` as the Orders and Products tables so a number
 * here sits exactly where a number sits everywhere else in the dashboard:
 * headings and values share one margin, and nothing is centred or pushed to
 * the far edge.
 *
 * It scrolls inside its own box rather than stretching the card, and the
 * heading row stays put while it does.
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
  return (
    <div
      className={cn(
        'max-h-[280px] w-full overflow-auto overscroll-contain border border-outline-variant md:max-h-[320px]',
        className,
      )}
    >
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="last:[&>td]:border-b-0">
              {row.map((cell, j) => (
                // Figures are read down a column, so they are lined up on
                // their digits — the label above them still starts at the
                // same margin as the column itself.
                <Td key={j} className={cn(j > 0 && 'tabular-nums')}>
                  {cell}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
