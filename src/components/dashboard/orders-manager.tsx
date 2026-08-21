'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { StatusBadge, EmptyState, Divider } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { updateOrderStatus } from '@/app/actions/dashboard';
import { OrderEditor } from './order-editor';
import { formatPrice, formatDate, ORDER_STATUSES } from '@/lib/utils';

interface AdminOrder {
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
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  promoCode: string | null;
  createdAt: string;
  items: {
    id: string;
    name: string;
    colorName: string;
    size: string | null;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
  }[];
}

export function OrdersManager({
  orders,
  governorates,
  currencySymbol,
  initialStatus,
}: {
  orders: AdminOrder[];
  governorates: { name: string; nameAr: string }[];
  currencySymbol: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [editing, setEditing] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(initialStatus);
  const [open, setOpen] = React.useState<AdminOrder | null>(null);

  React.useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (status && o.status !== status) return false;
    if (query) {
      const q = query.toLowerCase();
      // Phones get typed with spaces, dashes and a +20 that may or may not be
      // there, so both sides are reduced to digits before comparing.
      const digits = q.replace(/D/g, '');
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.fullName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (!!digits && (o.phone ?? '').replace(/D/g, '').includes(digits))
      );
    }
    return true;
  });

  async function changeStatus(orderId: string, next: string) {
    setPendingId(orderId);
    const result = await updateOrderStatus({ orderId, status: next });
    setPendingId(null);

    if (!result.ok) {
      toast(result.error ?? d.orders.couldNotUpdate, 'error');
      return;
    }

    toast(
      next === 'CANCELLED'
        ? d.orders.cancelledReturnsStock
        : fmt(d.orders.markedAs, { status: d.orders.statusLabels[next] ?? next }),
    );
    setOpen((current) => (current ? { ...current, status: next } : null));
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:min-w-[220px] sm:flex-1">
          <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.orders.searchPlaceholder}
            aria-label={d.orders.searchPlaceholder}
            className="h-11 w-full border border-outline-variant bg-background ps-11 pe-4 text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={d.common.status}
          className="h-11 w-full sm:w-auto sm:min-w-[180px]"
        >
          <option value="">{d.orders.allStatuses}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {d.orders.statusLabels[s] ?? s}
            </option>
          ))}
        </Select>
        <span className="pb-3 text-body-sm text-secondary">{fmt(d.orders.ordersCount, { n: filtered.length })}</span>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {filtered.length === 0 ? (
          <EmptyState title={d.common.noResults} body={d.common.adjustFilters} className="border-0" />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.orders.order}</Th>
                <Th>{d.orders.customer}</Th>
                <Th>{d.common.date}</Th>
                <Th>{d.orders.items}</Th>
                <Th>{d.common.total}</Th>
                <Th>{d.common.status}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                /*
                  The whole row opens the order — an icon at the end of it was
                  a small target for something you do to every row you look at.
                  It is focusable and answers Enter/Space, so the keyboard gets
                  the same thing the mouse does.
                */
                <tr
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${d.orders.viewOrder} ${o.orderNumber}`}
                  onClick={() => setOpen(o)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpen(o);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-surface-low focus-visible:bg-surface-low focus-visible:outline focus-visible:outline-1 focus-visible:outline-navy"
                >
                  <Td>
                    <span className="text-label-md">{o.orderNumber}</span>
                  </Td>
                  <Td>
                    <p className="text-label-md">{o.fullName}</p>
                    <p className="mt-0.5 text-body-sm text-tertiary">{o.email}</p>
                    {o.phone && (
                      <p className="mt-0.5 text-body-sm text-tertiary" dir="ltr">
                        {o.phone}
                      </p>
                    )}
                  </Td>
                  <Td className="text-secondary">{formatDate(o.createdAt)}</Td>
                  <Td className="tabular-nums text-secondary">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </Td>
                  <Td className="tabular-nums">{formatPrice(o.total, currencySymbol)}</Td>
                  {/* The status control belongs to the cell, not to the row. */}
                  <Td>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <select
                        value={o.status}
                        onChange={(e) => changeStatus(o.id, e.target.value)}
                        disabled={pendingId === o.id}
                        aria-label={`Status of ${o.orderNumber}`}
                        className="select-reset h-9 cursor-pointer border border-outline-variant bg-background ps-3 pe-8 text-label-sm transition-colors focus:border-navy focus:outline-none disabled:opacity-50"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {d.orders.statusLabels[s] ?? s}
                          </option>
                        ))}
                      </select>
                      {pendingId === o.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* ------------------------------------------------------ detail modal */}
      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? `Order ${open.orderNumber}` : ''}
        description={open ? `Placed ${formatDate(open.createdAt)}` : undefined}
        footer={
          editing ? undefined : (
            <>
              <Button variant="secondary" onClick={() => setOpen(null)}>
                {d.common.close}
              </Button>
              <Button onClick={() => setEditing(true)}>{d.orders.editOrder}</Button>
            </>
          )
        }
      >
        {open && editing && (
          <OrderEditor
            order={open}
            governorates={governorates}
            currencySymbol={currencySymbol}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setEditing(false);
              setOpen(null);
            }}
          />
        )}

        {open && !editing && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="label-caps mb-2 text-secondary">{d.common.status}</p>
                <StatusBadge status={open.status} label={d.orders.statusLabels[open.status] ?? open.status} />
              </div>
              <div className="ms-auto">
                <label htmlFor="detail-status" className="label-caps mb-2 block text-secondary">
                  {d.orders.changeStatus}</label>
                <select
                  id="detail-status"
                  value={open.status}
                  onChange={(e) => changeStatus(open.id, e.target.value)}
                  disabled={pendingId === open.id}
                  className="select-reset h-11 cursor-pointer border border-outline-variant bg-background ps-4 pe-9 text-label-md focus:border-navy focus:outline-none disabled:opacity-50"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {d.orders.statusLabels[s] ?? s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border border-outline-variant p-5">
                <p className="label-caps mb-3 text-secondary">{d.orders.customer}</p>
                <p className="text-body-md">{open.fullName}</p>
                <p className="mt-1 text-body-sm text-secondary">{open.email}</p>
                {open.phone && <p className="mt-1 text-body-sm text-secondary">{open.phone}</p>}
              </div>
              <div className="border border-outline-variant p-5">
                <p className="label-caps mb-3 text-secondary">{d.orders.deliverTo}</p>
                <address className="not-italic text-body-sm leading-6 text-secondary">
                  {open.street}
                  <br />
                  {open.area && `${open.area}, `}
                  {open.governorate}
                </address>
              </div>
            </div>

            {open.notes && (
              <div className="border border-outline-variant p-5">
                <p className="label-caps mb-2 text-secondary">{d.orders.deliveryNotes}</p>
                <p className="text-body-md text-secondary">{open.notes}</p>
              </div>
            )}

            <div>
              <p className="label-caps mb-3 text-secondary">{d.orders.itemsHeading}</p>
              <div className="border-t border-outline-variant">
                {open.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 border-b border-outline-variant py-4"
                  >
                    {item.imageUrl && (
                      <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-surface-low">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md">{item.name}</p>
                      <p className="mt-0.5 text-body-sm text-secondary">
                        {item.colorName}
                        {item.size && ` · ${item.size}`} · {formatPrice(item.unitPrice, currencySymbol)}{' '}{d.orders.each}
                      </p>
                    </div>
                    <span className="shrink-0 text-body-sm text-secondary">×{item.quantity}</span>
                    <span className="w-24 shrink-0 text-end tabular-nums">
                      {formatPrice(item.unitPrice * item.quantity, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              <Divider className="my-5" />

              <dl className="flex flex-col gap-2.5 text-body-md">
                <div className="flex justify-between">
                  <dt className="text-secondary">{d.orders.subtotal}</dt>
                  <dd className="tabular-nums">{formatPrice(open.subtotal, currencySymbol)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary">{d.orders.shipping}</dt>
                  <dd className="tabular-nums">
                    {open.shippingCost === 0 ? d.orders.free : formatPrice(open.shippingCost, currencySymbol)}
                  </dd>
                </div>
                {open.discount > 0 && (
                  <div className="flex justify-between text-error">
                    <dt>{d.orders.discount} {open.promoCode && `(${open.promoCode})`}</dt>
                    <dd className="tabular-nums">−{formatPrice(open.discount, currencySymbol)}</dd>
                  </div>
                )}
                <div className="mt-2 flex items-baseline justify-between border-t border-outline-variant pt-4">
                  <dt className="label-caps text-secondary">{d.common.total}</dt>
                  {/* Same face as every other figure in the dashboard — only
                      larger. A serif here read as a different kind of number. */}
                  <dd className="text-[22px] font-medium leading-none tabular-nums">
                    {formatPrice(open.total, currencySymbol)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
