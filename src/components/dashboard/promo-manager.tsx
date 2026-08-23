'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Checkbox } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td, ProgressBar } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { promoSchema } from '@/lib/validations';
import { savePromoCode, deletePromoCode, togglePromoCode } from '@/app/actions/dashboard';
import { formatPrice } from '@/lib/utils';

type PromoInput = z.infer<typeof promoSchema>;
interface PromoRow extends PromoInput {
  usedCount: number;
}

const EMPTY: PromoInput = {
  code: '',
  description: '',
  descriptionAr: '',
  discountType: 'PERCENT',
  discountValue: 10,
  minOrder: 0,
  maxUses: null,
  startsAt: '',
  expiresAt: '',
  active: true,
};

/** Mirrors the checks in validatePromoCode so the table reads like the cart behaves. */
function statusOf(c: PromoRow) {
  if (!c.active) return 'DISABLED';
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return 'EXPIRED';
  if (c.maxUses && c.usedCount >= c.maxUses) return 'EXPIRED';
  if (c.startsAt && new Date(c.startsAt) > new Date()) return 'PENDING';
  return 'ACTIVE';
}

export function PromoManager({
  codes,
  currencySymbol,
}: {
  codes: PromoRow[];
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [modal, setModal] = React.useState<{ open: boolean; data: PromoInput | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<PromoInput>({
    resolver: zodResolver(promoSchema),
    defaultValues: EMPTY,
  });

  const discountType = form.watch('discountType');

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

  function open(data: PromoRow | null) {
    form.reset(data ? { ...data } : EMPTY);
    setModal({ open: true, data });
  }

  return (
    <>
      <div className="flex justify-start">
        <Button onClick={() => open(null)}>
          <Plus className="h-4 w-4" />{d.promo.addNew}</Button>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {codes.length === 0 ? (
          <EmptyState
            title={d.promo.emptyTitle}
            body={d.promo.emptyBody}
            action={<Button onClick={() => open(null)}>{d.promo.addNew}</Button>}
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{d.promo.code}</Th>
                <Th>{d.promo.discount}</Th>
                <Th>{d.promo.minimum}</Th>
                <Th>{d.promo.usage}</Th>
                <Th>{d.promo.window}</Th>
                <Th>{d.common.actions}</Th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                return (
                  <tr
                    key={c.id}
                    className={cn('transition-colors hover:bg-surface-low', !c.active && 'row-off')}
                  >
                    <Td>
                      <p className="font-mono text-label-md tracking-wider">{c.code}</p>
                      {c.description && (
                        // Owner-entered text: <bdi> isolates it so it reads in
                        // its own language's direction while still sitting at the
                        // start of the cell (the right, in Arabic) — dir="auto"
                        // on the block would have pulled English text left.
                        <p className="mt-0.5 text-body-sm text-tertiary">
                          <bdi>{c.description}</bdi>
                        </p>
                      )}
                    </Td>
                    <Td className="tabular-nums">
                      {c.discountType === 'PERCENT'
                        ? `${c.discountValue}%`
                        : formatPrice(c.discountValue, currencySymbol)}
                    </Td>
                    <Td className="tabular-nums text-secondary">
                      {c.minOrder > 0 ? formatPrice(c.minOrder, currencySymbol) : '—'}
                    </Td>
                    <Td>
                      <p className="tabular-nums text-body-sm">
                        {c.usedCount}
                        {c.maxUses ? ` / ${c.maxUses}` : ' / ∞'}
                      </p>
                      {c.maxUses && (
                        <ProgressBar
                          value={(c.usedCount / c.maxUses) * 100}
                          className="mt-2 w-24"
                        />
                      )}
                    </Td>
                    <Td className="text-body-sm text-secondary">
                      {c.startsAt || c.expiresAt ? (
                        // Two dates and an arrow are a single left-to-right
                        // phrase; without this the RTL flow swaps them and the
                        // arrow ends up pointing from the end date to the start.
                        <span dir="ltr" className="inline-block">
                          {`${c.startsAt || '…'} → ${c.expiresAt || '…'}`}
                        </span>
                      ) : (
                        d.promo.always
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            run(
                              () => togglePromoCode(c.id!),
                              c.active ? d.promo.disabled : d.promo.enabled,
                            )
                          }
                          disabled={pending}
                          aria-label={`${c.active ? d.common.hide : d.common.show} ${c.code}`}
                          title={c.active ? d.promo.disabled : d.promo.enabled}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => open(c)}
                          aria-label={`${d.common.edit} ${c.code}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirm(c.id!)}
                          aria-label={`${d.common.delete} ${c.code}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </section>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        title={modal.data ? `${d.common.edit} — ${modal.data.code}` : d.promo.addNew}
        description={d.promo.modalHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>{d.common.cancel}</Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(
                  () => savePromoCode({ ...values, maxUses: values.maxUses || null }),
                  d.promo.saved,
                );
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.promo.saveCode
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Code"
              required
              placeholder="WELCOME10"
              className="font-mono uppercase tracking-wider"
              hint={d.promo.codeHint}
              error={form.formState.errors.code?.message}
              {...form.register('code')}
            />
            <Input
              label={d.common.description}
              placeholder="10% off a first order."
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
            <Select label={d.common.type} {...form.register('discountType')}>
              <option value="PERCENT">{d.common.percentOff}</option>
              <option value="FIXED">{d.common.fixedOff}</option>
            </Select>
            <Input
              label={discountType === 'PERCENT' ? d.promo.percentage : `${d.promo.amount} (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              required
              error={form.formState.errors.discountValue?.message}
              {...form.register('discountValue')}
            />
            <Input
              label={`${d.promo.minimumOrder} (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              hint={d.promo.minimumHint}
              error={form.formState.errors.minOrder?.message}
              {...form.register('minOrder')}
            />
            <Input
              label={d.promo.maxUses}
              type="number"
              min="1"
              hint={d.promo.maxUsesHint}
              error={form.formState.errors.maxUses?.message}
              {...form.register('maxUses')}
            />
            <Input label={d.common.startsOn} type="date" {...form.register('startsAt')} />
            <Input label={d.promo.expiresOn} type="date" {...form.register('expiresAt')} />
          </div>

          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label={d.promo.activeAtCheckout}
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title={d.promo.deleteTitle}
        body={d.promo.deleteBody}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deletePromoCode(confirm), d.promo.deleted);
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
