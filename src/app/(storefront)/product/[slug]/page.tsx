import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { ProductDetail } from '@/components/storefront/product-detail';
import { ProductGrid } from '@/components/storefront/product-card';
import { SectionHeading } from '@/components/ui/primitives';
import { getProductBySlug, getRelatedProducts } from '@/lib/queries';
import { getSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Not found' };

  const image = product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url;
  const settings = await getSettings();

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
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId, 4);

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
      priceCurrency: 'USD',
      availability: product.variants.some((v) => v.stock > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container-luwjje py-8 md:py-stack-md">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-body-sm text-secondary">
        <Link href="/" className="hover:text-on-surface">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/shop" className="hover:text-on-surface">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-on-surface">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-on-surface">{product.name}</span>
      </nav>

      <ProductDetail
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          materialInfo: product.materialInfo,
          careInfo: product.careInfo,
          price: product.effectivePrice,
          listPrice: product.price,
          discounted: product.discounted,
          categoryName: product.category?.name ?? null,
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
          variants: product.variants.map((v) => ({
            id: v.id,
            colorName: v.colorName,
            colorHex: v.colorHex,
            size: v.size,
            stock: v.stock,
          })),
        }}
      />

      {related.length > 0 && (
        <section className="mt-stack-lg">
          <SectionHeading eyebrow="Considered together" title="You may also like" />
          <div className="mt-stack-md">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </div>
  );
}
