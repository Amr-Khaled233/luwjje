import { prisma } from './prisma';
import { pick, type Locale } from '@/i18n/config';
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

/**
 * The price to show struck through, or the selling price when there is nothing
 * to strike.
 *
 * Two things can lower a price: the shop owner typing what it used to cost
 * ("price before discount"), and a discount campaign. Whichever is higher is
 * the honest "was" figure — striking through a number lower than the one being
 * charged would be nonsense, and ignoring compareAtPrice made the field the
 * owner filled in do nothing at all.
 */
function strikeThrough(price: number, compareAt: number | null, selling: number) {
  return Math.max(price, compareAt ?? 0, selling);
}

const cardInclude = {
  images: { orderBy: { position: 'asc' } },
  variants: { orderBy: { position: 'asc' } },
  category: { select: { name: true, nameAr: true } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function toCard(p: ProductWithRelations, locale: Locale): ProductCardData {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const hover = p.images.find((i) => i.isHover) ?? p.images[1] ?? null;
  const price = p.price;
  const listPrice = strikeThrough(p.price, p.compareAtPrice, price);

  // De-duplicate colourways (a colour may span several sizes).
  const colors: { name: string; hex: string }[] = [];
  for (const v of p.variants) {
    const name = pick(locale, v.colorName, v.colorNameAr);
    if (!colors.some((c) => c.name === name)) colors.push({ name, hex: v.colorHex });
  }

  return {
    id: p.id,
    slug: p.slug,
    name: pick(locale, p.name, p.nameAr),
    price,
    listPrice,
    discounted: listPrice > price,
    categoryName: p.category ? pick(locale, p.category.name, p.category.nameAr) : null,
    primaryImage: primary?.url ?? '',
    hoverImage: hover?.url ?? null,
    colors,
    inStock: p.variants.some((v) => v.stock > 0),
  };
}

export async function getBestSellers(locale: Locale, limit = 4): Promise<ProductCardData[]> {
  const flagged = await prisma.product.findMany({
    where: { status: 'PUBLISHED', isBestSeller: true },
    include: cardInclude,
    orderBy: [{ bestSellerOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  // Fall back to actual sales only when nothing has been curated at all —
  // a deliberate selection of two should show two, not two plus filler.
  if (flagged.length > 0) return flagged.map((p) => toCard(p, locale));

  const filler = await prisma.product.findMany({
    where: { status: 'PUBLISHED' },
    include: cardInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return filler.map((p) => toCard(p, locale));
}

export interface ShopFilters {
  q?: string;
  category?: string;
  price?: string; // "<min>-<max>" | "<min>-" for open-ended
  sort?: string; // best | price-asc | price-desc | newest
  page?: number;
  perPage?: number;
}

export async function getShopProducts(filters: ShopFilters, locale: Locale) {
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { status: 'PUBLISHED' };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { nameAr: { contains: filters.q } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { descriptionAr: { contains: filters.q } },
      { category: { name: { contains: filters.q, mode: 'insensitive' } } },
    ];
  }
  if (filters.category) {
    where.category = { slug: filters.category, visible: true };
  }
  if (filters.price) {
    const [minRaw, maxRaw] = filters.price.split('-');
    const min = Number(minRaw) || 0;
    const max = maxRaw ? Number(maxRaw) : undefined;
    where.price = max && Number.isFinite(max) ? { gte: min, lte: max } : { gte: min };
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
    products: rows.map((p) => toCard(p, locale)),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Filter bar options. Colours and price ranges are curated in the dashboard;
 * only rows marked visible reach the customer, and colours with nothing in
 * stock are dropped so the filter never leads to an empty grid.
 */
export async function getFilterOptions(locale: Locale) {
  const [categories, priceRanges] = await Promise.all([
    prisma.category.findMany({
      where: { visible: true, products: { some: { status: 'PUBLISHED' } } },
      select: { name: true, nameAr: true, slug: true },
      orderBy: { position: 'asc' },
    }),
    prisma.priceRange.findMany({ where: { visible: true }, orderBy: { position: 'asc' } }),
  ]);

  return {
    categories: categories.map((c) => ({
      value: c.slug,
      label: pick(locale, c.name, c.nameAr),
    })),
    priceRanges: priceRanges.map((r) => ({
      value: `${r.min}-${r.max ?? ''}`,
      label: pick(locale, r.label, r.labelAr),
    })),
  };
}

export async function getProductBySlug(slug: string, locale: Locale) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: { orderBy: { position: 'asc' } },
      category: true,
    },
  });
  if (!product || product.status !== 'PUBLISHED') return null;

  const price = product.price;

  return {
    id: product.id,
    slug: product.slug,
    categoryId: product.categoryId,
    name: pick(locale, product.name, product.nameAr),
    description: pick(locale, product.description, product.descriptionAr),
    categoryName: product.category ? pick(locale, product.category.name, product.category.nameAr) : null,
    categorySlug: product.category?.slug ?? null,
    sku: product.sku,
    effectivePrice: price,
    listPrice: strikeThrough(product.price, product.compareAtPrice, price),
    discounted: strikeThrough(product.price, product.compareAtPrice, price) > price,
    images: product.images.map((i) => ({ url: i.url, alt: i.alt || product.name })),
    variants: product.variants.map((v) => ({
      id: v.id,
      colorName: pick(locale, v.colorName, v.colorNameAr),
      colorHex: v.colorHex,
      size: v.size,
      stock: v.stock,
    })),
  };
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  locale: Locale,
  limit = 4,
) {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED', id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    include: cardInclude,
    orderBy: { soldCount: 'desc' },
    take: limit,
  });

  if (rows.length >= limit) return rows.map((p) => toCard(p, locale));

  const filler = await prisma.product.findMany({
    where: { status: 'PUBLISHED', id: { notIn: [productId, ...rows.map((r) => r.id)] } },
    include: cardInclude,
    orderBy: { soldCount: 'desc' },
    take: limit - rows.length,
  });

  return [...rows, ...filler].map((p) => toCard(p, locale));
}
