import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Resolves the first in-stock variant for Quick Add. Price comes from the
 * database, never from the grid the browser rendered.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { position: 'asc' } },
    },
  });

  if (!product || product.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const variant = product.variants.find((v) => v.stock > 0);
  if (!variant) {
    return NextResponse.json({ error: 'Out of stock' }, { status: 409 });
  }

  const price = variant.priceOverride ?? product.price;
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];

  return NextResponse.json({
    variantId: variant.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    size: variant.size,
    unitPrice: price,
    imageUrl: image?.url ?? '',
    maxStock: variant.stock,
  });
}
