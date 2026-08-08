'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Checkbox, FieldLabel, FieldError } from '@/components/ui/field';
import { Modal } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { useToast } from '@/components/ui/toast';
import { productSchema, type ProductInput } from '@/lib/validations';
import { saveProduct } from '@/app/actions/dashboard';
import { slugify } from '@/lib/utils';
import type { AdminCategory } from './products-manager';

export interface EditableProduct {
  id?: string;
  name: string;
  slug: string;
  description: string;
  materialInfo: string;
  careInfo: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  status: string;
  isBestSeller: boolean;
  bestSellerOrder: number;
  soldCount: number;
  images: { url: string; alt: string }[];
  variants: {
    id?: string;
    colorName: string;
    colorHex: string;
    size: string | null;
    sku: string;
    stock: number;
    lowStockAt: number;
  }[];
}

const EMPTY: ProductInput = {
  name: '',
  slug: '',
  description: '',
  materialInfo: '',
  careInfo: '',
  price: 0,
  compareAtPrice: null,
  sku: '',
  categoryId: '',
  status: 'PUBLISHED',
  isBestSeller: false,
  bestSellerOrder: 0,
  images: [],
  variants: [
    { colorName: '', colorHex: '#0b1c30', size: '', sku: '', stock: 0, lowStockAt: 5 },
  ],
};

