'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Checkbox } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { resetStoreData } from '@/app/actions/dashboard';

/** The word the owner types before anything is erased. */
const CONFIRM_WORD = 'RESET';

/**
 * Settings → Start fresh. Erases the parts of the store the owner ticks —
 * orders, visitor statistics, the catalogue — so it can begin again like new.
 * Nothing happens until something is ticked and the confirm word is typed.
 */
export function StartFresh() {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [orders, setOrders] = React.useState(false);
  const [traffic, setTraffic] = React.useState(false);
  const [catalog, setCatalog] = React.useState(false);
  const [confirm, setConfirm] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const chosen = orders || traffic || catalog;
  const ready = chosen && confirm.trim() === CONFIRM_WORD;

  async function erase() {
    if (!ready || pending) return;
    setPending(true);
    const result = await resetStoreData({ orders, traffic, catalog, confirm });
    setPending(false);
    if (!result.ok) {
      toast(result.error ?? d.fresh.failed, 'error');
      return;
    }
    toast(d.fresh.done);
    setOrders(false);
    setTraffic(false);
    setCatalog(false);
    setConfirm('');
    router.refresh();
  }

  const options: { checked: boolean; set: (v: boolean) => void; title: string; hint: string }[] = [
    { checked: orders, set: setOrders, title: d.fresh.orders, hint: d.fresh.ordersHint },
    { checked: traffic, set: setTraffic, title: d.fresh.traffic, hint: d.fresh.trafficHint },
    { checked: catalog, set: setCatalog, title: d.fresh.catalog, hint: d.fresh.catalogHint },
  ];

  return (
    <section className="mt-8 border border-error/50 bg-surface-lowest p-6">
      <h2 className="flex items-center gap-2 font-display text-headline-sm text-error">
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
        {d.fresh.title}
      </h2>
      <p className="mt-2 max-w-[70ch] text-body-sm text-secondary">{d.fresh.intro}</p>

      <div className="mt-6 flex flex-col gap-5">
        {options.map((o) => (
          <Checkbox
            key={o.title}
            checked={o.checked}
            onChange={(e) => o.set(e.target.checked)}
            label={
              <span className="block">
                <span className="block text-label-md text-on-surface">{o.title}</span>
                <span className="mt-0.5 block text-body-sm text-secondary">{o.hint}</span>
              </span>
            }
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-col gap-2 sm:w-64">
          <span className="label-caps text-secondary">{d.fresh.confirmLabel}</span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!chosen}
            dir="ltr"
            autoComplete="off"
            placeholder={CONFIRM_WORD}
            className="h-11 border border-outline-variant bg-background px-4 text-body-md tracking-widest transition-colors placeholder:text-tertiary focus:border-error focus:outline-none disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={erase}
          disabled={!ready || pending}
          className="label-caps inline-flex h-11 items-center justify-center gap-2 border border-error bg-error px-6 text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? d.fresh.erasing : d.fresh.erase}
        </button>
      </div>
    </section>
  );
}
