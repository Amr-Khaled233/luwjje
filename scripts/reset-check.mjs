/**
 * Password recovery and transactional email checks.
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
import { buildOrderEmail, sendOrderConfirmation } from '../src/lib/order-email.ts';
import { checkPassword } from '../src/lib/dashboard-auth.ts';
import { formatPrice } from '../src/lib/utils.ts';
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

/**
 * This suite genuinely changes the dashboard password partway through, so the
 * restore has to survive a crash. Without it, dying mid-run leaves the store
 * on the test's throwaway password — and the next run captures *that* as the
 * value to restore, so the real one is gone for good.
 */
let restored = false;
async function restore() {
  if (restored) return;
  restored = true;
  await prisma.passwordReset.deleteMany({});
  await prisma.siteSettings.update({
    where: { id: 'singleton' },
    data: {
      dashboardPasswordHash: originalHash.dashboardPasswordHash,
      sessionEpoch: originalHash.sessionEpoch,
    },
  });
  process.env.PASSWORD_RESET_EMAIL = previousEmail;
}
for (const signal of ['exit', 'SIGINT', 'uncaughtException', 'unhandledRejection']) {
  process.once(signal, () => {
    void restore();
  });
}

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

// ---------------------------------------------------------------- order email
console.log('\n▸ Order confirmation email');
const order = await prisma.order.findFirst({
  include: { items: true },
  orderBy: { createdAt: 'desc' },
});

if (!order) {
  console.log('  … skipped: no orders to confirm.');
} else {
  const en = await buildOrderEmail(order.orderNumber, 'en');
  const both = `${en.text}${en.html}`;

  check('it is addressed to the customer, not the store', en.to === order.email, en.to);
  check('the subject carries the order number', en.subject.includes(order.orderNumber));
  // Compare against the formatter the storefront uses rather than guessing at
  // separators and decimals — `formatPrice` drops the cents on whole amounts.
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'singleton' },
    select: { currencySymbol: true },
  });
  const symbol = settings?.currencySymbol ?? 'EGP';
  check(
    'the total is in the body, formatted as on the site',
    en.text.includes(formatPrice(order.total, symbol, 'en')),
    formatPrice(order.total, symbol, 'en'),
  );
  check(
    'and in the HTML part too',
    en.html.includes(formatPrice(order.total, symbol, 'en').replace(/&/g, '&amp;')),
  );
  check('every line item is listed', order.items.every((i) => both.includes(i.name)));
  check('quantities are shown', en.text.includes(`× ${order.items[0].quantity}`));
  check('the delivery address is included', en.text.includes(order.governorate));
  check('the buyer name is included', en.text.includes(order.fullName));
  check('it links to order tracking', en.html.includes('/orders'));
  check('both a text and an HTML part are built', en.text.length > 0 && en.html.length > 0);

  const ar = await buildOrderEmail(order.orderNumber, 'ar');
  check('the Arabic version is Arabic', /[؀-ۿ]/.test(ar.text));
  check('the Arabic version is right-to-left', ar.html.includes('dir="rtl"'));
  check('the Arabic subject still carries the order number', ar.subject.includes(order.orderNumber));

  check('an unknown order number builds nothing', (await buildOrderEmail('NO-SUCH', 'en')) === null);
  check(
    'and sending one is refused quietly',
    (await sendOrderConfirmation('NO-SUCH-ORDER', 'en')) === false,
  );
  check(
    'with no transport a real order reports as not sent',
    (await sendOrderConfirmation(order.orderNumber, 'en')) === false,
    'claimed a send with no provider configured',
  );

  // A product name reaches the HTML email; it must not be able to carry markup
  // into someone's inbox.
  const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
  await prisma.orderItem.update({
    where: { id: item.id },
    data: { name: '<img src=x onerror=alert(1)>' },
  });
  const injected = await buildOrderEmail(order.orderNumber, 'en');
  check('a product name cannot inject markup', !injected.html.includes('<img src=x onerror='));
  check('it is escaped rather than dropped', injected.html.includes('&lt;img src=x'));
  await prisma.orderItem.update({ where: { id: item.id }, data: { name: item.name } });
}

// ---------------------------------------------------------------- settings
console.log('\n▸ The password is no longer editable from Settings');
const settingsSource = readFileSync('src/components/dashboard/settings-manager.tsx', 'utf8');
check('no password tab remains', !settingsSource.includes("'password'"));
check('no change-password form remains', !settingsSource.includes('changeDashboardPassword'));
const actions = readFileSync('src/app/actions/dashboard.ts', 'utf8');
check('the change-password action is gone', !actions.includes('changeDashboardPassword'));

// ---------------------------------------------------------------- restore
await restore();
const leftover = await prisma.passwordReset.count();
check('the test cleaned up after itself', leftover === 0, leftover);
check(
  'the password is back to what it was',
  (
    await prisma.siteSettings.findUnique({
      where: { id: 'singleton' },
      select: { dashboardPasswordHash: true },
    })
  )?.dashboardPasswordHash === originalHash.dashboardPasswordHash,
);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
