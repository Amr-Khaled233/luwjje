'use client';

import { StatTable } from './stat-table';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import type { FunnelStage } from '@/lib/traffic';

const pct = (n: number) => `${n.toFixed(1)}%`;

/**
 * The funnel: how many people reached each step, and what share of the step
 * before them that is — which is where the leak actually shows.
 */
export function FunnelPanel({
  stages,
  periodLabel,
}: {
  stages: FunnelStage[];
  periodLabel: string;
}) {
  const { d } = useDash();
  const v = d.shoppers;

  const stageLabel: Record<FunnelStage['key'], string> = {
    product: v.stageProduct,
    bag: v.stageBag,
    checkout: v.stageCheckout,
    ordered: v.stageOrdered,
  };

  const empty = stages[0]?.count === 0;

  return (
    <div>
      <header className="mb-5 md:mb-6">
        <h2 className="font-display text-title-md md:text-headline-sm">{v.funnelTitle}</h2>
        <p className="mt-1.5 text-body-sm text-secondary">
          {fmt(v.funnelSubtitle, { period: periodLabel })}
        </p>
      </header>

      {empty ? (
        <p className="text-body-sm text-secondary">{v.noData}</p>
      ) : (
        <>
          <StatTable
            columns={[v.stageCol, v.peopleCol, v.ofInterestedCol, v.ofPreviousCol]}
            rows={stages.map((s) => [
              stageLabel[s.key],
              s.count.toLocaleString(),
              pct(s.shareOfInterested),
              s.key === 'product' ? '—' : pct(s.shareOfPrevious),
            ])}
          />

          {/* The bars are the same numbers again, at a glance. */}
          <div className="mt-6 flex flex-col gap-3">
            {stages.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-[46%] shrink-0 truncate text-body-sm text-secondary sm:w-[34%]">
                  {stageLabel[s.key]}
                </span>
                <span className="h-2 flex-1 bg-surface-container">
                  <span
                    className="block h-2 bg-navy transition-all duration-500 ease-scandi"
                    style={{ width: `${Math.max(1, s.shareOfInterested)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-end text-body-sm tabular-nums">
                  {s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
