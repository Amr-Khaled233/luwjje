import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { confirmOrder } from '@/lib/orders';
import { sendOrderConfirmation } from '@/lib/order-email';
import { getLocale } from '@/i18n/server';

/**
 * The target of the "confirm your order" link. Confirming is a change, so it
 * lives in a route handler rather than a page render: it takes the stock, sends
 * the receipt to the shopper, then hands off to the display page. The owner was
 * already alerted when the order was placed, so nothing is emailed to them here.
 * Idempotent — a second click simply shows the confirmed order.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const show = (params: string) => NextResponse.redirect(new URL(`/order/confirm?${params}`, req.url));

  const result = await confirmOrder(token);

  if (!result.ok) {
    if (result.reason === 'out_of_stock' && token) {
      return show(`token=${encodeURIComponent(token)}&status=soldout`);
    }
    return show('status=invalid');
  }

  // First confirmation only: now the order is real, so send the shopper their
  // receipt and let the dashboard pick it up. Never let a mail hiccup break the
  // redirect — the order is already confirmed in the database.
  if (!result.alreadyConfirmed) {
    const locale = await getLocale();
    try {
      await sendOrderConfirmation(result.orderNumber, locale);
    } catch {
      /* the send guards itself; ignore here */
    }
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');
  }

  return show(`token=${encodeURIComponent(token!)}&status=ok`);
}
