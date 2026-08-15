/**
 * Arabic/English coverage — dictionaries and rendered pages.
 *
 *   npm run build && npm start
 *   npm run i18n
 *
 * Two halves: the dictionaries must have an Arabic value for every English
 * key with the same placeholders, and every page must actually come back in
 * Arabic, right-to-left, when the locale cookie says so.
 */
import './load-env.ts';
import { getDictionary } from '../src/i18n/dictionaries.ts';
import { getDashboardDictionary } from '../src/i18n/dashboard-dictionary.ts';
import { COOKIE_NAME, createSessionToken } from '../src/lib/session-token.ts';
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
    console.log(`  ✗ ${label}${detail !== undefined ? ` — ${String(detail).slice(0, 300)}` : ''}`);
  }
};

const ARABIC = /[؀-ۿ]/;
const placeholders = (s) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(',');

/** Acronyms and brand names that are written the same way in Arabic. */
const KEPT_AS_IS = new Set(['SKU', 'EGP', 'luwjje', 'Instagram', 'Facebook']);

/** Walks both trees together, collecting every leaf that fails a rule. */
function audit(label, base, translated) {
  const missing = [];
  const untranslated = [];
  const mismatched = [];

  const walk = (a, b, path) => {
    for (const key of Object.keys(a)) {
      const here = path ? `${path}.${key}` : key;
      const left = a[key];
      const right = b?.[key];

      if (left && typeof left === 'object' && !Array.isArray(left)) {
        walk(left, right ?? {}, here);
        continue;
      }
      if (typeof left !== 'string') continue;

      if (typeof right !== 'string' || right.length === 0) {
        missing.push(here);
        continue;
      }
      if (placeholders(left) !== placeholders(right)) {
        mismatched.push(`${here} (${placeholders(left)} vs ${placeholders(right)})`);
      }
      // A leaf that stayed identical is only suspicious when it has letters —
      // symbols, digits and brand names are legitimately the same.
      if (
        right === left &&
        /[a-zA-Z]{3,}/.test(left) &&
        !ARABIC.test(right) &&
        !KEPT_AS_IS.has(left.trim())
      ) {
        untranslated.push(`${here} = "${left}"`);
      }
    }
  };

  walk(base, translated, '');

  check(`${label}: every key has an Arabic value`, missing.length === 0, missing.slice(0, 8).join(', '));
  check(`${label}: placeholders survive translation`, mismatched.length === 0, mismatched.slice(0, 6).join(', '));
  check(`${label}: no English left behind`, untranslated.length === 0, untranslated.slice(0, 8).join(' | '));
}

console.log('\n▸ Dictionaries');
audit('storefront', getDictionary('en'), getDictionary('ar'));
audit('dashboard', getDashboardDictionary('en'), getDashboardDictionary('ar'));

// ---------------------------------------------------------------- rendered pages
const product = await prisma.product.findFirst({
  where: { status: 'PUBLISHED' },
  select: { slug: true },
});
const category = await prisma.category.findFirst({
  where: { visible: true },
  select: { slug: true },
});
const cmsPage = await prisma.page.findFirst({ select: { slug: true } });

const STOREFRONT = [
  '/',
  '/shop',
  category ? `/shop?category=${category.slug}` : null,
  product ? `/product/${product.slug}` : null,
  '/cart',
  '/checkout',
  '/orders',
  '/journal',
  '/about',
  cmsPage ? `/pages/${cmsPage.slug}` : null,
].filter(Boolean);

const DASHBOARD = [
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

const session = await createSessionToken();

async function page(path, locale, extraCookie = '') {
  const cookie = [`luwjje_locale=${locale}`, extraCookie].filter(Boolean).join('; ');
  const res = await fetch(`${BASE}${path}`, { headers: { cookie } });
  return { status: res.status, html: await res.text() };
}

/** Text a visitor reads, minus scripts, styles and markup. */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

console.log('\n▸ Storefront in Arabic');
for (const path of STOREFRONT) {
  const ar = await page(path, 'ar');
  const ok = ar.status === 200;
  const rtl = /<html[^>]*dir="rtl"/.test(ar.html) && /<html[^>]*lang="ar"/.test(ar.html);
  const arabic = ARABIC.test(visibleText(ar.html));
  check(`${path} — 200, dir=rtl, Arabic text`, ok && rtl && arabic, `status ${ar.status}, rtl ${rtl}, arabic ${arabic}`);
}

console.log('\n▸ Storefront in English');
for (const path of STOREFRONT) {
  const en = await page(path, 'en');
  const ltr = /<html[^>]*dir="ltr"/.test(en.html) && /<html[^>]*lang="en"/.test(en.html);
  check(`${path} — 200, dir=ltr`, en.status === 200 && ltr, `status ${en.status}, ltr ${ltr}`);
}

console.log('\n▸ Dashboard in Arabic');
const staffCookie = `${COOKIE_NAME}=${session}`;
for (const path of DASHBOARD) {
  const ar = await page(path, 'ar', staffCookie);
  const arabic = ARABIC.test(visibleText(ar.html));
  const rtl = /dir="rtl"/.test(ar.html);
  check(`${path} — 200, rtl, Arabic text`, ar.status === 200 && rtl && arabic, `status ${ar.status}, rtl ${rtl}, arabic ${arabic}`);
}

console.log('\n▸ Dashboard in English');
for (const path of DASHBOARD) {
  const en = await page(path, 'en', staffCookie);
  check(`${path} — 200`, en.status === 200, en.status);
}

// ---------------------------------------------------------------- prices
console.log('\n▸ Prices');
const shopAr = await page('/shop', 'ar');
const shopEn = await page('/shop', 'en');
check('the English shop quotes EGP', /EGP/.test(visibleText(shopEn.html)));
check('the Arabic shop quotes جنيه', /جنيه|ج\.م|EGP/.test(visibleText(shopAr.html)));

// ---------------------------------------------------------------- login page
console.log('\n▸ Login gate');
const loginAr = await page('/dashboard/login', 'ar');
check('the login page speaks Arabic too', ARABIC.test(visibleText(loginAr.html)), loginAr.status);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
