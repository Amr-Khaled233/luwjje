/**
 * Verifies the Arabic/English storefront, EGP pricing, Egyptian governorates
 * and the dashboard-controlled filters against a running server.
 *
 *   npm run build && npm start   # in one terminal
 *   npm run features             # in another
 *
 * Mutates and restores a few rows, so point it at a dev database.
 */
const BASE = process.env.FEATURES_BASE ?? 'http://localhost:3000';
const AR = { cookie: 'luwjje_locale=ar' };
const EN = { cookie: 'luwjje_locale=en' };

let pass = 0, fail = 0;
const check = (l, ok, d) => {
  if (ok) { pass++; console.log(`  ✓ ${l}`); }
  else { fail++; console.log(`  ✗ ${l}${d !== undefined ? ` — ${String(d).slice(0, 180)}` : ''}`); }
};
const raw = (p, h) => fetch(`${BASE}${p}`, { headers: h, cache: 'no-store' }).then((r) => r.text());

/**
 * Rendered markup only. Next inlines the whole RSC flight payload — including
 * the dictionary — inside <script> tags, so asserting on the raw response
 * matches strings that were never painted.
 */
const SCRIPT_TAGS = new RegExp('<script[\\s\\S]*?</script>', 'g');
const html = async (p, h) => (await raw(p, h)).replace(SCRIPT_TAGS, '');

console.log('\n▸ Language switching');
const en = await html('/', EN);
const ar = await html('/', AR);
check('English renders dir="ltr"', en.includes('dir="ltr"'));
check('Arabic renders dir="rtl"', ar.includes('dir="rtl"'));
check('Arabic sets lang="ar"', ar.includes('lang="ar"'));
check('English nav is English', en.includes('>Shop<'));
check('Arabic nav is Arabic', ar.includes('المتجر'), ar.match(/>[^<]{0,20}المتجر/)?.[0]);
check('Arabic best-sellers heading translated', ar.includes('الأكثر مبيعاً'));
check('English best-sellers heading', en.includes('Best Sellers'));

console.log('\n▸ Bilingual product content');
const pEn = await html('/product/the-classic-snood', EN);
const pAr = await html('/product/the-classic-snood', AR);
check('English product name', pEn.includes('The Classic Snood'));
check('Arabic product name', pAr.includes('سنود كلاسيك'));
check('Arabic colourway name', pAr.includes('رمادي فحمي'));
check('Arabic Add-to-bag label', pAr.includes('أضِف إلى الحقيبة'));
check('Arabic accordion titles', pAr.includes('الخامة والمقاسات') && pAr.includes('العناية'));

console.log('\n▸ Currency');
check('English price in EGP', /EGP\s?1,250/.test(pEn), pEn.match(/EGP[^<]{0,12}/)?.[0]);
check('Arabic price uses ج.م', pAr.includes('ج.م'));
check('no dollar prices remain', !/\$\s?\d/.test(pEn), pEn.match(/\$\s?\d[^<]{0,10}/)?.[0]);

console.log('\n▸ Sort by has one "Best Selling"');
const shop = await html('/shop', EN);
const SORT_OPTION = new RegExp('<option[^>]*>Best Selling</option>', 'g');
const sortOptions = shop.match(SORT_OPTION) ?? [];
check('exactly one Best Selling option', sortOptions.length === 1, `found ${sortOptions.length}`);

console.log('\n▸ Governorates at checkout');
// CartView renders a spinner until it hydrates, so the option list lives in
// the serialised props rather than the SSR markup — read the raw response.
const cart = await raw('/cart', EN);
const cartAr = await raw('/cart', AR);
const GOV_COUNT = new RegExp('shippingCost', 'g');
check('Cairo offered', cart.includes('Cairo'));
check('Aswan offered', cart.includes('Aswan'));
check(
  'all 27 governorates passed to the form',
  (cart.match(GOV_COUNT) ?? []).length === 27,
  (cart.match(GOV_COUNT) ?? []).length,
);
check('Arabic governorate names', cartAr.includes('القاهرة') && cartAr.includes('أسوان'));
check('no postal code anywhere', !/postalCode/.test(cart));
check('area field offered instead', /Area/.test(cart));

