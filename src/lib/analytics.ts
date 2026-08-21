import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  eachDayOfInterval,
} from 'date-fns';
import { prisma } from './prisma';
import { getSettings } from './settings';

/** Orders that count as revenue — cancelled ones never do. */
const REVENUE_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED'];

/**
 * The window every figure on the Analytics page is computed over.
 *
 * Passed around rather than a day count because the page offers a period of
 * your own choosing: "1 to 15 March" cannot be expressed as "N days back from
 * today", which is what a count assumes.
 */
export interface Period {
  start: Date;
  end: Date;
}

/** The last `days` days, ending today. */
export function periodFromDays(days = 30): Period {
  const now = new Date();
  return { start: startOfDay(subDays(now, days - 1)), end: endOfDay(now) };
}

/**
 * What the period sold, and how many orders it took.
 *
 * Three figures, because three are what the page shows. It used to also work
 * out the change against the previous window, a conversion rate and a session
 * count — five extra queries on every page load for numbers nobody read.
 */
export async function getOverviewStats(period: Period = periodFromDays()) {
  const { start: periodStart, end: periodEnd } = period;

  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
        status: { in: REVENUE_STATUSES },
      },
      select: { total: true },
    }),
    getSettings(),
  ]);

  return {
    sales: orders.reduce((s, o) => s + o.total, 0),
    orderCount: orders.length,
    currencySymbol: settings.currencySymbol,
  };
}

/** Daily revenue + order count series, gap-filled so the chart has no holes. */
export async function getRevenueSeries(period: Period = periodFromDays()) {
  const { start, end } = period;

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end }, status: { in: REVENUE_STATUSES } },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (const day of eachDayOfInterval({ start, end: new Date() })) {
    buckets.set(format(day, 'yyyy-MM-dd'), { revenue: 0, orders: 0 });
  }
  for (const order of orders) {
    const key = format(order.createdAt, 'yyyy-MM-dd');
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }

  return Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    label: format(new Date(date), 'd MMM'),
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
  }));
}

export async function getLowStockVariants(limit = 6) {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
    orderBy: { stock: 'asc' },
    take: 60,
  });

  return variants
    .filter((v) => v.stock <= v.lowStockAt)
    .slice(0, limit)
    .map((v) => ({
      id: v.id,
      productName: v.product.name,
      productSlug: v.product.slug,
      image: v.product.images[0]?.url ?? '',
      sku: v.sku,
      colorName: v.colorName,
      size: v.size,
      stock: v.stock,
      lowStockAt: v.lowStockAt,
    }));
}

export async function getTopPerformers(period: Period = periodFromDays(), limit = 3) {
  const { start, end } = period;

  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { createdAt: { gte: start, lte: end }, status: { in: REVENUE_STATUSES } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit,
  });

  const ids = grouped.map((g) => g.productId).filter(Boolean) as string[];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });

  const max = grouped[0]?._sum.quantity ?? 1;

  return grouped.map((g) => {
    const product = products.find((p) => p.id === g.productId);
    const units = g._sum.quantity ?? 0;
    return {
      id: g.productId ?? '',
      name: product?.name ?? 'Removed product',
      slug: product?.slug ?? '',
      image: product?.images[0]?.url ?? '',
      units,
      revenue: units * (product?.price ?? 0),
      share: max ? (units / max) * 100 : 0,
    };
  });
}

export async function getCategoryPerformance(period: Period = periodFromDays(90)) {
  const { start, end } = period;

  const items = await prisma.orderItem.findMany({
    where: {
      order: { createdAt: { gte: start, lte: end }, status: { in: REVENUE_STATUSES } },
    },
    select: {
      quantity: true,
      unitPrice: true,
      product: { select: { category: { select: { name: true } } } },
    },
  });

  const byCategory = new Map<string, { revenue: number; units: number }>();
  for (const item of items) {
    const name = item.product?.category?.name ?? 'Uncategorised';
    const entry = byCategory.get(name) ?? { revenue: 0, units: 0 };
    entry.revenue += item.unitPrice * item.quantity;
    entry.units += item.quantity;
    byCategory.set(name, entry);
  }

  return Array.from(byCategory.entries())
    .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), units: v.units }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getOrderStatusBreakdown() {
  const grouped = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });
  return grouped.map((g) => ({ status: g.status, count: g._count._all }));
}
