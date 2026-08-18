import { NextResponse, type NextRequest } from 'next/server';
// Import from session-token, not dashboard-auth: middleware runs on the Edge
// runtime and must not pull in Prisma or bcrypt.
import { COOKIE_NAME, verifySessionToken } from '@/lib/session-token';

/**
 * Edge guard for /dashboard. Verifies only the cookie signature — the password
 * itself is never checked here. The dashboard layout repeats the check
 * server-side so protection never depends on middleware alone.
 */
/**
 * Reachable without a session, because they are how you get one back. The
 * reset page validates its own token, and the forgot page mails a fixed
 * address, so neither is an opening.
 */
const PUBLIC_PATHS = new Set(['/dashboard/login', '/dashboard/forgot', '/dashboard/reset']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const valid = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
  if (valid) return NextResponse.next();

  const url = new URL('/dashboard/login', req.url);
  if (pathname !== '/dashboard') url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
