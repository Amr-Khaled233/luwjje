import { StatCard } from '@/components/dashboard/admin-ui';
import { getLocale } from '@/i18n/server';
import { getDashboardDictionary } from '@/i18n/dashboard-dictionary';
import { fmt } from '@/i18n/dictionaries';
import { PageTitle } from '@/components/dashboard/page-title';
import { OrdersManager } from '@/components/dashboard/orders-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const d = getDashboardDictionary(await getLocale());
  const [orders, settings, governorates] = await Promise.all([
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    getSettings(),
    prisma.governorate.findMany({
      where: { active: true },
      orderBy: { position: 'asc' },
      select: { name: true, nameAr: true },
    }),
  ]);

  const active = orders.filter((o) => ['PENDING', 'SHIPPED'].includes(o.status)).length;
  const revenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((s, o) => s + o.total, 0);
  const avg = orders.length ? revenue / orders.filter((o) => o.status !== 'CANCELLED').length : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="orders" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={d.orders.totalOrders} value={String(orders.length)} />
        <StatCard label={d.orders.activeOrders} value={String(active)} hint={d.orders.activeHint} />
        <StatCard
          label={d.orders.revenue}
          value={`${settings.currencySymbol}${revenue.toFixed(2)}`}
          hint={d.orders.revenueHint}
        />
        <StatCard
          label={d.orders.averageOrder}
          value={`${settings.currencySymbol}${avg.toFixed(2)}`}
        />
      </div>

      <OrdersManager
        governorates={governorates.map((g) => ({ name: g.name, nameAr: g.nameAr }))}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          fullName: o.fullName,
          email: o.email,
          phone: o.phone,
          street: o.street,
          area: o.area,
          governorate: o.governorate,
          notes: o.notes,
          status: o.status,
          subtotal: o.subtotal,
          shippingCost: o.shippingCost,
          discount: o.discount,
          total: o.total,
          promoCode: o.promoCode,
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            id: i.id,
            name: i.name,
            colorName: i.colorName,
            size: i.size,
            imageUrl: i.imageUrl,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
          })),
        }))}
        currencySymbol={settings.currencySymbol}
        initialStatus={searchParams.status ?? ''}
      />
    </div>
  );
}
