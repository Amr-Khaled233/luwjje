import { prisma } from './prisma';
import { getSettings } from './settings';
import { pick, type Locale } from '@/i18n/config';

export interface ResolvedLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  nameAr: string;
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
    include: { product: { include: { images: { orderBy: { position: 'asc' } } } } },
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
      nameAr: v.product.nameAr,
      colorName: v.colorName,
      colorHex: v.colorHex,
      size: v.size,
      unitPrice: price,
      listPrice,
      imageUrl: primary?.url ?? '',
      quantity,
      maxStock: v.stock,
      notice: quantity < line.quantity ? `Only ${v.stock} left — quantity adjusted.` : undefined,
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
export async function validatePromoCode(
  rawCode: string,
  subtotal: number,
  locale: Locale = 'en',
): Promise<PromoResult> {
  const code = rawCode.trim().toUpperCase();
  const settings = await getSettings();
  const symbol = locale === 'ar' ? settings.currencySymbolAr : settings.currencySymbol;

  const msg = (en: string, ar: string) => (locale === 'ar' ? ar : en);

  if (!code) return { ok: false, message: msg('Enter a promo code.', 'أدخل كود الخصم.'), discount: 0 };

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo || !promo.active) {
    return { ok: false, message: msg('That code is not recognised.', 'هذا الكود غير معروف.'), discount: 0 };
  }

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) {
    return { ok: false, message: msg('That code is not active yet.', 'هذا الكود لم يبدأ بعد.'), discount: 0 };
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return { ok: false, message: msg('That code has expired.', 'انتهت صلاحية هذا الكود.'), discount: 0 };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    return {
      ok: false,
      message: msg('That code has reached its usage limit.', 'وصل هذا الكود إلى حد الاستخدام.'),
      discount: 0,
    };
  }
  if (subtotal < promo.minOrder) {
    return {
      ok: false,
      message: msg(
        `Spend at least ${symbol} ${promo.minOrder.toLocaleString()} to use this code.`,
        `أضِف ما قيمته ${promo.minOrder.toLocaleString('ar-EG')} ${symbol} على الأقل لاستخدام هذا الكود.`,
      ),
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
        ? msg(`${promo.discountValue}% off applied.`, `تم تطبيق خصم ${promo.discountValue}٪.`)
        : msg(
            `${symbol} ${promo.discountValue.toLocaleString()} off applied.`,
            `تم تطبيق خصم ${promo.discountValue.toLocaleString('ar-EG')} ${symbol}.`,
          ),
  };
}

/**
 * Whether delivery is free right now, and what the shopper would have to spend
 * for it to become free.
 *
 * Rules stack rather than override: any live rule the basket satisfies makes
 * delivery free. `nextThreshold` is the cheapest one still out of reach, which
 * is what the cart's progress meter counts towards — showing the highest, or
 * the first, would tell the shopper to spend more than they need to.
 */
export async function getFreeShipping(subtotal: number) {
  const now = new Date();

  const live = await prisma.freeShippingRule.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
  });

  const free = live.some((rule) => subtotal >= (rule.minOrder ?? 0));

  const pending = live
    .map((rule) => rule.minOrder ?? 0)
    .filter((minimum) => minimum > subtotal);

  return { free, nextThreshold: pending.length ? Math.min(...pending) : 0 };
}

/**
 * Delivery cost for a governorate. Each governorate carries its own price;
 * whether that price is waived is decided by the free-shipping rules.
 */
export async function calculateShipping(governorateName: string, subtotal: number) {
  const settings = await getSettings();
  // Checkout submits the English name, but accept the Arabic one too so a
  // stray localised value is priced correctly instead of silently falling
  // back to the default rate.
  const governorate = await prisma.governorate.findFirst({
    where: {
      active: true,
      OR: [{ name: governorateName }, { nameAr: governorateName }],
    },
  });

  const rate = governorate?.shippingCost ?? settings.defaultShippingRate;
  const { free, nextThreshold } = await getFreeShipping(subtotal);

  return {
    cost: free ? 0 : rate,
    rate,
    threshold: nextThreshold,
    free,
    governorateId: governorate?.id ?? null,
    zoneName: governorate?.name ?? 'Standard',
    zoneNameAr: governorate?.nameAr ?? '',
    estimatedDays: governorate?.estimatedDays ?? '3-5',
  };
}

/** Governorates offered at checkout, in the visitor's language. */
export async function getGovernorates(locale: Locale = 'en') {
  const rows = await prisma.governorate.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
  });

  return rows.map((g) => ({
    // The stored value is always the English name so orders stay comparable.
    value: g.name,
    label: pick(locale, g.name, g.nameAr),
    shippingCost: g.shippingCost,
    estimatedDays: g.estimatedDays,
  }));
}
