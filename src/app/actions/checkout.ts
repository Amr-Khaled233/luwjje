'use server';

import { revalidatePath } from 'next/cache';
import { placeOrderSchema } from '@/lib/validations';
import { createOrder } from '@/lib/orders';
import { grantOrderAccess } from '@/lib/order-access';
import { sendOrderConfirmation } from '@/lib/order-email';
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
    // Lets this browser read the receipt without an account.
    await grantOrderAccess(result.orderNumber);

    // Awaited rather than left floating: a serverless function can be frozen
    // the moment it responds, which would drop the send. `sendOrderConfirmation`
    // has its own timeout and swallows its own errors, so the order is never
    // put at risk by the mail provider — the shopper has already paid.
    await sendOrderConfirmation(result.orderNumber, locale);

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');
    revalidatePath('/shop');
  }

  return result;
}
