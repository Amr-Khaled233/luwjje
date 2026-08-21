/**
 * Baseline seed: everything the store needs to take its first order, and
 * nothing you would have to delete afterwards.
 *
 * The catalogue is left EMPTY on purpose — add real products, categories and
 * prices from the dashboard. For a populated demo instead, run:
 *   npm run db:seed:demo
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GOVERNORATES } from './governorates';
import { ensureOutDir, makeEditorial } from './placeholders';

const prisma = new PrismaClient();

async function main() {
  console.log('\n▸ Resetting store data…');
  ensureOutDir();

  await prisma.pageView.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.priceRange.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.governorate.deleteMany();
  await prisma.paletteSwatch.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.page.deleteMany();
  await prisma.freeShippingRule.deleteMany();

  const dashboardPassword = process.env.DASHBOARD_PASSWORD || 'luwjje-admin';

  // ---------------------------------------------------------------- settings
  console.log('▸ Store settings…');
  const heroImage = makeEditorial('hero-default', 'luwjje', '#8b8577');

  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      // Hashing the env password here means the store is usable immediately;
      // change it from Settings → Password and this value stops mattering.
      dashboardPasswordHash: await bcrypt.hash(dashboardPassword, 10),
      storeName: 'luwjje',
      tagline: 'Considered essentials for a quiet life.',
      taglineAr: 'أساسيات مدروسة لحياة هادئة.',
      supportEmail: 'care@luwjje.com',
      supportPhone: '',
      defaultLocale: 'en',
      enableArabic: true,
      currencyCode: 'EGP',
      currencySymbol: 'EGP',
      currencySymbolAr: 'ج.م',
      defaultShippingRate: 75,
      lowStockThreshold: 5,
      showCategoryFilter: true,
      showPriceFilter: true,
      showSortFilter: true,
      // The store's real channels. Editable from Settings → Social.
      instagramUrl: 'https://www.instagram.com/luwjje',
      facebookUrl: 'https://www.facebook.com/share/1BY898bngC/',
      metaTitle: 'luwjje — Considered essentials',
      metaTitleAr: 'luwjje — أساسيات مدروسة',
      metaDescription: 'Quiet, well-made pieces in wool, cotton and leather. Delivered across Egypt.',
      metaDescriptionAr: 'قطع هادئة مصنوعة بعناية من الصوف والقطن والجلد. توصيل لكل محافظات مصر.',
      ogImageUrl: heroImage,
    },
  });

  // ---------------------------------------------------------------- shipping
  console.log('▸ Egyptian governorates…');
  await prisma.governorate.createMany({
    data: GOVERNORATES.map((g, i) => ({
      name: g.name,
      nameAr: g.nameAr,
      shippingCost: g.shippingCost,
      estimatedDays: g.estimatedDays,
      active: true,
      position: i,
    })),
  });

  // ------------------------------------------------------------ free delivery
  console.log('▸ Free delivery…');
  await prisma.freeShippingRule.create({
    data: {
      name: 'Free delivery over EGP 2,000',
      nameAr: 'شحن مجاني فوق ٢٠٠٠ ج.م',
      minOrder: 2000,
      active: true,
    },
  });

  // ---------------------------------------------------------------- filters
  console.log('▸ Shop filter defaults…');
  await prisma.priceRange.createMany({
    data: [
      { label: 'Under EGP 500', labelAr: 'أقل من ٥٠٠ ج.م', min: 0, max: 500, position: 0 },
      { label: 'EGP 500 – 1,500', labelAr: '٥٠٠ – ١٥٠٠ ج.م', min: 500, max: 1500, position: 1 },
      { label: 'EGP 1,500 – 3,000', labelAr: '١٥٠٠ – ٣٠٠٠ ج.م', min: 1500, max: 3000, position: 2 },
      { label: 'EGP 3,000 and above', labelAr: '٣٠٠٠ ج.م فأكثر', min: 3000, max: null, position: 3 },
    ],
  });

  // ---------------------------------------------------------------- content
  console.log('▸ Home banner and pages…');
  await prisma.banner.create({
    data: {
      slot: 'HERO',
      eyebrow: 'New Season',
      eyebrowAr: 'موسم جديد',
      heading: 'Considered essentials.',
      headingAr: 'أساسيات مدروسة.',
      body: 'Edit this banner — its text, image and button — from Dashboard → Offers.',
      bodyAr: 'عدّل هذا البانر — نصه وصورته وزره — من لوحة التحكم ← العروض.',
      ctaLabel: 'Shop Now',
      ctaLabelAr: 'تسوّق الآن',
      imageUrl: heroImage,
      active: true,
      position: 0,
    },
  });

  await prisma.page.createMany({
    data: [
      {
        slug: 'about',
        title: 'About',
        titleAr: 'عن luwjje',
        excerpt: 'A small studio making a small number of things.',
        excerptAr: 'استوديو صغير يصنع عدداً قليلاً من القطع.',
        showInFooter: false,
        position: 0,
        body: `Write your story here from Dashboard → Settings → Content Pages.

## How we make

Describe your materials, your makers and your process.

## What we will not do

Say what you stand against. It is usually more memorable than what you stand for.`,
        bodyAr: `اكتب قصتك هنا من لوحة التحكم ← الإعدادات ← صفحات المحتوى.

## كيف نصنع

اشرح خاماتك، ومن يصنع لك، وكيف تتم العملية.

## ما لا نفعله

قل ما ترفضه. غالباً ما يكون أوقع في الذهن مما تؤيده.`,
      },
      {
        slug: 'journal',
        title: 'Journal',
        titleAr: 'المدوّنة',
        excerpt: 'Notes on material, process and the people we make with.',
        excerptAr: 'ملاحظات عن الخامة والصناعة ومن نعمل معهم.',
        showInFooter: false,
        position: 1,
        body: `## Your first entry

Replace this from the dashboard whenever you have something worth saying.`,
        bodyAr: `## أول تدوينة

استبدل هذا النص من لوحة التحكم وقتما يكون لديك ما يستحق أن يُقال.`,
      },
      {
        slug: 'shipping-returns',
        title: 'Shipping & Returns',
        titleAr: 'الشحن والإرجاع',
        excerpt: 'How your order reaches you, and how to send it back.',
        excerptAr: 'كيف يصلك طلبك، وكيف ترجعه.',
        showInFooter: true,
        position: 0,
        body: `## Shipping

Orders are dispatched within two working days. Delivery cost is calculated at checkout by governorate, and is complimentary above the threshold shown in your bag.

## Returns

Return anything unworn within 14 days. Email us with your order number and we will arrange collection.`,
        bodyAr: `## الشحن

يتم شحن الطلبات خلال يومي عمل. تُحسب تكلفة التوصيل عند الدفع حسب المحافظة، وتكون مجانية فوق الحد الموضّح في حقيبتك.

## الإرجاع

يمكنك إرجاع أي قطعة لم تُستخدم خلال ١٤ يوماً. راسلنا برقم طلبك وسنرتّب الاستلام.`,
      },
      {
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        titleAr: 'سياسة الخصوصية',
        excerpt: 'What we collect and why.',
        excerptAr: 'ما نجمعه ولماذا.',
        showInFooter: true,
        position: 1,
        body: `We collect the minimum required to fulfil your order: your name, email, phone number and delivery address.

## What we do not do

We do not sell your data. We do not share it with advertisers. Newsletter subscription is opt-in.

## Your rights

Write to us to request a copy of your data or its deletion.`,
        bodyAr: `نجمع الحد الأدنى اللازم لتنفيذ طلبك: اسمك وبريدك ورقم هاتفك وعنوان التوصيل.

## ما لا نفعله

لا نبيع بياناتك ولا نشاركها مع المعلنين. الاشتراك في النشرة البريدية اختياري.

## حقوقك

راسلنا لطلب نسخة من بياناتك أو حذفها.`,
      },
      {
        slug: 'terms',
        title: 'Terms of Service',
        titleAr: 'شروط الخدمة',
        excerpt: 'The agreement between us.',
        excerptAr: 'الاتفاق بيننا.',
        showInFooter: true,
        position: 2,
        body: `By placing an order you agree to these terms.

## Orders

All orders are subject to stock availability. If an item becomes unavailable after you order, we will contact you and refund in full.

## Pricing

Prices are shown in Egyptian pounds and include applicable taxes.`,
        bodyAr: `بتأكيد الطلب فإنك توافق على هذه الشروط.

## الطلبات

جميع الطلبات مرهونة بتوافر المخزون. إذا نفدت قطعة بعد طلبك، سنتواصل معك ونرد المبلغ كاملاً.

## الأسعار

الأسعار بالجنيه المصري وشاملة الضرائب المستحقة.`,
      },
    ],
  });

  console.log('\n✓ Store ready');
  console.log(`  ${GOVERNORATES.length} governorates · 5 pages · 1 hero banner · 4 price ranges`);
  console.log('  Catalogue is empty — add categories and products from the dashboard.');
  console.log(`  Dashboard password → ${dashboardPassword}`);
  console.log('  Want demo products to look around first? npm run db:seed:demo\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
