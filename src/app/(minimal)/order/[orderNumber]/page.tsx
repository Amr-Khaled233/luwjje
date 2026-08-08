import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Divider, StatusBadge } from '@/components/ui/primitives';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { canViewOrder } from '@/lib/order-access';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { formatPrice, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order Confirmed',
  robots: { index: false },
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { new?: string };
}) {
  // No accounts, so an order number alone must not reveal a customer's
  // address — this browser must have placed the order or passed the lookup
  // form. Dashboard sessions can always look.
  const [allowed, staff] = await Promise.all([
    canViewOrder(params.orderNumber),
    isDashboardUser(),
  ]);
  if (!allowed && !staff) redirect(`/orders?number=${encodeURIComponent(params.orderNumber)}`);

  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: { items: true },
    }),
    getSettings(),
  ]);

  if (!order) notFound();
  const isNew = searchParams.new === '1';
  const symbol = settings.currencySymbol;

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <div className="mx-auto max-w-[760px]">
        <div className="text-center">
          {isNew && (
            <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center border border-navy">
              <Check className="h-6 w-6" />
            </span>
          )}
          <p className="label-caps mb-4 text-secondary">
            {isNew ? 'Thank you' : 'Order'}
          </p>
          <h1 className="font-display text-display-sm">
            {isNew ? 'Order Confirmed' : `Order ${order.orderNumber}`}
          </h1>
          <p className="mt-4 text-body-lg text-secondary">
            {isNew
              ? `We have sent a confirmation to ${order.email}.`
              : `Placed ${formatDate(order.createdAt)}.`}
          </p>
        </div>

        <div className="mt-stack-md border border-outline-variant bg-surface-lowest">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-6">
            <div>
              <p className="label-caps text-secondary">Order number</p>
              <p className="mt-1 font-display text-headline-sm">{order.orderNumber}</p>
            </div>
            <div>
              <p className="label-caps mb-2 text-secondary">Status</p>
              <StatusBadge status={order.status} />
            </div>
            <div>
              <p className="label-caps text-secondary">Placed</p>
              <p className="mt-1 text-body-md">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          <div className="p-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 border-b border-outline-variant py-4 last:border-b-0">
                {item.imageUrl && (
                  <div className="relative h-20 w-[60px] shrink-0 overflow-hidden bg-surface-low">
                    <Image src={item.imageUrl} alt={item.name} fill sizes="60px" className="object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-body-lg">{item.name}</p>
                    <p className="mt-1 text-body-sm text-secondary">
                      {item.colorName}
                      {item.size && ` · Size ${item.size}`} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-body-md">
                    {formatPrice(item.unitPrice * item.quantity, symbol)}
                  </span>
                </div>
              </div>
            ))}

            <Divider className="my-5" />

            <dl className="flex flex-col gap-2.5 text-body-md">
              <div className="flex justify-between">
                <dt className="text-secondary">Subtotal</dt>
                <dd>{formatPrice(order.subtotal, symbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Shipping</dt>
                <dd>
                  {order.shippingCost === 0 ? 'Free' : formatPrice(order.shippingCost, symbol)}
                </dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-error">
                  <dt>Discount {order.promoCode && `(${order.promoCode})`}</dt>
                  <dd>−{formatPrice(order.discount, symbol)}</dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between border-t border-outline-variant pt-4">
                <dt className="label-caps text-secondary">Total</dt>
                <dd className="font-display text-headline-sm">{formatPrice(order.total, symbol)}</dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-outline-variant p-6">
            <p className="label-caps mb-3 text-secondary">Shipping to</p>
            <address className="not-italic text-body-md leading-7 text-secondary">
              {order.fullName}
              <br />
              {order.street}
              <br />
              {order.city && `${order.city}, `}
              {order.postalCode}
              <br />
              {order.region}
              {order.phone && (
                <>
                  <br />
                  {order.phone}
                </>
              )}
            </address>
          </div>
        </div>

        <div className="mt-stack-md flex flex-wrap justify-center gap-3">
          <ButtonLink href="/shop" size="lg">
            Continue shopping
          </ButtonLink>
          <ButtonLink href="/orders" variant="secondary" size="lg">
            Track another order
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
