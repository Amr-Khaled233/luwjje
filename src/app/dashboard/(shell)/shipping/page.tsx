import { StatCard } from '@/components/dashboard/admin-ui';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { PageTitle } from '@/components/dashboard/page-title';
import { ShippingManager } from '@/components/dashboard/shipping-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardShippingPage() {
  const d = getDashboardDictionary(await getLocale());
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
      <PageTitle section="shipping" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={d.shipping.governorates} value={String(governorates.length)} />
        <StatCard label={d.shipping.deliveringTo} value={String(active.length)} hint={d.common.active} />
        <StatCard
          label={d.shipping.averageRate}
          value={`${settings.currencySymbol} ${average.toFixed(0)}`}
        />
        <StatCard
          label={d.shipping.freeOver}
          value={`${settings.currencySymbol} ${settings.freeShippingOver.toLocaleString()}`}
          hint={d.shipping.globalDefault}
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
