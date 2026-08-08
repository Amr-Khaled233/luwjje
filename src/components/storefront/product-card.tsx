'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart-store';
import { useToast } from '@/components/ui/toast';
import { ColorDot } from '@/components/ui/primitives';
import { formatPrice, cn } from '@/lib/utils';
import type { ProductCardData } from '@/lib/queries';

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
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
      const line = await res.json();
      addItem(line, 1);
      openCart();
    } catch {
      toast('That piece is unavailable right now.', 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className={cn('group', className)}>
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-low">
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className={cn(
              'object-cover transition-all duration-500 ease-scandi',
              product.hoverImage
                ? 'group-hover:scale-[1.02] group-hover:opacity-0'
                : 'group-hover:scale-[1.02]',
            )}
          />
          {product.hoverImage && (
            <Image
              src={product.hoverImage}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
              className="scale-[1.02] object-cover opacity-0 transition-opacity duration-500 ease-scandi group-hover:opacity-100"
            />
          )}

          {!product.inStock && (
            <span className="label-caps absolute left-3 top-3 border border-navy bg-background px-2.5 py-1">
              Sold out
            </span>
          )}
          {product.discounted && product.inStock && (
            <span className="label-caps absolute left-3 top-3 border border-navy bg-navy px-2.5 py-1 text-background">
              Sale
            </span>
          )}

          {product.inStock && (
            <button
              onClick={quickAdd}
              disabled={adding}
              className="label-caps absolute inset-x-3 bottom-3 hidden h-11 items-center justify-center border border-navy bg-background/95 text-navy opacity-0 backdrop-blur-sm transition-all duration-300 ease-scandi hover:bg-navy hover:text-background group-hover:opacity-100 md:flex"
            >
              {adding ? 'Adding…' : 'Quick Add'}
            </button>
          )}
        </div>

        <div className="pt-4">
          <h3 className="font-display text-headline-sm leading-8">{product.name}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            {product.discounted && (
              <span className="text-body-md text-tertiary line-through">
                {formatPrice(product.listPrice)}
              </span>
            )}
            <span className={cn('text-body-md', product.discounted && 'text-error')}>
              {formatPrice(product.price)}
            </span>
          </div>

          {product.colors.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5">
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
  className,
}: {
  products: ProductCardData[];
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-gutter gap-y-stack-md md:grid-cols-2 lg:grid-cols-4', className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
