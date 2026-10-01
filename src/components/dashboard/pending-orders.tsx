'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Send, Trash2, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import {
  confirmOrderFromDashboard,
  resendOrderConfirmation,
  deletePendingOrder,
} from '@/app/actions/dashboard';
import { formatPrice, formatDate, cn } from '@/lib/utils';

interface PendingOrder {
  id: string;
  orderNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  total: number;
  createdAt: string;
  itemCount: number;
}

/** Whole days since the order was placed. */
function daysWaiting(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function PendingOrders({
  orders,
  currencySymbol,
}: {
  orders: PendingOrder[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  // Which row is busy, and with which action, so only its button spins.
  const [busy, setBusy] = React.useState<{ id: string; action: 'confirm' | 'resend' | 'delete' } | null>(
    null,
  );
  const [toDelete, setToDelete] = React.useState<PendingOrder | null>(null);

  async function confirm(order: PendingOrder) {
    setBusy({ id: order.id, action: 'confirm' });
    const result = await confirmOrderFromDashboard(order.id);
    setBusy(null);
    if (!result.ok) {
      toast(result.error ?? d.pending.couldNotConfirm, 'error');
      return;
    }
    toast(d.pending.confirmed);
    router.refresh();
  }

  async function resend(order: PendingOrder) {
    setBusy({ id: order.id, action: 'resend' });
    const result = await resendOrderConfirmation(order.id);
    setBusy(null);
    if (!result.ok) {
      toast(result.error ?? d.pending.couldNotSend, 'error');
      return;
    }
    toast(d.pending.emailSent);
  }

  async function remove() {
    if (!toDelete) return;
    setBusy({ id: toDelete.id, action: 'delete' });
    const result = await deletePendingOrder(toDelete.id);
    setBusy(null);
    if (!result.ok) {
      toast(result.error ?? d.pending.couldNotDelete, 'error');
      return;
    }
    setToDelete(null);
    toast(d.pending.deleted);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-body-sm text-secondary">{d.pending.intro}</p>
        <span className="text-body-sm text-secondary">{fmt(d.pending.count, { n: orders.length })}</span>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {orders.length === 0 ? (
          <EmptyState title={d.pending.none} body={d.pending.noneHint} className="border-0" />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.pending.order}</Th>
                <Th>{d.pending.customer}</Th>
                <Th>{d.pending.placed}</Th>
                <Th>{d.pending.items}</Th>
                <Th>{d.pending.total}</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const confirming = busy?.id === o.id && busy.action === 'confirm';
                const resending = busy?.id === o.id && busy.action === 'resend';
                const deleting = busy?.id === o.id && busy.action === 'delete';
                const rowBusy = busy?.id === o.id;
                const days = daysWaiting(o.createdAt);
                const stale = days >= 2;
                return (
                  <tr key={o.id} className="transition-colors hover:bg-surface-low">
                    <Td>
                      <span className="text-label-md">{o.orderNumber}</span>
                    </Td>
                    <Td>
                      <p className="text-label-md">{o.fullName}</p>
                      <p className="mt-0.5 text-body-sm text-tertiary">{o.email}</p>
                      {o.phone && (
                        <p className="mt-0.5 text-body-sm text-tertiary">
                          <bdi>{o.phone}</bdi>
                        </p>
                      )}
                    </Td>
                    <Td className="text-secondary">
                      {formatDate(o.createdAt)}
                      {days >= 1 && (
                        <span
                          className={cn(
                            'mt-1 block text-body-sm',
                            stale ? 'font-medium text-warning-ink' : 'text-tertiary',
                          )}
                        >
                          {fmt(d.pending.waiting, { n: days })}
                        </span>
                      )}
                    </Td>
                    <Td className="tabular-nums text-secondary">{o.itemCount}</Td>
                    <Td className="tabular-nums">{formatPrice(o.total, currencySymbol)}</Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => setToDelete(o)}
                          disabled={rowBusy}
                          aria-label={`${d.pending.delete} ${o.orderNumber}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant text-secondary transition-colors hover:border-error hover:text-error disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <Button
                          variant="secondary"
                          onClick={() => resend(o)}
                          disabled={rowBusy}
                          className="h-9 px-3 text-label-sm"
                        >
                          {resending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {resending ? d.pending.resending : d.pending.resend}
                        </Button>
                        <Button
                          onClick={() => confirm(o)}
                          disabled={rowBusy}
                          className="h-9 px-3 text-label-sm"
                        >
                          {confirming ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          {confirming ? d.pending.confirming : d.pending.confirm}
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={d.pending.confirmDeleteTitle}
        body={d.pending.confirmDeleteBody}
        confirmLabel={d.pending.delete}
        pending={busy?.action === 'delete'}
      />
    </>
  );
}
