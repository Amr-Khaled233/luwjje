'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireDashboard, checkPassword, setPassword } from '@/lib/dashboard-auth';
import { slugify } from '@/lib/utils';
import {
  productSchema,
  promoSchema,
  shippingZoneSchema,
  bannerSchema,
  discountSchema,
  settingsSchema,
  pageSchema,
  changePasswordSchema,
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

    const skus = data.variants.map((v) => v.sku.trim());
    if (new Set(skus).size !== skus.length) {
      return { ok: false, error: 'Each colourway needs its own unique SKU.' };
    }
    const skuClash = await prisma.productVariant.findFirst({
      where: { sku: { in: skus }, ...(data.id ? { productId: { not: data.id } } : {}) },
      select: { sku: true },
    });
    if (skuClash) {
      return { ok: false, error: `SKU ${skuClash.sku} is already used by another product.` };
    }

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
      slug,
      description: data.description,
      materialInfo: data.materialInfo,
      careInfo: data.careInfo,
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
            colorHex: v.colorHex,
            size: v.size || null,
            sku: v.sku.trim(),
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
              colorHex: v.colorHex,
              size: v.size || null,
              sku: v.sku.trim(),
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

    const { id, name, description } = parsed.data;
    const slug = slugify(name);

    const clash = await prisma.category.findFirst({
      where: { OR: [{ name }, { slug }], ...(id ? { NOT: { id } } : {}) },
    });
    if (clash) return { ok: false, error: 'A category with that name already exists.' };

    if (id) {
      await prisma.category.update({ where: { id }, data: { name, slug, description } });
    } else {
      const count = await prisma.category.count();
      await prisma.category.create({ data: { name, slug, description, position: count } });
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
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

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

      await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          paymentStatus:
            status === 'CANCELLED' ? 'REFUNDED' : status === 'PENDING' ? order.paymentStatus : 'PAID',
        },
      });
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard');
    revalidateStorefront();
    return { ok: true };
  }) as Promise<ActionResult>;
}

// ================================================================ promo codes

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

export async function saveShippingZone(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = shippingZoneSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const d = parsed.data;
    const payload = {
      name: d.name,
      countries: d.countries,
      rate: d.rate,
      freeOver: d.freeOver ?? null,
      estimatedDays: d.estimatedDays,
      active: d.active,
    };

    if (d.id) await prisma.shippingZone.update({ where: { id: d.id }, data: payload });
    else {
      const count = await prisma.shippingZone.count();
      await prisma.shippingZone.create({ data: { ...payload, position: count } });
    }

    revalidateStorefront();
    revalidatePath('/dashboard/shipping');
    return { ok: true };
  }) as Promise<ActionResult>;
}

export async function deleteShippingZone(id: string): Promise<ActionResult> {
  return guard(async () => {
    await prisma.shippingZone.delete({ where: { id } });
    revalidateStorefront();
    revalidatePath('/dashboard/shipping');
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
      heading: d.heading,
      subheading: d.subheading,
      body: d.body,
      ctaLabel: d.ctaLabel,
      ctaHref: d.ctaHref,
      imageUrl: d.imageUrl,
      badge: d.badge,
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
          data: parsed.data.swatches.map((s, i) => ({ name: s.name, hex: s.hex, position: i })),
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
      excerpt: d.excerpt,
      body: d.body,
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

// ================================================================ dashboard password

export async function changeDashboardPassword(input: unknown): Promise<ActionResult> {
  return guard(async () => {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return zodErrors(parsed.error);

    const { currentPassword, newPassword } = parsed.data;

    // Knowing the session cookie is not enough to rotate the password.
    if (!(await checkPassword(currentPassword))) {
      return {
        ok: false,
        error: 'The current password is not correct.',
        fieldErrors: { currentPassword: 'Not correct.' },
      };
    }

    await setPassword(newPassword);
    revalidatePath('/dashboard/settings');
    return { ok: true };
  }) as Promise<ActionResult>;
}
