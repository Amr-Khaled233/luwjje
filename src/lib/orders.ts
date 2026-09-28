import { prisma } from './prisma';
import { resolveCartLines, calculateShipping, validatePromoCode } from './commerce';
import { generateOrderNumber } from './utils';
import type { ShippingInput } from './validations';
import type { Locale } from '@/i18n/config';

export interface CreateOrderInput {
  shipping: ShippingInput;
  items: { variantId: string; quantity: number }[];
  promoCode?: string;
  locale?: Locale;
  /** The visit that placed it, for the funnel on Visitors. */
  sessionId?: string;
}

export interface CreateOrderResult {
  ok: boolean;
  orderNumber?: string;
  confirmationToken?: string;
  error?: string;
}

/** A 64-char hex secret for the order's confirmation link. */
function newConfirmationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Writes an order, but does not make it real yet. Deliberately free of request
 * context so it can be exercised directly in tests and scripts; `placeOrder`
 * supplies the rest.
 *
 * Every figure is recomputed here — the client's totals are never trusted. The
 * order is created unconfirmed with a confirmation token: nothing is taken from
 * stock and it stays off the dashboard until the shopper clicks the link
 * emailed to them, at which point `confirmOrder` reserves the stock. Stock is
 * only softly checked here, so a piece can be offered to two shoppers until one
 * of them confirms.
 */
export async function createOrder({
  shipping,
  items,
  promoCode,
  locale = 'en',
  sessionId,
}: CreateOrderInput): Promise<CreateOrderResult> {
  const msg = (en: string, ar: string) => (locale === 'ar' ? ar : en);

  const lines = await resolveCartLines(items);
  if (lines.length === 0) {
    return {
      ok: false,
      error: msg(
        'Your bag is empty or those items are no longer available.',
        'حقيبتك فارغة أو أن هذه القطع لم تعد متاحة.',
      ),
    };
  }

  // Any silent adjustment means the customer is about to pay for something
  // other than what they reviewed — stop and let them re-confirm.
  const adjusted = lines.some(
    (l) => l.quantity !== items.find((i) => i.variantId === l.variantId)?.quantity,
  );
  if (adjusted || lines.length !== items.length) {
    return {
      ok: false,
      error: msg(
        'Stock changed while you were checking out. Please review your bag and try again.',
        'تغيّر المخزون أثناء إتمام الطلب. راجع حقيبتك وحاول مرة أخرى.',
      ),
    };
  }

  const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;
  const shippingCalc = await calculateShipping(shipping.governorate, subtotal);

  const promo = promoCode ? await validatePromoCode(promoCode, subtotal, locale) : null;
  const discount = promo?.ok ? promo.discount : 0;
  const total = Math.max(0, Math.round((subtotal + shippingCalc.cost - discount) * 100) / 100);

  // A soft check: refuse an order for something already off the shelf, but do
  // not reserve anything — the reservation happens at confirmation.
  for (const line of lines) {
    const fresh = await prisma.productVariant.findUnique({
      where: { id: line.variantId },
      select: { stock: true },
    });
    if (!fresh || fresh.stock < line.quantity) {
      return {
        ok: false,
        error: msg(
          `${line.name} sold out while you were checking out. Please review your bag.`,
          `نفدت كمية ${line.name} أثناء إتمام الطلب. راجع حقيبتك من فضلك.`,
        ),
      };
    }
  }

  try {
    const confirmationToken = newConfirmationToken();
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        email: shipping.email,
        fullName: shipping.fullName,
        phone: shipping.phone,
        street: shipping.street,
        area: shipping.area || null,
        governorate: shipping.governorate,
        governorateId: shippingCalc.governorateId,
        notes: shipping.notes || null,
        // Cash on delivery, and not yet confirmed: nothing is reserved or
        // collected until the shopper clicks the emailed link.
        status: 'PENDING',
        confirmed: false,
        confirmationToken,
        sessionId: sessionId || null,
        subtotal,
        shippingCost: shippingCalc.cost,
        discount,
        total,
        promoCode: promo?.ok ? promo.code : null,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            nameAr: l.nameAr,
            colorName: l.colorName,
            size: l.size,
            imageUrl: l.imageUrl,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
          })),
        },
      },
    });

    return { ok: true, orderNumber: order.orderNumber, confirmationToken };
  } catch (err) {
    console.error('createOrder failed', err);
    return {
      ok: false,
      error: msg(
        'We could not complete your order. Please try again.',
        'تعذّر إتمام طلبك. حاول مرة أخرى من فضلك.',
      ),
    };
  }
}

export type ConfirmOrderResult =
  | { ok: true; orderNumber: string; alreadyConfirmed: boolean }
  | { ok: false; reason: 'invalid' | 'out_of_stock'; orderNumber?: string };

/**
 * Turns a pending order into a real one when the shopper clicks the link that
 * was emailed to them. This is where stock is actually taken and the sale is
 * counted — inside one transaction, re-reading stock, so that if the last piece
 * went to someone who confirmed first, this order is refused rather than
 * overselling. Idempotent: clicking the link twice confirms once.
 */
