import { COOKIE_NAME, createSessionToken } from '../src/lib/session-token.ts';
import { prisma } from '../src/lib/prisma.ts';

/**
 * A dashboard cookie the running server will actually accept.
 *
 * Sessions carry the store's `sessionEpoch`, which a password reset bumps, so
 * a token minted with the default 0 is rejected the moment a reset has ever
 * happened. Reading the real value keeps the suites working on a database
 * with history.
 */
export async function staffCookie() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { sessionEpoch: true },
  });
  return `${COOKIE_NAME}=${await createSessionToken(settings?.sessionEpoch ?? 0)}`;
}

export { COOKIE_NAME };
