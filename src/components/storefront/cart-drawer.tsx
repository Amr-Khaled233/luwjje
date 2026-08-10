'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { Button, ButtonLink } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
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

  React.useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t.nav.bag}>
      <div className="scrim absolute inset-0" onClick={closeCart} />
      <aside className="absolute inset-y-0 right-0 flex w-[min(100vw,440px)] animate-fade-in flex-col border-l border-outline-variant bg-background">
        <header className="flex items-center justify-between border-b border-outline-variant px-6 py-5">
          <h2 className="font-display text-headline-sm">{t.cart.title}</h2>
          <button onClick={closeCart} aria-label={t.nav.close}>
            <X className="h-5 w-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-display text-headline-sm">{t.cart.empty}</p>
            <p className="text-body-md text-secondary">{t.cart.nothingChosen}</p>
            <ButtonLink href="/shop" onClick={closeCart} className="mt-2">
              {t.cart.browse}
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-4 border-b border-outline-variant py-5 last:border-b-0"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="relative h-28 w-20 shrink-0 overflow-hidden bg-surface-low"
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="font-display text-body-lg leading-6 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-body-sm text-secondary">
                      {item.colorName}
                      {item.size && ` · ${item.size}`}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-outline-variant">
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-surface-low"
                          aria-label={t.product.decreaseQty}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-body-sm">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
                          aria-label={t.product.increaseQty}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-body-md">
                        {formatPrice(item.unitPrice * item.quantity, currencySymbol, locale)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="self-start text-tertiary transition-colors hover:text-error"
                    aria-label={`${t.cart.remove} ${item.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <footer className="border-t border-outline-variant px-6 py-5">
              <div className="mb-4 flex items-baseline justify-between">
                <span className="label-caps text-secondary">{t.cart.subtotal}</span>
                <span className="font-display text-headline-sm">{formatPrice(subtotal, currencySymbol, locale)}</span>
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
