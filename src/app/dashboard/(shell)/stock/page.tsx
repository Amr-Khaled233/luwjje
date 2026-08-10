import { StatCard } from '@/components/dashboard/admin-ui';
import { PageTitle } from '@/components/dashboard/page-title';
import { StockManager } from '@/components/dashboard/stock-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total SKUs" value={String(rows.length)} />
        <StatCard label="Units on hand" value={units.toLocaleString()} />
        <StatCard label="Low stock" value={String(low)} hint="at or below their own mark" />
        <StatCard label="Out of stock" value={String(outOfStock)} />
      </div>

      <StockManager rows={rows} initialFilter={searchParams.filter ?? ''} />
    </div>
  );
}
