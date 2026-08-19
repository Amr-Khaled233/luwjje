'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Checkbox } from '@/components/ui/field';
import { Modal } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { BilingualField } from '@/components/dashboard/bilingual-field';
import {
  ColourwayEditor,
  emptyColourway,
  type Colourway,
} from '@/components/dashboard/colourway-editor';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { productSchema, type ProductInput } from '@/lib/validations';
import { saveProduct } from '@/app/actions/dashboard';
import { slugify } from '@/lib/utils';
import type { AdminCategory } from './products-manager';

export interface EditableProduct {
  id?: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  status: string;
  isBestSeller: boolean;
  bestSellerOrder: number;
  soldCount: number;
  images: { url: string; alt: string; focalX: number; focalY: number; fit: string }[];
  variants: {
    id?: string;
    colorName: string;
    colorNameAr: string;
    colorHex: string;
    size: string | null;
    sku: string;
    stock: number;
    lowStockAt: number;
  }[];
}

const EMPTY: ProductInput = {
  name: '',
  nameAr: '',
  slug: '',
  // Filled from the colourway editor on submit.
  description: '',
  descriptionAr: '',
  price: 0,
  compareAtPrice: null,
  sku: '',
  categoryId: '',
  status: 'PUBLISHED',
  isBestSeller: false,
  bestSellerOrder: 0,
  images: [],
  variants: [
    { colorName: '', colorNameAr: '', colorHex: '#0b1c30', size: '', sku: '', stock: 0, lowStockAt: 5 },
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
  const { d } = useDash();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  // Colourways live outside the form: the shape the shop owner edits (one
  // colour, many sizes) is not the shape the database stores (one row per
  // colour-and-size), and they are flattened on submit.
  const [colourways, setColourways] = React.useState<Colourway[]>([emptyColourway()]);
  const [colourError, setColourError] = React.useState<string | null>(null);

  // Reload the form whenever a different product is opened.
  React.useEffect(() => {
    if (!open) return;
    setServerError(null);

    if (product) {
      form.reset({
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        slug: product.slug,
        description: product.description,
        descriptionAr: product.descriptionAr,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        sku: product.sku ?? '',
        categoryId: product.categoryId ?? '',
        status: product.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
        isBestSeller: product.isBestSeller,
        bestSellerOrder: product.bestSellerOrder,
        images: product.images.map((i) => ({
          ...i,
          fit: i.fit === 'contain' ? ('contain' as const) : ('cover' as const),
          isPrimary: false,
          isHover: false,
        })),
        variants: product.variants.map((v) => ({ ...v, size: v.size ?? '' })),
      });

      // Regroup the stored rows back into one entry per colour.
      const grouped: Colourway[] = [];
      for (const v of product.variants) {
        const existing = grouped.find(
          (c) => c.colorName === v.colorName && c.colorHex === v.colorHex,
        );
        const entry = { id: v.id, size: v.size ?? '', stock: v.stock };
        if (existing) existing.sizes.push(entry);
        else {
          grouped.push({
            colorName: v.colorName,
            colorNameAr: v.colorNameAr,
            colorHex: v.colorHex,
            sizes: [entry],
          });
        }
      }
      setColourways(grouped.length ? grouped : [emptyColourway()]);
    } else {
      form.reset(EMPTY);
      setColourways([emptyColourway()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  async function onSubmit(values: ProductInput) {
    setServerError(null);
    setColourError(null);

    if (colourways.some((c) => !c.colorName.trim())) {
      setColourError(d.products.colourNameRequired);
      return;
    }

    // One database row per colour-and-size, which is what carries stock and
    // what an order line points at.
    const variants = colourways.flatMap((c) =>
      c.sizes.map((s) => ({
        id: s.id,
        colorName: c.colorName.trim(),
        colorNameAr: c.colorNameAr.trim(),
        colorHex: c.colorHex,
        size: s.size || null,
        stock: s.stock,
        lowStockAt: 5,
      })),
    );

    const result = await saveProduct({
      ...values,
      slug: slugify(values.name),
      variants,
    });

    if (!result.ok) {
      setServerError(result.error ?? d.common.couldNotSave);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof ProductInput, { message });
        }
      }
      return;
    }

    toast(product ? d.products.savedLive : d.products.created);
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={product ? `${d.common.edit} — ${product.name}` : d.products.addNew}
      description={d.products.saveHint}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={form.formState.isSubmitting}>{d.common.cancel}</Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
              </>
            ) : product ? (
              d.common.saveChanges
            ) : (
              d.products.createProduct
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
          <Controller
            control={form.control}
            name="name"
            render={({ field: en }) => (
              <Controller
                control={form.control}
                name="nameAr"
                render={({ field: ar }) => (
                  <BilingualField
                    label={d.products.productName}
                    required
                    className="md:col-span-2"
                    placeholder="The Classic Snood"
                    placeholderAr="سنود كلاسيك"
                    english={{ value: en.value, onChange: en.onChange }}
                    arabic={{ value: ar.value, onChange: ar.onChange }}
                    errorEn={form.formState.errors.name?.message}
                    errorAr={form.formState.errors.nameAr?.message}
                  />
                )}
              />
            )}
          />
          {/* The URL is generated from the name — one less thing to invent. */}
          <Select
            label={d.products.category}
            error={form.formState.errors.categoryId?.message}
            {...form.register('categoryId')}
          >
            <option value="">{d.products.uncategorised}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label={`${d.common.price} (${currencySymbol})`}
            type="number"
            step="0.01"
            min="0"
            required
            error={form.formState.errors.price?.message}
            {...form.register('price')}
          />
          <Input
            label={`${d.products.compareAt} (${currencySymbol})`}
            type="number"
            step="0.01"
            min="0"
            hint={d.products.compareAtHint}
            error={form.formState.errors.compareAtPrice?.message}
            {...form.register('compareAtPrice')}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field: en }) => (
              <Controller
                control={form.control}
                name="descriptionAr"
                render={({ field: ar }) => (
                  <BilingualField
                    label={d.common.description}
                    rows={5}
                    className="md:col-span-2"
                    english={{ value: en.value, onChange: en.onChange }}
                    arabic={{ value: ar.value, onChange: ar.onChange }}
                    errorEn={form.formState.errors.description?.message}
                    errorAr={form.formState.errors.descriptionAr?.message}
                  />
                )}
              />
            )}
          />
        </section>

        {/* ------------------------------------------------------- images */}
        <section>
          <Controller
            control={form.control}
            name="images"
            render={({ field }) => (
              <ImageUploader
                label={d.common.images}
                focus
                value={field.value.map((i) => ({ url: i.url, alt: i.alt }))}
                onChange={(images) =>
                  field.onChange(images.map((i) => ({ ...i, isPrimary: false, isHover: false })))
                }
              />
            )}
          />
        </section>

        {/* -------------------------------------------------- colourways */}
        <section>
          <ColourwayEditor
            value={colourways}
            onChange={setColourways}
            errors={colourError ?? form.formState.errors.variants?.message}
          />
        </section>

        {/* ---------------------------------------------------- publishing */}
        <section className="flex flex-wrap items-end gap-8 border-t border-outline-variant pt-6">
          <Select
            label={d.common.status}
            containerClassName="min-w-[200px]"
            {...form.register('status')}
          >
            <option value="PUBLISHED">{d.products.publishedVisible}</option>
            <option value="DRAFT">{d.products.draftHidden}</option>
          </Select>

          <Controller
            control={form.control}
            name="isBestSeller"
            render={({ field }) => (
              <div className="pb-3">
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  label={d.products.showInBestSellers}
                />
              </div>
            )}
          />
        </section>
      </form>
    </Modal>
  );
}
