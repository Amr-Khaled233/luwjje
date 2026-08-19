import { readToken, signToken } from './signing';

/**
 * The dashboard session token, isolated from anything Node-only so Edge
 * middleware can verify it without dragging Prisma or bcrypt into the bundle.
 *
 * The payload is `expiry.epoch`. Middleware checks the signature and the
 * expiry — that is all it can do without a database. The dashboard layout,
 * which already loads settings, additionally checks the epoch, so a password
 * reset invalidates sessions that are already open.
 */

export const COOKIE_NAME = 'luwjje_dashboard';
export const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export async function createSessionToken(sessionEpoch = 0) {
  return signToken(`${Date.now() + MAX_AGE_SECONDS * 1000}.${sessionEpoch}`);
}

/**
 * Signature and expiry only. Returns the epoch the token was issued under so
 * the caller can compare it against the current one; `null` means the token
 * is not usable at all.
 */
export async function readSession(token: string | undefined): Promise<{ epoch: number } | null> {
  const payload = await readToken(token);
  if (!payload) return null;

  // `readToken` splits on the last dot, so the epoch is what follows the first.
  const separator = payload.indexOf('.');
  const expiresAt = Number(separator === -1 ? payload : payload.slice(0, separator));
  const epoch = separator === -1 ? 0 : Number(payload.slice(separator + 1));

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  if (!Number.isFinite(epoch)) return null;

  return { epoch };
}

/** Signature + expiry. Used by middleware, which cannot reach the database. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return (await readSession(token)) !== null;
}

/**
 * No `maxAge` on purpose: this is a session cookie, so the browser drops it
 * when it closes and the password is asked for again. The signed expiry inside
 * the token is still the hard ceiling — a browser left open all week does not
 * keep the dashboard open with it.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
