/**
 * Order lifecycle checks — the money path, end to end.
 *
 *   npm run orders
 *
 * Runs against the database directly (no server needed) using the same
 * libraries the checkout and dashboard call. Everything it creates is removed
 * at the end, and it refuses to touch orders it did not create itself.
 */
import './load-env.ts';
import { prisma } from '../src/lib/prisma.ts';
import { createOrder, applyOrderEdit } from '../src/lib/orders.ts';
import { findOrdersForEmail } from '../src/lib/order-lookup.ts';
import { calculateShipping, validatePromoCode, getFreeShipping } from '../src/lib/commerce.ts';

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

const EMAIL = 'order-check@luwjje.test';
const created = [];
const promoCodes = [];

const shipping = {
  fullName: 'Order Check',
  email: EMAIL,
  phone: '01000000000',
  street: '1 Test Street',
  area: 'Zamalek',
  governorate: 'Cairo',
  notes: '',
};

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { email: EMAIL } } });
  await prisma.order.deleteMany({ where: { email: EMAIL } });
  if (promoCodes.length) {
    await prisma.promoCode.deleteMany({ where: { code: { in: promoCodes } } });
  }
}

await cleanup(); // in case a previous run died mid-way

const variant = await prisma.productVariant.findFirst({
  where: { stock: { gte: 4 }, product: { status: 'PUBLISHED' } },
  include: { product: true },
});

if (!variant) {
  console.log('\nNo variant with enough stock to test against. Seed the catalogue first.\n');
  await prisma.$disconnect();
  process.exit(1);
}

const startStock = variant.stock;
const startSold = variant.product.soldCount;

// ---------------------------------------------------------------- placing
console.log('\n▸ Placing an order');
const placed = await createOrder({ shipping, items: [{ variantId: variant.id, quantity: 2 }] });
check('order accepted', placed.ok, placed.error);
check('an order number came back', /^[A-Z0-9-]{6,}$/.test(placed.orderNumber ?? ''), placed.orderNumber);
if (placed.orderNumber) created.push(placed.orderNumber);

const order = await prisma.order.findUnique({
  where: { orderNumber: placed.orderNumber },
  include: { items: true },
});
check('the order was written with its line', order?.items.length === 1);
check('quantity stored as sent', order?.items[0]?.quantity === 2, order?.items[0]?.quantity);
check(
  'unit price taken from the catalogue',
  order?.items[0]?.unitPrice === variant.product.price,
  `${order?.items[0]?.unitPrice} vs ${variant.product.price}`,
);

const expectedShipping = await calculateShipping('Cairo', variant.product.price * 2);
check(
  'subtotal = price × quantity',
  order?.subtotal === Math.round(variant.product.price * 2 * 100) / 100,
  order?.subtotal,
);
check('delivery charged at the governorate rate', order?.shippingCost === expectedShipping.cost, order?.shippingCost);
check(
  'total = subtotal + delivery − discount',
  order?.total === Math.round((order.subtotal + order.shippingCost - order.discount) * 100) / 100,
  order?.total,
);
check('the buyer name and address were kept', order?.fullName === shipping.fullName && order?.street === shipping.street);
check('a fresh order is marked paid', order?.status === 'PAID' && order?.paymentStatus === 'PAID', order?.status);

// ---------------------------------------------------------------- stock
console.log('\n▸ Stock and sales counters');
let after = await prisma.productVariant.findUnique({
  where: { id: variant.id },
  include: { product: true },
});
check('stock went down by the quantity sold', after.stock === startStock - 2, `${startStock} → ${after.stock}`);
check('the sold counter went up', after.product.soldCount === startSold + 2, after.product.soldCount);

