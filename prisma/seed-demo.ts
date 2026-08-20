/**
 * Optional demo catalogue — run after `npm run db:seed` when you want a
 * populated store to look around:  npm run db:seed:demo
 *
 * Adds bilingual categories and products priced in EGP, plus 90 days of
 * order history and traffic so the dashboard charts have something real to
 * draw. Safe to delete everything afterwards from the dashboard.
 */
import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay } from 'date-fns';
import { ensureOutDir, makeProductImages, makeEditorial } from './placeholders';

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

const CATEGORIES = [
  { name: 'Knitwear', nameAr: 'التريكو', description: 'Wool, cashmere and merino.', descriptionAr: 'صوف وكشمير ومرينو.' },
  { name: 'Outerwear', nameAr: 'الملابس الخارجية', description: 'Weight, drape and a long horizon.', descriptionAr: 'وزن وانسدال وعمر طويل.' },
  { name: 'Shirting', nameAr: 'القمصان', description: 'Cotton and linen, cut clean.', descriptionAr: 'قطن وكتان بقصّة نظيفة.' },
  { name: 'Trousers', nameAr: 'البنطلونات', description: 'Quiet tailoring for every day.', descriptionAr: 'تفصيل هادئ لكل يوم.' },
  { name: 'Footwear', nameAr: 'الأحذية', description: 'Leather that earns its patina.', descriptionAr: 'جلد يكتسب لمعته بمرور الوقت.' },
  { name: 'Accessories', nameAr: 'الإكسسوارات', description: 'The small, considered things.', descriptionAr: 'التفاصيل الصغيرة المدروسة.' },
  { name: 'Denim', nameAr: 'الدنيم', description: 'Raw, selvedge, unhurried.', descriptionAr: 'خام، سلفدج، بلا استعجال.' },
];

type SeedVariant = {
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  stock: number;
  sizes?: string[];
};

