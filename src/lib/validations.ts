import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

// ---------------------------------------------------------------- dashboard access

/**
 * The store has one dashboard password and no customer accounts. It is set
 * only through the emailed reset link — there is no "change password" form
 * behind the login, so a stolen session cannot lock the owner out.
 */
export const newPasswordSchema = z
  .object({
    token: z.string().regex(/^[0-9a-f]{64}$/, 'That reset link is not valid.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'The two passwords do not match.',
    path: ['confirmPassword'],
  });

/** Order lookup needs only the email the order was placed with. */
export const orderLookupSchema = z.object({ email: emailSchema });

// ---------------------------------------------------------------- checkout

export const shippingSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(8, 'Enter a contact number.')
    .max(24)
    .regex(/^[0-9+\-\s()]+$/, 'Enter a valid phone number.'),
  street: z.string().trim().min(4, 'Enter your address.').max(200),
  area: z.string().trim().max(80).optional().or(z.literal('')),
  governorate: z.string().trim().min(1, 'Select your governorate.'),
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
  paymentMethod: z.enum(['card', 'cod']).default('cod'),
});

// ---------------------------------------------------------------- products

export const variantSchema = z.object({
  id: z.string().optional(),
  colorName: z.string().trim().min(1, 'Colour name is required.').max(60),
  colorNameAr: z.string().trim().max(60).default(''),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Use a 6-digit hex colour.'),
  size: z.string().trim().max(20).nullable().optional(),
  /** Generated on save. An internal key, never something to type in. */
  sku: z.string().trim().max(60).optional(),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative.').max(100000),
  lowStockAt: z.coerce.number().int().min(0).max(10000).default(5),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Product name is required.').max(120),
  nameAr: z.string().trim().max(120).default(''),
  /** Derived from the name on save; the form no longer asks for it. */
  slug: z.string().trim().max(140).optional().or(z.literal('')),
  description: z.string().trim().max(5000).default(''),
  descriptionAr: z.string().trim().max(5000).default(''),
  price: z.coerce.number().min(0.01, 'Price must be greater than zero.').max(10000000),
  compareAtPrice: z.coerce.number().min(0).max(10000000).optional().nullable(),
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
        /// The point that must stay in frame when the image is cropped.
        focalX: z.coerce.number().int().min(0).max(100).default(50),
        focalY: z.coerce.number().int().min(0).max(100).default(50),
        fit: z.enum(['cover', 'contain']).default('cover'),
      }),
    )
    .default([]),
  variants: z.array(variantSchema).min(1, 'Add at least one colourway.'),
});

export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Category name is required.').max(80),
  nameAr: z.string().trim().max(80).default(''),
  description: z.string().trim().max(300).default(''),
  descriptionAr: z.string().trim().max(300).default(''),
  visible: z.boolean().default(true),
});

// ---------------------------------------------------------------- filters

export const filterColorSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Colour name is required.').max(60),
  nameAr: z.string().trim().max(60).default(''),
  hex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Use a 6-digit hex colour.')
    .default('#0b1c30'),
  visible: z.boolean().default(true),
});

export const priceRangeSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(1, 'Label is required.').max(60),
    labelAr: z.string().trim().max(60).default(''),
    min: z.coerce.number().min(0),
    max: z.coerce.number().min(0).optional().nullable(),
    visible: z.boolean().default(true),
  })
  .refine((d) => d.max === null || d.max === undefined || d.max > d.min, {
    message: 'The upper bound must be greater than the lower one.',
    path: ['max'],
  });

export const filterVisibilitySchema = z.object({
  showColorFilter: z.boolean(),
  showCategoryFilter: z.boolean(),
  showPriceFilter: z.boolean(),
  showSortFilter: z.boolean(),
  showSearch: z.boolean(),
});

// ---------------------------------------------------------------- shipping

export const governorateSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Name is required.').max(80),
  nameAr: z.string().trim().min(1, 'Arabic name is required.').max(80),
  shippingCost: z.coerce.number().min(0, 'Cannot be negative.').max(100000),
  estimatedDays: z.string().trim().max(40).default('2-4'),
  active: z.boolean().default(true),
});

/** Bulk price edit from the shipping table. */
export const governorateRatesSchema = z.object({
  rates: z
    .array(
      z.object({
        id: z.string().min(1),
        shippingCost: z.coerce.number().min(0).max(100000),
        active: z.boolean(),
      }),
    )
    .max(60),
});

// ---------------------------------------------------------------- promotions

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
    descriptionAr: z.string().trim().max(200).default(''),
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

