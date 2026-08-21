'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Check, Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { ColorDot, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { updateStock } from '@/app/actions/dashboard';
import { cn, LOW_STOCK_AT } from '@/lib/utils';

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
}

/** One inline-editable row. Saves on blur or Enter, never on every keystroke. */
function Row({ row, startsProduct }: { row: StockRow; startsProduct: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [stock, setStock] = React.useState(String(row.stock));
  const [state, setState] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  // Re-sync when the server sends fresh data.
  React.useEffect(() => {
    setStock(String(row.stock));
  }, [row.stock]);

  const dirty = Number(stock) !== row.stock;

  async function save() {
    if (!dirty) return;
    const next = Number(stock);

    if (!Number.isInteger(next) || next < 0) {
      toast(d.stock.wholeNumbers, 'error');
      setStock(String(row.stock));
      return;
    }

    setState('saving');
    const result = await updateStock({ variantId: row.id, stock: next });

    if (!result.ok) {
      setState('idle');
      toast(result.error ?? d.common.couldNotSave, 'error');
      return;
    }

    setState('saved');
    router.refresh();
    setTimeout(() => setState('idle'), 1600);
  }

  const isOut = row.stock === 0;
  const isLow = row.stock > 0 && row.stock < LOW_STOCK_AT;

  return (
    <tr
      className={cn(
        'transition-colors',
        // The whole row is tinted, not just a number: a colour you have to
        // hunt for is not a warning.
        isOut ? 'bg-error/5 hover:bg-error/10' : isLow ? 'bg-warning/10 hover:bg-warning/20' : 'hover:bg-surface-low',
        // A heavier line where one product ends and the next begins.
        startsProduct && '[&>td]:border-t-2 [&>td]:border-t-outline-variant',
      )}
    >
      <Td>
        {/* Every row shows what it is a row of. The grouping is carried by the
            order and by the rule between products, not by leaving cells blank. */}
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
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={`${d.common.quantity} — ${row.sku}`}
            className={cn(
              'h-10 w-24 border bg-background px-3 text-body-md tabular-nums transition-colors focus:border-navy focus:outline-none',
              isOut
                ? 'border-error text-error'
                : isLow
                  ? 'border-warning text-warning-ink'
                  : 'border-outline-variant',
            )}
          />
          {state === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-secondary" />}
          {state === 'saved' && <Check className="h-4 w-4 text-navy" />}
          {state === 'idle' && dirty && (
            <span className="text-body-sm text-secondary">{d.stock.unsaved}</span>
          )}
        </div>
      </Td>

      <Td>
        {isOut ? (
          <span className="label-caps text-error">{d.stock.outOfStock}</span>
        ) : isLow ? (
          <span className="label-caps text-warning-ink">{d.stock.low}</span>
        ) : (
          <span className="label-caps text-secondary">{d.stock.inStock}</span>
        )}
      </Td>
    </tr>
  );
}

export function StockManager({ rows, initialFilter }: { rows: StockRow[]; initialFilter: string }) {
  const { d } = useDash();
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState(initialFilter);

  const filtered = rows.filter((r) => {
    if (query) {
      const q = query.toLowerCase();
      const match =
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.colorName.toLowerCase().includes(q) ||
        (r.size ?? '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filter === 'out') return r.stock === 0;
    if (filter === 'low') return r.stock > 0 && r.stock < LOW_STOCK_AT;
    if (filter === 'in') return r.stock >= LOW_STOCK_AT;
    return true;
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:min-w-[220px] sm:flex-1">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.stock.searchPlaceholder}
            aria-label={d.stock.searchPlaceholder}
            className="h-11 w-full border border-outline-variant bg-background ps-11 pe-4 text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none"
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={d.common.status}
          className="h-11 w-full sm:w-auto sm:min-w-[180px]"
        >
          <option value="">{d.stock.allStock}</option>
          <option value="in">{d.stock.inStock}</option>
          <option value="low">{d.stock.low}</option>
          <option value="out">{d.stock.outOfStock}</option>
        </Select>
        <p className="text-body-sm text-secondary sm:ms-auto">
          {filtered.length} / {rows.length}
        </p>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {filtered.length === 0 ? (
          <EmptyState
            title={d.common.noResults}
            body={d.common.adjustFilters}
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.stock.product}</Th>
                <Th>{d.stock.colour}</Th>
                <Th>{d.stock.size}</Th>
                <Th>{d.common.quantity}</Th>
                <Th>{d.common.status}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <Row
                  key={row.id}
                  row={row}
                  startsProduct={i > 0 && filtered[i - 1].productName !== row.productName}
                />
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </>
  );
}