// ---------------------------------------------------------------- overselling
console.log('\n▸ Overselling');
const oversell = await createOrder({
  shipping,
  items: [{ variantId: variant.id, quantity: after.stock + 50 }],
});
check('an order beyond stock is refused', !oversell.ok, oversell.orderNumber);
check(
  'refusing it did not move stock',
  (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock === after.stock,
);

const empty = await createOrder({ shipping, items: [] });
check('an empty bag is refused', !empty.ok);

const ghost = await createOrder({ shipping, items: [{ variantId: 'nope', quantity: 1 }] });
check('an unknown variant is refused', !ghost.ok);

const arabic = await createOrder({ shipping, items: [], locale: 'ar' });
check('the refusal is in Arabic for an Arabic shopper', /[؀-ۿ]/.test(arabic.error ?? ''), arabic.error);

// ---------------------------------------------------------------- draft products
console.log('\n▸ Unpublished stock is not for sale');
const draft = await prisma.productVariant.findFirst({
  where: { stock: { gt: 0 }, product: { status: { not: 'PUBLISHED' } } },
});
if (draft) {
  const hidden = await createOrder({ shipping, items: [{ variantId: draft.id, quantity: 1 }] });
  check('a draft product cannot be bought', !hidden.ok, hidden.orderNumber);
} else {
  console.log('  … skipped: every product is published.');
}

// ---------------------------------------------------------------- promo codes
console.log('\n▸ Promo codes');
const subtotal = variant.product.price;
const pct = `OCHK${Date.now().toString(36).toUpperCase().slice(-5)}`;
promoCodes.push(pct);
await prisma.promoCode.create({
  data: {
    code: pct,
    discountType: 'PERCENT',
    discountValue: 10,
    minOrder: 0,
    active: true,
  },
});
const applied = await validatePromoCode(pct, subtotal, 'en');
check('a percentage code discounts correctly', applied.ok && applied.discount === Math.round(subtotal * 10) / 100, applied.discount);

const withPromo = await createOrder({
  shipping,
  items: [{ variantId: variant.id, quantity: 1 }],
  promoCode: pct,
});
check('an order with a code is accepted', withPromo.ok, withPromo.error);
if (withPromo.orderNumber) created.push(withPromo.orderNumber);
const promoOrder = await prisma.order.findUnique({ where: { orderNumber: withPromo.orderNumber } });
check('the discount is stored on the order', promoOrder?.discount === applied.discount, promoOrder?.discount);
check('the code is recorded on the order', promoOrder?.promoCode === pct, promoOrder?.promoCode);
check(
  'the redemption count went up',
  (await prisma.promoCode.findUnique({ where: { code: pct } })).usedCount === 1,
);

const inactive = `OCHKOFF${Date.now().toString(36).toUpperCase().slice(-4)}`;
promoCodes.push(inactive);
await prisma.promoCode.create({
  data: { code: inactive, discountType: 'FIXED', discountValue: 50, minOrder: 0, active: false },
});
check('a switched-off code is refused', !(await validatePromoCode(inactive, subtotal, 'en')).ok);
check('an invented code is refused', !(await validatePromoCode('NO-SUCH-CODE', subtotal, 'en')).ok);

const highMin = `OCHKMIN${Date.now().toString(36).toUpperCase().slice(-4)}`;
promoCodes.push(highMin);
await prisma.promoCode.create({
  data: {
    code: highMin,
    discountType: 'FIXED',
    discountValue: 50,
    minOrder: subtotal * 100,
    active: true,
  },
});
check('a code below its minimum spend is refused', !(await validatePromoCode(highMin, subtotal, 'en')).ok);

// A fixed discount larger than the basket must not produce a negative total.
const bigOff = `OCHKBIG${Date.now().toString(36).toUpperCase().slice(-4)}`;
promoCodes.push(bigOff);
await prisma.promoCode.create({
  data: {
    code: bigOff,
    discountType: 'FIXED',
    discountValue: subtotal * 100,
    minOrder: 0,
    active: true,
  },
});
const freebie = await createOrder({
  shipping,
  items: [{ variantId: variant.id, quantity: 1 }],
  promoCode: bigOff,
});
if (freebie.orderNumber) created.push(freebie.orderNumber);
const freeOrder = await prisma.order.findUnique({ where: { orderNumber: freebie.orderNumber } });
check('an oversized discount never makes the total negative', (freeOrder?.total ?? -1) >= 0, freeOrder?.total);

// ---------------------------------------------------------------- shipping by governorate
console.log('\n▸ Delivery by governorate');
const zones = await prisma.governorate.findMany({ where: { active: true }, take: 3 });
for (const zone of zones) {
  const calc = await calculateShipping(zone.name, 1);
  check(`${zone.name} charges its own rate`, calc.cost === zone.shippingCost, `${calc.cost} vs ${zone.shippingCost}`);
}
if (zones[0]) {
  const free = await calculateShipping(zones[0].name, 10_000_000);
  check('a large enough basket ships free', free.cost === 0 && free.free, free.cost);
  const byArabicName = await calculateShipping(zones[0].nameAr || zones[0].name, 1);
  check('the Arabic governorate name resolves too', byArabicName.cost === zones[0].shippingCost, byArabicName.cost);
}

// ---------------------------------------------------------------- free shipping
console.log('\n▸ Free delivery rules');
const previousRules = await prisma.freeShippingRule.findMany();
await prisma.freeShippingRule.deleteMany({});

const cheap = variant.product.price;

check('with no rules, delivery is charged', !(await getFreeShipping(cheap * 100)).free);

// A spend threshold.
const overRule = await prisma.freeShippingRule.create({
  data: { name: 'over', minOrder: cheap * 2, active: true },
});
check('below the threshold still pays', !(await getFreeShipping(cheap)).free);
check('at the threshold is free', (await getFreeShipping(cheap * 2)).free);
check('above the threshold is free', (await getFreeShipping(cheap * 5)).free);
check(
  'the meter counts towards the threshold',
  (await getFreeShipping(cheap)).nextThreshold === cheap * 2,
  (await getFreeShipping(cheap)).nextThreshold,
);

// Switching a rule off must actually stop it.
await prisma.freeShippingRule.update({ where: { id: overRule.id }, data: { active: false } });
check('an inactive rule does not apply', !(await getFreeShipping(cheap * 5)).free);
await prisma.freeShippingRule.update({ where: { id: overRule.id }, data: { active: true } });

// A date window.
const past = await prisma.freeShippingRule.create({
  data: {
    name: 'finished',
    startsAt: new Date(Date.now() - 20 * 86400000),
    endsAt: new Date(Date.now() - 10 * 86400000),
    active: true,
  },
});
check('a finished campaign does not apply', !(await getFreeShipping(0)).free);

const future = await prisma.freeShippingRule.create({
  data: { name: 'upcoming', startsAt: new Date(Date.now() + 86400000), active: true },
});
check('a campaign that has not started does not apply', !(await getFreeShipping(0)).free);

const now = await prisma.freeShippingRule.create({
  data: {
    name: 'running',
    startsAt: new Date(Date.now() - 86400000),
    endsAt: new Date(Date.now() + 86400000),
    active: true,
  },
});
check('a running campaign makes any basket free', (await getFreeShipping(0)).free);
check('even an empty one', (await getFreeShipping(0)).free);

// Rules stack: the campaign wins even though the spend rule is unmet.
check('rules add up rather than override', (await getFreeShipping(1)).free);

await prisma.freeShippingRule.deleteMany({
  where: { id: { in: [overRule.id, past.id, future.id, now.id] } },
});

// And it reaches the actual delivery price.
const noRules = await calculateShipping('Cairo', cheap);
check('with no rule the governorate rate is charged', noRules.cost > 0, noRules.cost);
const always = await prisma.freeShippingRule.create({ data: { name: 'all', active: true } });
const waived = await calculateShipping('Cairo', cheap);
check('a live rule waives the governorate rate', waived.cost === 0 && waived.free);
await prisma.freeShippingRule.delete({ where: { id: always.id } });

for (const rule of previousRules) {
  await prisma.freeShippingRule.create({ data: rule });
}
check(
  'the rules table was restored',
  (await prisma.freeShippingRule.count()) === previousRules.length,
);

// ---------------------------------------------------------------- lookup
console.log('\n▸ Order lookup by email');
const found = await findOrdersForEmail({ email: EMAIL });
check('the buyer finds their own orders', found.ok && found.orders.length === created.length, found.orders?.length);
check(
  'each result carries what the customer needs',
  found.ok && found.orders.every((o) => o.orderNumber && o.total >= 0 && o.status),
);
const upper = await findOrdersForEmail({ email: EMAIL.toUpperCase() });
check('the email match ignores capitals', upper.ok && upper.orders.length === created.length, upper.orders?.length);
const stranger = await findOrdersForEmail({ email: 'someone-else@luwjje.test' });
check('a stranger sees nothing', !stranger.ok || stranger.orders.length === 0, stranger.orders?.length);
const nonsense = await findOrdersForEmail({ email: 'not-an-email' });
check('an invalid email is rejected', !nonsense.ok);

// ---------------------------------------------------------------- status changes
console.log('\n▸ Status changes from the dashboard');
const target = await prisma.order.findUnique({
  where: { orderNumber: created[0] },
  include: { items: true },
});
const stockBeforeCancel = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;

// Mirrors `updateOrderStatus`: cancelling returns stock, reinstating takes it.
async function setStatus(id, status) {
  const current = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  await prisma.$transaction(async (tx) => {
    const delta =
      status === 'CANCELLED' && current.status !== 'CANCELLED'
        ? 1
        : status !== 'CANCELLED' && current.status === 'CANCELLED'
        ? -1
        : 0;
    if (delta !== 0) {
      for (const item of current.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: delta * item.quantity } },
          });
        }
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { soldCount: { increment: -delta * item.quantity } },
          });
        }
      }
    }
    await tx.order.update({ where: { id }, data: { status } });
  });
}

