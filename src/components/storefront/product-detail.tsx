'use client';

import * as React from 'react';
import Image from 'next/image';
import { Minus, Plus, Plus as PlusIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/ui/primitives';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/ui/toast';
import { formatPrice, cn } from '@/lib/utils';
import { fmt } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

interface Variant {
  id: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  stock: number;
}

interface DetailProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  listPrice: number;
  discounted: boolean;
  categoryName: string | null;
  images: { url: string; alt: string; focalX: number; focalY: number; fit: 'cover' | 'contain' }[];
  variants: Variant[];
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-outline-variant">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-start"
      >
        <span className="label-caps">{title}</span>
        <span className="relative h-3 w-3 shrink-0">
          <span className="absolute start-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
          <span
            className={cn(
              'absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-300 ease-scandi',
              open && 'scale-y-0',
            )}
          />
        </span>
      </button>
      {open && (
        <div className="animate-fade-in pb-6 text-body-md leading-7 text-secondary">{children}</div>
      )}
    </div>
  );
}

export function ProductDetail({
  product,
  currencySymbol,
  locale,
  t,
}: {
  product: DetailProduct;
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
}) {
  const { toast } = useToast();
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);

  // Distinct colourways, in source order.
  const colors = React.useMemo(() => {
    const out: { name: string; hex: string }[] = [];
    for (const v of product.variants) {
      if (!out.some((c) => c.name === v.colorName)) {
        out.push({ name: v.colorName, hex: v.colorHex });
      }
    }
    return out;
  }, [product.variants]);

  const firstAvailable = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [color, setColor] = React.useState(firstAvailable?.colorName ?? '');

  const sizesForColor = React.useMemo(
    () => product.variants.filter((v) => v.colorName === color && v.size !== null),
    [product.variants, color],
  );

  const [size, setSize] = React.useState<string | null>(
    firstAvailable?.size ?? null,
  );

  // Keep the selected size valid when the colourway changes.
  React.useEffect(() => {
    if (sizesForColor.length === 0) {
      setSize(null);
      return;
    }
    if (!sizesForColor.some((v) => v.size === size)) {
      setSize((sizesForColor.find((v) => v.stock > 0) ?? sizesForColor[0]).size);
    }
  }, [color, sizesForColor, size]);

  const selected = product.variants.find(
    (v) => v.colorName === color && (size === null ? v.size === null : v.size === size),
  );

  const [quantity, setQuantity] = React.useState(1);
  const [activeImage, setActiveImage] = React.useState(0);
  const [added, setAdded] = React.useState(false);

  // The gallery is a scroller, so "which image" is wherever it has been
  // scrolled to. Clicking a thumbnail scrolls it; swiping updates the state.
  const stripRef = React.useRef<HTMLDivElement>(null);

  function show(index: number) {
    setActiveImage(index);
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollTo({ left: strip.clientWidth * index, behavior: 'smooth' });
  }

  function onStripScroll(event: React.UIEvent<HTMLDivElement>) {
    const strip = event.currentTarget;
    if (strip.clientWidth === 0) return;
    const index = Math.round(strip.scrollLeft / strip.clientWidth);
    setActiveImage(Math.min(product.images.length - 1, Math.max(0, index)));
  }

  React.useEffect(() => setQuantity(1), [selected?.id]);

  // The sticky phone buy bar appears only once the real button is off screen.
  const buyRowRef = React.useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = React.useState(false);

  React.useEffect(() => {
    const node = buyRowRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setBarVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const maxStock = selected?.stock ?? 0;
  const canAdd = Boolean(selected) && maxStock > 0;

  function handleAdd() {
    if (!selected || !canAdd) return;
    addItem(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        colorName: selected.colorName,
        colorHex: selected.colorHex,
        size: selected.size,
        unitPrice: product.price,
        imageUrl: product.images[0]?.url ?? '',
        maxStock: selected.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    openCart();
    toast(fmt(t.product.addedToast, { name: product.name }));
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:gap-stack-md lg:grid-cols-2 lg:gap-gutter">
      {/* ----------------------------------------------------------- gallery */}
      <div className="flex flex-col-reverse gap-4 md:flex-row">
        {product.images.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain sm:gap-3 md:flex-col md:overflow-visible">
            {product.images.map((img, i) => (
              <button
                key={img.url + i}
                onClick={() => show(i)}
                aria-label={fmt(t.product.viewImage, { n: i + 1 })}
                aria-current={i === activeImage}
                className={cn(
                  'relative h-24 w-[72px] shrink-0 overflow-hidden border transition-colors',
                  i === activeImage ? 'border-navy' : 'border-outline-variant hover:border-outline',
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  sizes="72px"
                  style={{ objectPosition: `${img.focalX}% ${img.focalY}%` }}
                  className={img.fit === 'contain' ? 'object-contain' : 'object-cover'}
                />
              </button>
            ))}
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/*
            One scroller for every image rather than a single swapped frame:
            on a phone that gives real swiping, with the browser doing the
            snapping. On a pointer device the thumbnails drive it and the
            scroller is just a container.
          */}
          <div
            ref={stripRef}
            onScroll={onStripScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:overflow-hidden"
          >
            {product.images.map((img, i) => (
              <div
                key={img.url + i}
                className="relative aspect-[3/4] w-full shrink-0 snap-center overflow-hidden bg-surface-low"
              >
                <Image
                  src={img.url}
                  alt={img.alt || product.name}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  style={{ objectPosition: `${img.focalX}% ${img.focalY}%` }}
                  className={img.fit === 'contain' ? 'object-contain' : 'object-cover'}
                />
              </div>
            ))}
          </div>

          {/* Where you are in the set — only worth showing on touch. */}
          {product.images.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5 md:hidden">
              {product.images.map((img, i) => (
                <button
                  key={img.url + i}
                  onClick={() => show(i)}
                  aria-label={fmt(t.product.viewImage, { n: i + 1 })}
                  aria-current={i === activeImage}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300 ease-scandi',
                    i === activeImage ? 'w-5 bg-navy' : 'w-1.5 bg-outline-variant',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------- info */}
      <div className="lg:ps-8">
        {product.categoryName && (
          <p className="label-caps mb-4 text-secondary">{product.categoryName}</p>
        )}
        <h1 className="font-display text-headline-sm sm:text-headline-md md:text-display-sm">{product.name}</h1>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 md:mt-4">
          {product.discounted && (
            <span className="text-body-lg text-tertiary line-through">
              {formatPrice(product.listPrice, currencySymbol, locale)}
            </span>
          )}
          <span className={cn('text-body-lg', product.discounted && 'text-error')}>
            {formatPrice(product.price, currencySymbol, locale)}
          </span>
        </div>

        {product.description && (
          <p className="mt-5 max-w-[52ch] whitespace-pre-line text-body-md leading-7 text-secondary md:mt-6">
            {product.description}
          </p>
        )}

        {/* colour */}
        <div className="mt-stack-sm pt-4">
          <p className="label-caps mb-4 text-secondary">
            {t.product.colour} — <span className="text-on-surface">{color}</span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {colors.map((c) => {
              const soldOut = !product.variants.some(
                (v) => v.colorName === c.name && v.stock > 0,
              );
              return (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={color === c.name}
                  className={cn('relative p-0.5', soldOut && 'opacity-40')}
                >
                  <ColorDot hex={c.hex} size="lg" selected={color === c.name} />
                </button>
              );
            })}
          </div>
        </div>

        {/* size */}
        {sizesForColor.length > 0 && (
          <div className="mt-8">
            <p className="label-caps mb-4 text-secondary">
              {t.product.size} — <span className="text-on-surface">{size}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {sizesForColor.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSize(v.size)}
                  disabled={v.stock === 0}
                  aria-pressed={size === v.size}
                  className={cn(
                    'label-caps min-w-[56px] border px-4 py-2.5 transition-colors',
                    size === v.size
                      ? 'border-navy bg-navy text-background'
                      : 'border-outline-variant text-secondary hover:border-navy hover:text-on-surface',
                    v.stock === 0 && 'cursor-not-allowed line-through opacity-40 hover:border-outline-variant',
                  )}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* stock notice */}
        {selected && maxStock > 0 && maxStock <= 5 && (
          <p className="mt-6 text-body-sm text-error">{fmt(t.product.onlyLeft, { n: maxStock })}</p>
        )}
        {selected && maxStock === 0 && (
          <p className="mt-6 text-body-sm text-error">{t.product.combinationSoldOut}</p>
        )}

        {/* quantity + add */}
        <div ref={buyRowRef} className="mt-8 flex flex-col gap-3 xs:flex-row">
          <div className="flex h-12 shrink-0 items-center justify-between border border-outline-variant sm:h-14">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-full w-12 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
              aria-label={t.product.decreaseQty}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-body-md" aria-live="polite">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxStock || 1, q + 1))}
              disabled={quantity >= maxStock}
              className="flex h-full w-12 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
              aria-label={t.product.increaseQty}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button size="lg" onClick={handleAdd} disabled={!canAdd} className="flex-1">
            {added ? (
              <>
                <Check className="h-4 w-4" /> {t.product.added}
              </>
            ) : canAdd ? (
              <>
                <PlusIcon className="h-4 w-4" /> {t.product.addToBag} — {formatPrice(product.price * quantity, currencySymbol, locale)}
              </>
            ) : (
              t.product.soldOut
            )}
          </Button>
        </div>

        {/* accordions */}
        <div className="mt-10 border-t border-outline-variant md:mt-stack-md">
          {/*
            Material and Care used to live here, but they were four fields to
            fill in per product for two panels most shoppers never open. What
            is left is the same for every item and needs no data entry.
          */}
          <Accordion title={t.product.shippingReturns}>
            <p>{t.product.shippingReturnsBody}</p>
          </Accordion>
        </div>
      </div>

      {/*
        Phone: once the real Add to Bag button has scrolled past, the same
        action reappears pinned to the bottom. Without this a shopper reading
        the description has to scroll back up to buy.
      */}
      {barVisible && canAdd && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-fade-up border-t border-outline-variant bg-background/95 px-margin-mobile py-3 pb-safe backdrop-blur-sm lg:hidden">
          <Button size="lg" onClick={handleAdd} className="w-full">
            {added ? (
              <>
                <Check className="h-4 w-4" /> {t.product.added}
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" /> {t.product.addToBag} —{' '}
                {formatPrice(product.price * quantity, currencySymbol, locale)}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
