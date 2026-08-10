'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Checkbox } from '@/components/ui/field';
import { EmptyState, StatusBadge } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { categorySchema } from '@/lib/validations';
import {
  saveCategory,
  deleteCategory,
  toggleCategoryVisible,
  reorderCategory,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type CategoryInput = z.infer<typeof categorySchema>;

interface CategoryRow extends CategoryInput {
  id: string;
  slug: string;
  productCount: number;
}

const EMPTY: CategoryInput = {
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  visible: true,
};

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [modal, setModal] = React.useState<{ open: boolean; data: CategoryRow | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<CategoryRow | null>(null);
  const [pending, setPending] = React.useState(false);

  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
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

  const visibleCount = categories.filter((c) => c.visible).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-md text-secondary">
          {categories.length} categories · {visibleCount} shown in the Shop filter
        </p>
        <Button
          onClick={() => {
            form.reset(EMPTY);
            setModal({ open: true, data: null });
          }}
        >
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <section className="border border-outline-variant bg-surface-lowest">
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet."
            body="Add one, then assign products to it from Dashboard → Products."
            action={
              <Button
                onClick={() => {
                  form.reset(EMPTY);
                  setModal({ open: true, data: null });
                }}
              >
                Add category
              </Button>
            }
            className="border-0"
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th className="w-16">Order</Th>
                <Th>Name</Th>
                <Th>Arabic name</Th>
                <Th>Products</Th>
                <Th>In Shop filter</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr
                  key={c.id}
                  className={cn('transition-colors hover:bg-surface-low', !c.visible && 'opacity-60')}
                >
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => run(() => reorderCategory(c.id, 'up'), 'Order updated.')}
                        disabled={i === 0 || pending}
                        aria-label={`Move ${c.name} up`}
                        className="flex h-7 w-7 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => run(() => reorderCategory(c.id, 'down'), 'Order updated.')}
                        disabled={i === categories.length - 1 || pending}
                        aria-label={`Move ${c.name} down`}
                        className="flex h-7 w-7 items-center justify-center border border-outline-variant transition-colors hover:border-navy disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-label-md">{c.name}</p>
                    <p className="mt-0.5 text-body-sm text-tertiary">/{c.slug}</p>
                  </Td>
                  <Td>
                    <span className="text-body-md text-secondary">{c.nameAr || '—'}</span>
                  </Td>
                  <Td className="tabular-nums text-secondary">{c.productCount}</Td>
                  <Td>
                    <button
                      onClick={() =>
                        run(
                          () => toggleCategoryVisible(c.id),
                          c.visible ? 'Hidden from the filter.' : 'Shown in the filter.',
                        )
                      }
                      disabled={pending}
                      className="flex items-center gap-2"
                      title="Toggle visibility in the Shop filter"
                    >
                      {c.visible ? (
                        <Eye className="h-4 w-4 text-navy" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-tertiary" />
                      )}
                      <StatusBadge status={c.visible ? 'ACTIVE' : 'DISABLED'} />
                    </button>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/shop?category=${c.slug}`}
                        target="_blank"
                        aria-label={`View ${c.name} on the storefront`}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          form.reset(c);
                          setModal({ open: true, data: c });
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirm(c)}
                        aria-label={`Delete ${c.name}`}
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

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, data: null })}
        title={modal.data ? `Edit — ${modal.data.name}` : 'New category'}
        description="The English name sets the URL; the Arabic name is what Arabic shoppers see."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, data: null })}>
              Cancel
            </Button>
            <Button
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(async (values) => {
                const ok = await run(
                  () => saveCategory({ ...values, id: modal.data?.id }),
                  'Category saved.',
                );
                if (ok) setModal({ open: false, data: null });
              })}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save category'
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
              placeholder="Knitwear"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Input
              label="Name (Arabic)"
              placeholder="التريكو"
              dir="rtl"
              hint="Blank falls back to the English name."
              error={form.formState.errors.nameAr?.message}
              {...form.register('nameAr')}
            />
            <Textarea
              label="Description (English)"
              rows={3}
              error={form.formState.errors.description?.message}
              {...form.register('description')}
            />
            <Textarea
              label="Description (Arabic)"
              rows={3}
              dir="rtl"
              error={form.formState.errors.descriptionAr?.message}
              {...form.register('descriptionAr')}
            />
          </div>

          <Controller
            control={form.control}
            name="visible"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label="Show in the Shop category filter"
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title={`Delete ${confirm?.name}?`}
        body={
          confirm?.productCount
            ? `Its ${confirm.productCount} product${confirm.productCount === 1 ? '' : 's'} stay on sale but become uncategorised.`
            : 'This category has no products.'
        }
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(() => deleteCategory(confirm.id), 'Category deleted.');
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
