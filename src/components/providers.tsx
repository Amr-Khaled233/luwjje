'use client';

import { ToastProvider } from '@/components/ui/toast';

export function Providers({
  children,
  dismissLabel,
}: {
  children: React.ReactNode;
  dismissLabel: string;
}) {
  return <ToastProvider dismissLabel={dismissLabel}>{children}</ToastProvider>;
}
