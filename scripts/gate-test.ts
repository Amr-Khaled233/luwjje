/**
 * Verifies the dashboard password gate and guest-order privacy.
 *
 *   npm run dev          # in one terminal
 *   npm run gate         # in another
 *
 * Exercises the real password check and the real session/cookie signing, then
 * uses a genuinely minted cookie against the running server.
 */
import './load-env';
import { checkPassword } from '../src/lib/dashboard-auth';
import { COOKIE_NAME, createSessionToken, verifySessionToken } from '../src/lib/session-token';
import { signToken } from '../src/lib/signing';
import { findOrdersForEmail } from '../src/lib/order-lookup';
import { prisma } from '../src/lib/prisma';

const BASE = process.env.GATE_BASE ?? 'http://localhost:3010';

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
  }
}

const DASHBOARD_PAGES = [
  '/dashboard',
  '/dashboard/products',
  '/dashboard/stock',
  '/dashboard/orders',
  '/dashboard/offers',
  '/dashboard/shipping',
  '/dashboard/promo-codes',
  '/dashboard/analytics',
  '/dashboard/settings',
];

async function main() {
  const expectedPassword = process.env.DASHBOARD_PASSWORD ?? 'luwjje-admin';

  console.log('\n▸ Password check');
  check('the configured password is accepted', await checkPassword(expectedPassword));
  check('a wrong password is rejected', !(await checkPassword('definitely-wrong')));
  check('an empty password is rejected', !(await checkPassword('')));

  console.log('\n▸ Session token');
  const epoch = (await prisma.siteSettings.findUnique({ where: { id: 'singleton' }, select: { sessionEpoch: true } }))?.sessionEpoch ?? 0;
  const valid = await createSessionToken(epoch);
  check('a freshly minted token verifies', await verifySessionToken(valid));
  check('no token is rejected', !(await verifySessionToken(undefined)));
  check('garbage is rejected', !(await verifySessionToken('not-a-token')));
  check(
    'a forged signature is rejected',
    !(await verifySessionToken(`${Date.now() + 60_000}.${'a'.repeat(64)}`)),
  );
  check(
    'an expired but correctly signed token is rejected',
    !(await verifySessionToken(await signToken(String(Date.now() - 1000)))),
  );

  console.log('\n▸ Guest order lookup');
  const sample = await prisma.order.findFirst({ select: { email: true } });

  if (!sample) {
    console.log('  … skipped: no orders in the database yet.');
  } else {
    const match = await findOrdersForEmail({ email: sample.email });
    check('a known email returns its orders', match.ok && match.orders.length > 0, match);

    const upper = await findOrdersForEmail({ email: sample.email.toUpperCase() });
    check('lookup is case-insensitive', upper.ok, upper);

    if (match.ok) {
      const total = await prisma.order.count({ where: { email: sample.email } });
      check(
        'every order for that email comes back',
        match.orders.length === Math.min(total, 50),
        { returned: match.orders.length, total },
      );
    }
  }

  const unknown = await findOrdersForEmail({ email: 'nobody-at-all@example.com' });
  check('an unknown email returns nothing', !unknown.ok);

  const junk = await findOrdersForEmail({ email: 'not-an-email' });
  check('a malformed email is rejected', !junk.ok);

  console.log('\n▸ HTTP gate (dev server must be running)');
  let reachable = true;
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(3000) });
  } catch {
    reachable = false;
  }

  if (!reachable) {
    console.log(`  … skipped: no server at ${BASE}. Start it with "npm run dev".`);
  } else {
    for (const path of DASHBOARD_PAGES) {
      const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
      const location = res.headers.get('location') ?? '';
      check(
        `${path} is closed without a session`,
        res.status === 307 && location.includes('/dashboard/login'),
        `${res.status} ${location}`,
      );
    }

    check(
      'the password screen itself stays reachable',
      (await fetch(`${BASE}/dashboard/login`)).status === 200,
    );

    const jar = `${COOKIE_NAME}=${valid}`;
    for (const path of DASHBOARD_PAGES) {
      const res = await fetch(`${BASE}${path}`, { headers: { cookie: jar } });
      check(`${path} opens with a valid session`, res.status === 200, res.status);
    }

    check(
      'a forged cookie does not open the dashboard',
      (await fetch(`${BASE}/dashboard`, {
        headers: { cookie: `${COOKIE_NAME}=${Date.now() + 60_000}.${'a'.repeat(64)}` },
        redirect: 'manual',
      })).status === 307,
    );

    console.log('\n▸ Dashboard APIs');
    check(
      'upload rejects without a session',
      (await fetch(`${BASE}/api/dashboard/upload`, { method: 'POST' })).status === 401,
    );
    check(
      'report rejects without a session',
      (await fetch(`${BASE}/api/dashboard/report`)).status === 401,
    );
    check(
      'report allows a valid session',
      (await fetch(`${BASE}/api/dashboard/report?days=7`, { headers: { cookie: jar } })).status ===
        200,
    );

    console.log('\n▸ Customer-account routes are gone');
    for (const path of ['/login', '/register', '/account', '/admin', '/api/auth/session']) {
      check(`${path} is 404`, (await fetch(`${BASE}${path}`)).status === 404);
    }

    console.log('\n▸ Storefront stays public');
    for (const path of ['/', '/shop', '/product/the-classic-snood', '/cart', '/checkout', '/orders']) {
      check(`${path} is open to everyone`, (await fetch(`${BASE}${path}`)).status === 200);
    }
    const home = await (await fetch(`${BASE}/`)).text();
    check('no sign-in or account links remain', !/href="\/(login|register|account)"/.test(home));

    console.log('\n▸ Guest order privacy');
    const order = await prisma.order.findFirstOrThrow({
      select: { orderNumber: true, email: true },
    });
    const stranger = await fetch(`${BASE}/order/${order.orderNumber}`, { redirect: 'manual' });
    check(
      'an order number alone does not reveal the order',
      stranger.status === 307 && (stranger.headers.get('location') ?? '').includes('/orders'),
      stranger.status,
    );
    check(
      'a dashboard session can still read any order',
      (await fetch(`${BASE}/order/${order.orderNumber}`, { headers: { cookie: jar } })).status ===
        200,
    );
  }

  console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('\n✗ Gate test crashed:\n', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
