'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Truck, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Checkbox } from '@/components/ui/field';
import { EmptyState, StatusBadge } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { BilingualField } from '@/components/dashboard/bilingual-field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { freeShippingSchema } from '@/lib/validations';
import {
  saveFreeShippingRule,
  deleteFreeShippingRule,
  toggleFreeShippingRule,
} from '@/app/actions/dashboard';

type RuleInput = z.infer<typeof freeShippingSchema>;

export interface FreeShippingRow {
  id: string;
  name: string;
  nameAr: string;
  minOrder: number | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
}

const EMPTY: RuleInput = {
  name: '',
  nameAr: '',
  minOrder: null,
  startsAt: '',
  endsAt: '',
  active: true,
};

/**
 * Free delivery, decided in one place.
 *
 * It used to be a number on Settings plus an override column on every
 * governorate, which meant three screens disagreeing about the same thing.
 * A rule here is a spend, a date range, or both — and any live rule the basket
 * satisfies makes delivery free, so rules add up instead of overriding.
 */
export function FreeShippingManager({
  rules,
  currencySymbol,
}: {
  rules: FreeShippingRow[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d, locale } = useDash();
  const [modal, setModal] = React.useState<{ open: boolean; data: RuleInput | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<RuleInput>({
    resolver: zodResolver(freeShippingSchema),
    defaultValues: EMPTY,
  });

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

  function open(row?: FreeShippingRow) {
    const data: RuleInput = row
      ? {
          id: row.id,
          name: row.name,
          nameAr: row.nameAr,
          minOrder: row.minOrder,
          startsAt: row.startsAt?.slice(0, 10) ?? '',
          endsAt: row.endsAt?.slice(0, 10) ?? '',
          active: row.active,
        }
      : EMPTY;
    form.reset(data);
    setModal({ open: true, data: row ? data : null });
  }

  const day = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

  /** Plain-language summary of what the rule actually does. */
  function describe(row: FreeShippingRow) {
    const spend = row.minOrder
      ? fmt(d.freeShipping.overAmount, {
          amount: `${currencySymbol} ${row.minOrder.toLocaleString()}`,
        })
      : d.freeShipping.anyBasket;

    const from = day(row.startsAt);
    const to = day(row.endsAt);
    // No window means no window; saying "always on" alongside a switch that
    // can turn the rule off reads as a contradiction.
    const when = from && to ? `${from} → ${to}` : from ? `${d.common.startsOn} ${from}` : to ? `${d.common.endsOn} ${to}` : '';

    return when ? `${spend} · ${when}` : spend;
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => open()}>
          <Plus className="h-3.5 w-3.5" />
          {d.freeShipping.addRule}
        </Button>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {rules.length === 0 ? (
          <EmptyState
            title={d.freeShipping.emptyTitle}
            body={d.freeShipping.emptyBody}
            className="border-0"
            action={
              <Button onClick={() => open()}>
                <Plus className="h-3.5 w-3.5" />
                {d.freeShipping.addRule}
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.common.name}</Th>
                <Th>{d.freeShipping.appliesWhen}</Th>
                <Th>{d.common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className={rule.active ? undefined : 'row-off'}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4 shrink-0 text-secondary" />
                      {rule.name || d.freeShipping.untitled}
                    </span>
                  </Td>
                  <Td className="text-secondary">{describe(rule)}</Td>
                  <Td>
                    <span className="flex gap-1">
                      {/* On or off, as a switch rather than a word in a column. */}
                      <button
                        type="button"
                        onClick={() =>
                          run(() => toggleFreeShippingRule(rule.id), d.common.saved)
                        }
                        aria-pressed={rule.active}
                        title={rule.active ? d.freeShipping.turnOff : d.freeShipping.turnOn}
                        aria-label={rule.active ? d.freeShipping.turnOff : d.freeShipping.turnOn}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center border transition-colors',
                          rule.active
                            ? 'border-navy bg-navy text-background'
                            : 'border-outline-variant text-tertiary hover:border-navy',
                        )}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => open(rule)}
                        aria-label={d.common.edit}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm(rule.id)}
                        aria-label={d.common.delete}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* ------------------------------------------------------------- modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        title={modal.data ? d.freeShipping.editRule : d.freeShipping.addRule}
        description={d.freeShipping.modalHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>
              {d.common.cancel}
            </Button>
            <Button
              disabled={pending}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(() => saveFreeShippingRule(values), d.freeShipping.saved);
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {pending ? d.common.saving : d.common.save}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <BilingualField
            label={d.common.name}
            placeholder="Ramadan free delivery"
            placeholderAr="شحن مجاني في رمضان"
            english={{
              value: form.watch('name') ?? '',
              onChange: (v) => form.setValue('name', v),
            }}
            arabic={{
              value: form.watch('nameAr') ?? '',
              onChange: (v) => form.setValue('nameAr', v),
            }}
          />

          <Input
            label={`${d.freeShipping.minOrder} (${currencySymbol})`}
            type="number"
            step="1"
            min="0"
            placeholder={d.freeShipping.anyBasket}
            hint={d.freeShipping.minOrderHint}
            error={form.formState.errors.minOrder?.message}
            {...form.register('minOrder', {
              setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
            })}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label={d.common.startsOn}
              type="date"
              hint={d.common.blankNoStart}
              error={form.formState.errors.startsAt?.message}
              {...form.register('startsAt')}
            />
            <Input
              label={d.common.endsOn}
              type="date"
              hint={d.common.blankNoEnd}
              error={form.formState.errors.endsAt?.message}
              {...form.register('endsAt')}
            />
          </div>

          <Checkbox
            checked={form.watch('active')}
            onChange={(e) => form.setValue('active', e.target.checked)}
            label={d.freeShipping.activeLabel}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deleteFreeShippingRule(confirm), d.common.deleted);
          if (ok) setConfirm(null);
        }}
        title={d.freeShipping.deleteTitle}
        body={d.freeShipping.deleteBody}
        pending={pending}
      />
    </>
  );
}
