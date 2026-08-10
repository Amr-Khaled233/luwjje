'use server';

import { findOrdersForEmail, type LookupOrderSummary } from '@/lib/order-lookup';
import { grantOrderAccess } from '@/lib/order-access';

export interface LookupState {
  error?: string;
  email?: string;
  orders?: LookupOrderSummary[];
}

/**
 * Thin wrapper: `findOrdersForEmail` does the matching, this grants the
 * browser read access to every order it returned and hands the list back for
 * the customer to choose from.
 */
export async function lookupOrders(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const email = String(formData.get('email') ?? '');
  const result = await findOrdersForEmail({ email });

  if (!result.ok) return { error: result.error, email };

  // Knowing the email is the proof of ownership; unlock exactly these orders.
  for (const order of result.orders) {
    await grantOrderAccess(order.orderNumber);
  }

  return { email, orders: result.orders };
}
