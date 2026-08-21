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
 * A session is a browser tab, and anyone blocking the counter is invisible to
 * all of it — these are floor figures, not a census.
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

/** Sessions that reached each stage, and the orders tied to them. */
async function stagesFor(period: Period) {
  const [views, orders] = await Promise.all([
    prisma.pageView.findMany({
      where: { createdAt: { gte: period.start, lte: period.end } },
      select: { path: true, sessionId: true, referrer: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: period.start, lte: period.end }, status: { not: 'CANCELLED' } },
      select: { sessionId: true },
    }),
  ]);

  const product = new Set<string>();
  const bag = new Set<string>();
  const checkout = new Set<string>();
  /** Where each session came from — the first referrer it arrived with. */
  const source = new Map<string, string>();

  for (const view of views) {
    if (!source.has(view.sessionId)) source.set(view.sessionId, view.referrer);
    if (isProduct(view.path)) product.add(view.sessionId);
    else if (isBag(view.path)) bag.add(view.sessionId);
    else if (isCheckout(view.path)) checkout.add(view.sessionId);
  }

  // Only orders we can tie to a session belong in the funnel; the rest are
  // reported separately rather than silently inflating the last step.
  const ordered = new Set(
    orders
      .map((o) => o.sessionId)
      .filter((id): id is string => Boolean(id) && product.has(id!)),
  );

  return { product, bag, checkout, ordered, source, orders: orders.length };
}

export async function getFunnel(period: Period = periodFromDays()) {
  const { product, bag, checkout, ordered, orders } = await stagesFor(period);

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
    /** Orders in the period whose visit was never tracked. */
    untrackedOrders: orders - ordered.size,
    orders,
  };
}

export interface SourceRow {
  referrer: string;
  /** People from this source who opened a product. */
  interested: number;
  /** …and how many of them ordered. */
  buyers: number;
}

/**
 * Which places bring people who actually shop.
 *
 * Counted among people who opened a product rather than everyone who
 * arrived, so a source that sends a thousand passers-by does not outrank the
 * one that sends fifty buyers.
 */
export async function getSources(period: Period = periodFromDays()) {
  const { product, ordered, source } = await stagesFor(period);

  const rows = new Map<string, SourceRow>();
  const row = (referrer: string) =>
    rows.get(referrer) ?? { referrer, interested: 0, buyers: 0 };

  for (const sessionId of product) {
    const referrer = source.get(sessionId) ?? 'direct';
    const current = row(referrer);
    current.interested += 1;
    if (ordered.has(sessionId)) current.buyers += 1;
    rows.set(referrer, current);
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.buyers - a.buyers || b.interested - a.interested,
  );
}
