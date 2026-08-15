'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap } from '@/components/ui/motion';
import { useDash } from './dashboard-i18n';

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
  const { d } = useDash();
  useScrollLock(open);
  const panelRef = useFocusTrap(open);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-[480px]', md: 'max-w-[760px]', lg: 'max-w-[1040px]' }[size];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto overscroll-contain p-3 sm:p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="scrim fixed inset-0 animate-fade-in" onClick={onClose} />

      <div
        ref={panelRef}
        className={cn(
          'relative my-auto w-full animate-scale-in border border-outline-variant bg-surface-lowest',
          widths,
        )}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-outline-variant bg-surface-lowest px-4 py-4 sm:gap-6 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="font-display text-title-md sm:text-headline-sm">{title}</h2>
            {description && <p className="mt-1.5 text-body-sm text-secondary">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label={d.common.close}
            className="tap-target -me-2.5 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        {footer && (
          // Full-width stacked buttons on a phone; a row of 100px buttons in
          // the corner is hard to hit and looks stranded across the width.
          <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-outline-variant bg-surface-lowest px-4 py-4 pb-safe sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3 sm:px-6 sm:py-5">
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
  confirmLabel,
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
  const { d } = useDash();

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
            className="label-caps h-11 border border-navy px-6 transition-colors hover:bg-navy hover:text-background sm:w-auto"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="label-caps h-11 border border-error bg-error px-6 text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {pending ? d.common.working : (confirmLabel ?? d.common.delete)}
          </button>
        </>
      }
    >
      <p className="text-body-md text-secondary">{body}</p>
    </Modal>
  );
}
