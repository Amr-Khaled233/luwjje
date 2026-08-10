'use client';

import * as React from 'react';
import type { Locale } from '@/i18n/config';
import type { DashboardDictionary } from '@/i18n/dashboard-dictionary';

/**
 * The dashboard is a deep tree of client components; passing the dictionary
 * down as a prop through every manager and modal would be noise. It is set
 * once by the layout and read with `useDash()`.
 */
const DashboardI18nContext = React.createContext<{
  locale: Locale;
  d: DashboardDictionary;
} | null>(null);

export function DashboardI18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: DashboardDictionary;
  children: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ locale, d: dictionary }), [locale, dictionary]);
  return <DashboardI18nContext.Provider value={value}>{children}</DashboardI18nContext.Provider>;
}

export function useDash() {
  const ctx = React.useContext(DashboardI18nContext);
  if (!ctx) throw new Error('useDash must be used inside DashboardI18nProvider');
  return ctx;
}