for (const status of ['SHIPPED', 'DELIVERED']) {
  await setStatus(target.id, status);
  const now = await prisma.order.findUnique({ where: { id: target.id } });
  check(`status moves to ${status}`, now.status === status, now.status);
}
check(
  'moving through shipped/delivered leaves stock alone',
  (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock === stockBeforeCancel,
);

await setStatus(target.id, 'CANCELLED');
const cancelledStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
check(
  'cancelling puts the stock back',
  cancelledStock === stockBeforeCancel + target.items[0].quantity,
  `${stockBeforeCancel} → ${cancelledStock}`,
);

await setStatus(target.id, 'PAID');
check(
  'reinstating takes the stock out again',
  (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock === stockBeforeCancel,
);

// ---------------------------------------------------------------- concurrency
console.log('\n▸ Two shoppers, one last piece');
const last = await prisma.productVariant.findFirst({
  where: { product: { status: 'PUBLISHED' } },
  orderBy: { stock: 'desc' },
});
await prisma.productVariant.update({ where: { id: last.id }, data: { stock: 1 } });
const race = await Promise.all([
  createOrder({ shipping, items: [{ variantId: last.id, quantity: 1 }] }),
  createOrder({ shipping, items: [{ variantId: last.id, quantity: 1 }] }),
]);
for (const r of race) if (r.orderNumber) created.push(r.orderNumber);
const won = race.filter((r) => r.ok).length;
check('exactly one of them gets it', won === 1, `${won} succeeded`);
const leftover = (await prisma.productVariant.findUnique({ where: { id: last.id } })).stock;
check('stock never goes below zero', leftover >= 0, leftover);

// ---------------------------------------------------------------- totals the dashboard reports
console.log('\n▸ Revenue arithmetic');
const revenue = await prisma.order.aggregate({
  where: { email: EMAIL, status: { not: 'CANCELLED' } },
  _sum: { total: true },
});
const manual = (
  await prisma.order.findMany({ where: { email: EMAIL, status: { not: 'CANCELLED' } } })
).reduce((s, o) => s + o.total, 0);
check(
  'summed revenue matches the individual orders',
  Math.abs((revenue._sum.total ?? 0) - manual) < 0.01,
  `${revenue._sum.total} vs ${manual}`,
);

// ---------------------------------------------------------------- editing
console.log('\n▸ Editing a placed order');
await cleanup();
await createOrder({ shipping, items: [{ variantId: variant.id, quantity: 3 }] });

let edited = await prisma.order.findFirst({ where: { email: EMAIL }, include: { items: true } });
const editLine = edited.items[0];
const shelf = async () =>
  (await prisma.productVariant.findUnique({ where: { id: variant.id } })).stock;
const atPlacing = await shelf();

const edit = {
  fullName: shipping.fullName,
  phone: shipping.phone,
  street: shipping.street,
  area: shipping.area,
  governorate: shipping.governorate,
  notes: '',
  status: 'PAID',
  paymentStatus: 'PAID',
};

let edit1 = await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: editLine.id, quantity: 1, unitPrice: editLine.unitPrice }],
  shippingCost: edited.shippingCost,
  discount: 0,
  total: editLine.unitPrice + edited.shippingCost,
});
check('reducing a quantity is accepted', edit1.ok, edit1.error);
check('and the difference goes back on the shelf', (await shelf()) === atPlacing + 2, await shelf());

