import { prisma } from './prisma';
import { applyDiscount, getActiveDiscountMap } from './commerce';
import type { Prisma } from '@prisma/client';

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: number;
  listPrice: number;
  discounted: boolean;
  categoryName: string | null;
  primaryImage: string;
  hoverImage: string | null;
  colors: { name: string; hex: string }[];
  inStock: boolean;
}

const cardInclude = {
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' } },
  category: { select: { name: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toCard(
  p: ProductWithRelations,
  discounts: Awaited<ReturnType<typeof getActiveDiscountMap>>,
): ProductCardData {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const hover = p.images.find((i) => i.isHover) ?? p.images[1] ?? null;
  const { price, discounted } = applyDiscount(p.price, p.id, p.categoryId, discounts);

  // De-duplicate colourways (a colour may span several sizes).
  const colors: { name: string; hex: string }[] = [];
  for (const v of p.variants) {
    if (!colors.some((c) => c.name === v.colorName)) {
      colors.push({ name: v.colorName, hex: v.colorHex });
    }
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price,
    listPrice: p.price,
    discounted,
    categoryName: p.category?.name ?? null,
    primaryImage: primary?.url ?? '',
    hoverImage: hover?.url ?? null,
    colors,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

export async function getBestSellers(limit = 4): Promise<ProductCardData[]> {
  const discounts = await getActiveDiscountMap();
  const flagged = await prisma.product.findMany({
    where: { status: 'PUBLISHED', isBestSeller: true },
    include: cardInclude,
    orderBy: [{ bestSellerOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  // Fall back to actual sales if the admin has not curated the row yet.
  if (flagged.length >= limit) return flagged.map((p) => toCard(p, discounts));

  const filler = await prisma.product.findMany({
    where: { status: 'PUBLISHED', id: { notIn: flagged.map((p) => p.id) } },
    include: cardInclude,
    orderBy: { soldCount: 'desc' },
    take: limit - flagged.length,
  });

  return [...flagged, ...filler].map((p) => toCard(p, discounts));
}

export interface ShopFilters {
  q?: string;
  color?: string;
  category?: string;
  price?: string; // "0-100" | "100-250" | "250-500" | "500+"
  sort?: string; // best | price-asc | price-desc | newest
  page?: number;
  perPage?: number;
}

export async function getShopProducts(filters: ShopFilters) {
  const discounts = await getActiveDiscountMap();
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { description: { contains: filters.q } },
      { category: { name: { contains: filters.q } } },
    ];
  }
  if (filters.color) {
    where.variants = { some: { colorName: filters.color } };
  }
  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.price) {
    const [minRaw, maxRaw] = filters.price.split('-');
    const min = Number(minRaw) || 0;
    const max = maxRaw && maxRaw !== '+' ? Number(maxRaw) : undefined;
    where.price = max ? { gte: min, lte: max } : { gte: min };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === 'price-asc'
      ? { price: 'asc' }
      : filters.sort === 'price-desc'
        ? { price: 'desc' }
        : filters.sort === 'newest'
          ? { createdAt: 'desc' }
          : { soldCount: 'desc' };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: rows.map((p) => toCard(p, discounts)),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Distinct colourways across the published catalogue, for the Shop filter. */
export async function getFilterOptions() {
  const [variants, categories] = await Promise.all([
    prisma.productVariant.findMany({
      where: { product: { status: 'PUBLISHED' } },
      select: { colorName: true, colorHex: true },
      distinct: ['colorName'],
      orderBy: { colorName: 'asc' },
    }),
    prisma.category.findMany({
      where: { products: { some: { status: 'PUBLISHED' } } },
      select: { name: true, slug: true },
      orderBy: { position: 'asc' },
    }),
  ]);

  return {
    colors: variants.map((v) => ({ name: v.colorName, hex: v.colorHex })),
    categories,
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { position: 'asc' } },
      category: true,
    },
  });
  if (!product || product.status !== 'PUBLISHED') return null;

  const discounts = await getActiveDiscountMap();
  const { price, discounted, campaignName } = applyDiscount(
    product.price,
    product.id,
    product.categoryId,
    discounts,
  );

  return { ...product, effectivePrice: price, discounted, campaignName };
}

export async function getRelatedProducts(productId: string, categoryId: string | null, limit = 4) {
  const discounts = await getActiveDiscountMap();
  const rows = await prisma.product.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: productId },
      ...(categoryId ? { categoryId } : {}),
    },
    include: cardInclude,
    orderBy: { soldCount: 'desc' },
    take: limit,
  });

  if (rows.length >= limit) return rows.map((p) => toCard(p, discounts));

  const filler = await prisma.product.findMany({
    where: { status: 'PUBLISHED', id: { notIn: [productId, ...rows.map((r) => r.id)] } },
    include: cardInclude,
    orderBy: { soldCount: 'desc' },
    take: limit - rows.length,
  });

  return [...rows, ...filler].map((p) => toCard(p, discounts));
}
