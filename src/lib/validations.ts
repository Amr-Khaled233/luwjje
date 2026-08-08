import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

// ---------------------------------------------------------------- dashboard access

/** The store has one dashboard password and no customer accounts. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter the current password.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'The new passwords do not match.',
    path: ['confirmPassword'],
  });

/** Look up an order without an account: order number + the email used. */
export const orderLookupSchema = z.object({
  orderNumber: z.string().trim().min(3, 'Enter your order number.').max(20),
  email: emailSchema,
});

// ---------------------------------------------------------------- checkout

export const shippingSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: emailSchema,
  phone: z.string().trim().min(6, 'Enter a contact number.').max(24),
  street: z.string().trim().min(4, 'Enter your street address.').max(160),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  region: z.string().trim().min(1, 'Select your region.'),
  postalCode: z.string().trim().min(2, 'Enter a postal code.').max(16),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export type ShippingInput = z.infer<typeof shippingSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const placeOrderSchema = z.object({
  shipping: shippingSchema,
  items: z.array(cartLineSchema).min(1, 'Your bag is empty.'),
  promoCode: z.string().trim().max(40).optional().or(z.literal('')),
  paymentMethod: z.enum(['card', 'cod']).default('card'),
});

// ---------------------------------------------------------------- admin: product

export const variantSchema = z.object({
  id: z.string().optional(),
  colorName: z.string().trim().min(1, 'Colour name is required.').max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Use a 6-digit hex colour.'),
  size: z.string().trim().max(20).nullable().optional(),
  sku: z.string().trim().min(1, 'SKU is required.').max(60),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(100000),
  lowStockAt: z.coerce.number().int().min(0).max(10000).default(5),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Product name is required.').max(120),
  slug: z.string().trim().max(140).optional().or(z.literal('')),
  description: z.string().trim().max(5000).default(''),
  materialInfo: z.string().trim().max(2000).default(''),
  careInfo: z.string().trim().max(2000).default(''),
  price: z.coerce.number().min(0.01, 'Price must be greater than zero.').max(1000000),
  compareAtPrice: z.coerce.number().min(0).max(1000000).optional().nullable(),
  sku: z.string().trim().max(60).optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('PUBLISHED'),
  isBestSeller: z.boolean().default(false),
  bestSellerOrder: z.coerce.number().int().min(0).max(999).default(0),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        alt: z.string().max(160).default(''),
        isPrimary: z.boolean().default(false),
        isHover: z.boolean().default(false),
      }),
    )
    .default([]),
  variants: z.array(variantSchema).min(1, 'Add at least one colourway.'),
});

export type ProductInput = z.infer<typeof productSchema>;

// ---------------------------------------------------------------- admin: promo

export const promoSchema = z
  .object({
    id: z.string().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, 'Code must be at least 3 characters.')
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, 'Letters, numbers, hyphen and underscore only.'),
    description: z.string().trim().max(200).default(''),
    discountType: z.enum(['PERCENT', 'FIXED']),
    discountValue: z.coerce.number().min(0.01, 'Enter a discount value.'),
    minOrder: z.coerce.number().min(0).default(0),
    maxUses: z.coerce.number().int().min(1).optional().nullable(),
    startsAt: z.string().optional().or(z.literal('')),
    expiresAt: z.string().optional().or(z.literal('')),
    active: z.boolean().default(true),
  })
  .refine((d) => d.discountType !== 'PERCENT' || d.discountValue <= 100, {
    message: 'A percentage discount cannot exceed 100.',
    path: ['discountValue'],
  });

// ---------------------------------------------------------------- admin: shipping

export const shippingZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Zone name is required.').max(80),
  countries: z.string().trim().max(2000).default(''),
  rate: z.coerce.number().min(0).max(100000),
  freeOver: z.coerce.number().min(0).max(1000000).optional().nullable(),
  estimatedDays: z.string().trim().max(60).default('3-5 business days'),
  active: z.boolean().default(true),
});

// ---------------------------------------------------------------- admin: banners

export const bannerSchema = z.object({
  id: z.string().optional(),
  slot: z.enum(['HERO', 'OFFER']),
  eyebrow: z.string().trim().max(120).default(''),
  heading: z.string().trim().max(200).default(''),
  subheading: z.string().trim().max(200).default(''),
  body: z.string().trim().max(1000).default(''),
  ctaLabel: z.string().trim().max(60).default('Shop Now'),
  ctaHref: z.string().trim().max(300).default('/shop'),
  imageUrl: z.string().trim().max(600).default(''),
  badge: z.string().trim().max(60).default(''),
  active: z.boolean().default(true),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  position: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------- admin: discounts

export const discountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Campaign name is required.').max(120),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.coerce.number().min(0.01),
  scope: z.enum(['PRODUCTS', 'CATEGORY', 'ALL']),
  categoryId: z.string().optional().or(z.literal('')),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

// ---------------------------------------------------------------- admin: settings & pages

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(200).default(''),
  logoUrl: z.string().trim().max(600).default(''),
  supportEmail: emailSchema,
  supportPhone: z.string().trim().max(40).default(''),
  currencySymbol: z.string().trim().min(1).max(4).default('$'),
  freeShippingOver: z.coerce.number().min(0),
  defaultShippingRate: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  instagramUrl: z.string().trim().max(300).default(''),
  pinterestUrl: z.string().trim().max(300).default(''),
  tiktokUrl: z.string().trim().max(300).default(''),
  facebookUrl: z.string().trim().max(300).default(''),
  metaTitle: z.string().trim().max(120).default(''),
  metaDescription: z.string().trim().max(300).default(''),
  ogImageUrl: z.string().trim().max(600).default(''),
  newsletterHeading: z.string().trim().max(80).default('Newsletter'),
  newsletterBody: z.string().trim().max(300).default(''),
});

export const pageSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Slug is required.')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only.'),
  title: z.string().trim().min(2, 'Title is required.').max(120),
  excerpt: z.string().trim().max(300).default(''),
  body: z.string().trim().max(50000).default(''),
  heroImage: z.string().trim().max(600).default(''),
  published: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  position: z.coerce.number().int().min(0).default(0),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Category name is required.').max(80),
  description: z.string().trim().max(300).default(''),
});
