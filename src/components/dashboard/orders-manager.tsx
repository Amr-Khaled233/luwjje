'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, Eye, Loader2 } from 'lucide-react';
import { Select } from '@/components/ui/field';
import { StatusBadge, EmptyState, Divider } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal } from '@/components/dashboard/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { updateOrderStatus } from '@/app/actions/dashboard';
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
  paymentStatus: string;
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
  currencySymbol,
  initialStatus,
}: {
  orders: AdminOrder[];
  currencySymbol: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState(initialStatus);
  const [open, setOpen] = React.useState<AdminOrder | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const filtered = orders.filter((o) => {
    if (status && o.status !== status) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.fullName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q)
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
        : fmt(d.orders.markedAs, { status: next.toLowerCase() }),
    );
    setOpen((current) => (current ? { ...current, status: next } : null));
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={d.orders.searchPlaceholder}
            aria-label={d.orders.searchPlaceholder}
            className="h-11 w-full border border-outline-variant bg-background pl-11 pr-4 text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={d.common.status}
          className="h-11 w-auto min-w-[180px]"
        >
          <option value="">{d.orders.allStatuses}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
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
                <Th align="end">{d.common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-surface-low">
                  <Td>
                    <span className="font-display text-body-lg">{o.orderNumber}</span>
                  </Td>
                  <Td>
                    <p className="text-label-md">{o.fullName}</p>
                    <p className="mt-0.5 text-body-sm text-tertiary">{o.email}</p>
                  </Td>
                  <Td className="text-secondary">{formatDate(o.createdAt)}</Td>
                  <Td className="tabular-nums text-secondary">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </Td>
                  <Td className="tabular-nums">{formatPrice(o.total, currencySymbol)}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        onChange={(e) => changeStatus(o.id, e.target.value)}
                        disabled={pendingId === o.id}
                        aria-label={`Status of ${o.orderNumber}`}
                        className="select-reset h-9 cursor-pointer border border-outline-variant bg-background pl-3 pr-8 text-label-sm transition-colors focus:border-navy focus:outline-none disabled:opacity-50"
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                      {pendingId === o.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setOpen(o)}
                        aria-label={`${d.orders.viewOrder} ${o.orderNumber}`}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
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
          <Button variant="secondary" onClick={() => setOpen(null)}>{d.common.close}</Button>
        }
      >
        {open && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="label-caps mb-2 text-secondary">{d.common.status}</p>
                <StatusBadge status={open.status} />
              </div>
              <div>
                <p className="label-caps mb-2 text-secondary">{d.orders.payment}</p>
                <StatusBadge status={open.paymentStatus === 'PAID' ? 'PAID' : open.paymentStatus} />
              </div>
              <div className="ml-auto">
                <label htmlFor="detail-status" className="label-caps mb-2 block text-secondary">
                  {d.orders.changeStatus}</label>
                <select
                  id="detail-status"
                  value={open.status}
                  onChange={(e) => changeStatus(open.id, e.target.value)}
                  disabled={pendingId === open.id}
                  className="select-reset h-11 cursor-pointer border border-outline-variant bg-background pl-4 pr-9 text-label-md focus:border-navy focus:outline-none disabled:opacity-50"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
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
                    <span className="w-24 shrink-0 text-right tabular-nums">
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
                  <dd className="font-display text-headline-sm">
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
