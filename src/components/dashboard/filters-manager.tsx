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
import { ColorDot, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { filterColorSchema, priceRangeSchema, filterVisibilitySchema } from '@/lib/validations';
import {
  syncFilterColors,
  saveFilterColor,
  toggleFilterColor,
  deleteFilterColor,
  savePriceRange,
  deletePriceRange,
  saveFilterVisibility,
  toggleCategoryVisible,
  reorderCategory,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type ColorInput = z.infer<typeof filterColorSchema>;
type RangeInput = z.infer<typeof priceRangeSchema>;
type VisibilityInput = z.infer<typeof filterVisibilitySchema>;

interface ColorRow extends ColorInput {
  id: string;
  /** False when nothing in the published catalogue uses this colourway. */
  inCatalogue: boolean;
}
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

const EMPTY_COLOR: ColorInput = { name: '', nameAr: '', hex: '#0b1c30', visible: true };
const EMPTY_RANGE: RangeInput = { label: '', labelAr: '', min: 0, max: null, visible: true };

const TAB_KEYS = ['controls', 'categories', 'colours', 'ranges'] as const;
type Tab = (typeof TAB_KEYS)[number];

export function FiltersManager({
  categories,
  colors,
  priceRanges,
  visibility,
  currencySymbol,
}: {
  categories: CategoryRow[];
  colors: ColorRow[];
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
    colours: d.filters.tabColours,
    ranges: d.filters.tabRanges,
  };
  const [pending, setPending] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  const visibilityForm = useForm<VisibilityInput>({
    resolver: zodResolver(filterVisibilitySchema),
    defaultValues: visibility,
  });
  const colorForm = useForm<ColorInput>({
    resolver: zodResolver(filterColorSchema),
    defaultValues: EMPTY_COLOR,
  });
  const rangeForm = useForm<RangeInput>({
    resolver: zodResolver(priceRangeSchema),
    defaultValues: EMPTY_RANGE,
  });

  const [colorModal, setColorModal] = React.useState<{ open: boolean; data: ColorRow | null }>({
    open: false,
    data: null,
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
    { key: 'showColorFilter', label: d.filters.colourFilter, hint: d.filters.tabColours },
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
                  <Th className="text-end">{d.common.actions}</Th>
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
                      <div className="flex justify-end gap-2">
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

      {tab === 'colours' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[70ch] text-body-md text-secondary">
              Only ticked colours appear in the Shop filter. A colour with nothing in the published
              catalogue is hidden automatically, so the filter never leads to an empty grid.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                disabled={syncing}
                onClick={async () => {
                  setSyncing(true);
                  const result = await syncFilterColors();
                  setSyncing(false);
                  if (!result.ok) {
                    toast(result.error ?? d.filters.couldNotSync, 'error');
                    return;
                  }
                  toast(d.filters.synced);
                  router.refresh();
                }}
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {d.filters.syncing}
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />{d.filters.syncFromProducts}</>
                )}
              </Button>
              <Button
                onClick={() => {
                  colorForm.reset(EMPTY_COLOR);
                  setColorModal({ open: true, data: null });
                }}
              >
                <Plus className="h-4 w-4" />{d.filters.addColour}</Button>
            </div>
          </div>

          <section className="border border-outline-variant bg-surface-lowest">
            {colors.length === 0 ? (
              <EmptyState
                title={d.filters.noColours}
                body={d.filters.noColoursBody}
                className="border-0"
              />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>{d.stock.colour}</Th>
                    <Th>{d.common.nameAr}</Th>
                    <Th>{d.filters.colourFilter}</Th>
                    <Th>{d.filters.inCatalogue}</Th>
                    <Th>{d.common.visible}</Th>
                    <Th className="text-end">{d.common.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'transition-colors hover:bg-surface-low',
                        (!c.visible || !c.inCatalogue) && 'opacity-60',
                      )}
                    >
                      <Td>
                        <span className="flex items-center gap-3">
                          <ColorDot hex={c.hex} size="md" />
                          <span className="text-label-md">{c.name}</span>
                        </span>
                      </Td>
                      <Td className="text-secondary">{c.nameAr || '—'}</Td>
                      <Td className="uppercase text-tertiary">
                        <span dir="ltr">{c.hex}</span>
                      </Td>
                      <Td>
                        {c.inCatalogue ? (
                          <span className="label-caps text-secondary">{d.common.yes}</span>
                        ) : (
                          <span className="label-caps text-error">{d.filters.unused}</span>
                        )}
                      </Td>
                      <Td>
                        <button
                          onClick={() =>
                            run(
                              () => toggleFilterColor(c.id),
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              colorForm.reset(c);
                              setColorModal({ open: true, data: c });
                            }}
                            aria-label={`${d.common.edit} ${c.name}`}
                            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirm({ kind: 'color', id: c.id })}
                            aria-label={`${d.common.delete} ${c.name}`}
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

      {/* ----------------------------------------------------- price ranges */}
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
                    <Th className="text-end">{d.common.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {priceRanges.map((r) => (
                    <tr key={r.id} className={cn('transition-colors hover:bg-surface-low', !r.visible && 'opacity-60')}>
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
                        <div className="flex justify-end gap-2">
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

      {/* ----------------------------------------------------- colour modal */}
      <Modal
        open={colorModal.open}
        onClose={() => setColorModal({ open: false, data: null })}
        size="sm"
        title={colorModal.data ? `${d.common.edit} — ${colorModal.data.name}` : d.filters.newColour}
        description={d.filters.colourModalHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setColorModal({ open: false, data: null })}>{d.common.cancel}</Button>
            <Button
              disabled={colorForm.formState.isSubmitting}
              onClick={colorForm.handleSubmit(async (values) => {
                const ok = await run(
                  () => saveFilterColor({ ...values, id: colorModal.data?.id }),
                  d.filters.colourSaved,
                );
                if (ok) setColorModal({ open: false, data: null });
              })}
            >
              {colorForm.formState.isSubmitting ? (
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
            label={d.shipping.nameEnglish}
            required
            placeholder="Deep Navy"
            error={colorForm.formState.errors.name?.message}
            {...colorForm.register('name')}
          />
          <Input
            label={d.shipping.nameArabic}
            placeholder="كحلي غامق"
            dir="rtl"
            error={colorForm.formState.errors.nameAr?.message}
            {...colorForm.register('nameAr')}
          />
          <div>
            <label className="label-caps mb-2 block text-secondary">{d.products.swatch}</label>
            <div className="flex h-12 items-center gap-2 border border-outline-variant bg-background px-2">
              <Controller
                control={colorForm.control}
                name="hex"
                render={({ field }) => (
                  <input
                    type="color"
                    value={field.value}
                    onChange={field.onChange}
                    aria-label={d.products.swatch}
                    className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                  />
                )}
              />
              <input
                {...colorForm.register('hex')}
                dir="ltr"
                className="w-full min-w-0 bg-transparent text-body-sm uppercase outline-none"
              />
            </div>
          </div>
          <Controller
            control={colorForm.control}
            name="visible"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label={d.filters.showColourInFilter}
              />
            )}
          />
        </form>
      </Modal>

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
        title={confirm?.kind === 'color' ? d.filters.deleteColour : d.filters.deleteRange}
        body={d.filters.deleteBody}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(
            () =>
              confirm.kind === 'color' ? deleteFilterColor(confirm.id) : deletePriceRange(confirm.id),
            d.common.deleted,
          );
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
