import { NextResponse, type NextRequest } from 'next/server';
// Import from session-token, not dashboard-auth: middleware runs on the Edge
// runtime and must not pull in Prisma or bcrypt.
import { COOKIE_NAME, verifySessionToken } from '@/lib/session-token';

/**
 * Edge guard for /dashboard. Verifies only the cookie signature — the password
 * itself is never checked here. The dashboard layout repeats the check
 * server-side so protection never depends on middleware alone.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The password screen itself must stay reachable.
  if (pathname === '/dashboard/login') return NextResponse.next();

  const valid = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value);
  if (valid) return NextResponse.next();

  const url = new URL('/dashboard/login', req.url);
  if (pathname !== '/dashboard') url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
