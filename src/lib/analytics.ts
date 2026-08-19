import { subDays, startOfDay, format, eachDayOfInterval } from 'date-fns';
import { prisma } from './prisma';
import { getSettings } from './settings';
import { percentChange } from './utils';

/** Orders that count as revenue — cancelled ones never do. */
const REVENUE_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'];

export async function getOverviewStats(days = 30) {
  const now = new Date();
  const periodStart = startOfDay(subDays(now, days - 1));
  const priorStart = startOfDay(subDays(periodStart, days));

  const [current, prior, activeOrders, variants, currentViews, priorViews, settings] =
    await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: periodStart }, status: { in: REVENUE_STATUSES } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: priorStart, lt: periodStart },
          status: { in: REVENUE_STATUSES },
        },
        select: { total: true },
      }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PAID', 'SHIPPED'] } } }),
      prisma.productVariant.findMany({ select: { stock: true, lowStockAt: true } }),
      prisma.pageView.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: periodStart } },
        _count: true,
      }),
      prisma.pageView.groupBy({
        by: ['sessionId'],
        where: { createdAt: { gte: priorStart, lt: periodStart } },
        _count: true,
      }),
      getSettings(),
    ]);

  const sales = current.reduce((s, o) => s + o.total, 0);
  const priorSales = prior.reduce((s, o) => s + o.total, 0);

  // Inventory level = share of SKUs sitting above their own low-stock mark.
  const healthy = variants.filter((v) => v.stock > v.lowStockAt).length;
  const inventoryLevel = variants.length ? (healthy / variants.length) * 100 : 0;

  const sessions = currentViews.length;
  const priorSessions = priorViews.length;
  const conversion = sessions ? (current.length / sessions) * 100 : 0;
  const priorConversion = priorSessions ? (prior.length / priorSessions) * 100 : 0;

  return {
    sales,
    salesChange: percentChange(sales, priorSales),
    orderCount: current.length,
    activeOrders,
    ordersChange: percentChange(current.length, prior.length),
    inventoryLevel,
    lowStockCount: variants.filter((v) => v.stock <= v.lowStockAt).length,
    conversion,
    conversionChange: percentChange(conversion, priorConversion),
    sessions,
    currencySymbol: settings.currencySymbol,
  };
}

/** Daily revenue + order count series, gap-filled so the chart has no holes. */
export async function getRevenueSeries(days = 30) {
  const start = startOfDay(subDays(new Date(), days - 1));

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start }, status: { in: REVENUE_STATUSES } },
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
    label: format(new Date(date), days > 45 ? 'd MMM' : 'd MMM'),
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

export async function getTopPerformers(days = 30, limit = 3) {
  const start = startOfDay(subDays(new Date(), days - 1));

  const grouped = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: { order: { createdAt: { gte: start }, status: { in: REVENUE_STATUSES } } },
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

export async function getCategoryPerformance(days = 90) {
  const start = startOfDay(subDays(new Date(), days - 1));

  const items = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: start }, status: { in: REVENUE_STATUSES } } },
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
