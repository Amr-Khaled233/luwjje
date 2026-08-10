import { PageTitle } from '@/components/dashboard/page-title';
import { OffersManager } from '@/components/dashboard/offers-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminOffersPage() {
  const [banners, discounts, products, categories, swatches] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ slot: 'asc' }, { position: 'asc' }] }),
    prisma.discount.findMany({
      include: { products: { select: { productId: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { position: 'asc' } }),
    prisma.paletteSwatch.findMany({ orderBy: { position: 'asc' } }),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="offers" />

      <OffersManager
        banners={banners.map((b) => ({
          id: b.id,
          slot: b.slot as 'HERO' | 'OFFER',
          eyebrow: b.eyebrow,
          eyebrowAr: b.eyebrowAr,
          heading: b.heading,
          headingAr: b.headingAr,
          subheading: b.subheading,
          subheadingAr: b.subheadingAr,
          body: b.body,
          bodyAr: b.bodyAr,
          ctaLabel: b.ctaLabel,
          ctaLabelAr: b.ctaLabelAr,
          ctaHref: b.ctaHref,
          imageUrl: b.imageUrl,
          badge: b.badge,
          badgeAr: b.badgeAr,
          active: b.active,
          startsAt: iso(b.startsAt),
          endsAt: iso(b.endsAt),
          position: b.position,
        }))}
        discounts={discounts.map((d) => ({
          id: d.id,
          name: d.name,
          nameAr: d.nameAr,
          discountType: d.discountType as 'PERCENT' | 'FIXED',
          discountValue: d.discountValue,
          scope: d.scope as 'PRODUCTS' | 'CATEGORY' | 'ALL',
          categoryId: d.categoryId ?? '',
          productIds: d.products.map((p) => p.productId),
          startsAt: iso(d.startsAt),
          endsAt: iso(d.endsAt),
          active: d.active,
        }))}
        products={products}
        categories={categories}
        swatches={swatches.map((s) => ({ name: s.name, hex: s.hex }))}
      />
    </div>
  );
}
