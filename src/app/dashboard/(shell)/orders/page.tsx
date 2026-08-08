import { PageHeader, StatCard } from '@/components/dashboard/admin-ui';
import { OrdersManager } from '@/components/dashboard/orders-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    getSettings(),
  ]);

  const active = orders.filter((o) => ['PENDING', 'PAID', 'SHIPPED'].includes(o.status)).length;
  const revenue = orders
    .filter((o) => ['PAID', 'SHIPPED', 'DELIVERED'].includes(o.status))
    .reduce((s, o) => s + o.total, 0);
  const avg = orders.length ? revenue / orders.filter((o) => o.status !== 'CANCELLED').length : 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Orders"
        description="Every order placed on the storefront. Changing a status here updates Active Orders on the dashboard, and cancelling returns the stock."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total orders" value={String(orders.length)} />
        <StatCard label="Active orders" value={String(active)} hint="pending, paid or shipped" />
        <StatCard
          label="Revenue"
          value={`${settings.currencySymbol}${revenue.toFixed(2)}`}
          hint="excluding cancelled"
        />
        <StatCard
          label="Average order"
          value={`${settings.currencySymbol}${avg.toFixed(2)}`}
        />
      </div>

      <OrdersManager
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          fullName: o.fullName,
          email: o.email,
          phone: o.phone,
          street: o.street,
          city: o.city,
          region: o.region,
          postalCode: o.postalCode,
          notes: o.notes,
          status: o.status,
          paymentStatus: o.paymentStatus,
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
