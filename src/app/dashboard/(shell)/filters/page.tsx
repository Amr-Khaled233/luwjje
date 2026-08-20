import { PageTitle } from '@/components/dashboard/page-title';
import { FiltersManager } from '@/components/dashboard/filters-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardFiltersPage() {
  const [priceRanges, settings, liveColors, categories] = await Promise.all([
    prisma.priceRange.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
    prisma.productVariant.findMany({
      where: { product: { status: 'PUBLISHED' } },
      select: { colorName: true },
      distinct: ['colorName'],
    }),
    // The count is what makes the row worth reading: a category with nothing
    // published behind it is a dead end in the filter.
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
      },
    }),
  ]);

  const inCatalogue = new Set(liveColors.map((v) => v.colorName));

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="filters" />

      <FiltersManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          visible: c.visible,
          productCount: c._count.products,
        }))}
        priceRanges={priceRanges.map((r) => ({
          id: r.id,
          label: r.label,
          labelAr: r.labelAr,
          min: r.min,
          max: r.max,
          visible: r.visible,
        }))}
        visibility={{
          showCategoryFilter: settings.showCategoryFilter,
          showPriceFilter: settings.showPriceFilter,
          showSortFilter: settings.showSortFilter,
        }}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
