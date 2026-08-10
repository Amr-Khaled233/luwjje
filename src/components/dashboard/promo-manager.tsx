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
      toast(result.error ?? 'Something went wrong.', 'error');
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
      <div className="flex justify-end">
        <Button onClick={() => open(null)}>
          <Plus className="h-4 w-4" />
          New promo code
        </Button>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {codes.length === 0 ? (
          <EmptyState
            title="No promo codes yet."
            body="Create one and it works in the cart immediately."
            action={<Button onClick={() => open(null)}>New promo code</Button>}
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Minimum</Th>
                <Th>Usage</Th>
                <Th>Window</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const status = statusOf(c);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-surface-low">
                    <Td>
                      <p className="font-mono text-label-md tracking-wider">{c.code}</p>
                      {c.description && (
                        <p className="mt-0.5 text-body-sm text-tertiary">{c.description}</p>
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
                      {c.startsAt || c.expiresAt
                        ? `${c.startsAt || '…'} → ${c.expiresAt || '…'}`
                        : 'Always'}
                    </Td>
                    <Td>
                      <StatusBadge status={status} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            run(
                              () => togglePromoCode(c.id!),
                              c.active ? 'Code disabled.' : 'Code enabled.',
                            )
                          }
                          disabled={pending}
                          aria-label={c.active ? `Disable ${c.code}` : `Enable ${c.code}`}
                          title={c.active ? 'Disable' : 'Enable'}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => open(c)}
                          aria-label={`Edit ${c.code}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirm(c.id!)}
                          aria-label={`Delete ${c.code}`}
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
        title={modal.data ? `Edit — ${modal.data.code}` : 'New promo code'}
        description="Validated live in the cart the moment you save."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(
                  () => savePromoCode({ ...values, maxUses: values.maxUses || null }),
                  'Promo code saved.',
                );
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save code'
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
              hint="Letters, numbers, hyphen and underscore."
              error={form.formState.errors.code?.message}
              {...form.register('code')}
            />
            <Input
              label="Description"
              placeholder="10% off a first order."
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
            <Select label="Discount type" {...form.register('discountType')}>
              <option value="PERCENT">Percentage off</option>
              <option value="FIXED">Fixed amount off</option>
            </Select>
            <Input
              label={discountType === 'PERCENT' ? 'Percentage (%)' : `Amount (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              required
              error={form.formState.errors.discountValue?.message}
              {...form.register('discountValue')}
            />
            <Input
              label={`Minimum order (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              hint="Zero means no minimum."
              error={form.formState.errors.minOrder?.message}
              {...form.register('minOrder')}
            />
            <Input
              label="Maximum uses"
              type="number"
              min="1"
              hint="Blank means unlimited."
              error={form.formState.errors.maxUses?.message}
              {...form.register('maxUses')}
            />
            <Input label="Starts on" type="date" {...form.register('startsAt')} />
            <Input label="Expires on" type="date" {...form.register('expiresAt')} />
          </div>

          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label="Active — accepted at checkout"
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title="Delete this promo code?"
        body="Customers who try it will be told it is not recognised. Orders already placed with it are unaffected."
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deletePromoCode(confirm), 'Promo code deleted.');
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
