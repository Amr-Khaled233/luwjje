import { PageTitle } from '@/components/dashboard/page-title';
import { PendingOrders } from '@/components/dashboard/pending-orders';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function PendingOrdersPage() {
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      where: { confirmed: false },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    getSettings(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="pending" />

      <PendingOrders
        currencySymbol={settings.currencySymbol}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          fullName: o.fullName,
          email: o.email,
          phone: o.phone,
          total: o.total,
          createdAt: o.createdAt.toISOString(),
          itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
        }))}
      />
    </div>
  );
}
