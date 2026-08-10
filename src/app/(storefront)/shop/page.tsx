import type { Metadata } from 'next';
import { ProductGrid } from '@/components/storefront/product-card';
import { ShopFilterBar } from '@/components/storefront/shop-filters';
import { Pagination } from '@/components/storefront/pagination';
import { EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { getShopProducts, getFilterOptions } from '@/lib/queries';
import { getSettings, getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.shop.title };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams[k];
    return typeof v === 'string' && v.length ? v : undefined;
  };

  const { locale, t } = await getI18n();

  const filters = {
    q: get('q'),
    color: get('color'),
    category: get('category'),
    price: get('price'),
    sort: get('sort') ?? 'best',
    page: Number(get('page') ?? 1) || 1,
    perPage: 12,
  };

  const [{ products, total, page, pageCount }, options, settings, symbol] = await Promise.all([
    getShopProducts(filters, locale),
    getFilterOptions(locale),
    getSettings(),
    getCurrencySymbol(locale),
  ]);

  const anyFilterVisible =
    settings.showColorFilter ||
    settings.showCategoryFilter ||
    settings.showPriceFilter ||
    settings.showSortFilter;

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <header className="text-center">
        <p className="label-caps mb-4 text-secondary">{t.shop.eyebrow}</p>
        <h1 className="font-display text-display-sm md:text-display-md">
          {filters.q ? `“${filters.q}”` : t.shop.title}
        </h1>
        <p className="mt-4 text-body-md text-secondary">
          {total} {total === 1 ? t.shop.piece : t.shop.pieces}
        </p>
      </header>

      {anyFilterVisible && (
        <ShopFilterBar
          t={t}
          colors={settings.showColorFilter ? options.colors : []}
          categories={settings.showCategoryFilter ? options.categories : []}
          priceRanges={settings.showPriceFilter ? options.priceRanges : []}
          showSort={settings.showSortFilter}
          className="mt-stack-md"
        />
      )}

      <div className="mt-stack-md">
        {products.length ? (
          <ProductGrid products={products} currencySymbol={symbol} locale={locale} t={t} />
        ) : total === 0 && !filters.q && !filters.color && !filters.category && !filters.price ? (
          <EmptyState title={t.shop.emptyTitle} body={t.shop.emptyHint} />
        ) : (
          <EmptyState
            title={t.shop.noMatch}
            body={t.shop.noMatchHint}
            action={<ButtonLink href="/shop">{t.shop.clearFilters}</ButtonLink>}
          />
        )}
      </div>

      {pageCount > 1 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          previousLabel={t.common.previousPage}
          nextLabel={t.common.nextPage}
          className="mt-stack-md"
        />
      )}
    </div>
  );
}
