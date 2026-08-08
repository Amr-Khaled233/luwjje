import { readToken, signToken } from './signing';

/**
 * The dashboard session token, isolated from anything Node-only so Edge
 * middleware can verify it without dragging Prisma or bcrypt into the bundle.
 */

export const COOKIE_NAME = 'luwjje_dashboard';
export const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export async function createSessionToken() {
  return signToken(String(Date.now() + MAX_AGE_SECONDS * 1000));
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const payload = await readToken(token);
  if (!payload) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};
