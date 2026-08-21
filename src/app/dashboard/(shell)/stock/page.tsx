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
  });

  /**
   * Every size of a colour together, every colour of a product together.
   * Sorting by quantity scattered one product across the whole page, which
   * made "how many of this do I have?" a search rather than a glance.
   */
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const sizeRank = (size: string | null) => {
    const i = SIZE_ORDER.indexOf((size ?? '').toUpperCase());
    return i === -1 ? SIZE_ORDER.length : i;
  };

  const rows = variants
    .map((v) => ({
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
    }))
    .sort(
      (a, b) =>
        a.productName.localeCompare(b.productName) ||
        a.colorName.localeCompare(b.colorName) ||
        sizeRank(a.size) - sizeRank(b.size) ||
        (a.size ?? '').localeCompare(b.size ?? ''),
    );

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="stock" />

      <StockManager rows={rows} initialFilter={searchParams.filter ?? ''} />
    </div>
  );
}
