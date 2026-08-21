'use client';

import { PageHeader } from './admin-ui';
import { PeriodPicker, type AnalyticsRange } from './analytics-header';
import { useDash } from './dashboard-i18n';

/** Title and period. No exports here — the figures are a read, not a record. */
export function ShoppersHeader({ range }: { range: AnalyticsRange }) {
  const { d } = useDash();
  return <PageHeader title={d.shoppers.title} actions={<PeriodPicker range={range} />} />;
}
