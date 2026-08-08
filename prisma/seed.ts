import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureOutDir, makeProductImages, makeEditorial } from './placeholders';
import { subDays, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function orderNumber() {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `LW-${s}`;
}

function slugify(input: string) {
  return input.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
}

type SeedVariant = { colorName: string; colorHex: string; stock: number; sizes?: string[] };
type SeedProduct = {
  name: string;
  price: number;
  category: string;
  description: string;
  materialInfo: string;
  careInfo: string;
  bestSeller?: number; // 1-based position in Best Sellers
  variants: SeedVariant[];
};

const CATEGORIES = [
  { name: 'Knitwear', description: 'Wool, cashmere and merino, worked slowly.' },
  { name: 'Outerwear', description: 'Weight, drape and a long horizon.' },
  { name: 'Shirting', description: 'Cotton and linen, cut clean.' },
  { name: 'Trousers', description: 'Quiet tailoring for every day.' },
  { name: 'Footwear', description: 'Leather that earns its patina.' },
  { name: 'Accessories', description: 'The small, considered things.' },
  { name: 'Denim', description: 'Raw, selvedge, unhurried.' },
];

const PRODUCTS: SeedProduct[] = [
  {
    name: 'The Classic Snood',
    price: 85,
    category: 'Knitwear',
    bestSeller: 1,
    description:
      'A closed-loop scarf in brushed lambswool. Wide enough to sit as a collar, long enough to double. The Classic is our densest weave — the one we return to when the light goes flat in November.',
    materialInfo: '100% brushed lambswool. Woven in Yorkshire. 180 × 34 cm.',
    careInfo: 'Dry clean, or hand wash cold with wool detergent and dry flat. Do not wring.',
    variants: [
      { colorName: 'Dark Charcoal Grey', colorHex: '#3a3d42', stock: 42 },
      { colorName: 'Deep Navy', colorHex: '#213145', stock: 18 },
    ],
  },
  {
    name: 'The Essential Snood',
    price: 85,
    category: 'Knitwear',
    bestSeller: 2,
    description:
      'The Essential is the lightest of the four — a fine-gauge merino loop that folds to nothing in a coat pocket. Made for the shoulder seasons.',
    materialInfo: '100% extra-fine merino wool. 175 × 32 cm.',
    careInfo: 'Hand wash cold, dry flat, reshape while damp.',
    variants: [
      { colorName: 'Off-White', colorHex: '#efe9df', stock: 31 },
      { colorName: 'Beige', colorHex: '#d8cbb8', stock: 24 },
    ],
  },
  {
    name: 'The Everyday Snood',
    price: 85,
    category: 'Knitwear',
    bestSeller: 3,
    description:
      'Heather-spun yarn gives the Everyday its depth — grey that reads warm in daylight and cool under lamps. The most forgiving of the collection.',
    materialInfo: '80% lambswool, 20% nylon for durability. 178 × 33 cm.',
    careInfo: 'Hand wash cold or dry clean. Dry flat away from direct heat.',
    variants: [
      { colorName: 'Light Grey Heather', colorHex: '#c4c7c9', stock: 4 },
      { colorName: 'Stone', colorHex: '#b3ada4', stock: 12 },
    ],
  },
  {
    name: 'The Midnight Snood',
    price: 85,
    category: 'Knitwear',
    bestSeller: 4,
    description:
      'Solid black, undyed at the core and overdyed twice for depth. The Midnight is the formal one — it sits under a tailored coat without argument.',
    materialInfo: '100% brushed lambswool, double-dyed. 180 × 34 cm.',
    careInfo: 'Dry clean recommended. Wash separately if hand washing.',
    variants: [{ colorName: 'Solid Black', colorHex: '#0f1113', stock: 27 }],
  },
  {
    name: 'The Wool Overcoat',
    price: 450,
    category: 'Outerwear',
    description:
      'A single-breasted overcoat in double-faced Italian wool, unlined so the cloth can move. Drop shoulder, patch pockets, horn buttons. It is the last coat argument you will have.',
    materialInfo: '90% virgin wool, 10% cashmere. Milled in Biella, Italy. Horn buttons.',
    careInfo: 'Dry clean only. Brush after wear. Store on a broad wooden hanger.',
    variants: [
      { colorName: 'Camel', colorHex: '#b08d5f', stock: 8, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Charcoal', colorHex: '#42464b', stock: 11, sizes: ['S', 'M', 'L', 'XL'] },
    ],
  },
  {
    name: 'Essential Cotton Shirt',
    price: 120,
    category: 'Shirting',
    description:
      'Long-staple Egyptian cotton, garment-washed once so it arrives already soft. Relaxed through the body, clean at the placket, no chest pocket.',
    materialInfo: '100% Egyptian cotton poplin, 120gsm. Mother-of-pearl buttons.',
    careInfo: 'Machine wash cold, tumble dry low, warm iron.',
    variants: [
      { colorName: 'Optic White', colorHex: '#f5f3ee', stock: 34, sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { colorName: 'Pale Blue', colorHex: '#c3d2e4', stock: 21, sizes: ['XS', 'S', 'M', 'L', 'XL'] },
      { colorName: 'Sand', colorHex: '#ddd0bb', stock: 3, sizes: ['S', 'M', 'L'] },
    ],
  },
  {
    name: 'Classic Loafer',
    price: 290,
    category: 'Footwear',
    description:
      'Hand-lasted penny loafer on a leather sole, Blake-stitched so it can be resoled indefinitely. Vegetable-tanned calf that darkens where you walk.',
    materialInfo: 'Vegetable-tanned Italian calfskin, leather sole, Blake construction.',
    careInfo: 'Condition monthly with neutral cream. Use shoe trees. Rotate between wears.',
    variants: [
      { colorName: 'Chestnut', colorHex: '#7d4f2e', stock: 9, sizes: ['40', '41', '42', '43', '44', '45'] },
      { colorName: 'Black', colorHex: '#17181a', stock: 14, sizes: ['40', '41', '42', '43', '44', '45'] },
    ],
  },
  {
    name: 'Linen Trousers',
    price: 180,
    category: 'Trousers',
    description:
      'A wide, flat-front trouser in heavyweight Belgian linen. Deep pleat, no break. Creases on purpose — that is the point of linen.',
    materialInfo: '100% Belgian linen, 260gsm. Unlined. Button fly.',
    careInfo: 'Machine wash cold on gentle, line dry, press while slightly damp.',
    variants: [
      { colorName: 'Natural', colorHex: '#e2d9c8', stock: 17, sizes: ['28', '30', '32', '34', '36'] },
      { colorName: 'Olive', colorHex: '#6b6f52', stock: 6, sizes: ['30', '32', '34'] },
    ],
  },
  {
    name: 'Structured Tote',
    price: 350,
    category: 'Accessories',
    description:
      'An unlined tote in a single panel of bridle leather, folded and saddle-stitched at two seams. It stands on its own from the first day.',
    materialInfo: 'English bridle leather, saddle-stitched with waxed linen thread. 38 × 32 × 12 cm.',
    careInfo: 'Wipe with a dry cloth. Condition twice yearly. Avoid prolonged rain.',
    variants: [
      { colorName: 'Tan', colorHex: '#9a6b3f', stock: 7 },
      { colorName: 'Black', colorHex: '#1a1b1d', stock: 10 },
    ],
  },
  {
    name: 'Cashmere Crewneck',
    price: 220,
    category: 'Knitwear',
    description:
      'Two-ply Mongolian cashmere at a gauge heavy enough to wear alone. Ribbed at the neck, cuff and hem, with a slightly dropped shoulder.',
    materialInfo: '100% grade-A Mongolian cashmere, 2-ply, 12gg.',
    careInfo: 'Hand wash cold with cashmere shampoo. Dry flat. De-pill with a comb, not a razor.',
    variants: [
      { colorName: 'Oatmeal', colorHex: '#d9cfbc', stock: 15, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Slate', colorHex: '#5d646d', stock: 2, sizes: ['S', 'M', 'L'] },
      { colorName: 'Black', colorHex: '#141517', stock: 19, sizes: ['S', 'M', 'L', 'XL'] },
    ],
  },
  {
    name: 'Silk Pocket Square',
    price: 45,
    category: 'Accessories',
    description:
      'Hand-rolled silk twill, printed in a single muted tone with a hairline border. Forty centimetres square — enough body to hold a fold.',
    materialInfo: '100% silk twill, hand-rolled edges. 40 × 40 cm. Made in Como.',
    careInfo: 'Dry clean only. Store flat or loosely folded.',
    variants: [
      { colorName: 'Ivory', colorHex: '#f0ebe1', stock: 40 },
      { colorName: 'Petrol', colorHex: '#2c4a52', stock: 22 },
    ],
  },
  {
    name: 'Raw Denim Jean',
    price: 195,
    category: 'Denim',
    description:
      'Fourteen-ounce selvedge denim from Okayama, woven on shuttle looms and left entirely raw. Straight leg, mid rise, copper rivets. It will become yours within a year.',
    materialInfo: '14oz unsanforized selvedge denim. Made in Japan. Copper hardware.',
    careInfo: 'Wear six months before the first wash. Then cold soak inside out, hang dry.',
    variants: [
      { colorName: 'Indigo', colorHex: '#2f4058', stock: 23, sizes: ['28', '30', '32', '34', '36'] },
      { colorName: 'Washed Black', colorHex: '#2b2c30', stock: 5, sizes: ['30', '32', '34'] },
    ],
  },
];

async function main() {
  console.log('▸ Clearing existing data…');
  ensureOutDir();

  await prisma.pageView.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.discountProduct.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.paletteSwatch.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.page.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();

  // There are no user accounts — guests check out, and the only credential is
  // the dashboard password, hashed into SiteSettings below.
  const dashboardPassword = process.env.DASHBOARD_PASSWORD || 'luwjje-admin';

  // Names attached to the demo order history.
  const customers = [
    { name: 'Nadia Farouk', email: 'nadia@example.com' },
    { name: 'Jonas Berg', email: 'jonas@example.com' },
    { name: 'Amira Saleh', email: 'amira@example.com' },
    { name: 'Elias Holm', email: 'elias@example.com' },
    { name: 'Mona Reda', email: 'mona@example.com' },
  ];

  // ---------------------------------------------------------------- catalogue
  console.log('▸ Categories…');
  const categoryMap = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const row = await prisma.category.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, position: i },
    });
    categoryMap.set(c.name, row.id);
  }

  console.log('▸ Products, variants and imagery…');
  const createdProducts: { id: string; price: number; variantIds: string[]; name: string; image: string }[] = [];

  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const lead = p.variants[0];
    const imgs = makeProductImages(slug, p.name, lead.colorName, lead.colorHex);

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        materialInfo: p.materialInfo,
        careInfo: p.careInfo,
        price: p.price,
        sku: `LW-${slug.toUpperCase().replace(/-/g, '').slice(0, 10)}`,
        categoryId: categoryMap.get(p.category),
        status: 'PUBLISHED',
        isBestSeller: Boolean(p.bestSeller),
        bestSellerOrder: p.bestSeller ?? 0,
        hasSizes: p.variants.some((v) => v.sizes?.length),
        images: {
          create: [
            { url: imgs.primary, alt: `${p.name} — studio`, position: 0, isPrimary: true },
            { url: imgs.hover, alt: `${p.name} — worn`, position: 1, isHover: true },
          ],
        },
      },
    });

    const variantIds: string[] = [];
    let pos = 0;
    for (const v of p.variants) {
      const sizes = v.sizes?.length ? v.sizes : [null];
      for (const size of sizes) {
        const skuParts = [
          slug.toUpperCase().replace(/-/g, '').slice(0, 8),
          v.colorName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4),
          size ? size.replace(/[^A-Z0-9]/gi, '').toUpperCase() : 'OS',
        ];
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorName: v.colorName,
            colorHex: v.colorHex,
            size,
            sku: skuParts.join('-'),
            // spread the colourway stock across its sizes
            stock: Math.max(1, Math.round(v.stock / sizes.length)),
            lowStockAt: 5,
            position: pos++,
          },
        });
        variantIds.push(variant.id);
      }
    }

    createdProducts.push({
      id: product.id,
      price: product.price,
      variantIds,
      name: product.name,
      image: imgs.primary,
    });
  }

  // ---------------------------------------------------------------- CMS content
  console.log('▸ Site settings, banners and pages…');
  const heroImage = makeEditorial('hero-new-neutrals', 'Autumn / Winter', '#8b8577');
  const offerImage = makeEditorial('offer-new-neutrals', 'The New Neutrals', '#b3a893');
  const aboutImage = makeEditorial('about-studio', 'The Studio', '#7d8494');
  const journalImage = makeEditorial('journal-cover', 'Journal', '#96907f');

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      dashboardPasswordHash: await bcrypt.hash(dashboardPassword, 10),
      storeName: 'luwjje',
      tagline: 'Considered essentials for a quiet life.',
      supportEmail: 'care@luwjje.com',
      supportPhone: '+20 100 000 0000',
      freeShippingOver: 100,
      defaultShippingRate: 12,
      lowStockThreshold: 5,
      instagramUrl: 'https://instagram.com/luwjje',
      pinterestUrl: 'https://pinterest.com/luwjje',
      tiktokUrl: 'https://tiktok.com/@luwjje',
      facebookUrl: '',
      metaTitle: 'luwjje — Considered essentials',
      metaDescription:
        'Scandinavian minimalism in wool, cashmere and cotton. Made slowly, kept for years.',
      ogImageUrl: heroImage,
      newsletterHeading: 'Newsletter',
      newsletterBody: 'Quiet updates. New arrivals, no noise. Two emails a month, at most.',
    },
  });

  await prisma.banner.createMany({
    data: [
      {
        slot: 'HERO',
        eyebrow: 'Autumn / Winter 2026',
        heading: 'Warmth, reduced to its essentials.',
        subheading: '',
        body: 'Brushed lambswool and two-ply cashmere, cut for the months when the light goes flat. Made in small runs, kept for years.',
        ctaLabel: 'Shop Now',
        ctaHref: '/shop',
        imageUrl: heroImage,
        active: true,
        position: 0,
      },
      {
        slot: 'OFFER',
        badge: 'Limited Release',
        eyebrow: 'The Collection',
        heading: 'Discover the New Neutrals',
        body: 'Seven tones drawn from stone, linen and winter light — released together, once a year. Complimentary shipping on the full collection.',
        ctaLabel: 'Explore',
        ctaHref: '/shop?color=Beige',
        imageUrl: offerImage,
        active: true,
        position: 0,
        startsAt: subDays(new Date(), 7),
        endsAt: subDays(new Date(), -60),
      },
    ],
  });

  await prisma.paletteSwatch.createMany({
    data: [
      { name: 'Parchment', hex: '#f8f9ff', position: 0 },
      { name: 'Off-White', hex: '#efe9df', position: 1 },
      { name: 'Beige', hex: '#d8cbb8', position: 2 },
      { name: 'Stone', hex: '#b3ada4', position: 3 },
      { name: 'Light Grey Heather', hex: '#c4c7c9', position: 4 },
      { name: 'Dark Charcoal', hex: '#3a3d42', position: 5 },
      { name: 'Midnight', hex: '#0b1c30', position: 6 },
    ],
  });

  await prisma.page.createMany({
    data: [
      {
        slug: 'about',
        title: 'About',
        excerpt: 'A small studio making a small number of things.',
        heroImage: aboutImage,
        showInFooter: false,
        position: 0,
        body: `luwjje began with a single question: how few things does a wardrobe actually need?

We design in one room, in daylight, with the samples on the wall for months before anything is made. Nothing enters the collection because a season demanded it. It enters because the last version was not quite right.

## How we make

Our knitwear is woven in Yorkshire from brushed lambswool and in Inner Mongolia from grade-A two-ply cashmere. Our shirting is cut from long-staple Egyptian cotton and washed once before it reaches you, so it arrives already soft. Our leather is vegetable-tanned in Tuscany and stitched by hand.

We produce in runs of a few hundred. When a colourway sells out, we decide whether it deserves to return.

## What we will not do

We do not run seasonal sales. We do not manufacture urgency. We do not add a product to the collection to fill a gap in a grid.

If something we made fails before it should have, write to us. We will repair it or replace it.`,
      },
      {
        slug: 'journal',
        title: 'Journal',
        excerpt: 'Notes on material, process and the people we make with.',
        heroImage: journalImage,
        showInFooter: false,
        position: 1,
        body: `## On the shuttle loom

The denim we use is woven in Okayama on looms built in the 1950s. They run at a fraction of the speed of a modern projectile loom and produce cloth barely a metre wide. The slack tension leaves the yarn slightly irregular — which is the entire reason to bother.

## Notes on brushing

Brushed lambswool is passed under fine wire rollers that lift the surface fibres. Done once, the cloth is soft. Done three times, it is soft and it stays soft, because the loft is structural rather than superficial. Our snoods are brushed three times.

## The case against the seasonal drop

Most of what we own fails not because it wore out but because it stopped feeling current. That is a design failure, and it is usually deliberate. We would rather make four scarves that look the same in 2036.`,
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        excerpt: 'What we collect and why.',
        showInFooter: true,
        position: 0,
        body: `We collect the minimum required to fulfil your order: your name, email, phone number and shipping address.

## What we store

Order history and shipping details are retained so you can view past orders in your account. Payment card details never touch our servers — they are handled entirely by our payment processor.

## What we do not do

We do not sell your data. We do not share it with advertisers. Newsletter subscription is opt-in and every email carries a one-click unsubscribe.

## Your rights

Write to care@luwjje.com to request a copy of your data or its deletion. We respond within thirty days.`,
      },
      {
        slug: 'terms',
        title: 'Terms of Service',
        excerpt: 'The agreement between us.',
        showInFooter: true,
        position: 1,
        body: `By placing an order you agree to these terms.

## Orders

All orders are subject to stock availability and acceptance. If an item becomes unavailable after you order, we will contact you and refund in full.

## Pricing

Prices are shown in US dollars and exclude any import duties, which are the responsibility of the recipient.

## Returns

Unworn items may be returned within 30 days of delivery for a full refund. Made-to-order and altered items are final sale.

## Liability

Our liability is limited to the value of the order placed.`,
      },
      {
        slug: 'shipping-returns',
        title: 'Shipping & Returns',
        excerpt: 'How your order reaches you, and how to send it back.',
        showInFooter: true,
        position: 2,
        body: `## Shipping

Orders are dispatched within two working days. Shipping is calculated at checkout by destination, and is complimentary on orders over the threshold shown in your cart.

## Returns

Return anything unworn within 30 days. Email care@luwjje.com with your order number and we will send a prepaid label for domestic returns.

## Repairs

We repair our knitwear for the life of the garment. Send it to us and we will quote before starting.`,
      },
    ],
  });

  // ---------------------------------------------------------------- commerce config
  console.log('▸ Shipping zones and promo codes…');
  await prisma.shippingZone.createMany({
    data: [
      { name: 'Egypt', countries: 'Egypt', rate: 5, freeOver: 80, estimatedDays: '2-4 business days', position: 0 },
      { name: 'Gulf & Levant', countries: 'Saudi Arabia,United Arab Emirates,Qatar,Kuwait,Bahrain,Oman,Jordan,Lebanon', rate: 15, freeOver: 150, estimatedDays: '4-7 business days', position: 1 },
      { name: 'Europe', countries: 'United Kingdom,Germany,France,Netherlands,Sweden,Denmark,Norway,Italy,Spain', rate: 18, freeOver: 200, estimatedDays: '5-8 business days', position: 2 },
      { name: 'North America', countries: 'United States,Canada', rate: 22, freeOver: 250, estimatedDays: '6-10 business days', position: 3 },
      { name: 'Rest of World', countries: 'Australia,Japan,Singapore,South Africa,Brazil', rate: 30, freeOver: null, estimatedDays: '8-14 business days', position: 4 },
    ],
  });

  await prisma.promoCode.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: '10% off a first order.',
        discountType: 'PERCENT',
        discountValue: 10,
        minOrder: 0,
        maxUses: 500,
        usedCount: 37,
        active: true,
        expiresAt: subDays(new Date(), -180),
      },
      {
        code: 'NEUTRALS20',
        description: '20% off during the New Neutrals release.',
        discountType: 'PERCENT',
        discountValue: 20,
        minOrder: 150,
        maxUses: 200,
        usedCount: 64,
        active: true,
        startsAt: subDays(new Date(), 7),
        expiresAt: subDays(new Date(), -30),
      },
      {
        code: 'SNOOD25',
        description: '$25 off orders over $200.',
        discountType: 'FIXED',
        discountValue: 25,
        minOrder: 200,
        maxUses: null,
        usedCount: 12,
        active: true,
      },
      {
        code: 'ARCHIVE15',
        description: 'Expired archive promotion.',
        discountType: 'PERCENT',
        discountValue: 15,
        minOrder: 0,
        usedCount: 210,
        active: false,
        expiresAt: subDays(new Date(), 45),
      },
    ],
  });

  // ---------------------------------------------------------------- order history
  // 90 days of orders so the dashboard charts, conversion rate and
  // top-performer rankings are computed from real rows.
  console.log('▸ Order history (90 days)…');
  const statusesByAge = (daysAgo: number) => {
    if (daysAgo < 3) return 'PENDING';
    if (daysAgo < 7) return 'PAID';
    if (daysAgo < 14) return 'SHIPPED';
    return 'DELIVERED';
  };

  const regions = ['Egypt', 'United Arab Emirates', 'United Kingdom', 'United States', 'Germany'];
  let orderCount = 0;

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    // gentle upward trend + weekend dip
    const day = startOfDay(subDays(new Date(), daysAgo));
    const weekend = [0, 6].includes(day.getDay());
    const base = 1 + (90 - daysAgo) / 45;
    const ordersToday = Math.max(0, Math.round((weekend ? base * 0.6 : base) + (Math.random() * 2 - 0.6)));

    for (let n = 0; n < ordersToday; n++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const itemCount = 1 + Math.floor(Math.random() * 3);
      const picks = new Set<number>();
      while (picks.size < itemCount) picks.add(Math.floor(Math.random() * createdProducts.length));

      const items = Array.from(picks).map((i) => {
        const p = createdProducts[i];
        const qty = 1 + (Math.random() > 0.8 ? 1 : 0);
        return { p, qty };
      });

      const subtotal = items.reduce((s, { p, qty }) => s + p.price * qty, 0);
      const shippingCost = subtotal >= 100 ? 0 : 12;
      const usedPromo = Math.random() > 0.82;
      const discount = usedPromo ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const status = Math.random() > 0.94 ? 'CANCELLED' : statusesByAge(daysAgo);
      const createdAt = new Date(day.getTime() + Math.floor(Math.random() * 86_400_000));

      await prisma.order.create({
        data: {
          orderNumber: `${orderNumber()}${orderCount}`.slice(0, 12),
          email: customer.email,
          fullName: customer.name,
          phone: '+20 100 555 0100',
          street: `${10 + n} Studio Lane`,
          city: 'Cairo',
          region: regions[Math.floor(Math.random() * regions.length)],
          postalCode: '11511',
          status,
          paymentStatus: status === 'CANCELLED' ? 'REFUNDED' : status === 'PENDING' ? 'UNPAID' : 'PAID',
          subtotal,
          shippingCost,
          discount,
          total: Math.round((subtotal + shippingCost - discount) * 100) / 100,
          promoCode: usedPromo ? 'WELCOME10' : null,
          createdAt,
          updatedAt: createdAt,
          items: {
            create: items.map(({ p, qty }) => ({
              productId: p.id,
              variantId: p.variantIds[0],
              name: p.name,
              imageUrl: p.image,
              unitPrice: p.price,
              quantity: qty,
            })),
          },
        },
      });
      orderCount++;
    }
  }

  // Denormalised sold counts drive the Top Performers panel.
  const sold = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
  });
  for (const row of sold) {
    if (!row.productId) continue;
    await prisma.product.update({
      where: { id: row.productId },
      data: { soldCount: row._sum.quantity ?? 0 },
    });
  }

  // ---------------------------------------------------------------- traffic
  console.log('▸ Page views (for conversion rate & traffic sources)…');
  const referrers = ['direct', 'instagram.com', 'google.com', 'pinterest.com', 'newsletter'];
  const viewRows: { path: string; referrer: string; sessionId: string; createdAt: Date }[] = [];
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const day = startOfDay(subDays(new Date(), daysAgo));
    const views = 40 + Math.floor(Math.random() * 60) + Math.round((90 - daysAgo) / 2);
    for (let i = 0; i < views; i++) {
      viewRows.push({
        path: Math.random() > 0.5 ? '/' : '/shop',
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        sessionId: `seed-${daysAgo}-${i}`,
        createdAt: new Date(day.getTime() + Math.floor(Math.random() * 86_400_000)),
      });
    }
  }
  // chunked to stay under SQLite's variable limit
  for (let i = 0; i < viewRows.length; i += 500) {
    await prisma.pageView.createMany({ data: viewRows.slice(i, i + 500) });
  }

  await prisma.newsletterSubscriber.createMany({
    data: customers.map((c) => ({ email: c.email })),
  });

  console.log('\n✓ Seed complete');
  console.log(`  ${PRODUCTS.length} products · ${orderCount} orders · ${viewRows.length} page views`);
  console.log(`  Dashboard → http://localhost:3000/dashboard`);
  console.log(`  Password  → ${dashboardPassword}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
