import { PageTitle } from '@/components/dashboard/page-title';
import { FiltersManager } from '@/components/dashboard/filters-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardFiltersPage() {
  const [colors, priceRanges, settings, liveColors] = await Promise.all([
    prisma.filterColor.findMany({ orderBy: { position: 'asc' } }),
    prisma.priceRange.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
    prisma.productVariant.findMany({
      where: { product: { status: 'PUBLISHED' } },
      select: { colorName: true },
      distinct: ['colorName'],
    }),
  ]);

  const inCatalogue = new Set(liveColors.map((v) => v.colorName));

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="filters" />

      <FiltersManager
        colors={colors.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          hex: c.hex,
          visible: c.visible,
          inCatalogue: inCatalogue.has(c.name),
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
          showColorFilter: settings.showColorFilter,
          showCategoryFilter: settings.showCategoryFilter,
          showPriceFilter: settings.showPriceFilter,
          showSortFilter: settings.showSortFilter,
          showSearch: settings.showSearch,
        }}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
