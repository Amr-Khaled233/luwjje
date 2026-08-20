'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  ArrowUp,
  ArrowDown,
  Search,
  ExternalLink,
  FolderTree,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { StatusBadge, ColorDot, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { ConfirmDialog } from '@/components/dashboard/modal';
import { ProductEditor, type EditableProduct } from '@/components/dashboard/product-editor';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import {
  deleteProduct,
  toggleProductStatus,
  toggleBestSeller,
  reorderBestSeller,
} from '@/app/actions/dashboard';
import { formatPrice, cn } from '@/lib/utils';

export interface AdminCategory {
  id: string;
  name: string;
  description: string;
}

export function ProductsManager({
  products,
  categories,
  currencySymbol,
}: {
  products: EditableProduct[];
  categories: AdminCategory[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [editing, setEditing] = React.useState<EditableProduct | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<EditableProduct | null>(null);
  const [pending, setPending] = React.useState(false);

  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');

  const filtered = products.filter((p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (categoryFilter && p.categoryId !== categoryFilter) return false;
    return true;
  });

  const bestSellers = products
    .filter((p) => p.isBestSeller)
    .sort((a, b) => a.bestSellerOrder - b.bestSellerOrder);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true);
    const result = await fn();
    setPending(false);

    if (!result.ok) {
      toast(result.error ?? d.common.somethingWrong, 'error');
      return false;
    }
    toast(success);
    router.refresh();
    return true;
  }

  /** De-duplicated colourways for the table's swatch column. */
  function colorsOf(p: EditableProduct) {
    const out: { name: string; hex: string }[] = [];
    for (const v of p.variants) {
      if (!out.some((c) => c.name === v.colorName)) out.push({ name: v.colorName, hex: v.colorHex });
    }
    return out;
  }

  return (
    <>
      {/* ------------------------------------------------- filters + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:min-w-[220px] sm:flex-1">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.products.searchPlaceholder}
            aria-label={d.products.searchPlaceholder}
            className="h-11 w-full border border-outline-variant bg-background ps-11 pe-4 text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none"
          />
        </div>

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label={d.products.category}
          className="h-11 w-full sm:w-auto sm:min-w-[170px]"
        >
          <option value="">{d.products.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />{d.products.addNew}</Button>
      </div>

      {/* ------------------------------------------------------ best sellers */}
      <section className="border border-outline-variant bg-surface-lowest">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">{d.products.bestSellersTitle}</h2>
            <p className="mt-1.5 text-body-sm text-secondary">
              These four appear in the Best Sellers row. Star a product below to add it; use the
              arrows to set the order.
            </p>
          </div>
          <span className="label-caps text-secondary">{fmt(d.products.selected, { n: bestSellers.length })}</span>
        </header>

        {bestSellers.length === 0 ? (
          <p className="px-6 py-8 text-body-sm text-secondary">
            None selected — the row falls back to the best-selling products by units sold.
          </p>
        ) : (
          <ol className="flex flex-col">
            {bestSellers.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-4 border-b border-outline-variant px-6 py-4 last:border-b-0"
              >
                <span className="w-6 shrink-0 text-body-sm tabular-nums text-tertiary">{i + 1}</span>
                {p.images[0] && (
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-surface-low">
                    <Image src={p.images[0].url} alt="" fill sizes="36px" className="object-cover" />
                  </div>
                )}
                <span className="min-w-0 flex-1 truncate text-label-md">{p.name}</span>
                <span className="shrink-0 text-body-sm text-secondary">
                  {formatPrice(p.price, currencySymbol)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => run(() => reorderBestSeller(p.id!, 'up'), d.products.orderUpdated)}
                    disabled={i === 0 || pending}
                    aria-label={`${d.products.moveUp} — ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => run(() => reorderBestSeller(p.id!, 'down'), d.products.orderUpdated)}
                    disabled={i === bestSellers.length - 1 || pending}
                    aria-label={`${d.products.moveDown} — ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => run(() => toggleBestSeller(p.id!), 'Removed from Best Sellers.')}
                    disabled={pending}
                    aria-label={`${d.products.removedFromBest} — ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error disabled:opacity-30"
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ------------------------------------------------------------ table */}
      <section className="border border-outline-variant bg-surface-lowest">
        {filtered.length === 0 ? (
          <EmptyState
            title="No products match."
            body={
              products.length === 0
                ? 'Add your first product to populate the storefront.'
                : 'Try clearing the filters above.'
            }
            action={<Button onClick={() => setCreating(true)}>{d.products.addNew}</Button>}
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.common.actions}</Th>
                <Th>{d.stock.product}</Th>
                <Th>{d.products.category}</Th>
                <Th>{d.common.price}</Th>
                <Th>{d.products.colours}</Th>
                <Th>{d.products.stock}</Th>
                <Th>{d.products.sold}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const stock = p.variants.reduce((s, v) => s + v.stock, 0);
                const low = p.variants.some((v) => v.stock <= v.lowStockAt);
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      'transition-colors hover:bg-surface-low',
                      p.status !== 'PUBLISHED' && 'row-off',
                    )}
                  >
                    <Td>
                      <div className="flex items-center justify-start gap-1">
                        <button
                          onClick={() =>
                            run(
                              () => toggleBestSeller(p.id!),
                              p.isBestSeller ? 'Removed from Best Sellers.' : d.products.addedToBest,
                            )
                          }
                          disabled={pending}
                          aria-label={d.products.toggleBestSeller}
                          title={d.products.toggleBestSeller}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center border transition-colors',
                            p.isBestSeller
                              ? 'border-navy bg-navy text-background'
                              : 'border-outline-variant hover:border-navy',
                          )}
                        >
                          <Star className={cn('h-3.5 w-3.5', p.isBestSeller && 'fill-current')} />
                        </button>
                        <Link
                          href={`/product/${p.slug}`}
                          target="_blank"
                          aria-label={d.products.viewOnStore}
                          title={d.products.viewOnStore}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => setEditing(p)}
                          aria-label={`${d.common.edit} ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          aria-label={`${d.common.delete} ${p.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden bg-surface-low">
                            <Image
                              src={p.images[0].url}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-14 w-10 shrink-0 bg-surface-container" />
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 truncate text-label-md">
                            {p.name}
                            {p.isBestSeller && (
                              <Star className="h-3 w-3 shrink-0 fill-current text-navy" />
                            )}
                          </p>
                          <p className="mt-0.5 truncate text-body-sm text-tertiary">/{p.slug}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-secondary">{p.categoryName ?? '—'}</Td>
                    <Td className="tabular-nums">{formatPrice(p.price, currencySymbol)}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {colorsOf(p).map((c) => (
                          <ColorDot key={c.name} hex={c.hex} size="sm" title={c.name} />
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <span className={cn('tabular-nums', low && 'text-error')}>{stock}</span>
                    </Td>
                    <Td className="tabular-nums text-secondary">{p.soldCount}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* --------------------------------------------------------- dialogs */}
      <ProductEditor
        open={creating || Boolean(editing)}
        product={editing}
        categories={categories}
        currencySymbol={currencySymbol}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        pending={pending}
        title={fmt(d.products.deleteTitle, { name: deleting?.name ?? '' })}
        body="The product disappears from the storefront immediately. Past orders keep their own copy of the name, colour and price, so order history stays intact."
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(() => deleteProduct(deleting.id!), d.products.deleted);
          if (ok) setDeleting(null);
        }}
      />
    </>
  );
}
