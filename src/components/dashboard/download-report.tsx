'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadReportButton({ days, label }: { days: number; label: string }) {
  return (
    <Button variant="secondary" onClick={() => window.open(`/api/dashboard/report?days=${days}`)}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
