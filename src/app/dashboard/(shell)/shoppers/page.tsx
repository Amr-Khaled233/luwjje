import { StatCard, Panel } from '@/components/dashboard/admin-ui';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { ShoppersHeader } from '@/components/dashboard/shoppers-header';
import { SourcesPanel, FunnelPanel } from '@/components/dashboard/shoppers-panels';
import { getFunnel, getSources } from '@/lib/traffic';
import { periodFromDays, type Period } from '@/lib/analytics';
import { startOfDay, endOfDay, format } from 'date-fns';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Shoppers — the people who opened a product, and how many of them bought.
 *
 * Kept apart from Analytics on purpose: that page is about money that came
 * in, this one is about the people who nearly spent it. It is not a visit
 * counter; a total that includes bots and two-second bounces is not something
 * anyone can act on.
 */
export default async function AdminShoppersPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const locale = await getLocale();
  const d = getDashboardDictionary(locale);

  const day = (value?: string) =>
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : null;

  const fromDate = day(searchParams.from);
  const toDate = day(searchParams.to);

  let period: Period;
  if (fromDate && toDate && !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
    const [a, b] = fromDate <= toDate ? [fromDate, toDate] : [toDate, fromDate];
    period = { start: startOfDay(a), end: endOfDay(b) };
  } else {
    period = periodFromDays(30);
  }

  const periodLabel = `${formatDate(period.start, locale)} — ${formatDate(period.end, locale)}`;

  const [funnel, sources] = await Promise.all([getFunnel(period), getSources(period)]);
  const stage = (key: string) => funnel.stages.find((s) => s.key === key)?.count ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <ShoppersHeader
        range={{
          from: format(period.start, 'yyyy-MM-dd'),
          to: format(period.end, 'yyyy-MM-dd'),
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={d.shoppers.openedProduct}
          value={stage('product').toLocaleString()}
          hint={d.shoppers.openedProductHint}
        />
        <StatCard label={d.shoppers.bought} value={stage('ordered').toLocaleString()} />
        <StatCard
          label={d.shoppers.abandoned}
          value={funnel.abandonedCheckout.toLocaleString()}
          hint={d.shoppers.abandonedHint}
        />
      </div>

      <Panel bodyClassName="p-4 md:p-6">
        <FunnelPanel stages={funnel.stages} periodLabel={periodLabel} />
      </Panel>

      <Panel bodyClassName="p-4 md:p-6">
        <SourcesPanel sources={sources} periodLabel={periodLabel} />
      </Panel>

      <p className="max-w-[70ch] text-body-sm text-tertiary">
        {d.shoppers.caveat}
        {funnel.untrackedOrders > 0 &&
          ` ${fmt(d.shoppers.untracked, { n: funnel.untrackedOrders })}`}
      </p>
    </div>
  );
}
