/**
 * Security and order-lifecycle checks against a running server.
 *
 *   npm run build && npm start
 *   npm run security
 *
 * Probes the things that actually lose money or leak data: authorisation on
 * every dashboard route and action, session forgery, order privacy, price and
 * stock tampering, injection, upload filtering and rate limits.
 */
import './load-env.ts';
import { COOKIE_NAME, createSessionToken } from '../src/lib/session-token.ts';
import { signToken } from '../src/lib/signing.ts';
import { jsonLdScript } from '../src/lib/json-ld.ts';
import { prisma } from '../src/lib/prisma.ts';

const BASE = process.env.SECURITY_BASE ?? 'http://localhost:3000';

let pass = 0;
let fail = 0;
const check = (label, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail !== undefined ? ` — ${String(detail).slice(0, 200)}` : ''}`);
  }
};

const session = await createSessionToken();
const STAFF = { cookie: `${COOKIE_NAME}=${session}` };

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/orders',
  '/dashboard/products',
  '/dashboard/categories',
  '/dashboard/stock',
  '/dashboard/offers',
  '/dashboard/shipping',
  '/dashboard/filters',
  '/dashboard/promo-codes',
  '/dashboard/analytics',
  '/dashboard/settings',
];

// ---------------------------------------------------------------- authorisation
console.log('\n▸ Authorisation');
for (const path of DASHBOARD_ROUTES) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  const location = res.headers.get('location') ?? '';
  check(
    `${path} closed to anonymous`,
    res.status === 307 && location.includes('/dashboard/login'),
    `${res.status} ${location}`,
  );
}
check(
  'upload API rejects anonymous',
  (await fetch(`${BASE}/api/dashboard/upload`, { method: 'POST' })).status === 401,
);
check(
  'report API rejects anonymous',
  (await fetch(`${BASE}/api/dashboard/report`)).status === 401,
);

// ---------------------------------------------------------------- session forgery
console.log('\n▸ Session integrity');
const forged = [
  ['random bytes', 'abcdef.0123456789'],
  ['valid shape, wrong signature', `${Date.now() + 600_000}.${'a'.repeat(64)}`],
  ['no signature at all', String(Date.now() + 600_000)],
  ['empty', ''],
];
for (const [name, token] of forged) {
  const res = await fetch(`${BASE}/dashboard/orders`, {
    headers: { cookie: `${COOKIE_NAME}=${token}` },
    redirect: 'manual',
  });
  check(`forged cookie rejected — ${name}`, res.status === 307, res.status);
}

// A correctly signed but expired token must still be refused.
const expired = await signToken(String(Date.now() - 1000));
check(
  'correctly signed but expired token rejected',
  (await fetch(`${BASE}/dashboard/orders`, {
    headers: { cookie: `${COOKIE_NAME}=${expired}` },
    redirect: 'manual',
  })).status === 307,
);
check(
  'a genuine token is accepted',
  (await fetch(`${BASE}/dashboard/orders`, { headers: STAFF })).status === 200,
);

// ---------------------------------------------------------------- headers
console.log('\n▸ Security headers');
const home = await fetch(`${BASE}/`);
const header = (n) => home.headers.get(n) ?? '';
check('CSP present', header('content-security-policy').includes("default-src 'self'"), header('content-security-policy').slice(0, 60));
check('CSP blocks framing', header('content-security-policy').includes("frame-ancestors 'none'"));
check('CSP blocks plugins', header('content-security-policy').includes("object-src 'none'"));
check('X-Content-Type-Options: nosniff', header('x-content-type-options') === 'nosniff');
check('X-Frame-Options: DENY', header('x-frame-options') === 'DENY');
check('Referrer-Policy set', header('referrer-policy').length > 0, header('referrer-policy'));
check('HSTS set', header('strict-transport-security').includes('max-age='));
check('server framework not advertised', !home.headers.get('x-powered-by'), home.headers.get('x-powered-by'));

// ---------------------------------------------------------------- order privacy
console.log('\n▸ Order privacy');
const sample = await prisma.order.findFirst({ select: { orderNumber: true, email: true } });
if (!sample) {
  console.log('  … skipped: no orders to test against.');
} else {
  const stranger = await fetch(`${BASE}/order/${sample.orderNumber}`, { redirect: 'manual' });
  check(
    'order number alone does not open the receipt',
    stranger.status === 307,
    stranger.status,
  );
  check(
    'a dashboard session may read any order',
    (await fetch(`${BASE}/order/${sample.orderNumber}`, { headers: STAFF })).status === 200,
  );
  // A forged order-access cookie must not work either.
  const forgedAccess = `luwjje_orders=${sample.orderNumber}.${'b'.repeat(64)}`;
  check(
    'forged order-access cookie rejected',
    (await fetch(`${BASE}/order/${sample.orderNumber}`, {
      headers: { cookie: forgedAccess },
      redirect: 'manual',
    })).status === 307,
  );
}

// ---------------------------------------------------------------- price & stock tampering
console.log('\n▸ Price and stock tampering');
const variant = await prisma.productVariant.findFirst({
  where: { stock: { gt: 0 }, product: { status: 'PUBLISHED' } },
  include: { product: true },
});

if (!variant) {
  console.log('  … skipped: no purchasable variant in the catalogue.');
} else {
  const price = async (body) =>
    (await fetch(`${BASE}/api/cart/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })).json();

  // The client cannot send a price at all — but prove the server ignores extras.
  const tampered = await price({
    items: [{ variantId: variant.id, quantity: 1, unitPrice: 1, price: 1 }],
    governorate: 'Cairo',
    subtotal: 1,
    total: 1,
  });
  check(
    'a client-supplied price is ignored',
    tampered.subtotal === variant.product.price,
    `sent 1, got ${tampered.subtotal}`,
  );

  const overQty = await price({
    items: [{ variantId: variant.id, quantity: 99 }],
    governorate: 'Cairo',
  });
  check(
    'quantity is clamped to stock',
    overQty.lines[0]?.quantity === Math.min(99, variant.stock),
    overQty.lines[0]?.quantity,
  );

  const negative = await fetch(`${BASE}/api/cart/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ variantId: variant.id, quantity: -5 }] }),
  });
  check('a negative quantity is rejected', negative.status === 400, negative.status);

  const huge = await fetch(`${BASE}/api/cart/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: Array.from({ length: 500 }, () => ({ variantId: variant.id, quantity: 1 })),
    }),
  });
  check('an oversized cart is rejected', huge.status === 400, huge.status);

  const unknown = await price({ items: [{ variantId: 'no-such-variant', quantity: 1 }] });
  check('an unknown variant yields nothing', unknown.subtotal === 0, unknown.subtotal);
  check('an empty cart is not charged delivery', unknown.shipping?.cost === 0, unknown.shipping?.cost);
}

