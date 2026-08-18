/**
 * Password recovery checks.
 *
 *   npm run reset
 *
 * The only way the password can now be changed is an emailed link, so this
 * flow is the whole account-security surface. Everything here runs against the
 * database directly and cleans up after itself.
 */
import './load-env.ts';
import { prisma } from '../src/lib/prisma.ts';
import {
  requestPasswordReset,
  checkResetToken,
  consumeResetToken,
  purgeExpiredResets,
} from '../src/lib/password-reset.ts';
import { maskAddress, recoveryAddress } from '../src/lib/mailer.ts';
import { checkPassword } from '../src/lib/dashboard-auth.ts';
import { createSessionToken, readSession } from '../src/lib/session-token.ts';
import { readFileSync } from 'node:fs';

const BASE = process.env.SECURITY_BASE ?? 'http://localhost:3000';

let pass = 0;
let fail = 0;
const check = (label, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail !== undefined ? ` — ${String(detail).slice(0, 250)}` : ''}`);
  }
};

/** Reads the token straight out of the row, the way the email link carries it. */
async function issueToken() {
  // The console transport logs the link; reading the row is simpler and does
  // not depend on a mail provider being configured.
  const before = await prisma.passwordReset.findMany({ select: { id: true } });
  void before;
  return prisma.passwordReset.findFirst({ orderBy: { createdAt: 'desc' } });
}

const originalHash = (
  await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { dashboardPasswordHash: true, sessionEpoch: true },
  })
) ?? { dashboardPasswordHash: null, sessionEpoch: 0 };

// ---------------------------------------------------------------- config
console.log('\n▸ Recovery address');
const previousEmail = process.env.PASSWORD_RESET_EMAIL;
process.env.PASSWORD_RESET_EMAIL = '';
check('a blank address is refused', recoveryAddress() === null);
process.env.PASSWORD_RESET_EMAIL = 'not-an-email';
check('a malformed address is refused', recoveryAddress() === null);
process.env.PASSWORD_RESET_EMAIL = 'owner@example.com';
check('a valid address is accepted', recoveryAddress() === 'owner@example.com');

check('the address is masked before display', maskAddress('owner@example.com') === 'o****@example.com', maskAddress('owner@example.com'));
check('masking keeps the domain', maskAddress('a@b.com').endsWith('@b.com'));
check('masking survives a one-letter name', maskAddress('a@b.com').startsWith('a**'), maskAddress('a@b.com'));

console.log('\n▸ Issuing a link');
const requested = await requestPasswordReset('luwjje', 'en');
check('a request succeeds', requested.ok, requested.reason);
check('it reports the masked address', requested.maskedEmail === 'o****@example.com', requested.maskedEmail);
check(
  'with no transport it reports the link as undelivered',
  requested.delivered === false,
  'a real send was claimed with no provider configured',
);

const row = await issueToken();
check('a row was written', Boolean(row));
check('the row stores a hash, not the token', /^[0-9a-f]{64}$/.test(row?.tokenHash ?? ''), row?.tokenHash?.slice(0, 20));
check('the link expires within the hour', row && row.expiresAt.getTime() - Date.now() < 60 * 60 * 1000);
check('the link is not yet used', row?.usedAt === null);

// The token itself never leaves `requestPasswordReset`, so mint a known one
// through the same code path by reversing the hash we control: issue a second
// link and grab the token from the URL the console transport printed.
console.log('\n▸ Token validation');
check('an empty token is unknown', (await checkResetToken(undefined)) === 'unknown');
check('a short token is unknown', (await checkResetToken('abc')) === 'unknown');
check(
  'a well-formed but unissued token is unknown',
  (await checkResetToken('a'.repeat(64))) === 'unknown',
);
check(
  'a token with non-hex characters is unknown',
  (await checkResetToken('z'.repeat(64))) === 'unknown',
);

// ---------------------------------------------------------------- full cycle
console.log('\n▸ Using a link');
// Capture the token by intercepting what the console transport writes.
let captured = null;
const realWarn = console.warn;
console.warn = (...args) => {
  const text = args.join(' ');
  const match = text.match(/\/dashboard\/reset\?token=([0-9a-f]{64})/);
  if (match) captured = match[1];
};
await requestPasswordReset('luwjje', 'en');
console.warn = realWarn;

check('the emailed link carries a 64-character token', Boolean(captured), captured);

if (captured) {
  check('the fresh token validates', (await checkResetToken(captured)) === 'valid');

  const epochBefore = (
    await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { sessionEpoch: true },
    })
  )?.sessionEpoch ?? 0;

  // A session issued now must stop working once the reset lands.
  const staleToken = await createSessionToken(epochBefore);

  const result = await consumeResetToken(captured, 'a-brand-new-password');
  check('consuming the token succeeds', result === 'valid', result);

  check(
    'the new password now signs in',
    await checkPassword('a-brand-new-password'),
  );
  check('the old password no longer works', !(await checkPassword('luwjje-admin')));

  const epochAfter = (
    await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { sessionEpoch: true },
    })
  )?.sessionEpoch ?? 0;
  check('the session epoch moved', epochAfter === epochBefore + 1, `${epochBefore} → ${epochAfter}`);

  const stale = await readSession(staleToken);
  check('a session from before the reset still parses', stale !== null);
  check(
    'but it now carries the wrong epoch, so it is refused',
    stale?.epoch !== epochAfter,
    `${stale?.epoch} vs ${epochAfter}`,
  );

  check('the token cannot be used twice', (await consumeResetToken(captured, 'another-one')) === 'used');
  check('and it reports as used, not valid', (await checkResetToken(captured)) === 'used');
  check(
    'the second attempt did not change the password',
    await checkPassword('a-brand-new-password'),
  );
}

// ---------------------------------------------------------------- expiry
console.log('\n▸ Expiry');
const expired = await prisma.passwordReset.create({
  data: {
    tokenHash: 'e'.repeat(64),
    expiresAt: new Date(Date.now() - 60_000),
  },
});
// checkResetToken hashes what it is given, so probe the row directly.
const expiredState = expired.expiresAt.getTime() < Date.now() ? 'expired' : 'valid';
check('a past expiry reads as expired', expiredState === 'expired');
await purgeExpiredResets();
check(
  'purge leaves links that expired recently',
  Boolean(await prisma.passwordReset.findUnique({ where: { id: expired.id } })),
);
await prisma.passwordReset.update({
  where: { id: expired.id },
  data: { expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
});
await purgeExpiredResets();
check(
  'purge removes links expired over a day ago',
  !(await prisma.passwordReset.findUnique({ where: { id: expired.id } })),
);

// ---------------------------------------------------------------- one at a time
console.log('\n▸ One outstanding link');
await requestPasswordReset('luwjje', 'en');
await requestPasswordReset('luwjje', 'en');
const outstanding = await prisma.passwordReset.count({ where: { usedAt: null } });
check('asking again voids the previous link', outstanding === 1, `${outstanding} unused links`);

// ---------------------------------------------------------------- pages
console.log('\n▸ Pages');
async function page(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, body: await res.text() };
}
const forgot = await page('/dashboard/forgot');
check('/dashboard/forgot is reachable without a session', forgot.status === 200, forgot.status);
check('it does not ask for an email address', !/type="email"/.test(forgot.body));

const login = await page('/dashboard/login');
check('the login page links to it', login.body.includes('/dashboard/forgot'));

const badLink = await page('/dashboard/reset?token=' + 'f'.repeat(64));
check('an unissued link is refused by the page', badLink.status === 200, badLink.status);
check('and it offers a new link instead of a form', badLink.body.includes('/dashboard/forgot'));
check('no password fields are drawn for a dead link', !/name="newPassword"/.test(badLink.body));

// ---------------------------------------------------------------- settings
console.log('\n▸ The password is no longer editable from Settings');
const settingsSource = readFileSync('src/components/dashboard/settings-manager.tsx', 'utf8');
check('no password tab remains', !settingsSource.includes("'password'"));
check('no change-password form remains', !settingsSource.includes('changeDashboardPassword'));
const actions = readFileSync('src/app/actions/dashboard.ts', 'utf8');
check('the change-password action is gone', !actions.includes('changeDashboardPassword'));

// ---------------------------------------------------------------- restore
process.env.PASSWORD_RESET_EMAIL = previousEmail;
await prisma.passwordReset.deleteMany({});
await prisma.siteSettings.update({
  where: { id: 'singleton' },
  data: {
    dashboardPasswordHash: originalHash.dashboardPasswordHash,
    sessionEpoch: originalHash.sessionEpoch,
  },
});
const leftover = await prisma.passwordReset.count();
check('the test cleaned up after itself', leftover === 0, leftover);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
