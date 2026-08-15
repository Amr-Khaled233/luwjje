'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'error';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = React.createContext<{
  toast: (message: string, tone?: Tone) => void;
}>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({
  children,
  dismissLabel = 'Dismiss',
}: {
  children: React.ReactNode;
  /** Passed down from the root layout, which is where the locale is known. */
  dismissLabel?: string;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: Tone = 'default') => {
      const id = nextId.current++;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Full width above the safe area on a phone, a corner card on desktop. */}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] mb-safe flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:mb-0 sm:w-[min(92vw,360px)] sm:end-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex animate-fade-up items-start gap-3 border px-4 py-3',
              t.tone === 'error'
                ? 'border-error bg-surface-lowest text-error'
                : 'border-navy bg-navy text-background',
            )}
          >
            <p className="flex-1 text-body-sm">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label={dismissLabel}
              className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
