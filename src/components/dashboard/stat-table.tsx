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
      {/*
        Fixed layout with every column the same share of the width. Left to
        itself the browser gives the text column everything and squeezes the
        figures against the end of the table; three even columns keep each
        heading over its own figures with room to breathe.
      */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {columns.map((c) => (
            <col key={c} style={{ width: `${100 / columns.length}%` }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </tr>
        </thead>
        {/*
          The rule between rows is drawn by the row, not by its cells — a
          cell-level border can stop short at a column that has nothing to
          draw against, which left the last column's figures running into
          each other.
        */}
        <tbody className="divide-y divide-outline-variant [&>tr:last-child>td]:border-b-0">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                // A long name wraps rather than being cut off; the figures
                // never need to, so they keep their line.
                <Td key={j} className={cn(j === 0 ? 'break-words' : 'whitespace-nowrap tabular-nums')}>
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
