'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea, FieldLabel } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { editOrder } from '@/app/actions/dashboard';
import { useDash } from './dashboard-i18n';
import { formatPrice, cn } from '@/lib/utils';

export interface EditableOrder {
  id: string;
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  street: string;
  area: string | null;
  governorate: string;
  notes: string | null;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  items: {
    id: string;
    name: string;
    colorName: string;
    size: string | null;
    unitPrice: number;
    quantity: number;
  }[];
}

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
const PAYMENTS = ['UNPAID', 'PAID', 'REFUNDED'] as const;

/**
 * Everything about an order, after it was placed.
 *
 * The total is shown beside the arithmetic of the lines rather than replacing
 * it: a shop settles the odd order by agreement, so the figure is editable,
 * but a total that disagrees with its own lines should be visibly a decision
 * rather than a mistake.
 */
export function OrderEditor({
  order,
  governorates,
  currencySymbol,
  onDone,
  onCancel,
}: {
  order: EditableOrder;
  governorates: { name: string; nameAr: string }[];
  currencySymbol: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { d, locale } = useDash();
  const { toast } = useToast();
  const router = useRouter();

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    fullName: order.fullName,
    phone: order.phone ?? '',
    street: order.street,
    area: order.area ?? '',
    governorate: order.governorate,
    notes: order.notes ?? '',
    status: order.status,
    paymentStatus: order.paymentStatus,
    shippingCost: String(order.shippingCost),
    discount: String(order.discount),
    total: String(order.total),
  });

  const [lines, setLines] = React.useState(
    order.items.map((i) => ({ ...i, quantity: String(i.quantity), unitPrice: String(i.unitPrice) })),
  );

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const num = (value: string) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const subtotal =
    Math.round(lines.reduce((s, l) => s + num(l.unitPrice) * num(l.quantity), 0) * 100) / 100;
  const computed =
    Math.round((subtotal + num(form.shippingCost) - num(form.discount)) * 100) / 100;
  const totalDiffers = Math.abs(num(form.total) - computed) > 0.009;

  // Keep the total following the lines until it is deliberately overridden.
  const [totalTouched, setTotalTouched] = React.useState(false);
  React.useEffect(() => {
    if (!totalTouched) setForm((f) => ({ ...f, total: String(computed) }));
  }, [computed, totalTouched]);

  async function save() {
    setSaving(true);
    setError(null);

    const result = await editOrder({
      orderId: order.id,
      fullName: form.fullName,
      phone: form.phone,
      street: form.street,
      area: form.area,
      governorate: form.governorate,
      notes: form.notes,
      status: form.status,
      paymentStatus: form.paymentStatus,
      shippingCost: num(form.shippingCost),
      discount: num(form.discount),
      total: num(form.total),
      lines: lines.map((l) => ({
        id: l.id,
        quantity: num(l.quantity),
        unitPrice: num(l.unitPrice),
      })),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? d.common.somethingWrong);
      return;
    }

    toast(d.orders.saved);
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <p role="alert" className="animate-fade-down border border-error p-3 text-body-sm text-error">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------ the lines */}
      <section>
        <FieldLabel>{d.orders.itemsHeading}</FieldLabel>
        <p className="mb-3 text-body-sm text-secondary">{d.orders.editLinesHint}</p>

        <div className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <div
              key={line.id}
              className={cn(
                'grid grid-cols-1 items-end gap-3 border border-outline-variant p-3 sm:grid-cols-[1fr_120px_110px_auto]',
                num(line.quantity) === 0 && 'row-off',
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-label-md">{line.name}</p>
                <p className="truncate text-body-sm text-secondary">
                  {[line.colorName, line.size].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>

              <Input
                label={`${d.common.price} (${currencySymbol})`}
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) =>
                  setLines((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, unitPrice: e.target.value } : r)),
                  )
                }
              />
              <Input
                label={d.common.quantity}
                type="number"
                min="0"
                value={line.quantity}
                onChange={(e) =>
                  setLines((rows) =>
                    rows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)),
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  setLines((rows) => rows.map((r, j) => (j === i ? { ...r, quantity: '0' } : r)))
                }
                aria-label={`${d.common.remove} ${line.name}`}
                title={d.orders.removeLineHint}
                className="flex h-12 w-12 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- the money */}
      <section className="border border-outline-variant bg-surface-low p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={`${d.orders.shipping} (${currencySymbol})`}
            type="number"
            min="0"
            step="0.01"
            value={form.shippingCost}
            onChange={(e) => set({ shippingCost: e.target.value })}
          />
          <Input
            label={`${d.orders.discount} (${currencySymbol})`}
            type="number"
            min="0"
            step="0.01"
            value={form.discount}
            onChange={(e) => set({ discount: e.target.value })}
          />
          <div>
            <Input
              label={`${d.common.total} (${currencySymbol})`}
              type="number"
              min="0"
              step="0.01"
              value={form.total}
              onChange={(e) => {
                setTotalTouched(true);
                set({ total: e.target.value });
              }}
            />
            {totalDiffers && (
              <button
                type="button"
                onClick={() => {
                  setTotalTouched(false);
                  set({ total: String(computed) });
                }}
                className="label-caps mt-1.5 inline-flex items-center gap-1.5 text-error underline-offset-4 hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                {d.orders.totalDiffers} {formatPrice(computed, currencySymbol, locale)}
              </button>
            )}
          </div>
        </div>

        <p className="mt-3 text-body-sm text-secondary">
          {d.orders.subtotal}: {formatPrice(subtotal, currencySymbol, locale)}
        </p>
      </section>

      {/* -------------------------------------------------- where it goes */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label={d.orders.customer}
          value={form.fullName}
          onChange={(e) => set({ fullName: e.target.value })}
        />
        <Input
          label={d.orders.phone}
          dir="ltr"
          value={form.phone}
          onChange={(e) => set({ phone: e.target.value })}
        />
        <Input
          label={d.orders.street}
          containerClassName="sm:col-span-2"
          value={form.street}
          onChange={(e) => set({ street: e.target.value })}
        />
        <Input
          label={d.orders.area}
          value={form.area}
          onChange={(e) => set({ area: e.target.value })}
        />
        <Select
          label={d.orders.governorate}
          value={form.governorate}
          onChange={(e) => set({ governorate: e.target.value })}
        >
          {/* The order keeps whatever it was placed with, even if that
              governorate has since been renamed or switched off. */}
          {!governorates.some((g) => g.name === form.governorate) && (
            <option value={form.governorate}>{form.governorate}</option>
          )}
          {governorates.map((g) => (
            <option key={g.name} value={g.name}>
              {locale === 'ar' && g.nameAr ? g.nameAr : g.name}
            </option>
          ))}
        </Select>
        <Textarea
          label={d.orders.deliveryNotes}
          containerClassName="sm:col-span-2"
          rows={2}
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </section>

      {/* ----------------------------------------------------- its state */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={d.common.status}
          value={form.status}
          onChange={(e) => set({ status: e.target.value })}
          hint={
            form.status === 'CANCELLED' && order.status !== 'CANCELLED'
              ? d.orders.cancelledReturnsStock
              : undefined
          }
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Select
          label={d.orders.payment}
          value={form.paymentStatus}
          onChange={(e) => set({ paymentStatus: e.target.value })}
        >
          {PAYMENTS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          {d.common.cancel}
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
            </>
          ) : (
            d.common.saveChanges
          )}
        </Button>
      </div>
    </div>
  );
}