export function ProductEditor({
  open,
  product,
  categories,
  currencySymbol,
  onClose,
}: {
  open: boolean;
  product: EditableProduct | null;
  categories: AdminCategory[];
  currencySymbol: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  const variants = useFieldArray({ control: form.control, name: 'variants' });

  // Reload the form whenever a different product is opened.
  React.useEffect(() => {
    if (!open) return;
    setServerError(null);

    if (product) {
      form.reset({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        materialInfo: product.materialInfo,
        careInfo: product.careInfo,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        sku: product.sku ?? '',
        categoryId: product.categoryId ?? '',
        status: product.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
        isBestSeller: product.isBestSeller,
        bestSellerOrder: product.bestSellerOrder,
        images: product.images.map((i) => ({ ...i, isPrimary: false, isHover: false })),
        variants: product.variants.map((v) => ({ ...v, size: v.size ?? '' })),
      });
    } else {
      form.reset(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const name = form.watch('name');

  /** Suggests a SKU so the admin rarely has to invent one. */
  function suggestSku(index: number) {
    const colour = form.getValues(`variants.${index}.colorName`) || '';
    const size = form.getValues(`variants.${index}.size`) || '';
    const base = slugify(name || 'item').toUpperCase().replace(/-/g, '').slice(0, 8);
    const c = colour.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'STD';
    const s = size ? size.replace(/[^A-Z0-9]/gi, '').toUpperCase() : 'OS';
    form.setValue(`variants.${index}.sku`, [base, c, s].join('-'), { shouldValidate: true });
  }

  async function onSubmit(values: ProductInput) {
    setServerError(null);

    const result = await saveProduct({
      ...values,
      slug: values.slug?.trim() || slugify(values.name),
      variants: values.variants.map((v) => ({ ...v, size: v.size || null })),
    });

    if (!result.ok) {
      setServerError(result.error ?? 'Could not save.');
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProductInput, { message });
        }
      }
      return;
    }

    toast(product ? 'Product updated — the storefront is live with it.' : 'Product created.');
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={product ? `Edit — ${product.name}` : 'Add New Product'}
      description="Saved changes appear on the storefront immediately."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : product ? (
              'Save changes'
            ) : (
              'Create product'
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        {serverError && (
          <p className="border border-error p-3 text-body-sm text-error">{serverError}</p>
        )}

        {/* ------------------------------------------------------- basics */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input
            label="Product Name"
            required
            containerClassName="md:col-span-2"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Input
            label="URL Slug"
            placeholder={name ? slugify(name) : 'auto-generated'}
            hint="Leave blank to generate from the name."
            error={form.formState.errors.slug?.message}
            {...form.register('slug')}
          />
          <Select
            label="Category"
            error={form.formState.errors.categoryId?.message}
            {...form.register('categoryId')}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label={`Price (${currencySymbol})`}
            type="number"
            step="0.01"
            min="0"
            required
            error={form.formState.errors.price?.message}
            {...form.register('price')}
          />
          <Input
            label={`Compare-at Price (${currencySymbol})`}
            type="number"
            step="0.01"
            min="0"
            hint="Optional — shown struck through."
            error={form.formState.errors.compareAtPrice?.message}
            {...form.register('compareAtPrice')}
          />

          <Textarea
            label="Description"
            rows={5}
            containerClassName="md:col-span-2"
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />
          <Textarea
            label="Material & Dimensions"
            rows={3}
            hint="Shown in the product page accordion."
            error={form.formState.errors.materialInfo?.message}
            {...form.register('materialInfo')}
          />
          <Textarea
            label="Care"
            rows={3}
            hint="Shown in the product page accordion."
            error={form.formState.errors.careInfo?.message}
            {...form.register('careInfo')}
          />
        </section>

        {/* ------------------------------------------------------- images */}
        <section>
          <Controller
            control={form.control}
            name="images"
            render={({ field }) => (
              <ImageUploader
                label="Images"
                value={field.value.map((i) => ({ url: i.url, alt: i.alt }))}
                onChange={(images) =>
                  field.onChange(images.map((i) => ({ ...i, isPrimary: false, isHover: false })))
                }
              />
            )}
          />
        </section>

        {/* ----------------------------------------------------- variants */}
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <FieldLabel>Colourways &amp; Stock</FieldLabel>
              <p className="text-body-sm text-secondary">
                One row per purchasable SKU. Add a size to split a colourway across sizes.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                variants.append({
                  colorName: '',
                  colorHex: '#0b1c30',
                  size: '',
                  sku: '',
                  stock: 0,
                  lowStockAt: 5,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add colourway
            </Button>
          </div>

          <FieldError>{form.formState.errors.variants?.message}</FieldError>

          <div className="flex flex-col gap-3">
            {variants.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-2 gap-3 border border-outline-variant p-4 md:grid-cols-12"
              >
                <div className="col-span-2 md:col-span-3">
                  <Input
                    label="Colour name"
                    placeholder="Dark Charcoal Grey"
                    error={form.formState.errors.variants?.[index]?.colorName?.message}
                    {...form.register(`variants.${index}.colorName`)}
                  />
                </div>

                <div className="md:col-span-2">
                  <FieldLabel>Swatch</FieldLabel>
                  <div className="flex h-12 items-center gap-2 border border-outline-variant bg-background px-2">
                    <Controller
                      control={form.control}
                      name={`variants.${index}.colorHex`}
                      render={({ field: colorField }) => (
                        <input
                          type="color"
                          value={colorField.value}
                          onChange={colorField.onChange}
                          aria-label="Pick colour"
                          className="h-7 w-7 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                        />
                      )}
                    />
                    <input
                      {...form.register(`variants.${index}.colorHex`)}
                      className="w-full min-w-0 bg-transparent text-body-sm uppercase outline-none"
                    />
                  </div>
                  <FieldError>
                    {form.formState.errors.variants?.[index]?.colorHex?.message}
                  </FieldError>
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="Size"
                    placeholder="—"
                    error={form.formState.errors.variants?.[index]?.size?.message}
                    {...form.register(`variants.${index}.size`)}
                  />
                </div>

                <div className="col-span-2 md:col-span-3">
                  <Input
                    label="SKU"
                    error={form.formState.errors.variants?.[index]?.sku?.message}
                    {...form.register(`variants.${index}.sku`)}
                  />
                  <button
                    type="button"
                    onClick={() => suggestSku(index)}
                    className="label-caps mt-1 text-secondary underline-offset-4 hover:underline"
                  >
                    Generate
                  </button>
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="Stock"
                    type="number"
                    min="0"
                    error={form.formState.errors.variants?.[index]?.stock?.message}
                    {...form.register(`variants.${index}.stock`)}
                  />
                </div>

                <div className="md:col-span-1">
                  <Input
                    label="Low at"
                    type="number"
                    min="0"
                    error={form.formState.errors.variants?.[index]?.lowStockAt?.message}
                    {...form.register(`variants.${index}.lowStockAt`)}
                  />
                </div>

                <div className="col-span-2 flex items-end md:col-span-1">
                  <button
                    type="button"
                    onClick={() => variants.remove(index)}
                    disabled={variants.fields.length === 1}
                    aria-label="Remove colourway"
                    className="flex h-12 w-full items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------- publishing */}
        <section className="flex flex-wrap items-end gap-8 border-t border-outline-variant pt-6">
          <Select
            label="Status"
            containerClassName="min-w-[200px]"
            {...form.register('status')}
          >
            <option value="PUBLISHED">Published — visible on the storefront</option>
            <option value="DRAFT">Draft — hidden</option>
          </Select>

          <Input
            label="Internal SKU"
            containerClassName="min-w-[200px]"
            hint="Optional catalogue reference."
            {...form.register('sku')}
          />

          <Controller
            control={form.control}
            name="isBestSeller"
            render={({ field }) => (
              <div className="pb-3">
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  label="Show in the Best Sellers row on the home page"
                />
              </div>
            )}
          />
        </section>
      </form>
    </Modal>
  );
}