edited = await prisma.order.findUnique({ where: { id: edited.id }, include: { items: true } });
check('the line records the new quantity', edited.items[0].quantity === 1);
check('the subtotal is recomputed from the lines', edited.subtotal === editLine.unitPrice);

edit1 = await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: editLine.id, quantity: 4, unitPrice: editLine.unitPrice }],
  shippingCost: edited.shippingCost,
  discount: 0,
  total: 1,
});
check('raising a quantity takes more stock', (await shelf()) === atPlacing - 1, await shelf());

const spare = await shelf();
const overEdit = await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: editLine.id, quantity: 4 + spare + 5, unitPrice: editLine.unitPrice }],
  shippingCost: 0,
  discount: 0,
  total: 1,
});
check('an edit beyond stock is refused', !overEdit.ok);
check('the refusal says how many are left', /Only \d+ left/.test(overEdit.error ?? ''), overEdit.error);
check('and nothing moved', (await shelf()) === spare, await shelf());

await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: editLine.id, quantity: 4, unitPrice: 100 }],
  shippingCost: 25,
  discount: 10,
  total: 415,
});
edited = await prisma.order.findUnique({ where: { id: edited.id }, include: { items: true } });
check('an edited unit price is stored', edited.items[0].unitPrice === 100, edited.items[0].unitPrice);
check('the subtotal follows the new price', edited.subtotal === 400, edited.subtotal);
check('delivery is stored as entered', edited.shippingCost === 25);
check('the discount is stored as entered', edited.discount === 10);
check('the total is stored as entered', edited.total === 415, edited.total);

