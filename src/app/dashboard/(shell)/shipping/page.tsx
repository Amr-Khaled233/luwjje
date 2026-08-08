import { PageHeader } from '@/components/dashboard/admin-ui';
import { ShippingManager } from '@/components/dashboard/shipping-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminShippingPage() {
  const [zones, settings] = await Promise.all([
    prisma.shippingZone.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Shipping"
        description="Zones, rates and free-shipping thresholds. The cart and checkout price every order against this table."
      />

      <ShippingManager
        zones={zones.map((z) => ({
          id: z.id,
          name: z.name,
          countries: z.countries,
          rate: z.rate,
          freeOver: z.freeOver,
          estimatedDays: z.estimatedDays,
          active: z.active,
        }))}
        globalFreeOver={settings.freeShippingOver}
        defaultRate={settings.defaultShippingRate}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
