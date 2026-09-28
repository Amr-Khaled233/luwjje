import type { Metadata } from 'next';
import { CheckCircle2, XCircle, PackageX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { OrderCard } from '@/components/storefront/order-card';
import { prisma } from '@/lib/prisma';
import { getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.order.confirmed, robots: { index: false } };
}

/**
 * Where the confirmation link lands after the route handler has done the work.
 * The token is proof enough to show the order — no account or cookie needed, so
 * it works even when the shopper opens the link on a different device. This page
 * only reads; it never confirms.
 */
export default async function OrderConfirmDisplayPage({
  searchParams,
}: {
  searchParams: { token?: string; status?: string };
}) {
  const { locale, t } = await getI18n();
  const token = searchParams.token;

  const notice = (Icon: typeof XCircle, title: string, body: string) => (
    <div className="container-luwjje py-10 md:py-stack-lg">
      <div className="mx-auto max-w-[560px] text-center">
        <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-outline-variant text-secondary md:mb-8">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="font-display text-headline-md sm:text-display-sm">{title}</h1>
        <p className="mx-auto mt-4 max-w-[46ch] text-body-md text-secondary sm:text-body-lg">{body}</p>
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

  if (searchParams.status === 'invalid' || !token || !/^[0-9a-f]{64}$/.test(token)) {
    return notice(XCircle, t.order.linkInvalidTitle, t.order.linkInvalidBody);
  }

  const [order, symbol] = await Promise.all([
    prisma.order.findFirst({
      where: { confirmationToken: token },
      include: { items: true },
    }),
    getCurrencySymbol(locale),
  ]);

  if (!order) return notice(XCircle, t.order.linkInvalidTitle, t.order.linkInvalidBody);

  if (!order.confirmed || searchParams.status === 'soldout') {
    return notice(PackageX, t.order.soldOutTitle, t.order.soldOutBody);
  }

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
          <span className="mx-auto mb-6 flex h-14 w-14 animate-scale-in items-center justify-center border border-success text-success md:mb-8">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="label-caps mb-4 text-secondary">{t.order.thankYou}</p>
          <h1 className="font-display text-headline-md sm:text-display-sm">{t.order.confirmed}</h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-body-md text-secondary sm:text-body-lg">
            {t.order.confirmedBanner}
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
