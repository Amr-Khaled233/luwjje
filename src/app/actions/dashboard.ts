'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { applyOrderEdit } from '@/lib/orders';
import { requireDashboard } from '@/lib/dashboard-auth';
import { slugify } from '@/lib/utils';
import {
  editOrderSchema,
  productSchema,
  promoSchema,
  freeShippingSchema,
  governorateSchema,
  governorateRatesSchema,
  priceRangeSchema,
  filterVisibilitySchema,
  bannerSchema,
  discountSchema,
  settingsSchema,
  pageSchema,
  categorySchema,
} from '@/lib/validations';
import { z } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

function zodErrors(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join('.')] = issue.message;
  return {
    ok: false,
    error: error.issues[0]?.message ?? 'Please check the form.',
    fieldErrors,
  };
}

/** Every admin mutation runs through this so the guard can never be forgotten. */
async function guard<T>(fn: () => Promise<T>): Promise<T | ActionResult> {
  try {
    await requireDashboard();
  } catch {
    return { ok: false, error: 'You are not authorised to do that.' } as ActionResult;
  }
  return fn();
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Storefront pages are rendered dynamically, but revalidating keeps any
 * cached segments honest the moment an admin saves.
 */
function revalidateStorefront() {
  revalidatePath('/', 'layout');
}

// ================================================================ products

export async function saveProduct(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const data = parsed.data;
    const slug = data.slug?.trim() || slugify(data.name);

    // Slug must stay unique across the catalogue.
    const clash = await prisma.product.findFirst({
      where: { slug, ...(data.id ? { NOT: { id: data.id } } : {}) },
      select: { id: true },
    });
    if (clash) {
      return {
        ok: false,
        error: 'Another product already uses that URL slug.',
        fieldErrors: { slug: 'Already in use.' },
      };
    }

    // The SKU is an internal key now — nobody types it, so it is derived from
    // the product slug plus the colour and size, which are already unique
    // within a product. A counter disambiguates the rare cross-product clash.
    const used = new Set<string>();
    const variants = data.variants.map((v) => {
      const base = [
        slug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'ITEM',
        v.colorName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'STD',
        v.size ? v.size.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : 'OS',
      ].join('-');

      let sku = v.sku?.trim() || base;
      let n = 2;
      while (used.has(sku)) sku = `${base}-${n++}`;
      used.add(sku);
      return { ...v, sku };
    });

    // A generated SKU can still collide with another product's; nudge it until
    // it does not, rather than refusing a save the shop owner cannot act on.
    const taken = await prisma.productVariant.findMany({
      where: {
        sku: { in: variants.map((v) => v.sku) },
        ...(data.id ? { productId: { not: data.id } } : {}),
      },
      select: { sku: true },
    });
    if (taken.length) {
      const clashes = new Set(taken.map((t) => t.sku));
      for (const v of variants) {
        if (!clashes.has(v.sku)) continue;
        v.sku = `${v.sku}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      }
    }
    data.variants = variants;

    // Exactly one primary and at most one hover image.
    const images = data.images.map((img, i) => ({
      url: img.url,
      alt: img.alt || data.name,
      position: i,
      isPrimary: i === 0,
      isHover: i === 1,
    }));

    const base = {
      name: data.name,
      nameAr: data.nameAr,
      slug,
      description: data.description,
      descriptionAr: data.descriptionAr,
      price: data.price,
      compareAtPrice: data.compareAtPrice || null,
      sku: data.sku || null,
      categoryId: data.categoryId || null,
      status: data.status,
      isBestSeller: data.isBestSeller,
      bestSellerOrder: data.bestSellerOrder,
      hasSizes: data.variants.some((v) => v.size),
    };

    const product = await prisma.$transaction(async (tx) => {
      if (data.id) {
        const updated = await tx.product.update({ where: { id: data.id }, data: base });

        // Images are fully replaced; they carry no history worth preserving.
        await tx.productImage.deleteMany({ where: { productId: data.id } });
        if (images.length) {
          await tx.productImage.createMany({
            data: images.map((i) => ({ ...i, productId: data.id! })),
          });
        }

        // Variants are reconciled, not wiped — order history references them.
        const keepIds = data.variants.map((v) => v.id).filter(Boolean) as string[];
        await tx.productVariant.deleteMany({
          where: { productId: data.id, id: { notIn: keepIds.length ? keepIds : ['__none__'] } },
        });

        for (let i = 0; i < data.variants.length; i++) {
          const v = data.variants[i];
          const payload = {
            colorName: v.colorName,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            size: v.size || null,
            sku: v.sku!,
            stock: v.stock,
            lowStockAt: v.lowStockAt,
            position: i,
          };
          if (v.id) {
            await tx.productVariant.update({ where: { id: v.id }, data: payload });
          } else {
            await tx.productVariant.create({ data: { ...payload, productId: data.id! } });
          }
        }
        return updated;
      }

      return tx.product.create({
        data: {
          ...base,
          images: { create: images },
          variants: {
            create: data.variants.map((v, i) => ({
              colorName: v.colorName,
              colorNameAr: v.colorNameAr,
              colorHex: v.colorHex,
              size: v.size || null,
              sku: v.sku!,
              stock: v.stock,
              lowStockAt: v.lowStockAt,
              position: i,
            })),
          },
        },
      });
    });

    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true, id: product.id };
  }) as Promise<ActionResult>;
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.product.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function toggleProductStatus(id: string): Promise<ActionResult> {
  return guard(async () => {
    const product = await prisma.product.findUnique({ where: { id }, select: { status: true } });
    if (!product) return { ok: false, error: 'Product not found.' };

    await prisma.product.update({
      where: { id },
      data: { status: product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' },
    });
    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function toggleBestSeller(id: string): Promise<ActionResult> {
  return guard(async () => {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { isBestSeller: true },
    });
    if (!product) return { ok: false, error: 'Product not found.' };

    if (!product.isBestSeller) {
      const max = await prisma.product.aggregate({
        where: { isBestSeller: true },
        _max: { bestSellerOrder: true },
      });
      await prisma.product.update({
        where: { id },
        data: { isBestSeller: true, bestSellerOrder: (max._max.bestSellerOrder ?? 0) + 1 },
      });
    } else {
      await prisma.product.update({
        where: { id },
        data: { isBestSeller: false, bestSellerOrder: 0 },
      });
    }

    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function reorderBestSeller(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  return guard(async () => {
    const list = await prisma.product.findMany({
      where: { isBestSeller: true },
      orderBy: { bestSellerOrder: 'asc' },
      select: { id: true },
    });
    const index = list.findIndex((p) => p.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= list.length) return { ok: true };

    [list[index], list[swapWith]] = [list[swapWith], list[index]];
    await prisma.$transaction(
      list.map((p, i) =>
        prisma.product.update({ where: { id: p.id }, data: { bestSellerOrder: i + 1 } }),
      ),
    );

    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ categories

export async function saveCategory(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const { id, name, nameAr, description, descriptionAr, visible } = parsed.data;
    const slug = slugify(name);

    const clash = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }], ...(id ? { NOT: { id } } : {}) },
    });
    if (clash) return { ok: false, error: 'A category with that name already exists.' };

    if (id) {
      await prisma.category.update({
        where: { id },
        data: { name, nameAr, slug, description, descriptionAr, visible },
      });
    } else {
      const count = await prisma.category.count();
      await prisma.category.create({
        data: { name, nameAr, slug, description, descriptionAr, visible, position: count },
      });
    }

    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return guard(async () => {
    // Products survive; they simply become uncategorised (onDelete: SetNull).
    await prisma.category.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/products');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ stock

const stockSchema = z.object({
  variantId: z.string().min(1),
  stock: z.coerce.number().int().min(0).max(1000000),
  lowStockAt: z.coerce.number().int().min(0).max(10000).optional(),
});

export async function updateStock(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = stockSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const { variantId, stock, lowStockAt } = parsed.data;
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock, ...(lowStockAt !== undefined ? { lowStockAt } : {}) },
    });

    revalidateStorefront();
    revalidatePath('/dashboard/stock');
    revalidatePath('/dashboard');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ orders

const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

/** Authorised wrapper; the arithmetic lives in `applyOrderEdit`. */
export async function editOrder(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = editOrderSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const result = await applyOrderEdit(parsed.data);
    if (!result.ok) return result;

    revalidateStorefront();
    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/analytics');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function updateOrderStatus(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = orderStatusSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const { orderId, status } = parsed.data;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { ok: false, error: 'Order not found.' };

    await prisma.$transaction(async (tx) => {
      // Cancelling returns the stock; un-cancelling takes it back out.
      if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { soldCount: { decrement: item.quantity } },
            });
          }
        }
      } else if (status !== 'CANCELLED' && order.status === 'CANCELLED') {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { soldCount: { increment: item.quantity } },
            });
          }
        }
      }

      await tx.order.update({ where: { id: orderId }, data: { status } });
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');
    revalidateStorefront();
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ promo codes

// ================================================================ free shipping

export async function saveFreeShippingRule(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = freeShippingSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const payload = {
      name: d.name,
      nameAr: d.nameAr,
      minOrder: d.minOrder ?? null,
      startsAt: parseDate(d.startsAt),
      endsAt: parseDate(d.endsAt),
      active: d.active,
    };

    if (d.id) await prisma.freeShippingRule.update({ where: { id: d.id }, data: payload });
    else await prisma.freeShippingRule.create({ data: payload });

    // The cart quotes delivery, so it has to be re-rendered too.
    revalidateStorefront();
    revalidatePath('/dashboard/free-shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteFreeShippingRule(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.freeShippingRule.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/free-shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function toggleFreeShippingRule(id: string): Promise<ActionResult> {
  return guard(async () => {
    const rule = await prisma.freeShippingRule.findUnique({ where: { id } });
    if (!rule) return { ok: false, error: 'Rule not found.' };

    await prisma.freeShippingRule.update({
      where: { id },
      data: { active: !rule.active },
    });

    revalidateStorefront();
    revalidatePath('/dashboard/free-shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function savePromoCode(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = promoSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const clash = await prisma.promoCode.findFirst({
      where: { code: d.code, ...(d.id ? { NOT: { id: d.id } } : {}) },
    });
    if (clash) {
      return { ok: false, error: 'That code already exists.', fieldErrors: { code: 'Already in use.' } };
    }

    const payload = {
      code: d.code,
      description: d.description,
      descriptionAr: d.descriptionAr,
      discountType: d.discountType,
      discountValue: d.discountValue,
      minOrder: d.minOrder,
      maxUses: d.maxUses ?? null,
      startsAt: parseDate(d.startsAt),
      expiresAt: parseDate(d.expiresAt),
      active: d.active,
    };

    if (d.id) await prisma.promoCode.update({ where: { id: d.id }, data: payload });
    else await prisma.promoCode.create({ data: payload });

    revalidatePath('/dashboard/promo-codes');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deletePromoCode(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.promoCode.delete({ where: { id } });
    revalidatePath('/dashboard/promo-codes');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function togglePromoCode(id: string): Promise<ActionResult> {
  return guard(async () => {
    const promo = await prisma.promoCode.findUnique({ where: { id }, select: { active: true } });
    if (!promo) return { ok: false, error: 'Code not found.' };
    await prisma.promoCode.update({ where: { id }, data: { active: !promo.active } });
    revalidatePath('/dashboard/promo-codes');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ shipping

export async function saveGovernorate(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = governorateSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const clash = await prisma.governorate.findFirst({
      where: { name: d.name, ...(d.id ? { NOT: { id: d.id } } : {}) },
    });
    if (clash) return { ok: false, error: 'A governorate with that name already exists.' };

    const payload = {
      name: d.name,
      nameAr: d.nameAr,
      shippingCost: d.shippingCost,
      estimatedDays: d.estimatedDays,
      active: d.active,
    };

    if (d.id) await prisma.governorate.update({ where: { id: d.id }, data: payload });
    else {
      const count = await prisma.governorate.count();
      await prisma.governorate.create({ data: { ...payload, position: count } });
    }

    revalidateStorefront();
    revalidatePath('/dashboard/shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

/** Bulk save from the shipping table — one round trip for the whole grid. */
export async function saveGovernorateRates(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = governorateRatesSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    await prisma.$transaction(
      parsed.data.rates.map((r) =>
        prisma.governorate.update({
          where: { id: r.id },
          data: { shippingCost: r.shippingCost, active: r.active },
        }),
      ),
    );

    revalidateStorefront();
    revalidatePath('/dashboard/shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteGovernorate(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.governorate.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ shop filters

export async function savePriceRange(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = priceRangeSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const { id, max, ...rest } = parsed.data;
    const data = { ...rest, max: max ?? null };

    if (id) await prisma.priceRange.update({ where: { id }, data });
    else {
      const count = await prisma.priceRange.count();
      await prisma.priceRange.create({ data: { ...data, position: count } });
    }

    revalidateStorefront();
    revalidatePath('/dashboard/filters');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deletePriceRange(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.priceRange.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/filters');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function saveFilterVisibility(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = filterVisibilitySchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: parsed.data,
      create: { id: 'singleton', ...parsed.data },
    });

    revalidateStorefront();
    revalidatePath('/dashboard/filters');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function toggleCategoryVisible(id: string): Promise<ActionResult> {
  return guard(async () => {
    const row = await prisma.category.findUnique({ where: { id }, select: { visible: true } });
    if (!row) return { ok: false, error: 'Category not found.' };
    await prisma.category.update({ where: { id }, data: { visible: !row.visible } });
    revalidateStorefront();
    revalidatePath('/dashboard/categories');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function reorderCategory(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  return guard(async () => {
    const list = await prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const index = list.findIndex((c) => c.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= list.length) return { ok: true };

    [list[index], list[swapWith]] = [list[swapWith], list[index]];
    await prisma.$transaction(
      list.map((c, i) => prisma.category.update({ where: { id: c.id }, data: { position: i } })),
    );

    revalidateStorefront();
    revalidatePath('/dashboard/categories');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function reorderPriceRange(
  id: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  return guard(async () => {
    const list = await prisma.priceRange.findMany({
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const index = list.findIndex((r) => r.id === id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || swapWith < 0 || swapWith >= list.length) return { ok: true };

    [list[index], list[swapWith]] = [list[swapWith], list[index]];
    await prisma.$transaction(
      list.map((r, i) => prisma.priceRange.update({ where: { id: r.id }, data: { position: i } })),
    );

    revalidateStorefront();
    revalidatePath('/dashboard/filters');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ banners

export async function saveBanner(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = bannerSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const payload = {
      slot: d.slot,
      eyebrow: d.eyebrow,
      eyebrowAr: d.eyebrowAr,
      heading: d.heading,
      headingAr: d.headingAr,
      subheading: d.subheading,
      subheadingAr: d.subheadingAr,
      body: d.body,
      bodyAr: d.bodyAr,
      ctaLabel: d.ctaLabel,
      ctaLabelAr: d.ctaLabelAr,
      imageUrl: d.imageUrl,
      badge: d.badge,
      badgeAr: d.badgeAr,
      active: d.active,
      startsAt: parseDate(d.startsAt),
      endsAt: parseDate(d.endsAt),
      position: d.position,
    };

    if (d.id) await prisma.banner.update({ where: { id: d.id }, data: payload });
    else await prisma.banner.create({ data: payload });

    revalidateStorefront();
    revalidatePath('/dashboard/offers');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.banner.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/offers');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ discounts

export async function saveDiscount(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = discountSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    if (d.scope === 'CATEGORY' && !d.categoryId) {
      return { ok: false, error: 'Choose a category for this campaign.' };
    }
    if (d.scope === 'PRODUCTS' && d.productIds.length === 0) {
      return { ok: false, error: 'Choose at least one product for this campaign.' };
    }

    const payload = {
      name: d.name,
      nameAr: d.nameAr,
      discountType: d.discountType,
      discountValue: d.discountValue,
      scope: d.scope,
      categoryId: d.scope === 'CATEGORY' ? d.categoryId || null : null,
      startsAt: parseDate(d.startsAt),
      endsAt: parseDate(d.endsAt),
      active: d.active,
    };

    await prisma.$transaction(async (tx) => {
      const campaign = d.id
        ? await tx.discount.update({ where: { id: d.id }, data: payload })
        : await tx.discount.create({ data: payload });

      await tx.discountProduct.deleteMany({ where: { discountId: campaign.id } });
      if (d.scope === 'PRODUCTS' && d.productIds.length) {
        await tx.discountProduct.createMany({
          data: d.productIds.map((productId) => ({ discountId: campaign.id, productId })),
        });
      }
    });

    revalidateStorefront();
    revalidatePath('/dashboard/offers');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteDiscount(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.discount.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/offers');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ palette

const swatchSchema = z.object({
  swatches: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        nameAr: z.string().trim().max(60).optional(),
        hex: z
          .string()
          .trim()
          .regex(/^#([0-9a-fA-F]{6})$/, 'Use a 6-digit hex colour.'),
      }),
    )
    .max(12),
});

export async function savePaletteSwatches(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = swatchSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    await prisma.$transaction(async (tx) => {
      await tx.paletteSwatch.deleteMany();
      if (parsed.data.swatches.length) {
        await tx.paletteSwatch.createMany({
          data: parsed.data.swatches.map((s, i) => ({
            name: s.name,
            nameAr: s.nameAr ?? '',
            hex: s.hex,
            position: i,
          })),
        });
      }
    });

    revalidateStorefront();
    revalidatePath('/dashboard/offers');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ settings

export async function saveSettings(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    await prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      update: parsed.data,
      create: { id: 'singleton', ...parsed.data },
    });

    revalidateStorefront();
    revalidatePath('/dashboard/settings');
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ pages

export async function savePage(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = pageSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const clash = await prisma.page.findFirst({
      where: { slug: d.slug, ...(d.id ? { NOT: { id: d.id } } : {}) },
    });
    if (clash) {
      return { ok: false, error: 'That slug is already in use.', fieldErrors: { slug: 'Already in use.' } };
    }

    const payload = {
      slug: d.slug,
      title: d.title,
      titleAr: d.titleAr,
      excerpt: d.excerpt,
      excerptAr: d.excerptAr,
      body: d.body,
      bodyAr: d.bodyAr,
      heroImage: d.heroImage,
      published: d.published,
      showInFooter: d.showInFooter,
      position: d.position,
    };

    if (d.id) await prisma.page.update({ where: { id: d.id }, data: payload });
    else await prisma.page.create({ data: payload });

    revalidateStorefront();
    revalidatePath('/dashboard/settings');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deletePage(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.page.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/settings');
    return { ok: true };
  }) as Promise<ActionResult>;
}