export async function confirmOrder(token: string | null | undefined): Promise<ConfirmOrderResult> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return { ok: false, reason: 'invalid' };

  const order = await prisma.order.findUnique({
    where: { confirmationToken: token },
    include: { items: true },
  });
  if (!order) return { ok: false, reason: 'invalid' };
  if (order.confirmed) {
    return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Re-read stock inside the transaction and fail loudly if it moved.
      for (const item of order.items) {
        if (!item.variantId) continue;
        const fresh = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });
        if (!fresh || fresh.stock < item.quantity) {
          throw new Error(`OUT_OF_STOCK:${item.name}`);
        }
      }

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: item.quantity } },
          });
        }
      }

      if (order.promoCode) {
        await tx.promoCode.updateMany({
          where: { code: order.promoCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: { confirmed: true, confirmedAt: new Date() },
      });
    });

    return { ok: true, orderNumber: order.orderNumber, alreadyConfirmed: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('OUT_OF_STOCK:')) {
      return { ok: false, reason: 'out_of_stock', orderNumber: order.orderNumber };
    }
    console.error('confirmOrder failed', err);
    return { ok: false, reason: 'invalid', orderNumber: order.orderNumber };
  }
}

export interface EditOrderInput {
  orderId: string;
  fullName: string;
  phone?: string;
  street: string;
  area?: string;
  governorate: string;
  notes?: string;
  lines: { id: string; quantity: number; unitPrice: number }[];
  shippingCost: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}

export type EditOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Edits an order that has already been placed: the address, the line
 * quantities and prices, delivery, discount and the total.
 *
 * Stock follows the quantities. Reducing a line returns the difference to the
 * shelf, raising it takes more off — and if there is not enough, the whole
 * edit is refused rather than leaving the shop overselling.
 *
 * A cancelled order has already had its stock returned, so its lines are left
 * alone here; moving it out of CANCELLED through the status control is what
 * takes the stock again.
 */
export async function applyOrderEdit(data: EditOrderInput): Promise<EditOrderResult> {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { items: true },
    });
    if (!order) return { ok: false as const, error: 'Order not found.' };

    // Every edited line has to belong to this order.
    const byId = new Map(order.items.map((i) => [i.id, i]));
    for (const line of data.lines) {
      if (!byId.has(line.id)) return { ok: false as const, error: 'That line is not on this order.' };
    }

    const wasCancelled = order.status === 'CANCELLED';
    const nowCancelled = data.status === 'CANCELLED';

    // What each variant's stock has to move by, before writing anything.
    const stockDelta = new Map<string, number>();
    if (!wasCancelled && !nowCancelled) {
      for (const line of data.lines) {
        const item = byId.get(line.id)!;
        if (!item.variantId) continue;
        const change = item.quantity - line.quantity; // positive = back on the shelf
        if (change !== 0) {
          stockDelta.set(item.variantId, (stockDelta.get(item.variantId) ?? 0) + change);
        }
      }
    }

    // Refuse the whole edit if any line would oversell.
    const takingIds = Array.from(stockDelta.entries())
      .filter(([, change]) => change < 0)
      .map(([variantId]) => variantId);

    if (takingIds.length > 0) {
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: takingIds } },
        select: { id: true, stock: true, colorName: true, size: true },
      });
      for (const variant of variants) {
        const needed = -(stockDelta.get(variant.id) ?? 0);
        if (variant.stock < needed) {
          const name = [variant.colorName, variant.size].filter(Boolean).join(' ');
          return {
            ok: false,
            error: `Only ${variant.stock} left of ${name || 'that variant'} — reduce the quantity.`,
          };
        }
      }
    }

    const subtotal =
      Math.round(
        data.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100,
      ) / 100;

    await prisma.$transaction(async (tx) => {
      for (const line of data.lines) {
        const item = byId.get(line.id)!;

        // A line taken to zero is removed; the order keeps the rest.
        if (line.quantity === 0) {
          await tx.orderItem.delete({ where: { id: line.id } });
        } else {
          await tx.orderItem.update({
            where: { id: line.id },
            data: { quantity: line.quantity, unitPrice: line.unitPrice },
          });
        }

        // Sold counts track what is actually on the order.
        if (item.productId && !wasCancelled && !nowCancelled) {
          const change = line.quantity - item.quantity;
          if (change !== 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { soldCount: { increment: change } },
            });
          }
        }
      }

      for (const [variantId, change] of stockDelta) {
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: { increment: change } },
        });
      }

      // Cancelling here returns everything still on the order.
      if (!wasCancelled && nowCancelled) {
        for (const line of data.lines) {
          const item = byId.get(line.id)!;
          if (item.variantId && line.quantity > 0) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: line.quantity } },
            });
          }
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { soldCount: { decrement: item.quantity } },
            });
          }
        }
      }

      await tx.order.update({
        where: { id: data.orderId },
        data: {
          fullName: data.fullName,
          phone: data.phone || null,
          street: data.street,
          area: data.area || null,
          governorate: data.governorate,
          notes: data.notes || null,
          subtotal,
          shippingCost: data.shippingCost,
          discount: data.discount,
          total: data.total,
          status: data.status,
        },
      });
    });

  return { ok: true as const };
}
