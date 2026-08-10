import { PageHeader } from '@/components/dashboard/admin-ui';
import { ProductsManager } from '@/components/dashboard/products-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const [products, categories, settings] = await Promise.all([
    prisma.product.findMany({
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ isBestSeller: 'desc' }, { bestSellerOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Products"
        description="Everything here drives the storefront directly — the Best Sellers row, the Shop grid and every product page read from this table."
      />

      <ProductsManager
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          nameAr: p.nameAr,
          slug: p.slug,
          description: p.description,
          descriptionAr: p.descriptionAr,
          materialInfo: p.materialInfo,
          materialInfoAr: p.materialInfoAr,
          careInfo: p.careInfo,
          careInfoAr: p.careInfoAr,
          price: p.price,
          compareAtPrice: p.compareAtPrice,
          sku: p.sku,
          categoryId: p.categoryId,
          categoryName: p.category?.name ?? null,
          status: p.status,
          isBestSeller: p.isBestSeller,
          bestSellerOrder: p.bestSellerOrder,
          soldCount: p.soldCount,
          images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
          variants: p.variants.map((v) => ({
            id: v.id,
            colorName: v.colorName,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            size: v.size,
            sku: v.sku,
            stock: v.stock,
            lowStockAt: v.lowStockAt,
          })),
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, description: c.description ?? '' }))}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
