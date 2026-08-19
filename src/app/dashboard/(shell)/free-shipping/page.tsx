import { PageTitle } from '@/components/dashboard/page-title';
import { FreeShippingManager } from '@/components/dashboard/free-shipping-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardFreeShippingPage() {
  const [rules, settings] = await Promise.all([
    prisma.freeShippingRule.findMany({ orderBy: { createdAt: 'desc' } }),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="freeShipping" />

      <FreeShippingManager
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          nameAr: r.nameAr,
          minOrder: r.minOrder,
          // Serialised for the client component; a Date cannot cross.
          startsAt: r.startsAt?.toISOString() ?? null,
          endsAt: r.endsAt?.toISOString() ?? null,
          active: r.active,
        }))}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
