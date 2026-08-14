'use server';

import { findOrdersForEmail, type LookupOrderSummary } from '@/lib/order-lookup';
import { grantOrderAccess } from '@/lib/order-access';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export interface LookupState {
  error?: string;
  email?: string;
  orders?: LookupOrderSummary[];
}

/**
 * Thin wrapper: `findOrdersForEmail` does the matching, this grants the
 * browser read access to every order it returned and hands the list back.
 *
 * Throttled because a successful lookup unlocks a customer's orders — without
 * a limit this is an email-enumeration oracle you can grind through.
 */
export async function lookupOrders(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const email = String(formData.get('email') ?? '');

  const limit = rateLimit(clientKey('order-lookup'), 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return {
      email,
      error: `Too many lookups. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  const result = await findOrdersForEmail({ email });
  if (!result.ok) return { error: result.error, email };

  // Knowing the email is the proof of ownership; unlock exactly these orders.
  for (const order of result.orders) {
    await grantOrderAccess(order.orderNumber);
  }

  return { email, orders: result.orders };
}
