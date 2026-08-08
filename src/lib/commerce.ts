import { prisma } from './prisma';
import { getSettings } from './settings';

export interface ResolvedLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  unitPrice: number;
  listPrice: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
  /** Set when the requested quantity had to be trimmed or dropped. */
  notice?: string;
}

/**
 * Automatic (non-code) campaigns currently in their window, indexed for
 * fast lookup while pricing a basket or rendering a grid.
 */
export async function getActiveDiscountMap() {
  const now = new Date();
  const campaigns = await prisma.discount.findMany({
    where: { active: true },
    include: { products: { select: { productId: true } } },
  });

  const live = campaigns.filter(
    (c) => (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now),
  );

  return {
    byProduct: new Map(
      live
        .filter((c) => c.scope === 'PRODUCTS')
        .flatMap((c) => c.products.map((p) => [p.productId, c] as const)),
    ),
    byCategory: new Map(
      live.filter((c) => c.scope === 'CATEGORY' && c.categoryId).map((c) => [c.categoryId!, c] as const),
    ),
    global: live.find((c) => c.scope === 'ALL') ?? null,
  };
}

export type DiscountMap = Awaited<ReturnType<typeof getActiveDiscountMap>>;

/** Applies the best matching campaign to a list price. */
export function applyDiscount(
  price: number,
  productId: string,
  categoryId: string | null,
  map: DiscountMap,
) {
  const campaign =
    map.byProduct.get(productId) ??
    (categoryId ? map.byCategory.get(categoryId) : undefined) ??
    map.global;
  if (!campaign) return { price, discounted: false, campaignName: null as string | null };

  const next =
    campaign.discountType === 'PERCENT'
      ? price * (1 - campaign.discountValue / 100)
      : price - campaign.discountValue;

  const final = Math.max(0, Math.round(next * 100) / 100);
  return { price: final, discounted: final < price, campaignName: campaign.name };
}

/**
 * Turns client-side cart lines into server-verified rows. This is the single
 * source of truth for price and stock — the browser's copy is only a cache.
 */
export async function resolveCartLines(
  lines: { variantId: string; quantity: number }[],
): Promise<ResolvedLine[]> {
  if (lines.length === 0) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      product: {
        include: { images: { orderBy: { position: 'asc' } } },
      },
    },
  });

  const discounts = await getActiveDiscountMap();
  const byId = new Map(variants.map((v) => [v.id, v]));
  const resolved: ResolvedLine[] = [];

  for (const line of lines) {
    const v = byId.get(line.variantId);
    // Dropped: variant or product deleted / unpublished by the admin.
    if (!v || v.product.status !== 'PUBLISHED') continue;

    const listPrice = v.priceOverride ?? v.product.price;
    const { price } = applyDiscount(listPrice, v.productId, v.product.categoryId, discounts);
    const primary = v.product.images.find((i) => i.isPrimary) ?? v.product.images[0];

    const quantity = Math.min(line.quantity, v.stock);
    if (quantity <= 0) continue;

    resolved.push({
      variantId: v.id,
      productId: v.productId,
      slug: v.product.slug,
      name: v.product.name,
      colorName: v.colorName,
      colorHex: v.colorHex,
      size: v.size,
      unitPrice: price,
      listPrice,
      imageUrl: primary?.url ?? '',
      quantity,
      maxStock: v.stock,
      notice:
        quantity < line.quantity ? `Only ${v.stock} left — quantity adjusted.` : undefined,
    });
  }

  return resolved;
}

export interface PromoResult {
  ok: boolean;
  message: string;
  code?: string;
  discount: number;
}

/** Validates a promo code against the live table and the current subtotal. */
export async function validatePromoCode(rawCode: string, subtotal: number): Promise<PromoResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, message: 'Enter a promo code.', discount: 0 };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return { ok: false, message: 'That code is not recognised.', discount: 0 };
  }

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return { ok: false, message: 'That code is not active yet.', discount: 0 };
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return { ok: false, message: 'That code has expired.', discount: 0 };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return { ok: false, message: 'That code has reached its usage limit.', discount: 0 };
  }
  if (subtotal < promo.minOrder) {
    return {
      ok: false,
      message: `Spend at least $${promo.minOrder.toFixed(2)} to use this code.`,
      discount: 0,
    };
  }

  const raw =
    promo.discountType === 'PERCENT' ? subtotal * (promo.discountValue / 100) : promo.discountValue;
  const discount = Math.min(subtotal, Math.round(raw * 100) / 100);

  return {
    ok: true,
    code: promo.code,
    discount,
    message:
      promo.discountType === 'PERCENT'
        ? `${promo.discountValue}% off applied.`
        : `$${promo.discountValue.toFixed(2)} off applied.`,
  };
}

/** Shipping cost for a region, honouring per-zone and global free thresholds. */
export async function calculateShipping(region: string, subtotal: number) {
  const settings = await getSettings();
  const zones = await prisma.shippingZone.findMany({ where: { active: true } });

  const zone = zones.find((z) =>
    z.countries
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)
      .includes(region.trim().toLowerCase()),
  );

  const rate = zone?.rate ?? settings.defaultShippingRate;
  const threshold = zone?.freeOver ?? settings.freeShippingOver;
  const free = threshold > 0 && subtotal >= threshold;

  return {
    cost: free ? 0 : rate,
    rate,
    threshold,
    free,
    zoneName: zone?.name ?? 'Standard',
    estimatedDays: zone?.estimatedDays ?? '5-8 business days',
  };
}

export async function getShippingRegions() {
  const zones = await prisma.shippingZone.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
  });
  return zones.map((z) => ({
    zone: z.name,
    countries: z.countries.split(',').map((c) => c.trim()).filter(Boolean),
  }));
}
