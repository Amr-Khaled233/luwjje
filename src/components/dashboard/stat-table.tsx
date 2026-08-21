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
            {columns.map((c, j) => (
              // Everything after the name column is a figure: it takes the
              // width of its own heading and no more, so the numbers sit
              // beside their dividing lines instead of drifting across an
              // empty third of the table.
              <Th key={c} className={cn(j > 0 && 'w-px')}>
                {c}
              </Th>
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
                <Td key={j} className={cn(j > 0 && 'whitespace-nowrap tabular-nums')}>
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
