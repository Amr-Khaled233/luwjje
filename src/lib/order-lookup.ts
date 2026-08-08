import { prisma } from './prisma';
import { orderLookupSchema } from './validations';

export type LookupResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/**
 * Order lookup without an account: the order number alone is not enough, the
 * email on the order must match too.
 *
 * Kept free of request context (cookies, redirects) so it can be tested
 * directly; the server action wraps it.
 */
export async function findOrderForCustomer(input: {
  orderNumber: unknown;
  email: unknown;
}): Promise<LookupResult> {
  const parsed = orderLookupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the details and try again.' };
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber.toUpperCase() },
    select: { orderNumber: true, email: true },
  });

  // One message for both failures — never reveal which order numbers exist.
  if (!order || order.email.toLowerCase() !== parsed.data.email) {
    return { ok: false, error: 'We could not find an order with those details.' };
  }

  return { ok: true, orderNumber: order.orderNumber };
}
