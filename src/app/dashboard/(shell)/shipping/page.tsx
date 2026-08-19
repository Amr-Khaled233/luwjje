import { PageTitle } from '@/components/dashboard/page-title';
import { ShippingManager } from '@/components/dashboard/shipping-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardShippingPage() {
  const [governorates, settings] = await Promise.all([
    prisma.governorate.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
  ]);

  // Just the table. The counts and the explainer restated what the rows below
  // already say, and pushed the thing you came to edit off the first screen.
  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="shipping" />

      <ShippingManager
        governorates={governorates.map((g) => ({
          id: g.id,
          name: g.name,
          nameAr: g.nameAr,
          shippingCost: g.shippingCost,
          estimatedDays: g.estimatedDays,
          active: g.active,
        }))}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
