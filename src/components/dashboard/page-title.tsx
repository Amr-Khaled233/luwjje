'use client';

import * as React from 'react';
import { PageHeader } from './admin-ui';
import { useDash } from './dashboard-i18n';
import type { DashboardDictionary } from '@/i18n/dashboard-dictionary';

/**
 * A PageHeader whose title comes from the dashboard dictionary, so the server
 * pages stay free of translation plumbing.
 */
export function PageTitle({
  section,
  actions,
}: {
  section: Extract<
    keyof DashboardDictionary,
    | 'orders'
    | 'products'
    | 'categories'
    | 'stock'
    | 'shipping'
    | 'freeShipping'
    | 'filters'
    | 'promo'
    | 'offers'
    | 'analytics'
    | 'settings'
  >;
  actions?: React.ReactNode;
}) {
  const { d } = useDash();
  return <PageHeader title={d[section].title} actions={actions} />;
}