/**
 * A free-delivery rule. Both halves are optional and mean different things
 * when omitted: no `minOrder` is "any basket", no dates is "always". A rule
 * with neither makes delivery free outright, which is a legitimate thing to
 * want and so is allowed rather than rejected.
 */
export const freeShippingSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().max(80).default(''),
    nameAr: z.string().trim().max(80).default(''),
    minOrder: z.coerce.number().min(0).max(10000000).optional().nullable(),
    startsAt: z.string().optional().or(z.literal('')),
    endsAt: z.string().optional().or(z.literal('')),
    active: z.boolean().default(true),
  })
  .refine(
    (d) => !d.startsAt || !d.endsAt || new Date(d.endsAt) >= new Date(d.startsAt),
    { message: 'The end date cannot be before the start date.', path: ['endsAt'] },
  );

export const discountSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Campaign name is required.').max(120),
  nameAr: z.string().trim().max(120).default(''),
  discountType: z.enum(['PERCENT', 'FIXED']),
  discountValue: z.coerce.number().min(0.01),
  scope: z.enum(['PRODUCTS', 'CATEGORY', 'ALL']),
  categoryId: z.string().optional().or(z.literal('')),
  productIds: z.array(z.string()).default([]),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  active: z.boolean().default(true),
});

// ---------------------------------------------------------------- banners

export const bannerSchema = z.object({
  id: z.string().optional(),
  slot: z.enum(['HERO', 'OFFER']),
  eyebrow: z.string().trim().max(120).default(''),
  eyebrowAr: z.string().trim().max(120).default(''),
  heading: z.string().trim().max(200).default(''),
  headingAr: z.string().trim().max(200).default(''),
  subheading: z.string().trim().max(200).default(''),
  subheadingAr: z.string().trim().max(200).default(''),
  body: z.string().trim().max(1000).default(''),
  bodyAr: z.string().trim().max(1000).default(''),
  ctaLabel: z.string().trim().max(60).default('Shop Now'),
  ctaLabelAr: z.string().trim().max(60).default(''),
  ctaHref: z.string().trim().max(300).default('/shop'),
  imageUrl: z.string().trim().max(600).default(''),
  badge: z.string().trim().max(60).default(''),
  badgeAr: z.string().trim().max(60).default(''),
  active: z.boolean().default(true),
  startsAt: z.string().optional().or(z.literal('')),
  endsAt: z.string().optional().or(z.literal('')),
  position: z.coerce.number().int().min(0).default(0),
});

// ---------------------------------------------------------------- settings & pages

/**
 * A social link goes straight into an `href` the footer renders, so it has to
 * be http(s) or nothing — `javascript:` and `data:` URLs would otherwise be
 * stored XSS with the dashboard as the entry point.
 */
const socialUrl = z
  .string()
  .trim()
  .max(300)
  .default('')
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), {
    message: 'Enter a full link starting with https://',
  });

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(200).default(''),
  taglineAr: z.string().trim().max(200).default(''),
  logoUrl: z.string().trim().max(600).default(''),
  supportEmail: emailSchema,
  supportPhone: z.string().trim().max(40).default(''),
  defaultLocale: z.enum(['en', 'ar']).default('en'),
  enableArabic: z.boolean().default(true),
  currencyCode: z.string().trim().min(1).max(8).default('EGP'),
  currencySymbol: z.string().trim().min(1).max(8).default('EGP'),
  currencySymbolAr: z.string().trim().min(1).max(8).default('ج.م'),
  defaultShippingRate: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).max(1000),
  instagramUrl: socialUrl,
  facebookUrl: socialUrl,
  metaTitle: z.string().trim().max(120).default(''),
  metaTitleAr: z.string().trim().max(120).default(''),
  metaDescription: z.string().trim().max(300).default(''),
  metaDescriptionAr: z.string().trim().max(300).default(''),
  ogImageUrl: z.string().trim().max(600).default(''),
  newsletterHeading: z.string().trim().max(80).default('Newsletter'),
  newsletterHeadingAr: z.string().trim().max(80).default(''),
  newsletterBody: z.string().trim().max(300).default(''),
  newsletterBodyAr: z.string().trim().max(300).default(''),
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
  titleAr: z.string().trim().max(120).default(''),
  excerpt: z.string().trim().max(300).default(''),
  excerptAr: z.string().trim().max(300).default(''),
  body: z.string().trim().max(50000).default(''),
  bodyAr: z.string().trim().max(50000).default(''),
  heroImage: z.string().trim().max(600).default(''),
  published: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  position: z.coerce.number().int().min(0).default(0),
});
