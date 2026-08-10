import { prisma } from './prisma';
import { orderLookupSchema } from './validations';

export interface LookupOrderSummary {
  orderNumber: string;
  createdAt: Date;
  status: string;
  total: number;
  itemCount: number;
  thumbnails: string[];
}

export type LookupResult =
  | { ok: true; orders: LookupOrderSummary[] }
  | { ok: false; error: string };

/**
 * Order lookup without an account: the email alone is the key, and every
 * order placed with it comes back so the customer can pick one.
 *
 * Kept free of request context (cookies, redirects) so it can be tested
 * directly; the server action wraps it.
 */
export async function findOrdersForEmail(input: { email: unknown }): Promise<LookupResult> {
  const parsed = orderLookupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  const orders = await prisma.order.findMany({
    where: { email: parsed.data.email },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      items: { select: { imageUrl: true, quantity: true } },
    },
  });

  if (orders.length === 0) {
    return { ok: false, error: 'NOT_FOUND' };
  }

  return {
    ok: true,
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      total: o.total,
      itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
      thumbnails: o.items.map((i) => i.imageUrl).filter(Boolean).slice(0, 4),
    })),
  };
}
