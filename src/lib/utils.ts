import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge has to guess whether `text-*` is a font size or a colour.
 * Its default heuristic treats any unrecognised value as a colour, so
 * `text-label-md` was landing in the colour group and silently evicting
 * `text-background` — which is how the navy button ended up with navy text.
 *
 * Naming the theme's custom sizes fixes the classification for good.
 */
const FONT_SIZES = [
  'display-lg',
  'display-md',
  'display-sm',
  'headline-lg',
  'headline-md',
  'headline-sm',
  'title-md',
  'body-lg',
  'body-md',
  'body-sm',
  'label-md',
  'label-sm',
  'label-caps',
];

const COLORS = [
  'background',
  'surface',
  'surface-lowest',
  'surface-low',
  'surface-container',
  'surface-bright',
  'on-background',
  'on-surface',
  'navy',
  'navy-soft',
  'secondary',
  'tertiary',
  'outline',
  'outline-soft',
  'outline-variant',
  'primary',
  'error',
  'inverse-surface',
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZES }],
      'text-color': [{ text: COLORS }],
      'bg-color': [{ bg: COLORS }],
      'border-color': [{ border: COLORS }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Prices are stored as plain numbers; the symbol and its side come from
 * settings so the store can run in EGP, USD or anything else.
 */
export function formatPrice(value: number, symbol = 'EGP', locale: 'en' | 'ar' = 'en') {
  const amount = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

  return locale === 'ar' ? `${amount} ${symbol}` : `${symbol} ${amount}`;
}

export function formatDate(value: Date | string, locale: 'en' | 'ar' = 'en') {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Human-facing order number, e.g. LW-8F3K2A. */
export function generateOrderNumber() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LW-${suffix}`;
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

/**
 * How long a product description may be, in words.
 *
 * A description sits beside the buy button; past a couple of paragraphs it
 * pushes the size picker off the screen and stops being read at all.
 */
export const DESCRIPTION_WORD_LIMIT = 250;

/** Words, by any script — Arabic and English are both split on whitespace. */
export function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/s+/).length : 0;
}

/**
 * Cuts a text to `limit` words. Used when rendering, so a description saved
 * before the limit existed is still shown at a readable length.
 */
export function limitWords(text: string, limit = DESCRIPTION_WORD_LIMIT) {
  const words = text.trim().split(/s+/);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
}

export const ORDER_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
