'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Checkbox } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { priceRangeSchema, filterVisibilitySchema } from '@/lib/validations';
import {
  savePriceRange,
  deletePriceRange,
  saveFilterVisibility,
  toggleCategoryVisible,
  reorderCategory,
  reorderPriceRange,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type RangeInput = z.infer<typeof priceRangeSchema>;
type VisibilityInput = z.infer<typeof filterVisibilitySchema>;

interface RangeRow extends RangeInput {
  id: string;
}
interface CategoryRow {
  id: string;
  name: string;
  nameAr: string;
  visible: boolean;
  /** Published products behind it — zero means a dead end in the filter. */
  productCount: number;
}

const EMPTY_RANGE: RangeInput = { label: '', labelAr: '', min: 0, max: null, visible: true };

const TAB_KEYS = ['controls', 'categories', 'ranges'] as const;
type Tab = (typeof TAB_KEYS)[number];

export function FiltersManager({
  categories,
  priceRanges,
  visibility,
  currencySymbol,
}: {
  categories: CategoryRow[];
  priceRanges: RangeRow[];
  visibility: VisibilityInput;
  currencySymbol: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();
  const [tab, setTab] = React.useState<Tab>('controls');
  const TAB_LABELS: Record<Tab, string> = {
    controls: d.filters.tabControls,
    categories: d.nav.categories,
    ranges: d.filters.tabRanges,
  };
  const [pending, setPending] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const visibilityForm = useForm<VisibilityInput>({
    resolver: zodResolver(filterVisibilitySchema),
    defaultValues: visibility,
  });
  const rangeForm = useForm<RangeInput>({
    resolver: zodResolver(priceRangeSchema),
    defaultValues: EMPTY_RANGE,
  });

  const [rangeModal, setRangeModal] = React.useState<{ open: boolean; data: RangeRow | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<{ kind: 'color' | 'range'; id: string } | null>(null);

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

  const CONTROLS: { key: keyof VisibilityInput; label: string; hint: string }[] = [
    { key: 'showCategoryFilter', label: d.filters.categoryFilter, hint: d.nav.categories },
    { key: 'showPriceFilter', label: d.filters.priceFilter, hint: d.filters.tabRanges },
    { key: 'showSortFilter', label: d.filters.sortBy, hint: d.analytics.revenue },
  ];

  return (
    <>
      <div className="flex flex-wrap border-b border-outline-variant">
        {TAB_KEYS.map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            className={cn(
              'label-caps relative px-5 py-4 transition-colors',
              tab === x ? 'text-on-surface' : 'text-secondary hover:text-on-surface',
            )}
          >
            {TAB_LABELS[x]}
            {tab === x && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-navy" />}
          </button>
        ))}
      </div>

      {/* --------------------------------------------------------- controls */}
      {tab === 'controls' && (
        <form
          onSubmit={visibilityForm.handleSubmit(async (values) => {
            await run(() => saveFilterVisibility(values), d.filters.barUpdated);
          })}
          className="max-w-[640px]"
        >
          <div className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">{d.filters.controlsTitle}</h2>
            <p className="mt-2 text-body-sm text-secondary">
              {d.filters.controlsHint}
            </p>

            <div className="mt-8 flex flex-col gap-5">
              {CONTROLS.map((c) => (
                <Controller
                  key={c.key}
                  control={visibilityForm.control}
                  name={c.key}
                  render={({ field }) => (
                    <div className="flex items-start gap-3 border-b border-outline-variant pb-5 last:border-b-0 last:pb-0">
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                      <div>
                        <p className="text-label-md">{c.label}</p>
                        <p className="mt-0.5 text-body-sm text-secondary">{c.hint}</p>
                      </div>
                    </div>
                  )}
                />
              ))}
            </div>

            <Button type="submit" size="lg" className="mt-8" disabled={visibilityForm.formState.isSubmitting}>
              {visibilityForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.common.save
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------------- colours */}
      {/*
        Which categories the shopper is offered, and in what order.

        The same `visible` flag the Categories page edits — one source of
        truth, reachable from both places. It belongs here too because this is
        the page you open when you are thinking about the filter bar, and
        having two of its three dimensions here and the third somewhere else
        is how a filter ends up offering a category with nothing behind it.
      */}
      {tab === 'categories' && (
        <section className="border border-outline-variant bg-surface-lowest">
          <header className="border-b border-outline-variant px-4 py-4 md:px-6 md:py-5">
            <h2 className="font-display text-title-md md:text-headline-sm">{d.nav.categories}</h2>
            <p className="mt-1.5 text-body-sm text-secondary">{d.filters.categoriesHint}</p>
          </header>

          {categories.length === 0 ? (
            <EmptyState
              title={d.filters.noCategories}
              body={d.filters.noCategoriesBody}
              className="border-0"
            />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>{d.common.name}</Th>
                  <Th>{d.common.nameAr}</Th>
                  <Th>{d.categories.productsCount}</Th>
                  <Th>{d.common.visible}</Th>
                  <Th>{d.common.actions}</Th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => (
                  <tr
                    key={c.id}
                    className={cn(
                      'transition-colors hover:bg-surface-low',
                      !c.visible && 'row-off',
                    )}
                  >
                    <Td className="text-label-md">{c.name}</Td>
                    <Td className="text-secondary">{c.nameAr || '—'}</Td>
                    <Td>
                      {c.productCount > 0 ? (
                        <span className="tabular-nums">{c.productCount}</span>
                      ) : (
                        <span className="label-caps text-error">{d.filters.noProducts}</span>
                      )}
                    </Td>
                    <Td>
                      <button
                        onClick={() =>
                          run(
                            () => toggleCategoryVisible(c.id),
                            c.visible ? d.categories.hiddenToast : d.categories.shownToast,
                          )
                        }
                        disabled={pending}
                        aria-label={`${d.common.visible} — ${c.name}`}
                      >
                        {c.visible ? (
                          <Eye className="h-4 w-4 text-navy" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-tertiary" />
                        )}
                      </button>
                    </Td>
                    <Td>
                      <div className="flex justify-start gap-2">
                        <button
                          onClick={() => run(() => reorderCategory(c.id, 'up'), d.common.saved)}
                          disabled={pending || i === 0}
                          aria-label={`${d.products.moveUp} ${c.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => run(() => reorderCategory(c.id, 'down'), d.common.saved)}
                          disabled={pending || i === categories.length - 1}
                          aria-label={`${d.products.moveDown} ${c.name}`}
                          className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </section>
      )}

      {tab === 'ranges' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[70ch] text-body-md text-secondary">
              The buckets in the price dropdown. Leave the upper bound blank for an
              “and above” bucket. Delete them all to remove the price filter.
            </p>
            <Button
              onClick={() => {
                rangeForm.reset(EMPTY_RANGE);
                setRangeModal({ open: true, data: null });
              }}
            >
              <Plus className="h-4 w-4" />{d.filters.addRange}</Button>
          </div>

          <section className="border border-outline-variant bg-surface-lowest">
            {priceRanges.length === 0 ? (
              <EmptyState
                title={d.filters.noRanges}
                body={d.filters.noRangesBody}
                className="border-0"
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>{d.filters.label}</Th>
                    <Th>Arabic label</Th>
                    <Th>{d.filters.from}</Th>
                    <Th>{d.filters.to}</Th>
                    <Th>{d.common.visible}</Th>
                    <Th>{d.common.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {priceRanges.map((r, i) => (
                    <tr
                      key={r.id}
                      className={cn(
                        'transition-colors hover:bg-surface-low',
                        !r.visible && 'row-off',
                      )}
                    >
                      <Td>
                        <span className="text-label-md">{r.label}</span>
                      </Td>
                      <Td className="text-secondary">{r.labelAr || '—'}</Td>
                      <Td className="tabular-nums">
                        {currencySymbol} {r.min.toLocaleString()}
                      </Td>
                      <Td className="tabular-nums">
                        {r.max === null || r.max === undefined
                          ? '∞'
                          : `${currencySymbol} ${r.max.toLocaleString()}`}
                      </Td>
                      <Td>
                        {r.visible ? (
                          <Eye className="h-4 w-4 text-navy" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-tertiary" />
                        )}
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          {/* The buckets appear in the dropdown in this order. */}
                          <button
                            onClick={() => run(() => reorderPriceRange(r.id, 'up'), d.common.saved)}
                            disabled={pending || i === 0}
                            aria-label={`${d.products.moveUp} ${r.label}`}
                            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => run(() => reorderPriceRange(r.id, 'down'), d.common.saved)}
                            disabled={pending || i === priceRanges.length - 1}
                            aria-label={`${d.products.moveDown} ${r.label}`}
                            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              rangeForm.reset(r);
                              setRangeModal({ open: true, data: r });
                            }}
                            aria-label={`${d.common.edit} ${r.label}`}
                            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirm({ kind: 'range', id: r.id })}
                            aria-label={`${d.common.delete} ${r.label}`}
                            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>
        </>
      )}


      {/* ------------------------------------------------------ range modal */}
      <Modal
        open={rangeModal.open}
        onClose={() => setRangeModal({ open: false, data: null })}
        size="sm"
        title={rangeModal.data ? `${d.common.edit} — ${rangeModal.data.label}` : d.filters.newRange}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRangeModal({ open: false, data: null })}>{d.common.cancel}</Button>
            <Button
              disabled={rangeForm.formState.isSubmitting}
              onClick={rangeForm.handleSubmit(async (values) => {
                const ok = await run(
                  () =>
                    savePriceRange({
                      ...values,
                      id: rangeModal.data?.id,
                      max: values.max === undefined || Number.isNaN(values.max) ? null : values.max,
                    }),
                  d.filters.rangeSaved,
                );
                if (ok) setRangeModal({ open: false, data: null });
              })}
            >
              {rangeForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.common.save
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <Input
            label={`${d.filters.label} (${d.common.english})`}
            required
            placeholder="EGP 500 – 1,500"
            error={rangeForm.formState.errors.label?.message}
            {...rangeForm.register('label')}
          />
          <Input
            label={`${d.filters.label} (${d.common.arabic})`}
            placeholder="٥٠٠ – ١٥٠٠ ج.م"
            dir="rtl"
            error={rangeForm.formState.errors.labelAr?.message}
            {...rangeForm.register('labelAr')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={`From (${currencySymbol})`}
              type="number"
              min="0"
              required
              error={rangeForm.formState.errors.min?.message}
              {...rangeForm.register('min')}
            />
            <Input
              label={`To (${currencySymbol})`}
              type="number"
              min="0"
              hint={d.filters.andAbove}
              error={rangeForm.formState.errors.max?.message}
              {...rangeForm.register('max')}
            />
          </div>
          <Controller
            control={rangeForm.control}
            name="visible"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label={d.filters.showRangeInFilter}
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title={d.filters.deleteRange}
        body={d.filters.deleteBody}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deletePriceRange(confirm.id), d.common.deleted);
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