const PRODUCTS: {
  name: string;
  nameAr: string;
  price: number;
  category: string;
  description: string;
  descriptionAr: string;
  bestSeller?: number;
  variants: SeedVariant[];
}[] = [
  {
    name: 'The Classic Snood',
    nameAr: 'سنود كلاسيك',
    price: 1250,
    category: 'Knitwear',
    bestSeller: 1,
    description:
      'A closed-loop scarf in brushed lambswool. Wide enough to sit as a collar, long enough to double.',
    descriptionAr:
      'وشاح مغلق من صوف الحملان المُمشّط. عريض بما يكفي ليكون ياقة، وطويل بما يكفي ليُلفّ مرتين.',
    variants: [
      { colorName: 'Dark Charcoal Grey', colorNameAr: 'رمادي فحمي', colorHex: '#3a3d42', stock: 42 },
      { colorName: 'Deep Navy', colorNameAr: 'كحلي غامق', colorHex: '#213145', stock: 18 },
    ],
  },
  {
    name: 'The Essential Snood',
    nameAr: 'سنود إسنشال',
    price: 1250,
    category: 'Knitwear',
    bestSeller: 2,
    description: 'The lightest of the four — a fine-gauge merino loop for the shoulder seasons.',
    descriptionAr: 'الأخف بين الأربعة — حلقة مرينو رفيعة لمواسم ما بين الحر والبرد.',
    variants: [
      { colorName: 'Off-White', colorNameAr: 'أبيض مائل', colorHex: '#efe9df', stock: 31 },
      { colorName: 'Beige', colorNameAr: 'بيج', colorHex: '#d8cbb8', stock: 24 },
    ],
  },
  {
    name: 'The Everyday Snood',
    nameAr: 'سنود إيفريداي',
    price: 1250,
    category: 'Knitwear',
    bestSeller: 3,
    description: 'Heather-spun yarn gives it depth — grey that reads warm in daylight.',
    descriptionAr: 'خيط مُخلّط يمنحه عمقاً — رمادي يبدو دافئاً في ضوء النهار.',
    variants: [
      { colorName: 'Light Grey Heather', colorNameAr: 'رمادي فاتح', colorHex: '#c4c7c9', stock: 4 },
      { colorName: 'Stone', colorNameAr: 'حجري', colorHex: '#b3ada4', stock: 12 },
    ],
  },
  {
    name: 'The Midnight Snood',
    nameAr: 'سنود ميدنايت',
    price: 1250,
    category: 'Knitwear',
    bestSeller: 4,
    description: 'Solid black, overdyed twice for depth. The formal one.',
    descriptionAr: 'أسود صريح، مصبوغ مرتين لعمق أكبر. الأكثر رسمية.',
    variants: [{ colorName: 'Solid Black', colorNameAr: 'أسود', colorHex: '#0f1113', stock: 27 }],
  },
  {
    name: 'The Wool Overcoat',
    nameAr: 'معطف صوف',
    price: 6800,
    category: 'Outerwear',
    description: 'Single-breasted, in double-faced Italian wool, unlined so the cloth can move.',
    descriptionAr: 'بصف أزرار واحد، من صوف إيطالي مزدوج الوجه، بدون بطانة ليتحرك القماش بحرية.',
    variants: [
      { colorName: 'Camel', colorNameAr: 'جملي', colorHex: '#b08d5f', stock: 8, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Charcoal', colorNameAr: 'فحمي', colorHex: '#42464b', stock: 11, sizes: ['S', 'M', 'L', 'XL'] },
    ],
  },
  {
    name: 'Essential Cotton Shirt',
    nameAr: 'قميص قطن أساسي',
    price: 1850,
    category: 'Shirting',
    description: 'Long-staple Egyptian cotton, garment-washed once so it arrives already soft.',
    descriptionAr: 'قطن مصري طويل التيلة، مغسول مرة ليصلك ناعماً من أول ارتداء.',
    variants: [
      { colorName: 'Optic White', colorNameAr: 'أبيض ناصع', colorHex: '#f5f3ee', stock: 34, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Pale Blue', colorNameAr: 'أزرق فاتح', colorHex: '#c3d2e4', stock: 21, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Sand', colorNameAr: 'رملي', colorHex: '#ddd0bb', stock: 3, sizes: ['S', 'M', 'L'] },
    ],
  },
  {
    name: 'Classic Loafer',
    nameAr: 'حذاء لوفر كلاسيك',
    price: 4400,
    category: 'Footwear',
    description: 'Hand-lasted penny loafer on a leather sole, Blake-stitched so it can be resoled.',
    descriptionAr: 'لوفر مُشكّل يدوياً بنعل جلدي وخياطة بليك، يمكن تغيير نعله مراراً.',
    variants: [
      { colorName: 'Chestnut', colorNameAr: 'بني كستنائي', colorHex: '#7d4f2e', stock: 9, sizes: ['40', '41', '42', '43', '44'] },
      { colorName: 'Black', colorNameAr: 'أسود', colorHex: '#17181a', stock: 14, sizes: ['40', '41', '42', '43', '44'] },
    ],
  },
  {
    name: 'Linen Trousers',
    nameAr: 'بنطلون كتان',
    price: 2700,
    category: 'Trousers',
    description: 'A wide, flat-front trouser in heavyweight Belgian linen.',
    descriptionAr: 'بنطلون واسع بواجهة مسطّحة من كتان بلجيكي ثقيل.',
    variants: [
      { colorName: 'Natural', colorNameAr: 'طبيعي', colorHex: '#e2d9c8', stock: 17, sizes: ['30', '32', '34', '36'] },
      { colorName: 'Olive', colorNameAr: 'زيتي', colorHex: '#6b6f52', stock: 6, sizes: ['30', '32', '34'] },
    ],
  },
  {
    name: 'Structured Tote',
    nameAr: 'شنطة توت',
    price: 5300,
    category: 'Accessories',
    description: 'An unlined tote in a single panel of bridle leather, saddle-stitched at two seams.',
    descriptionAr: 'شنطة بدون بطانة من قطعة جلد واحدة، مخيطة يدوياً عند درزتين.',
    variants: [
      { colorName: 'Tan', colorNameAr: 'عسلي', colorHex: '#9a6b3f', stock: 7 },
      { colorName: 'Black', colorNameAr: 'أسود', colorHex: '#1a1b1d', stock: 10 },
    ],
  },
  {
    name: 'Cashmere Crewneck',
    nameAr: 'بلوفر كشمير',
    price: 3300,
    category: 'Knitwear',
    description: 'Two-ply Mongolian cashmere at a gauge heavy enough to wear alone.',
    descriptionAr: 'كشمير منغولي مزدوج الخيط بسماكة تكفي لارتدائه وحده.',
    variants: [
      { colorName: 'Oatmeal', colorNameAr: 'بيج فاتح', colorHex: '#d9cfbc', stock: 15, sizes: ['S', 'M', 'L', 'XL'] },
      { colorName: 'Slate', colorNameAr: 'رمادي أزرق', colorHex: '#5d646d', stock: 2, sizes: ['S', 'M', 'L'] },
      { colorName: 'Black', colorNameAr: 'أسود', colorHex: '#141517', stock: 19, sizes: ['S', 'M', 'L', 'XL'] },
    ],
  },
  {
    name: 'Silk Pocket Square',
    nameAr: 'منديل جيب حرير',
    price: 700,
    category: 'Accessories',
    description: 'Hand-rolled silk twill, printed in a single muted tone with a hairline border.',
    descriptionAr: 'حرير تويل بحواف مطوية يدوياً، بلون هادئ واحد وإطار رفيع.',
    variants: [
      { colorName: 'Ivory', colorNameAr: 'عاجي', colorHex: '#f0ebe1', stock: 40 },
      { colorName: 'Petrol', colorNameAr: 'بترولي', colorHex: '#2c4a52', stock: 22 },
    ],
  },
  {
    name: 'Raw Denim Jean',
    nameAr: 'جينز خام',
    price: 2900,
    category: 'Denim',
    description: 'Fourteen-ounce selvedge denim, woven on shuttle looms and left entirely raw.',
    descriptionAr: 'دنيم سلفدج بوزن ١٤ أونصة، منسوج على أنوال مكوكية ومتروك خاماً تماماً.',
    variants: [
      { colorName: 'Indigo', colorNameAr: 'نيلي', colorHex: '#2f4058', stock: 23, sizes: ['30', '32', '34', '36'] },
      { colorName: 'Washed Black', colorNameAr: 'أسود مغسول', colorHex: '#2b2c30', stock: 5, sizes: ['30', '32', '34'] },
    ],
  },
];

const CUSTOMERS = [
  { name: 'Nadia Farouk', email: 'nadia@example.com' },
  { name: 'Youssef Adel', email: 'youssef@example.com' },
  { name: 'Amira Saleh', email: 'amira@example.com' },
  { name: 'Karim Hassan', email: 'karim@example.com' },
  { name: 'Mona Reda', email: 'mona@example.com' },
];

async function main() {
  ensureOutDir();

  const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) {
    throw new Error('Run `npm run db:seed` first — the store settings do not exist yet.');
  }

  console.log('\n▸ Clearing any existing catalogue…');
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
  await prisma.paletteSwatch.deleteMany();
  await prisma.banner.deleteMany({ where: { slot: 'OFFER' } });

  console.log('▸ Categories…');
  const categoryMap = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const row = await prisma.category.create({
      data: { ...c, slug: slugify(c.name), visible: true, position: i },
    });
    categoryMap.set(c.name, row.id);
  }

  console.log('▸ Products…');
  const created: { id: string; price: number; variantIds: string[]; name: string; nameAr: string; image: string }[] = [];

  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const lead = p.variants[0];
    const imgs = makeProductImages(slug, p.name, lead.colorName, lead.colorHex);

    const product = await prisma.product.create({
      data: {
        name: p.name,
        nameAr: p.nameAr,
        slug,
        description: p.description,
        descriptionAr: p.descriptionAr,
        price: p.price,
        sku: `LW-${slug.toUpperCase().replace(/-/g, '').slice(0, 10)}`,
        categoryId: categoryMap.get(p.category),
        status: 'PUBLISHED',
        isBestSeller: Boolean(p.bestSeller),
        bestSellerOrder: p.bestSeller ?? 0,
        hasSizes: p.variants.some((v) => v.sizes?.length),
        images: {
          create: [
            { url: imgs.primary, alt: p.name, position: 0, isPrimary: true },
            { url: imgs.hover, alt: p.name, position: 1, isHover: true },
          ],
        },
      },
    });

    const variantIds: string[] = [];
    let pos = 0;
    for (const v of p.variants) {
      const sizes = v.sizes?.length ? v.sizes : [null];
      for (const size of sizes) {
        const sku = [
          slug.toUpperCase().replace(/-/g, '').slice(0, 8),
          v.colorName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4),
          size ? size.replace(/[^A-Z0-9]/gi, '').toUpperCase() : 'OS',
        ].join('-');

        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            colorName: v.colorName,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            size,
            sku,
            stock: Math.max(1, Math.round(v.stock / sizes.length)),
            lowStockAt: 5,
            position: pos++,
          },
        });
        variantIds.push(variant.id);
      }
    }

    created.push({
      id: product.id,
      price: product.price,
      variantIds,
      name: product.name,
      nameAr: product.nameAr,
      image: imgs.primary,
    });
  }

  // Filter colours mirror the colourways now in the catalogue.
  console.log('▸ Filter colours…');

  console.log('▸ Palette, offer banner and promo codes…');
  await prisma.paletteSwatch.createMany({
    data: [
      { name: 'Parchment', nameAr: 'ورقي', hex: '#f8f9ff', position: 0 },
      { name: 'Off-White', nameAr: 'أبيض مائل', hex: '#efe9df', position: 1 },
      { name: 'Beige', nameAr: 'بيج', hex: '#d8cbb8', position: 2 },
      { name: 'Stone', nameAr: 'حجري', hex: '#b3ada4', position: 3 },
      { name: 'Light Grey', nameAr: 'رمادي فاتح', hex: '#c4c7c9', position: 4 },
      { name: 'Charcoal', nameAr: 'فحمي', hex: '#3a3d42', position: 5 },
      { name: 'Midnight', nameAr: 'كحلي داكن', hex: '#0b1c30', position: 6 },
    ],
  });

  await prisma.banner.create({
    data: {
      slot: 'OFFER',
      badge: 'Limited Release',
      badgeAr: 'إصدار محدود',
      eyebrow: 'The Collection',
      eyebrowAr: 'المجموعة',
      heading: 'Discover the New Neutrals',
      headingAr: 'اكتشف الألوان المحايدة الجديدة',
      body: 'Seven tones drawn from stone, linen and winter light — released together, once a year.',
      bodyAr: 'سبع درجات مستوحاة من الحجر والكتان وضوء الشتاء — تُطرح معاً مرة واحدة في العام.',
      ctaLabel: 'Explore',
      ctaLabelAr: 'استكشف',
      imageUrl: makeEditorial('offer-new-neutrals', 'The New Neutrals', '#b3a893'),
      active: true,
      position: 0,
    },
  });

  await prisma.promoCode.createMany({
    data: [
      {
        code: 'WELCOME10',
        description: '10% off a first order.',
        descriptionAr: 'خصم ١٠٪ على أول طلب.',
        discountType: 'PERCENT',
        discountValue: 10,
        maxUses: 500,
        active: true,
        expiresAt: subDays(new Date(), -180),
      },
      {
        code: 'SHIP0',
        description: 'EGP 500 off orders over 5,000.',
        descriptionAr: 'خصم ٥٠٠ ج.م على الطلبات فوق ٥٠٠٠.',
        discountType: 'FIXED',
        discountValue: 500,
        minOrder: 5000,
        active: true,
      },
    ],
  });

  // ---------------------------------------------------------------- history
  console.log('▸ 90 days of orders…');
  const governorates = await prisma.governorate.findMany({ orderBy: { position: 'asc' } });
  if (governorates.length === 0) throw new Error('No governorates — run `npm run db:seed` first.');

  const statusFor = (daysAgo: number) =>
    daysAgo < 3 ? 'PENDING' : daysAgo < 7 ? 'PAID' : daysAgo < 14 ? 'SHIPPED' : 'DELIVERED';

  let orderCount = 0;
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const day = startOfDay(subDays(new Date(), daysAgo));
    const weekend = [5, 6].includes(day.getDay());
    const base = 1 + (90 - daysAgo) / 45;
    const todays = Math.max(0, Math.round((weekend ? base * 0.6 : base) + (Math.random() * 2 - 0.6)));

    for (let n = 0; n < todays; n++) {
      const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
      const gov = governorates[Math.floor(Math.random() * governorates.length)];

      const picks = new Set<number>();
      while (picks.size < 1 + Math.floor(Math.random() * 3)) {
        picks.add(Math.floor(Math.random() * created.length));
      }
      const items = Array.from(picks).map((i) => ({
        p: created[i],
        qty: 1 + (Math.random() > 0.8 ? 1 : 0),
      }));

      const subtotal = items.reduce((s, { p, qty }) => s + p.price * qty, 0);
      // The demo seed predates any free-shipping rule, so every order pays.
      const shippingCost = gov.shippingCost;
      const usedPromo = Math.random() > 0.82;
      const discount = usedPromo ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      const status = Math.random() > 0.94 ? 'CANCELLED' : statusFor(daysAgo);
      const createdAt = new Date(day.getTime() + Math.floor(Math.random() * 86_400_000));

      await prisma.order.create({
        data: {
          orderNumber: `${orderNumber()}${orderCount}`.slice(0, 12),
          email: customer.email,
          fullName: customer.name,
          phone: '+20 100 555 0100',
          street: `${10 + n} Studio Lane`,
          area: 'Zamalek',
          governorate: gov.name,
          governorateId: gov.id,
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
              nameAr: p.nameAr,
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

  const sold = await prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true } });
  for (const row of sold) {
    if (!row.productId) continue;
    await prisma.product.update({
      where: { id: row.productId },
      data: { soldCount: row._sum.quantity ?? 0 },
    });
  }

  console.log('▸ Traffic…');
  const referrers = ['direct', 'instagram.com', 'google.com', 'facebook.com', 'newsletter'];
  const views: { path: string; referrer: string; sessionId: string; createdAt: Date }[] = [];
  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const day = startOfDay(subDays(new Date(), daysAgo));
    const n = 40 + Math.floor(Math.random() * 60) + Math.round((90 - daysAgo) / 2);
    for (let i = 0; i < n; i++) {
      views.push({
        path: Math.random() > 0.5 ? '/' : '/shop',
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        sessionId: `demo-${daysAgo}-${i}`,
        createdAt: new Date(day.getTime() + Math.floor(Math.random() * 86_400_000)),
      });
    }
  }
  for (let i = 0; i < views.length; i += 500) {
    await prisma.pageView.createMany({ data: views.slice(i, i + 500) });
  }

  console.log('\n✓ Demo catalogue ready');
  console.log(`  ${PRODUCTS.length} products · ${orderCount} orders · ${views.length} page views`);
  console.log('  Delete any of it from the dashboard when you add your own.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
