'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Checkbox } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { shippingZoneSchema } from '@/lib/validations';
import { saveShippingZone, deleteShippingZone } from '@/app/actions/dashboard';
import { formatPrice } from '@/lib/utils';

type ZoneInput = z.infer<typeof shippingZoneSchema>;

const EMPTY: ZoneInput = {
  name: '',
  countries: '',
  rate: 0,
  freeOver: null,
  estimatedDays: '3-5 business days',
  active: true,
};

export function ShippingManager({
  zones,
  globalFreeOver,
  defaultRate,
  currencySymbol,
}: {
  zones: ZoneInput[];
  globalFreeOver: number;
  defaultRate: number;
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [modal, setModal] = React.useState<{ open: boolean; data: ZoneInput | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<ZoneInput>({
    resolver: zodResolver(shippingZoneSchema),
    defaultValues: EMPTY,
  });

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

  function open(data: ZoneInput | null) {
    form.reset(data ?? EMPTY);
    setModal({ open: true, data });
  }

  return (
    <>
      <div className="border border-outline-variant bg-surface-low p-6">
        <h2 className="font-display text-headline-sm">Global fallback</h2>
        <p className="mt-2 max-w-[70ch] text-body-md text-secondary">
          Destinations not covered by any zone below are charged{' '}
          <strong className="text-on-surface">{formatPrice(defaultRate, currencySymbol)}</strong> and
          ship free over{' '}
          <strong className="text-on-surface">{formatPrice(globalFreeOver, currencySymbol)}</strong>.
          Both are edited in{' '}
          <Link href="/dashboard/settings" className="underline underline-offset-4">
            Settings
          </Link>
          . A zone&rsquo;s own free-shipping threshold overrides the global one.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => open(null)}>
          <Plus className="h-4 w-4" />
          Add shipping zone
        </Button>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {zones.length === 0 ? (
          <EmptyState
            title="No shipping zones."
            body="Every destination falls back to the global rate until you add one."
            action={<Button onClick={() => open(null)}>Add shipping zone</Button>}
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Zone</Th>
                <Th>Destinations</Th>
                <Th>Rate</Th>
                <Th>Free over</Th>
                <Th>Estimate</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const countries = z.countries.split(',').map((c) => c.trim()).filter(Boolean);
                return (
                  <tr key={z.id} className="transition-colors hover:bg-surface-low">
                    <Td>
                      <span className="text-label-md">{z.name}</span>
                    </Td>
                    <Td>
                      <span className="text-body-sm text-secondary">
                        {countries.length ? countries.join(', ') : '—'}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{formatPrice(z.rate, currencySymbol)}</Td>
                    <Td className="tabular-nums text-secondary">
                      {z.freeOver ? formatPrice(z.freeOver, currencySymbol) : `${formatPrice(globalFreeOver, currencySymbol)} (global)`}
                    </Td>
                    <Td className="text-secondary">{z.estimatedDays}</Td>
                    <Td>
                      <StatusBadge status={z.active ? 'ACTIVE' : 'DISABLED'} />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => open(z)}
                          aria-label={`Edit ${z.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirm(z.id!)}
                          aria-label={`Delete ${z.name}`}
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
        title={modal.data ? `Edit — ${modal.data.name}` : 'New shipping zone'}
        description="Destinations listed here appear in the Region dropdown at checkout."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(
                  () => saveShippingZone({ ...values, freeOver: values.freeOver || null }),
                  'Shipping zone saved.',
                );
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save zone'
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <Input
            label="Zone name"
            required
            placeholder="Gulf & Levant"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Textarea
            label="Destinations"
            rows={3}
            required
            placeholder="Saudi Arabia, United Arab Emirates, Qatar"
            hint="Comma-separated. Each entry becomes a selectable option at checkout."
            error={form.formState.errors.countries?.message}
            {...form.register('countries')}
          />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Input
              label={`Rate (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              required
              error={form.formState.errors.rate?.message}
              {...form.register('rate')}
            />
            <Input
              label={`Free over (${currencySymbol})`}
              type="number"
              step="0.01"
              min="0"
              hint={`Blank uses the global ${formatPrice(globalFreeOver, currencySymbol)}.`}
              error={form.formState.errors.freeOver?.message}
              {...form.register('freeOver')}
            />
            <Input
              label="Delivery estimate"
              placeholder="4-7 business days"
              error={form.formState.errors.estimatedDays?.message}
              {...form.register('estimatedDays')}
            />
          </div>
          <Controller
            control={form.control}
            name="active"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label="Active — offered at checkout"
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title="Delete this shipping zone?"
        body="Its destinations fall back to the global rate. Existing orders are unaffected."
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deleteShippingZone(confirm), 'Shipping zone deleted.');
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
