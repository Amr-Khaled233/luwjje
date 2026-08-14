import { headers } from 'next/headers';

/**
 * Small in-memory fixed-window limiter.
 *
 * Enough to stop casual abuse and email enumeration on a single instance.
 * Serverless scales horizontally, so each instance keeps its own counters —
 * treat this as a speed bump, not a guarantee. Put a WAF or a Redis counter in
 * front if the store gets real traffic.
 */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Bound the map so a flood of distinct keys cannot grow it without limit.
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

/** Best-effort client identity. Behind a proxy this is the forwarded address. */
export function clientKey(prefix: string) {
  const h = headers();
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'local';
  return `${prefix}:${ip}`;
}

/** Same, for Route Handlers, which get the Request rather than headers(). */
export function requestKey(req: Request, prefix: string) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'local';
  return `${prefix}:${ip}`;
}

/** Test seam — the counters are process-global. */
export function resetRateLimits() {
  buckets.clear();
}
