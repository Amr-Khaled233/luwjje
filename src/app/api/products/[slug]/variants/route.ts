import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pick, isLocale } from '@/i18n/config';

/**
 * The colourways and sizes for a Quick Add picker, in the shopper's language.
 * Prices and stock come from the database, never from the rendered grid, so a
 * stale or sold-out choice can never be added. One variant per colour/size.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const localeParam = new URL(req.url).searchParams.get('locale');
  const locale = isLocale(localeParam) ? localeParam : 'en';

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

  const image = product.images.find((i) => i.isPrimary) ?? product.images[0];

  return NextResponse.json({
    productId: product.id,
    slug: product.slug,
    name: pick(locale, product.name, product.nameAr),
    imageUrl: image?.url ?? '',
    variants: product.variants.map((v) => ({
      id: v.id,
      colorName: pick(locale, v.colorName, v.colorNameAr),
      colorHex: v.colorHex,
      size: v.size,
      stock: v.stock,
      unitPrice: v.priceOverride ?? product.price,
    })),
  });
}
