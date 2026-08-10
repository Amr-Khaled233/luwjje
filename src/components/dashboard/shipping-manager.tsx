'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Checkbox, Select } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { governorateSchema } from '@/lib/validations';
import {
  saveGovernorate,
  saveGovernorateRates,
  deleteGovernorate,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type GovernorateInput = z.infer<typeof governorateSchema>;
interface GovernorateRow extends GovernorateInput {
  id: string;
}

const EMPTY: GovernorateInput = {
  name: '',
  nameAr: '',
  shippingCost: 0,
  freeOver: null,
  estimatedDays: '2-4',
  active: true,
};

export function ShippingManager({
  governorates,
  globalFreeOver,
  currencySymbol,
}: {
  governorates: GovernorateRow[];
  globalFreeOver: number;
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [modal, setModal] = React.useState<{ open: boolean; data: GovernorateInput | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState('');

  // Local draft of the whole rate grid, saved in one go.
  const [rates, setRates] = React.useState<Record<string, { cost: string; active: boolean }>>({});
  const [saving, setSaving] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  React.useEffect(() => {
    setRates(
      Object.fromEntries(
        governorates.map((g) => [g.id, { cost: String(g.shippingCost), active: g.active }]),
      ),
    );
  }, [governorates]);

  const form = useForm<GovernorateInput>({
    resolver: zodResolver(governorateSchema),
    defaultValues: EMPTY,
  });

  const dirty = governorates.some((g) => {
    const draft = rates[g.id];
    return draft && (Number(draft.cost) !== g.shippingCost || draft.active !== g.active);
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

  async function saveAll() {
    const payload = governorates
      .map((g) => ({ id: g.id, ...rates[g.id] }))
      .filter((r) => r.cost !== undefined)
      .map((r) => ({ id: r.id, shippingCost: Number(r.cost), active: r.active }));

    if (payload.some((r) => !Number.isFinite(r.shippingCost) || r.shippingCost < 0)) {
      toast('Every price must be a number of zero or more.', 'error');
      return;
    }

    setSaving('saving');
    const result = await saveGovernorateRates({ rates: payload });
    setSaving('idle');

    if (!result.ok) {
      toast(result.error ?? 'Could not save the prices.', 'error');
      return;
    }
    setSaving('saved');
    toast('Delivery prices updated.');
    router.refresh();
    setTimeout(() => setSaving('idle'), 1600);
  }

  const filtered = governorates.filter((g) => {
    if (query) {
      const q = query.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !g.nameAr.includes(query)) return false;
    }
    if (filter === 'active') return rates[g.id]?.active ?? g.active;
    if (filter === 'inactive') return !(rates[g.id]?.active ?? g.active);
    return true;
  });

  return (
    <>
      <div className="border border-outline-variant bg-surface-low p-6">
        <h2 className="font-display text-headline-sm">How delivery is priced</h2>
        <p className="mt-2 max-w-[75ch] text-body-md text-secondary">
          The customer picks a governorate at checkout and is charged its price below. Orders above{' '}
          <strong className="text-on-surface">
            {currencySymbol} {globalFreeOver.toLocaleString()}
          </strong>{' '}
          ship free — set a per-governorate threshold on a row to override that. Switching a
          governorate off removes it from the checkout dropdown entirely.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-secondary ltr:left-4 rtl:right-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search governorates…"
            aria-label="Search governorates"
            className="h-11 w-full border border-outline-variant bg-background text-body-md transition-colors placeholder:text-tertiary focus:border-navy focus:outline-none ltr:pl-11 ltr:pr-4 rtl:pl-4 rtl:pr-11"
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter"
          className="h-11 w-auto min-w-[160px]"
        >
          <option value="">All</option>
          <option value="active">Delivering</option>
          <option value="inactive">Switched off</option>
        </Select>

        <div className="flex items-center gap-3 ltr:ml-auto rtl:mr-auto">
          {saving === 'saved' && <Check className="h-4 w-4 text-navy" />}
          <Button variant="secondary" onClick={() => { form.reset(EMPTY); setModal({ open: true, data: null }); }}>
            <Plus className="h-4 w-4" />
            Add governorate
          </Button>
          <Button onClick={saveAll} disabled={!dirty || saving === 'saving'}>
            {saving === 'saving' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Save prices'
            )}
          </Button>
        </div>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {filtered.length === 0 ? (
          <EmptyState
            title="No governorates match."
            body="Clear the search, or add one."
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Governorate</Th>
                <Th>Arabic name</Th>
                <Th>Delivery price ({currencySymbol})</Th>
                <Th>Free over</Th>
                <Th>Days</Th>
                <Th>Delivering</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const draft = rates[g.id] ?? { cost: String(g.shippingCost), active: g.active };
                const changed = Number(draft.cost) !== g.shippingCost || draft.active !== g.active;

                return (
                  <tr
                    key={g.id}
                    className={cn('transition-colors hover:bg-surface-low', changed && 'bg-surface-low')}
                  >
                    <Td>
                      <span className="text-label-md">{g.name}</span>
                    </Td>
                    <Td>
                      <span className="text-body-md text-secondary">{g.nameAr}</span>
                    </Td>
                    <Td>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={draft.cost}
                        onChange={(e) =>
                          setRates((r) => ({ ...r, [g.id]: { ...draft, cost: e.target.value } }))
                        }
                        aria-label={`Delivery price for ${g.name}`}
                        className="h-10 w-28 border border-outline-variant bg-background px-3 text-body-md tabular-nums transition-colors focus:border-navy focus:outline-none"
                      />
                    </Td>
                    <Td className="tabular-nums text-secondary">
                      {g.freeOver
                        ? `${currencySymbol} ${g.freeOver.toLocaleString()}`
                        : `${globalFreeOver.toLocaleString()} (global)`}
                    </Td>
                    <Td className="text-secondary">{g.estimatedDays}</Td>
                    <Td>
                      <Checkbox
                        checked={draft.active}
                        onChange={(e) =>
                          setRates((r) => ({ ...r, [g.id]: { ...draft, active: e.target.checked } }))
                        }
                        aria-label={`Deliver to ${g.name}`}
                      />
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            form.reset(g);
                            setModal({ open: true, data: g });
                          }}
                          aria-label={`Edit ${g.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirm(g.id)}
                          aria-label={`Delete ${g.name}`}
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
        title={modal.data ? `Edit — ${modal.data.name}` : 'New governorate'}
        description="Appears in the checkout dropdown in both languages."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(
                  () => saveGovernorate({ ...values, freeOver: values.freeOver || null }),
                  'Governorate saved.',
                );
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Name (English)"
              required
              placeholder="Cairo"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Input
              label="Name (Arabic)"
              required
              placeholder="القاهرة"
              dir="rtl"
              error={form.formState.errors.nameAr?.message}
              {...form.register('nameAr')}
            />
            <Input
              label={`Delivery price (${currencySymbol})`}
              type="number"
              step="1"
              min="0"
              required
              error={form.formState.errors.shippingCost?.message}
              {...form.register('shippingCost')}
            />
            <Input
              label={`Free over (${currencySymbol})`}
              type="number"
              step="1"
              min="0"
              hint={`Blank uses the global ${globalFreeOver.toLocaleString()}.`}
              error={form.formState.errors.freeOver?.message}
              {...form.register('freeOver')}
            />
            <Input
              label="Estimated days"
              placeholder="2-4"
              containerClassName="md:col-span-2"
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
                label="Delivering — offered at checkout"
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title="Delete this governorate?"
        body="It disappears from the checkout dropdown. Existing orders keep the name they were placed with."
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deleteGovernorate(confirm), 'Governorate deleted.');
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
