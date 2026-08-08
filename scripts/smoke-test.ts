/**
 * End-to-end check of the commerce core against the real database.
 *
 *   npm run smoke
 *
 * Exercises the same functions the storefront calls — pricing, promo
 * validation, shipping zones, and the order transaction — then asserts that
 * stock, sold counts and promo usage all moved correctly. Cleans up after
 * itself, so it is safe to run against a seeded dev database.
 */
import './load-env';
import { prisma } from '../src/lib/prisma';
import { resolveCartLines, validatePromoCode, calculateShipping } from '../src/lib/commerce';
import { createOrder } from '../src/lib/orders';
import { getOverviewStats, getRevenueSeries, getLowStockVariants } from '../src/lib/analytics';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ''}`);
  }
}

async function main() {
  console.log('\n▸ Catalogue');
  const variant = await prisma.productVariant.findFirst({
    where: { product: { slug: 'the-classic-snood' }, stock: { gt: 5 } },
    include: { product: true },
  });
  if (!variant) throw new Error('Seed the database first: npm run db:seed');

  check('product resolves with stock', variant.stock > 0, variant.stock);

  console.log('\n▸ Pricing');
  const lines = await resolveCartLines([{ variantId: variant.id, quantity: 2 }]);
  check('cart line resolves', lines.length === 1);
  check('unit price comes from the database', lines[0]?.unitPrice === variant.product.price, lines[0]?.unitPrice);

  const overQty = await resolveCartLines([{ variantId: variant.id, quantity: 99 }]);
  check('quantity is clamped to stock', overQty[0]?.quantity === Math.min(99, variant.stock), overQty[0]?.quantity);
  check('clamping raises a notice', Boolean(overQty[0]?.notice));

  const gone = await resolveCartLines([{ variantId: 'nonexistent-variant', quantity: 1 }]);
  check('unknown variant is dropped', gone.length === 0);

  console.log('\n▸ Promo codes');
  const good = await validatePromoCode('WELCOME10', 200);
  check('valid code applies', good.ok && good.discount === 20, good);

  const unknown = await validatePromoCode('DEFINITELY-NOT-A-CODE', 200);
  check('unknown code rejected', !unknown.ok);

  const belowMin = await validatePromoCode('SNOOD25', 50);
  check('minimum spend enforced', !belowMin.ok, belowMin.message);

  const aboveMin = await validatePromoCode('SNOOD25', 250);
  check('fixed discount applies above minimum', aboveMin.ok && aboveMin.discount === 25, aboveMin);

  const disabled = await validatePromoCode('ARCHIVE15', 500);
  check('disabled code rejected', !disabled.ok);

  console.log('\n▸ Shipping');
  const eg = await calculateShipping('Egypt', 50);
  check('zone rate applied', eg.cost === 5 && eg.zoneName === 'Egypt', eg);

  const egFree = await calculateShipping('Egypt', 120);
  check('zone free-shipping threshold applied', egFree.free && egFree.cost === 0, egFree);

  const us = await calculateShipping('United States', 100);
  check('different zone, different rate', us.cost === 22, us);

  const unknownRegion = await calculateShipping('Atlantis', 10);
  check('unknown region falls back to the global rate', unknownRegion.zoneName === 'Standard', unknownRegion);

  console.log('\n▸ Order transaction');
  const before = {
    stock: variant.stock,
    sold: variant.product.soldCount,
    promoUses: (await prisma.promoCode.findUniqueOrThrow({ where: { code: 'WELCOME10' } })).usedCount,
    orders: await prisma.order.count(),
  };

  const result = await createOrder({
    shipping: {
      fullName: 'Smoke Test',
      email: 'smoke-test@luwjje.local',
      phone: '+20 100 000 0000',
      street: '1 Test Lane',
      city: 'Cairo',
      region: 'Egypt',
      postalCode: '11511',
      notes: '',
    },
    items: [{ variantId: variant.id, quantity: 2 }],
    promoCode: 'WELCOME10',
  });

  check('order created', result.ok, result.error);
  if (!result.ok) throw new Error(result.error);

  const order = await prisma.order.findUniqueOrThrow({
    where: { orderNumber: result.orderNumber! },
    include: { items: true },
  });

  const price = variant.product.price;
  check('subtotal recomputed server-side', order.subtotal === price * 2, order.subtotal);
  check('free shipping applied (Egypt, >$80)', order.shippingCost === 0, order.shippingCost);
  check('promo discount applied', order.discount === Math.round(price * 2 * 0.1 * 100) / 100, order.discount);
  check('total = subtotal + shipping − discount', order.total === order.subtotal + order.shippingCost - order.discount, order.total);
  check('line item snapshot stored', order.items[0]?.name === variant.product.name);

  const afterVariant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  const afterProduct = await prisma.product.findUniqueOrThrow({ where: { id: variant.productId } });
  const afterPromo = await prisma.promoCode.findUniqueOrThrow({ where: { code: 'WELCOME10' } });

  check('stock decremented by 2', afterVariant.stock === before.stock - 2, afterVariant.stock);
  check('sold count incremented by 2', afterProduct.soldCount === before.sold + 2, afterProduct.soldCount);
  check('promo usage incremented', afterPromo.usedCount === before.promoUses + 1, afterPromo.usedCount);
  check('order count incremented', (await prisma.order.count()) === before.orders + 1);

  console.log('\n▸ Oversell protection');
  const oversell = await createOrder({
    shipping: {
      fullName: 'Smoke Test',
      email: 'smoke-test@luwjje.local',
      phone: '+20 100 000 0000',
      street: '1 Test Lane',
      city: 'Cairo',
      region: 'Egypt',
      postalCode: '11511',
      notes: '',
    },
    items: [{ variantId: variant.id, quantity: afterVariant.stock + 50 }],
  });
  check('cannot order beyond stock', !oversell.ok, oversell.error);

  const stockUnchanged = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  check('failed order left stock untouched', stockUnchanged.stock === afterVariant.stock, stockUnchanged.stock);

  console.log('\n▸ Dashboard analytics');
  const stats = await getOverviewStats(30);
  check('sales figure computed', stats.sales > 0, stats.sales);
  check('conversion rate computed', stats.conversion > 0, stats.conversion);
  check('inventory level is a percentage', stats.inventoryLevel >= 0 && stats.inventoryLevel <= 100, stats.inventoryLevel);

  const series = await getRevenueSeries(30);
  check('revenue series is gap-filled to 30 points', series.length === 30, series.length);

  const lowStock = await getLowStockVariants(5);
  check('low-stock query runs', Array.isArray(lowStock));

  console.log('\n▸ Cleanup');
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: before.stock } });
  await prisma.product.update({ where: { id: variant.productId }, data: { soldCount: before.sold } });
  await prisma.promoCode.update({ where: { code: 'WELCOME10' }, data: { usedCount: before.promoUses } });
  check('test order removed and counters restored', true);

  console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('\n✗ Smoke test crashed:\n', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
