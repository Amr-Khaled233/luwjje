'use client';

import * as React from 'react';
import Image from 'next/image';
import { Minus, Plus, Plus as PlusIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorDot } from '@/components/ui/primitives';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/ui/toast';
import { formatPrice, cn } from '@/lib/utils';

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
  materialInfo: string;
  careInfo: string;
  price: number;
  listPrice: number;
  discounted: boolean;
  categoryName: string | null;
  images: { url: string; alt: string }[];
  variants: Variant[];
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-outline-variant">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="label-caps">{title}</span>
        <span className="relative h-3 w-3 shrink-0">
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
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

export function ProductDetail({ product }: { product: DetailProduct }) {
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

  React.useEffect(() => setQuantity(1), [selected?.id]);

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
    toast(`${product.name} added to your bag.`);
  }

  return (
    <div className="grid grid-cols-1 gap-stack-md lg:grid-cols-2 lg:gap-gutter">
      {/* ----------------------------------------------------------- gallery */}
      <div className="flex flex-col-reverse gap-4 md:flex-row">
        {product.images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto md:flex-col md:overflow-visible">
            {product.images.map((img, i) => (
              <button
                key={img.url + i}
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  'relative h-24 w-[72px] shrink-0 overflow-hidden border transition-colors',
                  i === activeImage ? 'border-navy' : 'border-outline-variant hover:border-outline',
                )}
              >
                <Image src={img.url} alt={img.alt} fill sizes="72px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="relative aspect-[3/4] flex-1 overflow-hidden bg-surface-low">
          {product.images[activeImage] && (
            <Image
              src={product.images[activeImage].url}
              alt={product.images[activeImage].alt || product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------- info */}
      <div className="lg:pl-8">
        {product.categoryName && (
          <p className="label-caps mb-4 text-secondary">{product.categoryName}</p>
        )}
        <h1 className="font-display text-headline-md md:text-display-sm">{product.name}</h1>

        <div className="mt-4 flex items-baseline gap-3">
          {product.discounted && (
            <span className="text-body-lg text-tertiary line-through">
              {formatPrice(product.listPrice)}
            </span>
          )}
          <span className={cn('text-body-lg', product.discounted && 'text-error')}>
            {formatPrice(product.price)}
          </span>
        </div>

        {product.description && (
          <p className="mt-6 max-w-[52ch] whitespace-pre-line text-body-md leading-7 text-secondary">
            {product.description}
          </p>
        )}

        {/* colour */}
        <div className="mt-stack-sm pt-4">
          <p className="label-caps mb-4 text-secondary">
            Colour — <span className="text-on-surface">{color}</span>
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
              Size — <span className="text-on-surface">{size}</span>
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
          <p className="mt-6 text-body-sm text-error">Only {maxStock} left in this colourway.</p>
        )}
        {selected && maxStock === 0 && (
          <p className="mt-6 text-body-sm text-error">This combination is sold out.</p>
        )}

        {/* quantity + add */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="flex h-14 items-center border border-outline-variant">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-full w-12 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
              aria-label="Decrease quantity"
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
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button size="lg" onClick={handleAdd} disabled={!canAdd} className="flex-1">
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : canAdd ? (
              <>
                <PlusIcon className="h-4 w-4" /> Add to Bag — {formatPrice(product.price * quantity)}
              </>
            ) : (
              'Sold out'
            )}
          </Button>
        </div>

        {/* accordions */}
        <div className="mt-stack-md border-t border-outline-variant">
          {product.materialInfo && (
            <Accordion title="Material & Dimensions">
              <p className="whitespace-pre-line">{product.materialInfo}</p>
            </Accordion>
          )}
          {product.careInfo && (
            <Accordion title="Care">
              <p className="whitespace-pre-line">{product.careInfo}</p>
            </Accordion>
          )}
          <Accordion title="Shipping & Returns">
            <p>
              Dispatched within two working days. Shipping is calculated at checkout by destination
              and is complimentary above the threshold shown in your bag. Return anything unworn
              within 30 days for a full refund.
            </p>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
