'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Check, Loader2, ExternalLink } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { ColorDot, StatusBadge, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { useToast } from '@/components/ui/toast';
import { updateStock } from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

export interface StockRow {
  id: string;
  sku: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  image: string;
  colorName: string;
  colorHex: string;
  size: string | null;
  stock: number;
  lowStockAt: number;
}

/** One inline-editable row. Saves on blur or Enter, never on every keystroke. */
function Row({ row }: { row: StockRow }) {
  const router = useRouter();
  const { toast } = useToast();

  const [stock, setStock] = React.useState(String(row.stock));
  const [lowStockAt, setLowStockAt] = React.useState(String(row.lowStockAt));
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  // Re-sync when the server sends fresh data.
  React.useEffect(() => {
    setStock(String(row.stock));
    setLowStockAt(String(row.lowStockAt));
  }, [row.stock, row.lowStockAt]);

  const dirty = Number(stock) !== row.stock || Number(lowStockAt) !== row.lowStockAt;

  async function save() {
    if (!dirty) return;
    const nextStock = Number(stock);
    const nextLow = Number(lowStockAt);

    if (!Number.isInteger(nextStock) || nextStock < 0 || !Number.isInteger(nextLow) || nextLow < 0) {
      toast('Quantities must be whole numbers of zero or more.', 'error');
      setStock(String(row.stock));
      setLowStockAt(String(row.lowStockAt));
      return;
    }

    setState('saving');
    const result = await updateStock({
      variantId: row.id,
      stock: nextStock,
      lowStockAt: nextLow,
    });

    if (!result.ok) {
      setState('idle');
      toast(result.error ?? 'Could not save.', 'error');
      return;
    }

    setState('saved');
    router.refresh();
    setTimeout(() => setState('idle'), 1600);
  }

  const isOut = row.stock === 0;
  const isLow = row.stock > 0 && row.stock <= row.lowStockAt;

  return (
    <tr className="transition-colors hover:bg-surface-low">
      <Td>
        <div className="flex items-center gap-3">
          {row.image ? (
            <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-surface-low">
              <Image src={row.image} alt="" fill sizes="36px" className="object-cover" />
            </div>
          ) : (
            <div className="h-12 w-9 shrink-0 bg-surface-container" />
          )}
          <div className="min-w-0">
            <p className="truncate text-label-md">{row.productName}</p>
            <p className="mt-0.5 truncate text-body-sm text-tertiary">{row.sku}</p>
          </div>
        </div>
      </Td>

      <Td>
        <span className="flex items-center gap-2">
          <ColorDot hex={row.colorHex} size="sm" />
          <span className="text-secondary">{row.colorName}</span>
        </span>
      </Td>

      <Td className="text-secondary">{row.size ?? '—'}</Td>

      <Td>
        <input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label={`Stock for ${row.sku}`}
          className={cn(
            'h-10 w-24 border bg-background px-3 text-body-md tabular-nums transition-colors focus:border-navy focus:outline-none',
            isOut ? 'border-error text-error' : isLow ? 'border-error' : 'border-outline-variant',
          )}
        />
      </Td>

      <Td>
        <input
          type="number"
          min="0"
          value={lowStockAt}
          onChange={(e) => setLowStockAt(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label={`Low-stock alert level for ${row.sku}`}
          className="h-10 w-24 border border-outline-variant bg-background px-3 text-body-md tabular-nums transition-colors focus:border-navy focus:outline-none"
        />
      </Td>

      <Td>
        {isOut ? (
          <span className="label-caps text-error">Out of stock</span>
        ) : isLow ? (
          <span className="label-caps text-error">Low</span>
        ) : (
          <span className="label-caps text-secondary">In stock</span>
        )}
      </Td>

      <Td>
        <div className="flex items-center justify-end gap-3">
          {state === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
          {state === 'saved' && <Check className="h-4 w-4 text-navy" />}
          {state === 'idle' && dirty && (
            <span className="text-body-sm text-secondary">Unsaved</span>
          )}
          <Link
            href={`/product/${row.productSlug}`}
            target="_blank"
            aria-label="View on storefront"
            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Td>
    </tr>
  );
}

export function StockManager({
  rows,
  initialFilter,
}: {
  rows: StockRow[];
  initialFilter: string;
}) {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState(initialFilter);

  const filtered = rows.filter((r) => {
    if (query) {
      const q = query.toLowerCase();
      const match =
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.colorName.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filter === 'low') return r.stock <= r.lowStockAt;
    if (filter === 'out') return r.stock === 0;
    if (filter === 'in') return r.stock > r.lowStockAt;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product, SKU or colour…"
            aria-label="Search stock"
            className="h-11 w-full border border-outline-variant bg-background pl-11 pr-4 text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none"
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter stock"
          className="h-11 w-auto min-w-[180px]"
        >
          <option value="">All SKUs</option>
          <option value="low">Low or out of stock</option>
          <option value="out">Out of stock only</option>
          <option value="in">Healthy stock</option>
        </Select>
        <span className="pb-3 text-body-sm text-secondary">{filtered.length} SKUs</span>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {filtered.length === 0 ? (
          <EmptyState
            title="No SKUs match."
            body="Adjust the search or filter above."
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Colour</Th>
                <Th>Size</Th>
                <Th>Quantity</Th>
                <Th>Alert at</Th>
                <Th>Status</Th>
                <Th className="text-right">&nbsp;</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </>
  );
}
