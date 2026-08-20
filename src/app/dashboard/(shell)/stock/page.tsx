import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { PageTitle } from '@/components/dashboard/page-title';
import { StockManager } from '@/components/dashboard/stock-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const d = getDashboardDictionary(await getLocale());
  const variants = await prisma.productVariant.findMany({
    include: {
      product: {
        select: {
          name: true,
          slug: true,
          status: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
    orderBy: [{ stock: 'asc' }, { sku: 'asc' }],
  });

  const rows = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    productName: v.product.name,
    productSlug: v.product.slug,
    productStatus: v.product.status,
    image: v.product.images[0]?.url ?? '',
    colorName: v.colorName,
    colorHex: v.colorHex,
    size: v.size,
    stock: v.stock,
    lowStockAt: v.lowStockAt,
  }));

  const outOfStock = rows.filter((r) => r.stock === 0).length;
  const low = rows.filter((r) => r.stock > 0 && r.stock <= r.lowStockAt).length;
  const units = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="stock" />

      <StockManager rows={rows} initialFilter={searchParams.filter ?? ''} />
    </div>
  );
}
