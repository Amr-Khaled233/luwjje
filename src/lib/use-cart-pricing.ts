'use client';

import * as React from 'react';
import { useCart, type CartItem } from './cart-store';

export const CHECKOUT_STORAGE_KEY = 'luwjje-checkout';

/** A server-verified cart line: the client shape plus any adjustment notice. */
export interface PricedLine extends CartItem {
  listPrice: number;
  notice?: string;
}

interface Pricing {
  lines: PricedLine[];
  subtotal: number;
  total: number;
  shipping: {
    cost: number;
    rate: number;
    threshold: number;
    free: boolean;
    zoneName: string;
    estimatedDays: string;
  } | null;
  promo: { ok: boolean; message: string; code?: string; discount: number } | null;
  /** Spend needed for free delivery, or 0 when no rule is within reach. */
  freeShippingOver: number;
  loading: boolean;
  error: string | null;
}

/**
 * Keeps the client cart in sync with server-side truth: re-prices on every
 * change of items, destination or promo code, and reconciles the local store
 * when the admin has changed a price, stock level or publication state.
 */
export function useCartPricing({
  items,
  governorate,
  promoCode,
}: {
  items: CartItem[];
  governorate?: string;
  promoCode?: string;
}): Pricing {
  const reconcile = useCart((s) => s.reconcile);

  const [state, setState] = React.useState<Pricing>({
    lines: [],
    subtotal: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    total: 0,
    shipping: null,
    promo: null,
    freeShippingOver: 0,
    loading: true,
    error: null,
  });

  // Stable dependency key so we only refetch on meaningful change.
  const key = JSON.stringify({
    items: items.map((i) => [i.variantId, i.quantity]),
    governorate: governorate ?? '',
    promoCode: promoCode ?? '',
  });

  React.useEffect(() => {
    if (items.length === 0) {
      setState({
        lines: [],
        subtotal: 0,
        total: 0,
        shipping: null,
        promo: null,
        freeShippingOver: 0,
        loading: false,
        error: null,
      });
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetch('/api/cart/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        governorate: governorate || undefined,
        promoCode: promoCode || undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Could not refresh your bag.');
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;

        // The admin may have changed price/stock or unpublished an item —
        // push the corrected rows back into the persisted store.
        if (data.changed) {
          reconcile(
            data.lines.map((l: CartItem) => ({
              variantId: l.variantId,
              productId: l.productId,
              slug: l.slug,
              name: l.name,
              colorName: l.colorName,
              colorHex: l.colorHex,
              size: l.size,
              unitPrice: l.unitPrice,
              imageUrl: l.imageUrl,
              quantity: l.quantity,
              maxStock: l.maxStock,
            })),
          );
        }

        setState({
          lines: data.lines,
          subtotal: data.subtotal,
          total: data.total,
          shipping: data.shipping,
          promo: promoCode ? data.promo : null,
          freeShippingOver: data.freeShippingOver ?? 0,
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
