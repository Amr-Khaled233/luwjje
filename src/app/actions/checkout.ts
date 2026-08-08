'use server';

import { revalidatePath } from 'next/cache';
import { placeOrderSchema } from '@/lib/validations';
import { createOrder } from '@/lib/orders';
import { grantOrderAccess } from '@/lib/order-access';

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

  const result = await createOrder({
    shipping: parsed.data.shipping,
    items: parsed.data.items,
    promoCode: parsed.data.promoCode,
  });

  if (result.ok && result.orderNumber) {
    // Lets this browser read the receipt without an account.
    await grantOrderAccess(result.orderNumber);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');
    revalidatePath('/shop');
  }

  return result;
}
