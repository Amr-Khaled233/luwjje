import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { ProductDetail } from '@/components/storefront/product-detail';
import { ProductGrid } from '@/components/storefront/product-card';
import { SectionHeading } from '@/components/ui/primitives';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries';
import { getSettings, getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';
import { getLocale } from '@/i18n/server';
import { prisma } from '@/lib/prisma';
import { jsonLdScript } from '@/lib/json-ld';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const locale = await getLocale();
  const product = await getProductBySlug(params.slug, locale);
  if (!product) return { title: 'Not found' };

  const settings = await getSettings();
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description: product.description.slice(0, 180),
    openGraph: {
      type: 'website',
      title: `${product.name} — ${settings.storeName}`,
      description: product.description.slice(0, 180),
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { locale, t } = await getI18n();
  const product = await getProductBySlug(params.slug, locale);
  if (!product) notFound();

  const [related, symbol] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId, locale, 4),
    getCurrencySymbol(locale),
  ]);

  // Fire-and-forget: powers the Analytics view counts.
  prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.url),
    sku: product.sku ?? undefined,
    offers: {
      '@type': 'Offer',
      price: product.effectivePrice.toFixed(2),
      priceCurrency: 'EGP',
      availability: product.variants.some((v) => v.stock > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container-luwjje py-8 md:py-stack-md">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex items-center gap-2 text-body-sm text-secondary"
      >
        <Link href="/" className="hover:text-on-surface">
          {t.product.home}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <Link href="/shop" className="hover:text-on-surface">
          {t.nav.shop}
        </Link>
        {product.categoryName && product.categorySlug && (
          <>
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-on-surface">
              {product.categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <ProductDetail
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          price: product.effectivePrice,
          listPrice: product.listPrice,
          discounted: product.discounted,
          categoryName: product.categoryName,
          images: product.images,
          variants: product.variants,
        }}
        currencySymbol={symbol}
        locale={locale}
        t={t}
      />

      {related.length > 0 && (
        <section className="mt-16 md:mt-stack-lg">
          <SectionHeading eyebrow={t.product.relatedEyebrow} title={t.product.related} />
          <div className="mt-stack-md">
            <ProductGrid products={related} currencySymbol={symbol} locale={locale} t={t} />
          </div>
        </section>
      )}
    </div>
  );
}
