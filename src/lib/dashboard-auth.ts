import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { safeEqual } from './signing';
import { COOKIE_NAME, createSessionToken, readSession, verifySessionToken } from './session-token';

/**
 * Single-password gate for /dashboard. No customer accounts exist — this is
 * the only login in the app.
 *
 * The password is bcrypt-hashed in SiteSettings (so it can be changed from the
 * dashboard) and falls back to DASHBOARD_PASSWORD on a fresh install. The
 * session token itself lives in `session-token.ts`, free of Node-only imports
 * so Edge middleware can verify it.
 */

export { COOKIE_NAME, SESSION_COOKIE_OPTIONS, createSessionToken, verifySessionToken } from './session-token';

/** The epoch every new session is stamped with. Bumped by a password reset. */
export async function currentSessionEpoch(): Promise<number> {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { sessionEpoch: true },
    });
    return settings?.sessionEpoch ?? 0;
  } catch {
    // The app already degrades to defaults when the database is unreachable;
    // refusing every session here would lock the owner out over a blip.
    return 0;
  }
}

/** Issues a session stamped with the current epoch. */
export async function newSessionToken() {
  return createSessionToken(await currentSessionEpoch());
}

/**
 * Is the current request holding a valid dashboard session?
 *
 * Signature and expiry are not enough: a session issued before a password
 * reset carries an older epoch and is refused here, which is what makes the
 * reset able to evict whoever prompted it.
 */
export async function isDashboardUser() {
  const session = await readSession(cookies().get(COOKIE_NAME)?.value);
  if (!session) return false;
  return session.epoch === (await currentSessionEpoch());
}

export async function requireDashboard() {
  if (!(await isDashboardUser())) throw new Error('UNAUTHORIZED');
}

/**
 * Verifies a submitted password against the stored hash, falling back to the
 * DASHBOARD_PASSWORD env var until one is set from the dashboard.
 */
export async function checkPassword(input: string): Promise<boolean> {
  // bcryptjs is Node-only; this is never called from middleware.
  const bcrypt = (await import('bcryptjs')).default;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { dashboardPasswordHash: true },
  });

  if (settings?.dashboardPasswordHash) {
    return bcrypt.compare(input, settings.dashboardPasswordHash);
  }

  const fallback = process.env.DASHBOARD_PASSWORD;
  if (!fallback) return false;
  return safeEqual(input, fallback);
}

export async function setPassword(newPassword: string) {
  const bcrypt = (await import('bcryptjs')).default;
  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: { dashboardPasswordHash: hash },
    create: { id: 'singleton', dashboardPasswordHash: hash },
  });
}

/**
 * Small in-memory throttle. Enough to make guessing impractical on a
 * single-instance deployment; put a WAF or Redis counter in front for more.
 */
const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function tooManyAttempts(key: string) {
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string) {
  const record = attempts.get(key);
  if (!record || Date.now() - record.firstAt > WINDOW_MS) {
    // Bounded so a flood of spoofed X-Forwarded-For values cannot grow the map
    // without limit; expired entries go first, and the oldest if none expired.
    if (attempts.size >= 5_000) {
      const now = Date.now();
      for (const [k, v] of Array.from(attempts.entries())) {
        if (now - v.firstAt > WINDOW_MS) attempts.delete(k);
      }
      if (attempts.size >= 5_000) {
        attempts.delete(Array.from(attempts.keys())[0]);
      }
    }
    attempts.set(key, { count: 1, firstAt: Date.now() });
    return;
  }
  record.count++;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
