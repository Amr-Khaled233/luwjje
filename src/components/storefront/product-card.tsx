'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Loader2 } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/ui/toast';
import { ColorDot } from '@/components/ui/primitives';
import { Reveal } from '@/components/ui/motion';
import { formatPrice, cn } from '@/lib/utils';
import type { ProductCardData } from '@/lib/queries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

export function ProductCard({
  product,
  currencySymbol,
  locale,
  t,
  priority = false,
  className,
}: {
  product: ProductCardData;
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
  priority?: boolean;
  className?: string;
}) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const { toast } = useToast();
  const [adding, setAdding] = React.useState(false);

  /**
   * Quick Add resolves the default variant server-side so we never trust a
   * stale price or a sold-out colourway from the rendered grid.
   */
  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAdding(true);
    try {
      const res = await fetch(`/api/products/${product.slug}/default-variant`);
      if (!res.ok) throw new Error('unavailable');
      addItem(await res.json(), 1);
      openCart();
    } catch {
      toast(t.product.unavailable, 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className={cn('group', className)}>
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-low">
          {product.primaryImage && (
            <Image
              src={product.primaryImage}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              style={{
                objectPosition: `${product.primaryFocus.focalX}% ${product.primaryFocus.focalY}%`,
              }}
              className={cn(
                'transition-all duration-500 ease-scandi',
                product.primaryFocus.fit === 'contain' ? 'object-contain' : 'object-cover',
                product.hoverImage
                  ? 'group-hover:scale-[1.02] group-hover:opacity-0'
                  : 'group-hover:scale-[1.02]',
              )}
            />
          )}
          {product.hoverImage && (
            <Image
              src={product.hoverImage}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              style={{
                objectPosition: `${product.hoverFocus.focalX}% ${product.hoverFocus.focalY}%`,
              }}
              className={cn(
                'scale-[1.02] opacity-0 transition-opacity duration-500 ease-scandi group-hover:opacity-100',
                product.hoverFocus.fit === 'contain' ? 'object-contain' : 'object-cover',
              )}
            />
          )}

          {!product.inStock && (
            <span className="label-caps absolute top-2 border border-navy bg-background px-2 py-1 text-[10px] ltr:left-2 rtl:right-2 sm:top-3 sm:px-2.5 sm:text-label-caps sm:ltr:left-3 sm:rtl:right-3">
              {t.product.soldOut}
            </span>
          )}
          {product.discounted && product.inStock && (
            <span className="label-caps absolute top-2 border border-navy bg-navy px-2 py-1 text-[10px] text-background ltr:left-2 rtl:right-2 sm:top-3 sm:px-2.5 sm:text-label-caps sm:ltr:left-3 sm:rtl:right-3">
              {t.product.sale}
            </span>
          )}

          {product.inStock && (
            <>
              {/* Pointer: a full-width bar that rises in on hover. */}
              <button
                onClick={quickAdd}
                disabled={adding}
                tabIndex={-1}
                aria-hidden
                className="label-caps absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center border border-navy bg-background/95 text-navy opacity-0 backdrop-blur-sm transition-all duration-300 ease-scandi hover:bg-navy hover:text-background group-hover:translate-y-0 group-hover:opacity-100 md:flex"
              >
                {adding ? t.product.adding : t.product.quickAdd}
              </button>

              {/*
                Touch: there is no hover, so the same action is a permanent
                44px button in the corner rather than a hidden bar.
              */}
              <button
                onClick={quickAdd}
                disabled={adding}
                aria-label={t.product.quickAdd}
                className="absolute bottom-2 flex h-11 w-11 items-center justify-center border border-navy bg-background/95 text-navy backdrop-blur-sm transition-transform duration-200 ease-scandi active:scale-95 disabled:opacity-60 ltr:right-2 rtl:left-2 md:hidden"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </>
          )}
        </div>

        <div className="pt-3 sm:pt-4">
          <h3 className="font-display text-title-md leading-tight sm:text-headline-sm sm:leading-8">
            {product.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {product.discounted && (
              <span className="text-body-sm text-tertiary line-through sm:text-body-md">
                {formatPrice(product.listPrice, currencySymbol, locale)}
              </span>
            )}
            <span className={cn('text-body-sm sm:text-body-md', product.discounted && 'text-error')}>
              {formatPrice(product.price, currencySymbol, locale)}
            </span>
          </div>

          {product.colors.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3">
              {product.colors.slice(0, 5).map((c) => (
                <ColorDot key={c.name} hex={c.hex} size="sm" title={c.name} />
              ))}
              {product.colors.length > 5 && (
                <span className="text-body-sm text-tertiary">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({
  products,
  currencySymbol,
  locale,
  t,
  className,
}: {
  products: ProductCardData[];
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
  className?: string;
}) {
  return (
    // Two across on a phone — one card per screen wastes the viewport and
    // makes browsing a catalogue feel endless.
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 md:gap-x-gutter md:gap-y-stack-md lg:grid-cols-4',
        className,
      )}
    >
      {products.map((p, i) => (
        <Reveal
          key={p.id}
          // Stagger across the first row only; past that the reader has
          // scrolled and each card animates as it arrives.
          delay={Math.min(i, 3) * 70}
        >
          <ProductCard
            product={p}
            currencySymbol={currencySymbol}
            locale={locale}
            t={t}
            priority={i < 4}
          />
        </Reveal>
      ))}
    </div>
  );
}
