import { prisma } from './prisma';
import { periodFromDays, type Period } from './analytics';

/**
 * How many people showed interest, and how many of them bought.
 *
 * Deliberately not a visit counter. "1,400 visits" says nothing you can act
 * on — half of it is bots and people who bounced off the home page in two
 * seconds. Opening a product is the first thing a visitor does that means
 * anything, so that is where every figure here starts.
 *
 * Everything counts **people** (browsing sessions), not page views: someone
 * reloading a product eleven times is one interested person, not eleven.
 */

const isProduct = (path: string) => path.startsWith('/product/');
const isBag = (path: string) => path === '/cart';
const isCheckout = (path: string) => path === '/checkout';

export interface FunnelStage {
  key: 'product' | 'bag' | 'checkout' | 'ordered';
  count: number;
  /** Share of the people who opened a product at all. */
  shareOfInterested: number;
  /** Share of the step before this one — where the leak actually is. */
  shareOfPrevious: number;
}

export async function getFunnel(period: Period = periodFromDays()) {
  const [views, orders] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: period.start, lte: period.end } },
      select: { path: true, sessionId: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: period.start, lte: period.end }, status: { not: 'CANCELLED' } },
      select: { sessionId: true },
    }),
  ]);

  const product = new Set<string>();
  const bag = new Set<string>();
  const checkout = new Set<string>();

  for (const view of views) {
    if (isProduct(view.path)) product.add(view.sessionId);
    else if (isBag(view.path)) bag.add(view.sessionId);
    else if (isCheckout(view.path)) checkout.add(view.sessionId);
  }

  // Only orders we can tie to a session belong in the funnel — an order from
  // a browser that blocked the counter would otherwise inflate the last step.
  const ordered = new Set(
    orders.map((o) => o.sessionId).filter((id): id is string => Boolean(id) && product.has(id!)),
  );

  const counts = {
    product: product.size,
    bag: bag.size,
    checkout: checkout.size,
    ordered: ordered.size,
  };

  const order: FunnelStage['key'][] = ['product', 'bag', 'checkout', 'ordered'];
  const share = (n: number, of: number) => (of ? (n / of) * 100 : 0);

  const stages: FunnelStage[] = order.map((key, i) => ({
    key,
    count: counts[key],
    shareOfInterested: share(counts[key], counts.product),
    shareOfPrevious: i === 0 ? 100 : share(counts[key], counts[order[i - 1]]),
  }));

  return {
    stages,
    /** Reached the payment step and did not order — the ones worth chasing. */
    abandonedCheckout: Math.max(0, counts.checkout - counts.ordered),
  };
}
