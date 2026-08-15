import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Divider } from '@/components/ui/primitives';
import { prisma } from '@/lib/prisma';
import { getCurrencySymbol } from '@/lib/settings';
import { canViewOrder } from '@/lib/order-access';
import { isDashboardUser } from '@/lib/dashboard-auth';
import { formatPrice, formatDate } from '@/lib/utils';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';
import { fmt } from '@/i18n/dictionaries';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.order.confirmed, robots: { index: false } };
}

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
  if (!allowed && !staff) redirect('/orders');

  const { locale, t } = await getI18n();
  const [order, symbol] = await Promise.all([
    prisma.order.findUnique({
      where: { orderNumber: params.orderNumber },
      include: { items: true },
    }),
    getCurrencySymbol(locale),
  ]);

  if (!order) notFound();
  const isNew = searchParams.new === '1';

  // The stored governorate is the English name; show the Arabic one when we
  // still have the row.
  const governorate = order.governorateId
    ? await prisma.governorate.findUnique({
        where: { id: order.governorateId },
        select: { name: true, nameAr: true },
      })
    : null;
  const governorateLabel = governorate
    ? pick(locale, governorate.name, governorate.nameAr)
    : order.governorate;

  return (
    <div className="container-luwjje py-10 md:py-stack-lg">
      <div className="mx-auto max-w-[760px]">
        <div className="text-center">
          {isNew && (
            <span className="mx-auto mb-6 flex h-14 w-14 animate-scale-in items-center justify-center border border-navy md:mb-8">
              <Check className="h-6 w-6" />
            </span>
          )}
          <p className="label-caps mb-4 text-secondary">
            {isNew ? t.order.thankYou : t.order.order}
          </p>
          <h1 className="font-display text-headline-md sm:text-display-sm">
            {isNew ? t.order.confirmed : `${t.order.order} ${order.orderNumber}`}
          </h1>
          <p className="mt-4 text-body-md text-secondary sm:text-body-lg">
            {isNew
              ? fmt(t.order.sentTo, { email: order.email })
              : fmt(t.order.placedOn, { date: formatDate(order.createdAt, locale) })}
          </p>
        </div>

        <div className="mt-8 border border-outline-variant bg-surface-lowest md:mt-stack-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-5 md:p-6">
            <div>
              <p className="label-caps text-secondary">{t.order.orderNumber}</p>
              <p className="mt-1 font-display text-title-md sm:text-headline-sm" dir="ltr">
                {order.orderNumber}
              </p>
            </div>
            <div>
              <p className="label-caps mb-2 text-secondary">{t.order.status}</p>
              <span className="label-caps inline-flex items-center border border-navy px-2.5 py-1">
                {t.order.statuses[order.status] ?? order.status}
              </span>
            </div>
            <div>
              <p className="label-caps text-secondary">{t.order.placed}</p>
              <p className="mt-1 text-body-md">{formatDate(order.createdAt, locale)}</p>
            </div>
          </div>

          <div className="p-5 md:p-6">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b border-outline-variant py-4 last:border-b-0 sm:gap-4"
              >
                {item.imageUrl && (
                  <div className="relative h-20 w-[60px] shrink-0 overflow-hidden bg-surface-low">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div>
                    <p className="font-display text-body-md sm:text-body-lg">{pick(locale, item.name, item.nameAr)}</p>
                    <p className="mt-1 text-body-sm text-secondary">
                      {item.colorName}
                      {item.size && ` · ${t.product.size} ${item.size}`} · ×{item.quantity}
                    </p>
                  </div>
                  <span className="text-body-md">
                    {formatPrice(item.unitPrice * item.quantity, symbol, locale)}
                  </span>
                </div>
              </div>
            ))}

            <Divider className="my-5" />

            <dl className="flex flex-col gap-2.5 text-body-md">
              <div className="flex justify-between">
                <dt className="text-secondary">{t.cart.subtotal}</dt>
                <dd>{formatPrice(order.subtotal, symbol, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">{t.cart.shipping}</dt>
                <dd>
                  {order.shippingCost === 0
                    ? t.cart.free
                    : formatPrice(order.shippingCost, symbol, locale)}
                </dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-error">
                  <dt>
                    {t.cart.discount} {order.promoCode && `(${order.promoCode})`}
                  </dt>
                  <dd>−{formatPrice(order.discount, symbol, locale)}</dd>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between border-t border-outline-variant pt-4">
                <dt className="label-caps text-secondary">{t.cart.total}</dt>
                <dd className="font-display text-headline-sm">
                  {formatPrice(order.total, symbol, locale)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-outline-variant p-6">
            <p className="label-caps mb-3 text-secondary">{t.order.deliverTo}</p>
            <address className="not-italic text-body-md leading-7 text-secondary">
              {order.fullName}
              <br />
              {order.street}
              <br />
              {order.area && `${order.area}, `}
              {governorateLabel}
              {order.phone && (
                <>
                  <br />
                  <span dir="ltr">{order.phone}</span>
                </>
              )}
            </address>
          </div>
        </div>

        <div className="mt-stack-md flex flex-wrap justify-center gap-3">
          <ButtonLink href="/shop" size="lg">
            {t.order.continueShopping}
          </ButtonLink>
          <ButtonLink href="/orders" variant="secondary" size="lg">
            {t.order.trackAnother}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
