import type { Metadata } from 'next';
import { ProductGrid } from '@/components/storefront/product-card';
import { ShopFilterBar } from '@/components/storefront/shop-filters';
import { Pagination } from '@/components/storefront/pagination';
import { EmptyState } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { getShopProducts, getFilterOptions } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'All Products',
  description: 'The complete luwjje collection — knitwear, outerwear, shirting and accessories.',
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const get = (k: string) => {
    const v = searchParams[k];
    return typeof v === 'string' && v.length ? v : undefined;
  };

  const filters = {
    q: get('q'),
    color: get('color'),
    category: get('category'),
    price: get('price'),
    sort: get('sort') ?? 'best',
    page: Number(get('page') ?? 1) || 1,
    perPage: 12,
  };

  const [{ products, total, page, pageCount }, options] = await Promise.all([
    getShopProducts(filters),
    getFilterOptions(),
  ]);

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <header className="text-center">
        <p className="label-caps mb-4 text-secondary">The Collection</p>
        <h1 className="font-display text-display-sm md:text-display-md">
          {filters.q ? `“${filters.q}”` : 'All Products'}
        </h1>
        <p className="mt-4 text-body-md text-secondary">
          {total} {total === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      <ShopFilterBar
        colors={options.colors}
        categories={options.categories}
        className="mt-stack-md"
      />

      <div className="mt-stack-md">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <EmptyState
            title="Nothing matches those filters."
            body="Try widening the price range or clearing the colour selection."
            action={<ButtonLink href="/shop">Clear filters</ButtonLink>}
          />
        )}
      </div>

      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} className="mt-stack-md" />}
    </div>
  );
}
