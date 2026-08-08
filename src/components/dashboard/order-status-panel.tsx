'use client';

import Link from 'next/link';
import { ProgressBar } from '@/components/dashboard/admin-ui';
import { StatusBadge } from '@/components/ui/primitives';
import { ORDER_STATUSES } from '@/lib/utils';

/**
 * Five values with names — a table with inline meters, not a pie. Identity
 * comes from the label, never colour alone.
 */
export function OrderStatusPanel({ data }: { data: { status: string; count: number }[] }) {
  const byStatus = new Map(data.map((d) => [d.status, d.count]));
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <ul className="flex flex-col gap-5">
      {ORDER_STATUSES.map((status) => {
        const count = byStatus.get(status) ?? 0;
        const share = (count / total) * 100;
        return (
          <li key={status}>
            <div className="flex items-center justify-between gap-4">
              <Link href={`/dashboard/orders?status=${status}`}>
                <StatusBadge status={status} />
              </Link>
              <span className="text-body-sm tabular-nums text-secondary">
                {count} · {share.toFixed(1)}%
              </span>
            </div>
            <ProgressBar value={share} className="mt-3" />
          </li>
        );
      })}
    </ul>
  );
}