// The total is the shop owner's to set, even against the arithmetic.
await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: editLine.id, quantity: 4, unitPrice: 100 }],
  shippingCost: 25,
  discount: 10,
  total: 300,
});
edited = await prisma.order.findUnique({ where: { id: edited.id } });
check('an agreed total overrides the arithmetic', edited.total === 300, edited.total);

await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  fullName: 'Someone Else',
  governorate: 'Giza',
  notes: 'Leave with the doorman',
  lines: [{ id: editLine.id, quantity: 4, unitPrice: 100 }],
  shippingCost: 25,
  discount: 10,
  total: 415,
});
edited = await prisma.order.findUnique({ where: { id: edited.id } });
check('the delivery details are updated', edited.fullName === 'Someone Else' && edited.governorate === 'Giza');
check('the notes are updated', edited.notes === 'Leave with the doorman');

const beforeCancel = await shelf();
const cancelled = await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  status: 'CANCELLED',
  lines: [{ id: editLine.id, quantity: 4, unitPrice: 100 }],
  shippingCost: 25,
  discount: 10,
  total: 415,
});
check('cancelling from the editor is accepted', cancelled.ok, cancelled.error);
check('and returns the whole order to stock', (await shelf()) === beforeCancel + 4, await shelf());

// A line taken to zero leaves the order.
await cleanup();
await createOrder({ shipping, items: [{ variantId: variant.id, quantity: 2 }] });
edited = await prisma.order.findFirst({ where: { email: EMAIL }, include: { items: true } });
const beforeRemoval = await shelf();
await applyOrderEdit({
  ...edit,
  orderId: edited.id,
  lines: [{ id: edited.items[0].id, quantity: 0, unitPrice: edited.items[0].unitPrice }],
  shippingCost: 0,
  discount: 0,
  total: 0,
});
edited = await prisma.order.findUnique({ where: { id: edited.id }, include: { items: true } });
check('a line taken to zero is removed', edited.items.length === 0, edited.items.length);
check('and its stock comes back', (await shelf()) === beforeRemoval + 2, await shelf());

// An order cannot be edited using another order's line.
await cleanup();
await createOrder({ shipping, items: [{ variantId: variant.id, quantity: 1 }] });
const mine = await prisma.order.findFirst({ where: { email: EMAIL }, include: { items: true } });
const foreign = await prisma.orderItem.findFirst({ where: { orderId: { not: mine.id } } });
if (foreign) {
  const stolen = await applyOrderEdit({
    ...edit,
    orderId: mine.id,
    lines: [{ id: foreign.id, quantity: 1, unitPrice: 1 }],
    shippingCost: 0,
    discount: 0,
    total: 1,
  });
  check('a line from another order is refused', !stolen.ok);
}
await cleanup();

// ---------------------------------------------------------------- tidy up
await prisma.productVariant.update({ where: { id: last.id }, data: { stock: 25 } });
await cleanup();
const leftovers = await prisma.order.count({ where: { email: EMAIL } });
check('the test cleaned up after itself', leftovers === 0, leftovers);

console.log(`\n${fail === 0 ? '✓' : '✗'} ${pass} passed, ${fail} failed\n`);
await prisma.$disconnect();
process.exitCode = fail ? 1 : 0;
