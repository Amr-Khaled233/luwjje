'use client';

import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Input, FieldLabel, FieldError } from '@/components/ui/field';
import { useDash } from './dashboard-i18n';
import { cn } from '@/lib/utils';

/** One colour of a product, and the sizes it comes in. */
export interface Colourway {
  colorName: string;
  colorNameAr: string;
  colorHex: string;
  sizes: { id?: string; size: string; stock: number }[];
}

/** The sizes almost every clothing product uses. Anything else is typed in. */
const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const emptyColourway = (): Colourway => ({
  colorName: '',
  colorNameAr: '',
  colorHex: '#0b1c30',
  // No size chosen yet means one size — the common case for bags and scarves.
  sizes: [{ size: '', stock: 0 }],
});

/**
 * A colour, then its sizes as toggles.
 *
 * The database still stores one row per colour-and-size, because that is what
 * has its own stock and what an order line points at. But entering it that way
 * meant retyping the colour, its Arabic name and its swatch for every size.
 * Here the colour is written once and the sizes are ticked.
 */
export function ColourwayEditor({
  value,
  onChange,
  errors,
}: {
  value: Colourway[];
  onChange: (next: Colourway[]) => void;
  errors?: string;
}) {
  const { d } = useDash();

  const update = (index: number, patch: Partial<Colourway>) => {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  /** Ticking a size adds it; unticking removes it and its stock. */
  function toggleSize(index: number, size: string) {
    const colour = value[index];
    const has = colour.sizes.some((s) => s.size === size);

    let sizes = has
      ? colour.sizes.filter((s) => s.size !== size)
      : [...colour.sizes.filter((s) => s.size !== ''), { size, stock: 0 }];

    // Removing the last size falls back to one size rather than leaving the
    // colour unbuyable.
    if (sizes.length === 0) sizes = [{ size: '', stock: 0 }];

    // Keep presets in their natural order; custom sizes follow.
    sizes.sort((a, b) => {
      const ai = PRESET_SIZES.indexOf(a.size);
      const bi = PRESET_SIZES.indexOf(b.size);
      if (ai === -1 && bi === -1) return a.size.localeCompare(b.size);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    update(index, { sizes });
  }

  function addCustomSize(index: number, raw: string) {
    const size = raw.trim().toUpperCase();
    if (!size) return;
    const colour = value[index];
    if (colour.sizes.some((s) => s.size === size)) return;
    update(index, {
      sizes: [...colour.sizes.filter((s) => s.size !== ''), { size, stock: 0 }],
    });
  }

  function setStock(index: number, size: string, stock: number) {
    update(index, {
      sizes: value[index].sizes.map((s) => (s.size === size ? { ...s, stock } : s)),
    });
  }

  const oneSize = (colour: Colourway) =>
    colour.sizes.length === 1 && colour.sizes[0].size === '';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <FieldLabel>{d.products.colourways}</FieldLabel>
          <p className="text-body-sm text-secondary">{d.products.colourwaysHint}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...value, emptyColourway()])}
          className="label-caps inline-flex h-9 items-center gap-2 border border-navy px-4 text-navy transition-colors hover:bg-navy hover:text-background"
        >
          <Plus className="h-3.5 w-3.5" />
          {d.products.addColourway}
        </button>
      </div>

      <FieldError>{errors}</FieldError>

      <div className="flex flex-col gap-3">
        {value.map((colour, index) => (
          <div key={index} className="border border-outline-variant p-4">
            {/* ------------------------------------------------ the colour */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                label={d.products.colourName}
                placeholder="Dark Charcoal Grey"
                value={colour.colorName}
                onChange={(e) => update(index, { colorName: e.target.value })}
              />
              <Input
                label={d.common.arabic}
                placeholder="رمادي فحمي"
                dir="rtl"
                value={colour.colorNameAr}
                onChange={(e) => update(index, { colorNameAr: e.target.value })}
              />

              <div className="md:w-[150px]">
                <FieldLabel>{d.products.swatch}</FieldLabel>
                <div className="flex h-12 items-center gap-2 border border-outline-variant bg-background px-2">
                  <input
                    type="color"
                    value={colour.colorHex}
                    onChange={(e) => update(index, { colorHex: e.target.value })}
                    aria-label={d.products.swatch}
                    className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    value={colour.colorHex}
                    onChange={(e) => update(index, { colorHex: e.target.value })}
                    className="w-full min-w-0 bg-transparent text-body-sm uppercase outline-none"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  disabled={value.length === 1}
                  aria-label={d.products.removeColourway}
                  className="flex h-12 w-12 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ------------------------------------------------- its sizes */}
            <div className="mt-5 border-t border-outline-variant pt-4">
              <FieldLabel>{d.products.sizesAvailable}</FieldLabel>
              <p className="mb-3 text-body-sm text-secondary">{d.products.sizesHint}</p>

              <div className="flex flex-wrap gap-2">
                {PRESET_SIZES.map((size) => {
                  const on = colour.sizes.some((s) => s.size === size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(index, size)}
                      aria-pressed={on}
                      className={cn(
                        'label-caps h-9 min-w-[48px] border px-3 transition-colors duration-200 ease-scandi',
                        on
                          ? 'border-navy bg-navy text-background'
                          : 'border-outline-variant text-secondary hover:border-navy hover:text-on-surface',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}

                <CustomSize onAdd={(size) => addCustomSize(index, size)} label={d.products.otherSize} />
              </div>

              {/* Stock, one box per size that is actually offered. */}
              <div className="mt-4 flex flex-wrap gap-3">
                {colour.sizes.map((s) => (
                  <div key={s.size || '__one__'} className="w-[120px]">
                    <label className="label-caps mb-1.5 flex items-center gap-1.5 text-secondary">
                      {s.size || d.products.oneSize}
                      {s.size && !PRESET_SIZES.includes(s.size) && (
                        <button
                          type="button"
                          onClick={() => toggleSize(index, s.size)}
                          aria-label={`${d.common.remove} ${s.size}`}
                          className="text-tertiary transition-colors hover:text-error"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={s.stock}
                      onChange={(e) => setStock(index, s.size, Number(e.target.value))}
                      aria-label={`${d.products.stock} ${s.size || d.products.oneSize}`}
                      className="h-11 w-full border border-outline-variant bg-background px-3 text-body-md transition-colors focus:border-navy focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {!oneSize(colour) && (
                <button
                  type="button"
                  onClick={() => update(index, { sizes: [{ size: '', stock: 0 }] })}
                  className="label-caps mt-3 text-secondary underline-offset-4 hover:underline"
                >
                  {d.products.backToOneSize}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A one-field form for a size the presets do not cover — 38, 42, EU 44. */
function CustomSize({ onAdd, label }: { onAdd: (size: string) => void; label: string }) {
  const [value, setValue] = React.useState('');

  function commit() {
    onAdd(value);
    setValue('');
  }

  return (
    <span className="inline-flex h-9 items-center border border-dashed border-outline-variant">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          // Enter inside a nested form would submit the product.
          e.preventDefault();
          commit();
        }}
        placeholder={label}
        aria-label={label}
        className="h-full w-[104px] bg-transparent px-3 text-body-sm outline-none placeholder:text-tertiary"
      />
      <button
        type="button"
        onClick={commit}
        disabled={!value.trim()}
        aria-label={label}
        className="flex h-full w-9 items-center justify-center text-secondary transition-colors hover:text-on-surface disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