console.log('\n▸ Order tracking is email-only');
const track = await html('/orders', EN);
check('asks for email', track.includes('Track an Order') && /name="email"/.test(track));
check('does not ask for an order number', !/name="orderNumber"/.test(track));

console.log('\n▸ Filters are dashboard-driven');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

check('colour filter present by default', shop.includes('Colour'));
await prisma.siteSettings.update({ where: { id: 'singleton' }, data: { showColorFilter: false } });
const noColour = await html('/shop', EN);
check('switching the colour filter off removes it', !noColour.includes('>Colour<'));
await prisma.siteSettings.update({ where: { id: 'singleton' }, data: { showColorFilter: true } });

const beige = await prisma.filterColor.findFirst({ where: { name: 'Beige' } });
if (beige) {
  check('Beige offered in the filter', (await html('/shop', EN)).includes('>Beige<'));
  await prisma.filterColor.update({ where: { id: beige.id }, data: { visible: false } });
  check('hiding a colour removes just that option', !(await html('/shop', EN)).includes('>Beige<'));
  await prisma.filterColor.update({ where: { id: beige.id }, data: { visible: true } });
}

const knit = await prisma.category.findFirst({ where: { name: 'Knitwear' } });
if (knit) {
  check('Knitwear in the category filter', (await html('/shop', EN)).includes('>Knitwear<'));
  await prisma.category.update({ where: { id: knit.id }, data: { visible: false } });
  const hidden = await html('/shop', EN);
  check('hiding a category removes it from the filter', !hidden.includes('>Knitwear<'));
  check('its products still sell', hidden.includes('/product/the-classic-snood'));
  await prisma.category.update({ where: { id: knit.id }, data: { visible: true } });
}

console.log('\n▸ Per-governorate delivery price');
const cairo = await prisma.governorate.findFirstOrThrow({ where: { name: 'Cairo' } });
const variant = await prisma.productVariant.findFirstOrThrow({ where: { stock: { gt: 0 } } });
const price = async (gov) =>
  (await (await fetch(`${BASE}/api/cart/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ variantId: variant.id, quantity: 1 }], governorate: gov }),
  })).json()).shipping;

check('Cairo charges its own rate', (await price('Cairo')).cost === cairo.shippingCost,
  JSON.stringify(await price('Cairo')));
await prisma.governorate.update({ where: { id: cairo.id }, data: { shippingCost: 999 } });
check('editing the rate re-prices the cart', (await price('Cairo')).cost === 999);
await prisma.governorate.update({ where: { id: cairo.id }, data: { shippingCost: cairo.shippingCost } });

console.log('\n▸ Best sellers are exactly what is curated');
const before = await prisma.product.findMany({ where: { isBestSeller: true }, select: { id: true, bestSellerOrder: true } });
await prisma.product.updateMany({ where: { isBestSeller: true }, data: { isBestSeller: false, bestSellerOrder: 0 } });
const only = await prisma.product.findFirstOrThrow({ where: { slug: 'silk-pocket-square' } });
await prisma.product.update({ where: { id: only.id }, data: { isBestSeller: true, bestSellerOrder: 1 } });
const curated = await html('/', EN);
check('the one starred product shows', curated.includes('/product/silk-pocket-square'));
check('nothing else is padded in', !curated.includes('/product/the-classic-snood'));
await prisma.product.update({ where: { id: only.id }, data: { isBestSeller: false, bestSellerOrder: 0 } });
for (const b of before) {
  await prisma.product.update({ where: { id: b.id }, data: { isBestSeller: true, bestSellerOrder: b.bestSellerOrder } });
}

await prisma.$disconnect();
console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
process.exitCode = fail ? 1 : 0;
