'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Modal } from '@/components/dashboard/modal';
import { useToast } from '@/components/ui/toast';
import { saveCategory, deleteCategory } from '@/app/actions/dashboard';
import type { AdminCategory } from './products-manager';

export function CategoryManager({
  open,
  categories,
  onClose,
}: {
  open: boolean;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({ name: '', description: '' });
  const [newCategory, setNewCategory] = React.useState({ name: '', description: '' });
  const [pending, setPending] = React.useState(false);

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Categories"
      description="Categories drive the Shop filter bar and each product's breadcrumb."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="border border-outline-variant">
          {categories.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-secondary">No categories yet.</p>
          ) : (
            <ul>
              {categories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 border-b border-outline-variant px-4 py-3 last:border-b-0"
                >
                  {editingId === c.id ? (
                    <>
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className="h-10 w-40 border border-outline-variant bg-background px-3 text-body-md focus:border-navy focus:outline-none"
                      />
                      <input
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                        placeholder="Description"
                        className="h-10 min-w-0 flex-1 border border-outline-variant bg-background px-3 text-body-sm focus:border-navy focus:outline-none"
                      />
                      <button
                        onClick={async () => {
                          const ok = await run(
                            () => saveCategory({ id: c.id, ...draft }),
                            'Category updated.',
                          );
                          if (ok) setEditingId(null);
                        }}
                        disabled={pending}
                        aria-label="Save"
                        className="flex h-9 w-9 items-center justify-center border border-navy transition-colors hover:bg-navy hover:text-background"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label="Cancel"
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="w-40 shrink-0 truncate text-label-md">{c.name}</span>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-secondary">
                        {c.description || '—'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setDraft({ name: c.name, description: c.description });
                        }}
                        aria-label={`Edit ${c.name}`}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => run(() => deleteCategory(c.id), 'Category deleted.')}
                        disabled={pending}
                        aria-label={`Delete ${c.name}`}
                        className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-outline-variant pt-6">
          <Input
            label="New category"
            placeholder="Knitwear"
            containerClassName="w-44"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Wool, cashmere and merino."
            containerClassName="min-w-[200px] flex-1"
            value={newCategory.description}
            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
          />
          <Button
            className="mb-0"
            disabled={pending || newCategory.name.trim().length < 2}
            onClick={async () => {
              const ok = await run(() => saveCategory(newCategory), 'Category created.');
              if (ok) setNewCategory({ name: '', description: '' });
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <p className="text-body-sm text-tertiary">
          Deleting a category does not delete its products — they become uncategorised.
        </p>
      </div>
    </Modal>
  );
}
