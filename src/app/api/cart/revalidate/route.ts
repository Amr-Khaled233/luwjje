import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveCartLines, calculateShipping, validatePromoCode } from '@/lib/commerce';
import { getSettings } from '@/lib/settings';

const schema = z.object({
  items: z
    .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(99) }))
    .max(50),
  region: z.string().optional(),
  promoCode: z.string().optional(),
});

/**
 * Re-prices the browser's cart against the database and returns the
 * authoritative lines plus totals. Called whenever the cart page mounts or a
 * quantity, region or promo code changes.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart payload.' }, { status: 400 });
  }

  const { items, region, promoCode } = parsed.data;
  const settings = await getSettings();
  const lines = await resolveCartLines(items);
  const subtotal = Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100;

  // An empty (or fully-unavailable) cart is never charged for delivery.
  const shipping = lines.length === 0
    ? {
        cost: 0,
        rate: 0,
        threshold: settings.freeShippingOver,
        free: true,
        zoneName: 'Standard',
        estimatedDays: '',
      }
    : region
    ? await calculateShipping(region, subtotal)
    : {
        cost: subtotal >= settings.freeShippingOver ? 0 : settings.defaultShippingRate,
        rate: settings.defaultShippingRate,
        threshold: settings.freeShippingOver,
        free: subtotal >= settings.freeShippingOver,
        zoneName: 'Standard',
        estimatedDays: '5-8 business days',
      };

  const promo = promoCode
    ? await validatePromoCode(promoCode, subtotal)
    : { ok: false, discount: 0, message: '', code: undefined };

  const total = Math.max(0, Math.round((subtotal + shipping.cost - promo.discount) * 100) / 100);

  // Signals the client that server truth diverged from its local copy.
  const changed =
    lines.length !== items.length ||
    lines.some((l) => l.quantity !== items.find((i) => i.variantId === l.variantId)?.quantity);

  return NextResponse.json({
    lines,
    subtotal,
    shipping,
    promo,
    total,
    changed,
    freeShippingOver: shipping.threshold,
    currencySymbol: settings.currencySymbol,
  });
}
