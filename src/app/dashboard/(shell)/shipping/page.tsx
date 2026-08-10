import { PageHeader, StatCard } from '@/components/dashboard/admin-ui';
import { ShippingManager } from '@/components/dashboard/shipping-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardShippingPage() {
  const [governorates, settings] = await Promise.all([
    prisma.governorate.findMany({ orderBy: { position: 'asc' } }),
    getSettings(),
  ]);

  const active = governorates.filter((g) => g.active);
  const average = active.length
    ? active.reduce((s, g) => s + g.shippingCost, 0) / active.length
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Shipping"
        description="One delivery price per governorate. The cart and checkout charge exactly what you set here."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Governorates" value={String(governorates.length)} />
        <StatCard label="Delivering to" value={String(active.length)} hint="active" />
        <StatCard
          label="Average rate"
          value={`${settings.currencySymbol} ${average.toFixed(0)}`}
        />
        <StatCard
          label="Free shipping over"
          value={`${settings.currencySymbol} ${settings.freeShippingOver.toLocaleString()}`}
          hint="global default"
        />
      </div>

      <ShippingManager
        governorates={governorates.map((g) => ({
          id: g.id,
          name: g.name,
          nameAr: g.nameAr,
          shippingCost: g.shippingCost,
          freeOver: g.freeOver,
          estimatedDays: g.estimatedDays,
          active: g.active,
        }))}
        globalFreeOver={settings.freeShippingOver}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
