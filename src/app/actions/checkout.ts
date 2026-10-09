'use server';

import { placeOrderSchema } from '@/lib/validations';
import { createOrder } from '@/lib/orders';
import { grantOrderAccess } from '@/lib/order-access';
import { sendConfirmRequest, sendOrderNotification } from '@/lib/order-email';
import { getLocale } from '@/i18n/server';

export interface PlaceOrderResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Guest checkout — the store has no customer accounts. Validates the
 * submission and hands off to `createOrder`, which owns all pricing and stock
 * arithmetic.
 */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { ok: false, error: 'Please check the details below.', fieldErrors };
  }

  const locale = await getLocale();

  const result = await createOrder({
    shipping: parsed.data.shipping,
    items: parsed.data.items,
    promoCode: parsed.data.promoCode,
    sessionId: parsed.data.sessionId,
    locale,
  });

  if (result.ok && result.orderNumber) {
    // Lets this browser read the pending order without an account.
    await grantOrderAccess(result.orderNumber);

    // Two emails, in parallel, each with its own timeout and swallowing its
    // own errors (awaited, not floated, because a serverless function can be
    // frozen the moment it responds):
    //   • the shopper gets the confirm-your-order link (the button);
    //   • the owner inboxes get a heads-up alert — no button, just who ordered
    //     what and for how much — so the shop knows the moment an order lands.
    await Promise.all([
      sendConfirmRequest(result.orderNumber, locale),
      sendOrderNotification(result.orderNumber),
    ]);
  }

  return result;
}
