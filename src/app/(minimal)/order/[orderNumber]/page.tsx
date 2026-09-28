import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { OrderCard } from '@/components/storefront/order-card';
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
}: {
  params: { orderNumber: string };
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

  // ---------------------------------------------------------------- awaiting
  // Placed but not yet confirmed: the shopper still has to click the emailed
  // link. Show what is waiting for them rather than a full receipt — nothing
  // is reserved or on its way until they confirm.
  if (!order.confirmed) {
    const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
    return (
      <div className="container-luwjje py-10 md:py-stack-lg">
        <div className="mx-auto max-w-[620px] text-center">
          <span className="mx-auto mb-6 flex h-14 w-14 animate-scale-in items-center justify-center border border-navy md:mb-8">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="font-display text-headline-md sm:text-display-sm">{t.order.awaitingTitle}</h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-body-md text-secondary sm:text-body-lg">
            {fmt(t.order.awaitingBody, { email: order.email })}
          </p>

          <div className="mx-auto mt-8 max-w-[420px] border border-outline-variant bg-surface-lowest p-5 text-start md:mt-stack-md md:p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="label-caps text-secondary">{t.order.orderNumber}</span>
              <span className="font-display text-title-md" dir="ltr">
                {order.orderNumber}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4 border-t border-outline-variant pt-3">
              <span className="label-caps text-secondary">{t.cart.total}</span>
              <span className="tabular-nums">
                {formatPrice(order.total, symbol, locale)} · {itemCount}
              </span>
            </div>
          </div>

          <p className="mt-6 text-body-sm text-tertiary">{t.order.awaitingNote}</p>

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

  // ---------------------------------------------------------------- confirmed
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
          <p className="label-caps mb-4 text-secondary">{t.order.order}</p>
          <h1 className="font-display text-headline-md sm:text-display-sm">
            {`${t.order.order} ${order.orderNumber}`}
          </h1>
          <p className="mt-4 text-body-md text-secondary sm:text-body-lg">
            {fmt(t.order.placedOn, { date: formatDate(order.createdAt, locale) })}
          </p>
        </div>

        <div className="mt-8 md:mt-stack-md">
          <OrderCard
            order={order}
            symbol={symbol}
            locale={locale}
            t={t}
            governorateLabel={governorateLabel}
          />
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
