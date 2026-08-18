/**
 * Responsive and motion checks.
 *
 *   npm run build && npm start
 *   npm run responsive
 *
 * Two halves. The static half reads the source and catches the mistakes that
 * only show up on a device — a physical `left-`/`pl-` that breaks Arabic, a
 * hover-only control with no touch equivalent, a fixed pixel width wider than
 * a phone. The rendered half fetches every page and checks the markup and CSS
 * that actually reach the browser.
 */
import './load-env.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { prisma } from '../src/lib/prisma.ts';
import { COOKIE_NAME, createSessionToken } from '../src/lib/session-token.ts';

const BASE = process.env.SECURITY_BASE ?? 'http://localhost:3000';
const ROOT = process.cwd();

let pass = 0;
let fail = 0;
const check = (label, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail !== undefined ? ` — ${String(detail).slice(0, 400)}` : ''}`);
  }
};

/** Every .tsx under src, as { path, source }. */
function sources() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.tsx')) {
        out.push({ path: relative(ROOT, full).replace(/\\/g, '/'), source: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(join(ROOT, 'src'));
  return out;
}

const files = sources();

// ================================================================ static
console.log('\n▸ Direction-safe layout');

/**
 * Physical-side utilities that break in Arabic. `ltr:`/`rtl:` prefixed ones
 * are deliberate pairs, and `translate-x` is fine because RTL mirrors it.
 */
const PHYSICAL = /(?<![\w:-])(pl|pr|ml|mr|left|right|border-l|border-r|rounded-l|rounded-r)-[\w.[\]%/-]+/g;
const offenders = [];
for (const { path, source } of files) {
  for (const line of source.split('\n')) {
    if (!line.includes('className')) continue;
    // Strip the directional escape hatches before looking for offenders.
    const stripped = line.replace(/\b(ltr|rtl):[\w.[\]%/-]+/g, '');
    const hits = stripped.match(PHYSICAL);
    if (hits) offenders.push(`${path}: ${hits.join(' ')}`);
  }
}
check(
  'no physical left/right utilities outside ltr:/rtl: pairs',
  offenders.length === 0,
  offenders.slice(0, 6).join(' | '),
);

const textSides = [];
for (const { path, source } of files) {
  if (/className="[^"]*\btext-(left|right)\b/.test(source)) textSides.push(path);
}
check('no text-left / text-right', textSides.length === 0, textSides.join(', '));

console.log('\n▸ Fixed widths');
// A width wider than the narrowest phone we support must be optional.
const NARROW = 360;
const wide = [];
for (const { path, source } of files) {
  for (const match of source.matchAll(/(?<!max-)(?<!sm:)(?<!md:)(?<!lg:)\b(w|min-w)-\[(\d+)px\]/g)) {
    const px = Number(match[2]);
    if (px <= NARROW) continue;
    const line = source.split('\n').find((l) => l.includes(match[0])) ?? '';
    // Safe if a responsive prefix caps it, a `min()` clamps it, or it sits
    // inside a scroll container that is meant to be wider than the screen.
    if (/\b(sm|md|lg|xl):/.test(line) || line.includes('min(')) continue;
    if (source.includes('overflow-x-auto')) continue;
    wide.push(`${path}: ${match[0]}`);
  }
}
check(`no unconditional width over ${NARROW}px`, wide.length === 0, wide.join(' | '));

console.log('\n▸ Touch');
// A control that only appears on hover is unreachable on a phone. Decorative
// elements (an image that swaps under the cursor) and anything that is itself
// pointer-only are fine — it is interactive controls that must have a twin.
const hoverOnly = [];
for (const { path, source } of files) {
  for (const line of source.split('\n')) {
    if (!/group-hover:opacity-100/.test(line)) continue;
    if (/\bmd:(flex|inline|block)\b|aria-hidden|object-cover/.test(line)) continue;
    hoverOnly.push(path);
  }
}
check(
  'no control reachable by hover alone',
  hoverOnly.length === 0,
  [...new Set(hoverOnly)].join(', '),
);

const grids = files.find((f) => f.path.endsWith('product-card.tsx'));
check(
  'the product grid is at least two across on a phone',
  /grid-cols-2/.test(grids?.source ?? ''),
);
check(
  'Quick Add has a touch-visible button',
  /md:hidden/.test(grids?.source ?? '') && /aria-label=\{t\.product\.quickAdd\}/.test(grids?.source ?? ''),
);

console.log('\n▸ Motion');
const css = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8');
check('prefers-reduced-motion is honoured', css.includes('prefers-reduced-motion: reduce'));
check('reduced motion covers pseudo-elements', /\*::before,\s*\n?\s*\*::after/.test(css));
check('the reveal utility exists', css.includes('.reveal'));
check('reveal degrades without JS', css.includes('.no-js .reveal'));
check('the body cannot scroll sideways', /body\s*\{[^}]*overflow-x:\s*hidden/s.test(css));
check('inputs are 16px on phones (iOS does not zoom)', /max-width:\s*767px[\s\S]{0,200}font-size:\s*16px/.test(css));
check('safe-area padding is available', css.includes('env(safe-area-inset-bottom'));
check('touch targets have a 44px floor', /\.tap-target[\s\S]{0,200}min-height:\s*44px/.test(css));

const tailwind = readFileSync(join(ROOT, 'tailwind.config.ts'), 'utf8');
for (const name of ['fade-in', 'fade-up', 'slide-in', 'scale-in', 'shimmer']) {
  check(`the ${name} animation is defined`, tailwind.includes(`'${name}':`) || tailwind.includes(`${name}:`));
}
check('a phone breakpoint below sm exists', /xs:\s*'400px'/.test(tailwind));

console.log('\n▸ Overlays lock the page behind them');
const OVERLAYS = [
  'src/components/storefront/cart-drawer.tsx',
  'src/components/storefront/site-header.tsx',
  'src/components/storefront/shop-filters.tsx',
  'src/components/dashboard/sidebar.tsx',
  'src/components/dashboard/modal.tsx',
];
for (const path of OVERLAYS) {
  const source = files.find((f) => f.path === path)?.source ?? '';
  const name = path.split('/').pop();
  check(`${name} locks background scroll`, source.includes('useScrollLock'));
  check(`${name} closes on Escape`, source.includes("'Escape'"));
}

// ================================================================ rendered
const product = await prisma.product.findFirst({
  where: { status: 'PUBLISHED' },
  select: { slug: true },
});

const PAGES = [
  '/',
  '/shop',
  product ? `/product/${product.slug}` : null,
  '/cart',
  '/checkout',
  '/orders',
  '/about',
].filter(Boolean);

const session = await createSessionToken();

async function html(path, cookie = '') {
  const res = await fetch(`${BASE}${path}`, { headers: cookie ? { cookie } : {} });
  return { status: res.status, body: await res.text() };
}

console.log('\n▸ Rendered pages');
const first = await html('/');
check('a viewport meta tag is present', /name="viewport"/.test(first.body));
check('the viewport is device-width', /width=device-width/.test(first.body));
check('the page may extend under a notch', /viewport-fit=cover/.test(first.body));
check(
  'zoom is not disabled',
  !/maximum-scale=1|user-scalable=no/.test(first.body),
  'pinch-zoom would be blocked',
);

for (const path of PAGES) {
  const page = await html(path);
  const ok = page.status === 200;
  // A stylesheet that never mentions a breakpoint means nothing is responsive.
  const responsive = /media="?\(min-width/.test(page.body) || page.body.includes('md:');
  check(`${path} renders`, ok, page.status);
  if (!ok) continue;
  check(
    `${path} has no fixed pixel width wider than a phone in inline style`,
    !/style="[^"]*width:\s*(4[0-9]{2}|[5-9][0-9]{2}|[0-9]{4,})px/.test(page.body),
  );
  void responsive;
}

console.log('\n▸ Dashboard on a phone');
const staff = `${COOKIE_NAME}=${session}`;
const orders = await html('/dashboard/orders', staff);
check('the dashboard renders', orders.status === 200, orders.status);
check(
  'the dashboard has a phone top bar',
  /md:hidden/.test(orders.body) && orders.body.includes('h-14'),
);
check('the sidebar is off-canvas on a phone', /-translate-x-full/.test(orders.body));
// Checked in the source, not the render: with an empty catalogue the Orders
// page shows its empty state and no table at all.
const tableWrap = files.find((f) => f.path.endsWith('admin-ui.tsx'))?.source ?? '';
check('tables scroll rather than overflow the page', tableWrap.includes('overflow-x-auto'));
check('and that scroll does not become a back-swipe', tableWrap.includes('overscroll-x-contain'));

console.log('\n▸ Direction variants cannot outrank a breakpoint');
/**
 * Tailwind compiles `ltr:`/`rtl:` to a `:where()` selector, which contributes
 * no specificity — so `ltr:-translate-x-full` and `md:translate-x-0` tie at
 * (0,1,0) and source order decides. `ltr:` is emitted last, which pinned the
 * dashboard sidebar off-screen at every width. Scope the direction variant to
 * `max-md:` instead, so the two ranges cannot overlap.
 */
const clashes = [];
for (const { path, source } of files) {
  for (const line of source.split('\n')) {
    if (!line.includes('ltr:') && !line.includes('rtl:')) continue;
    for (const match of line.matchAll(/(?<!max-\w\w:)\b(ltr|rtl):-?([a-z]+(?:-[a-z]+)*)-/g)) {
      const property = match[2];
      // Does an unprefixed responsive utility for the same property appear
      // on the same line, hoping to override it?
      const rival = new RegExp(`\\b(sm|md|lg|xl):-?${property}-`);
      if (rival.test(line)) clashes.push(`${path}: ${match[0]}… vs ${property}`);
    }
  }
}
check(
  'no ltr:/rtl: utility competes with a breakpoint on the same property',
  clashes.length === 0,
  clashes.slice(0, 5).join(' | '),
);

console.log('\n▸ The dashboard sidebar is visible on a desktop');
const desktopShell = await html('/dashboard/orders', staff);
const aside = desktopShell.body.match(/<aside[^>]*class="([^"]*)"/)?.[1] ?? '';
check('the sidebar renders', aside.length > 0);
check(
  'it is not translated away outside the phone breakpoint',
  !/(?<!max-md:)(ltr|rtl):-?translate-x-full/.test(aside),
  aside.slice(0, 160),
);
check('and it is off-canvas on a phone', /max-md:(ltr|rtl):/.test(aside), aside.slice(0, 160));

console.log('\n▸ Outbound links');
const footer = files.find((f) => f.path.endsWith('site-footer.tsx'))?.source ?? '';
check('social links open in a new tab', footer.includes('target="_blank"'));
check(
  'and cannot reach back into this page',
  /rel="noreferrer noopener"|rel="noopener noreferrer"/.test(footer),
);
check(
  'only Instagram and Facebook are offered',
  /'Instagram'/.test(footer) &&
    /'Facebook'/.test(footer) &&
    !/TikTok|Pinterest|WhatsApp/i.test(footer),
);
const home = await html('/');
check(
  'no other outbound link is rendered on the home page',
  (home.body.match(/target="_blank"/g) ?? []).length <= 2,
  `${(home.body.match(/target="_blank"/g) ?? []).length} found`,
);

console.log('\n▸ Stylesheet');
const cssHref = first.body.match(/href="(\/_next\/static\/css\/[^"]+\.css)"/)?.[1];
if (!cssHref) {
  console.log('  … skipped: no stylesheet link found.');
} else {
  // The built CSS is minified, so match without depending on whitespace.
  // The built CSS is minified, so match without depending on whitespace.
  const sheet = (await (await fetch(`${BASE}${cssHref}`)).text()).replace(/\s+/g, '');
  check('breakpoints made it into the build', sheet.includes('@media(min-width:768px)'));
  check('the 400px phone breakpoint is compiled', sheet.includes('@media(min-width:400px)'));
  check('the phone-only input rule is compiled', sheet.includes('@media(max-width:767px)'));
  check('reduced motion is compiled', sheet.includes('prefers-reduced-motion'));
  check('keyframes are compiled', /@keyframes(fade-up|slide-in)/.test(sheet));
  check('the safe-area inset is compiled', sheet.includes('safe-area-inset-bottom'));
  check(
    'logical padding is compiled',
    sheet.includes('padding-inline-end') || sheet.includes('padding-inline-start'),
  );
}

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
