'use server';

import { redirect } from 'next/navigation';
import { findOrderForCustomer } from '@/lib/order-lookup';
import { grantOrderAccess } from '@/lib/order-access';

export interface LookupState {
  error?: string;
}

/**
 * Thin wrapper: `findOrderForCustomer` does the matching, this adds the
 * access cookie and the redirect.
 */
export async function lookupOrder(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const result = await findOrderForCustomer({
    orderNumber: formData.get('orderNumber'),
    email: formData.get('email'),
  });

  if (!result.ok) return { error: result.error };

  await grantOrderAccess(result.orderNumber);
  redirect(`/order/${result.orderNumber}`);
}
