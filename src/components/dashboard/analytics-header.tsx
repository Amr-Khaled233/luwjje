'use client';

import { PageHeader } from './admin-ui';
import { RangePicker } from './range-picker';
import { DownloadReportButton } from './download-report';
import { useDash } from './dashboard-i18n';

/** Analytics header — title, range picker and the Excel export, translated. */
export function AnalyticsHeader({ days }: { days: number }) {
  const { d } = useDash();

  return (
    <PageHeader
      title={d.analytics.title}
      description={d.analytics.description}
      actions={
        <>
          <RangePicker
            value={String(days)}
            options={[
              { value: '7', label: d.ranges.d7 },
              { value: '30', label: d.ranges.d30 },
              { value: '90', label: d.ranges.d90 },
            ]}
          />
          <DownloadReportButton days={days} label={d.report.download} />
        </>
      }
    />
  );
}
