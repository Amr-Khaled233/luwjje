import { cookies } from 'next/headers';
import { readToken, signToken } from './signing';

/**
 * Without customer accounts, an order number alone must not be enough to read
 * someone's address. A signed cookie records which orders *this browser* has
 * earned access to — either by placing them, or by passing the order-lookup
 * form (which requires the order's email).
 */

const COOKIE_NAME = 'luwjje_orders';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 60; // 60 days
const MAX_TRACKED = 20;

const OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};

async function readList(): Promise<string[]> {
  const payload = await readToken(cookies().get(COOKIE_NAME)?.value);
  if (!payload) return [];
  return payload.split(',').filter(Boolean);
}

/** Call from a Server Action or Route Handler — it writes a cookie. */
export async function grantOrderAccess(orderNumber: string) {
  const existing = await readList();
  // Newest first, de-duplicated, capped so the cookie cannot grow unbounded.
  const next = [orderNumber, ...existing.filter((n) => n !== orderNumber)].slice(0, MAX_TRACKED);
  cookies().set(COOKIE_NAME, await signToken(next.join(',')), OPTIONS);
}

export async function canViewOrder(orderNumber: string) {
  return (await readList()).includes(orderNumber);
}

export async function getVisibleOrderNumbers() {
  return readList();
}
