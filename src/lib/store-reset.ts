import { prisma } from './prisma';

export interface ResetParts {
  /** Every order, sold counts and promo-code use. */
  orders: boolean;
  /** The page-view history behind the funnel and social counts. */
  traffic: boolean;
  /** Every product (with photos, colours and sizes) and every category. */
  catalog: boolean;
}

/**
 * Erase the chosen parts of the store so it can start again like new.
 * Settings, shipping, banners, pages and promo codes themselves are kept.
 *
 * When orders go but products stay, the stock those orders took is put back
 * first — only confirmed, not-cancelled orders ever took any — so the shelves
 * read as if the test sales never happened. Kept free of request context so it
 * can be exercised directly; the dashboard action guards and confirms it.
 */
export async function resetStore({ orders, traffic, catalog }: ResetParts) {
  const restock = new Map<string, number>();
  if (orders && !catalog) {
    const items = await prisma.orderItem.findMany({
      where: {
        variantId: { not: null },
        order: { confirmed: true, status: { not: 'CANCELLED' } },
      },
      select: { variantId: true, quantity: true },
    });
    for (const item of items) {
      restock.set(item.variantId!, (restock.get(item.variantId!) ?? 0) + item.quantity);
    }
  }

  await prisma.$transaction(
    async (tx) => {
      for (const [variantId, quantity] of restock) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: { increment: quantity } },
        });
      }
      if (orders) {
        await tx.order.deleteMany({}); // lines go with them
        await tx.product.updateMany({ data: { soldCount: 0 } });
        await tx.promoCode.updateMany({ data: { usedCount: 0 } });
      }
      if (traffic) {
        await tx.pageView.deleteMany({});
      }
      if (catalog) {
        await tx.product.deleteMany({}); // photos, colours and sizes go with them
        await tx.category.deleteMany({});
      }
    },
    { timeout: 30_000 },
  );
}
