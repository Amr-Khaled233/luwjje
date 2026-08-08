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
}

export interface CreateOrderResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
}

/**
 * Writes an order. Deliberately free of request context so it can be exercised
 * directly in tests and scripts; `placeOrder` supplies the rest.
 *
 * Every figure is recomputed here — the client's totals are never trusted —
 * and stock is re-checked and decremented inside one transaction so two
 * shoppers cannot both claim the last piece.
 */
export async function createOrder({
  shipping,
  items,
  promoCode,
  locale = 'en',
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

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Re-read stock inside the transaction and fail loudly if it moved.
      for (const line of lines) {
        const fresh = await tx.productVariant.findUnique({
          where: { id: line.variantId },
          select: { stock: true },
        });
        if (!fresh || fresh.stock < line.quantity) {
          throw new Error(`OUT_OF_STOCK:${line.name}`);
        }
      }

      const created = await tx.order.create({
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
          status: 'PAID',
          paymentStatus: 'PAID',
          paymentRef: `mock_${Date.now().toString(36)}`,
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

      for (const line of lines) {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { stock: { decrement: line.quantity } },
        });
        await tx.product.update({
          where: { id: line.productId },
          data: { soldCount: { increment: line.quantity } },
        });
      }

      if (promo?.ok && promo.code) {
        await tx.promoCode.update({
          where: { code: promo.code },
          data: { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    return { ok: true, orderNumber: order.orderNumber };
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('OUT_OF_STOCK:')) {
      const name = message.split(':')[1];
      return {
        ok: false,
        error: msg(
          `${name} sold out while you were checking out. Please review your bag.`,
          `نفدت كمية ${name} أثناء إتمام الطلب. راجع حقيبتك من فضلك.`,
        ),
      };
    }
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
