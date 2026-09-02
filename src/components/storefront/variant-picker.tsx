'use client';

import * as React from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/ui/primitives';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/ui/toast';
import { useScrollLock, useFocusTrap, useExitAnimation } from '@/components/ui/motion';
import { formatPrice, cn } from '@/lib/utils';
import { fmt } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

interface Option {
  id: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  stock: number;
  unitPrice: number;
}

interface Data {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  variants: Option[];
}

/**
 * Quick Add for a product with more than one choice. When the piece has sizes,
 * the size is chosen first and the colours appear only afterwards — showing
 * just the colourways that come in that size, with sold-out ones dimmed. A
 * piece sold in one size (or none) shows its colours straight away. Only a
 * real, in-stock combination can be added; colours, prices and stock are
 * fetched fresh from the server when it opens.
 */
export function VariantPicker({
  open,
  onClose,
  slug,
  currencySymbol,
  locale,
  t,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
}) {
  const addItem = useCart((s) => s.addItem);
  const openCart = useCart((s) => s.openCart);
  const { toast } = useToast();

  const panel = useExitAnimation(open, 240);
  useScrollLock(open);
  const panelRef = useFocusTrap(open);

  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [size, setSize] = React.useState<string | null>(null);
  const [color, setColor] = React.useState('');

  const hasSizes = React.useMemo(
    () => (data?.variants ?? []).some((v) => v.size !== null),
    [data],
  );

  // Fetch the colourways once the picker opens.
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/products/${slug}/variants?locale=${locale}`)
      .then((r) => {
        if (!r.ok) throw new Error('unavailable');
        return r.json();
      })
      .then((d: Data) => {
        if (cancelled) return;
        setData(d);
        const withSizes = d.variants.some((v) => v.size !== null);
        if (withSizes) {
          // Size leads; colours wait until one is picked.
          setSize(null);
          setColor('');
        } else {
          const first = d.variants.find((v) => v.stock > 0) ?? d.variants[0];
          setSize(null);
          setColor(first?.colorName ?? '');
        }
      })
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, slug, locale]);

  // Escape closes it, like the other dialogs.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const variants = data?.variants ?? [];

  // Distinct sizes, in source order.
  const sizes = React.useMemo(() => {
    const out: string[] = [];
    for (const v of variants) if (v.size && !out.includes(v.size)) out.push(v.size);
    return out;
  }, [variants]);

  const sizeSoldOut = (s: string) => !variants.some((v) => v.size === s && v.stock > 0);

  // Colours to offer: for the chosen size when there are sizes, otherwise all.
  const colors = React.useMemo(() => {
    const src = variants.filter((v) => !hasSizes || v.size === size);
    const out: { name: string; hex: string }[] = [];
    for (const v of src) {
      if (!out.some((c) => c.name === v.colorName)) out.push({ name: v.colorName, hex: v.colorHex });
    }
    return out;
  }, [variants, hasSizes, size]);

  // Picking a size lands on its first in-stock colour so the choice is ready.
  function pickSize(s: string) {
    setSize(s);
    const forSize = variants.filter((v) => v.size === s);
    const first = forSize.find((v) => v.stock > 0) ?? forSize[0];
    setColor(first?.colorName ?? '');
  }

  const selected = variants.find(
    (v) => v.colorName === color && (hasSizes ? v.size === size : v.size === null),
  );
  const canAdd = Boolean(selected) && (selected?.stock ?? 0) > 0;
  const coloursShown = !hasSizes || size !== null;

  function handleAdd() {
    if (!data || !selected || !canAdd) return;
    addItem(
      {
        variantId: selected.id,
        productId: data.productId,
        slug: data.slug,
        name: data.name,
        colorName: selected.colorName,
        colorHex: selected.colorHex,
        size: selected.size,
        unitPrice: selected.unitPrice,
        imageUrl: data.imageUrl,
        maxStock: selected.stock,
      },
      1,
    );
    onClose();
    openCart();
    toast(fmt(t.product.addedToast, { name: data.name }));
  }

  if (!panel.mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t.product.selectVariant}
    >
      <div
        className={cn('scrim absolute inset-0', panel.closing ? 'animate-fade-out' : 'animate-fade-in')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'relative w-full max-w-md border-outline-variant bg-background p-6 pb-safe',
          'border-t sm:border',
          panel.closing ? 'animate-fade-out' : 'animate-fade-up',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-caps text-secondary">{t.product.selectVariant}</p>
            {data && <h3 className="mt-1 truncate font-display text-headline-sm">{data.name}</h3>}
          </div>
          <button onClick={onClose} aria-label={t.nav.close} className="tap-target -me-2 -mt-2 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-secondary" />
          </div>
        )}
        {error && <p className="py-12 text-center text-body-md text-error">{t.product.unavailable}</p>}

        {data && !loading && !error && (
          <>
            {/* size first — the colours depend on it */}
            {hasSizes && (
              <div className="mt-6">
                <p className="label-caps mb-3 text-secondary">
                  {t.product.size}
                  {size && (
                    <>
                      {' '}
                      — <span className="text-on-surface">{size}</span>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => pickSize(s)}
                      disabled={sizeSoldOut(s)}
                      aria-pressed={size === s}
                      className={cn(
                        'label-caps min-w-[52px] border px-4 py-2.5 transition-colors',
                        size === s
                          ? 'border-navy bg-navy text-background'
                          : 'border-outline-variant text-secondary hover:border-navy hover:text-on-surface',
                        sizeSoldOut(s) &&
                          'cursor-not-allowed line-through opacity-40 hover:border-outline-variant',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* colour — every colourway available in the chosen size */}
            {coloursShown ? (
              <div className="mt-6">
                <p className="label-caps mb-3 text-secondary">
                  {t.product.colour} — <span className="text-on-surface">{color}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {colors.map((c) => {
                    const soldOut = !variants.some(
                      (v) => v.colorName === c.name && (!hasSizes || v.size === size) && v.stock > 0,
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
            ) : (
              <p className="mt-6 text-body-sm text-secondary">{t.product.pickSizeForColours}</p>
            )}

            {selected && selected.stock > 0 && selected.stock <= 5 && (
              <p className="mt-5 text-body-sm text-error">{fmt(t.product.onlyLeft, { n: selected.stock })}</p>
            )}
            {selected && selected.stock === 0 && (
              <p className="mt-5 text-body-sm text-error">{t.product.combinationSoldOut}</p>
            )}

            <Button size="lg" onClick={handleAdd} disabled={!canAdd} className="mt-6 w-full">
              {canAdd ? (
                <>
                  <Plus className="h-4 w-4" /> {t.product.addToBag} —{' '}
                  {formatPrice(selected?.unitPrice ?? 0, currencySymbol, locale)}
                </>
              ) : coloursShown ? (
                t.product.soldOut
              ) : (
                t.product.selectVariant
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
