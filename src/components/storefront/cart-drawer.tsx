'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { Button, ButtonLink } from '@/components/ui/button';
import { useScrollLock, useFocusTrap, useExitAnimation } from '@/components/ui/motion';
import { formatPrice, cn } from '@/lib/utils';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

export function CartDrawer({
  locale,
  t,
  currencySymbol = 'EGP',
}: {
  locale: Locale;
  t: Dictionary;
  currencySymbol?: string;
}) {
  const { isOpen, closeCart, items, setQuantity, removeItem } = useCart();
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  useScrollLock(isOpen);
  const panelRef = useFocusTrap(isOpen);
  const panel = useExitAnimation(isOpen, 300);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCart();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  if (!panel.mounted) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t.nav.bag}>
      <div
        className={cn(
          'scrim absolute inset-0',
          panel.closing ? 'animate-fade-out' : 'animate-fade-in',
        )}
        onClick={closeCart}
      />
      {/*
        Full width under 440px, then a fixed panel. Anchored to the trailing
        edge with logical properties, so it comes from the left in Arabic —
        and `--slide-from` in globals.css flips the animation to match.
      */}
      <aside
        ref={panelRef}
        className={cn(
          'absolute inset-y-0 flex w-[min(100vw,440px)] flex-col border-outline-variant bg-background',
          'ltr:right-0 ltr:border-s rtl:left-0 rtl:border-e',
          panel.closing ? 'animate-fade-out' : 'animate-slide-in',
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-outline-variant px-margin-mobile py-4 sm:px-6 sm:py-5">
          <h2 className="font-display text-title-md sm:text-headline-sm">{t.cart.title}</h2>
          <button className="tap-target -me-2.5" onClick={closeCart} aria-label={t.nav.close}>
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 animate-fade-in flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-title-md sm:text-headline-sm">{t.cart.empty}</p>
            <p className="text-body-sm text-secondary sm:text-body-md">{t.cart.nothingChosen}</p>
            <ButtonLink href="/shop" onClick={closeCart} className="mt-2">
              {t.cart.browse}
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-margin-mobile sm:px-6">
              {items.map((item, i) => (
                <div
                  key={item.variantId}
                  style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}
                  className="flex animate-fade-up gap-3 border-b border-outline-variant py-4 last:border-b-0 sm:gap-4 sm:py-5"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="relative h-24 w-[68px] shrink-0 overflow-hidden bg-surface-low sm:h-28 sm:w-20"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover transition-transform duration-500 ease-scandi hover:scale-105"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start gap-2">
                      <Link
                        href={`/product/${item.slug}`}
                        onClick={closeCart}
                        className="min-w-0 flex-1 font-display text-body-md leading-6 hover:underline sm:text-body-lg"
                      >
                        {item.name}
                      </Link>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="-me-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-tertiary transition-colors hover:text-error"
                        aria-label={`${t.cart.remove} ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-0.5 truncate text-body-sm text-secondary">
                      {item.colorName}
                      {item.size && ` · ${item.size}`}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                      <div className="flex items-center border border-outline-variant">
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-surface-low active:bg-surface-container"
                          aria-label={t.product.decreaseQty}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-body-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="flex h-9 w-9 items-center justify-center transition-colors hover:bg-surface-low active:bg-surface-container disabled:opacity-30"
                          aria-label={t.product.increaseQty}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-body-md tabular-nums">
                        {formatPrice(item.unitPrice * item.quantity, currencySymbol, locale)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="shrink-0 border-t border-outline-variant px-margin-mobile py-4 pb-safe sm:px-6 sm:py-5">
              <div className="mb-3 flex items-baseline justify-between gap-3 sm:mb-4">
                <span className="label-caps text-secondary">{t.cart.subtotal}</span>
                <span className="font-display text-title-md tabular-nums sm:text-headline-sm">
                  {formatPrice(subtotal, currencySymbol, locale)}
                </span>
              </div>
              <p className="mb-4 text-body-sm text-secondary">{t.cart.calculatedAtCheckout}</p>
              <div className="flex flex-col gap-2">
                <ButtonLink href="/cart" onClick={closeCart} className="w-full">
                  {t.cart.viewBag}
                </ButtonLink>
                <Button variant="secondary" onClick={closeCart} className="w-full">
                  {t.cart.continueShopping}
                </Button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
