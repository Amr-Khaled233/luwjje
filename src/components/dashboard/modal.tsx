'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-[480px]', md: 'max-w-[760px]', lg: 'max-w-[1040px]' }[size];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="scrim fixed inset-0" onClick={onClose} />

      <div
        className={cn(
          'relative my-auto w-full animate-fade-up border border-outline-variant bg-surface-lowest',
          widths,
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-outline-variant bg-surface-lowest px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">{title}</h2>
            {description && <p className="mt-1.5 text-body-sm text-secondary">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 pt-1">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-6 py-6">{children}</div>

        {footer && (
          <footer className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-outline-variant bg-surface-lowest px-6 py-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = 'Delete',
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  pending?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            className="label-caps h-11 border border-navy px-6 transition-colors hover:bg-navy hover:text-background"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="label-caps h-11 border border-error bg-error px-6 text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-body-md text-secondary">{body}</p>
    </Modal>
  );
}