// ---------------------------------------------------------------- injection
console.log('\n▸ Injection');
const sqlish = "' OR 1=1 --";
const search = await fetch(`${BASE}/shop?q=${encodeURIComponent(sqlish)}`);
check('SQL-ish search string is handled safely', search.status === 200, search.status);

const xssQuery = '<img src=x onerror=alert(1)>';
const xssPage = await fetch(`${BASE}/shop?q=${encodeURIComponent(xssQuery)}`);
const xssHtml = await xssPage.text();
check(
  'a search term is escaped, not injected',
  !xssHtml.includes('<img src=x onerror='),
  'raw payload found in the HTML',
);

check(
  'JSON-LD escapes a tag-breaking product name',
  !jsonLdScript({ name: 'x</script><script>alert(1)</script>' }).includes('</script>'),
);

const badJson = await fetch(`${BASE}/api/cart/revalidate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{not json',
});
check('malformed JSON does not 500', badJson.status < 500, badJson.status);

// ---------------------------------------------------------------- uploads
console.log('\n▸ Upload filtering');
async function upload(name, type, bytes = 'x') {
  const body = new FormData();
  body.append('files', new Blob([bytes], { type }), name);
  const res = await fetch(`${BASE}/api/dashboard/upload`, {
    method: 'POST',
    headers: STAFF,
    body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const svg = await upload('x.svg', 'image/svg+xml', '<svg onload="alert(1)"></svg>');
check('SVG upload refused (it can carry script)', svg.status === 400, svg.status);
const script = await upload('x.js', 'text/javascript', 'alert(1)');
check('script upload refused', script.status === 400, script.status);
const html = await upload('x.html', 'text/html', '<script>alert(1)</script>');
check('HTML upload refused', html.status === 400, html.status);

// ---------------------------------------------------------------- rate limits
console.log('\n▸ Rate limits');
const newsletterHits = [];
for (let i = 0; i < 26; i++) {
  const res = await fetch(`${BASE}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `flood-${i}@example.com` }),
  });
  newsletterHits.push(res.status);
}
check(
  'newsletter flood is throttled',
  newsletterHits.includes(429),
  `statuses seen: ${[...new Set(newsletterHits)].join(', ')}`,
);

await prisma.newsletterSubscriber.deleteMany({ where: { email: { contains: 'flood-' } } });

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
