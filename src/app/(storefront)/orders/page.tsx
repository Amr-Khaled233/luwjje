import type { Metadata } from 'next';
import { OrderLookupForm } from '@/components/storefront/order-lookup-form';
import { getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.track.title, description: t.track.hint };
}

export default async function OrderLookupPage() {
  const { locale, t } = await getI18n();
  const symbol = await getCurrencySymbol(locale);

  return (
    <div className="container-luwjje py-10 md:py-stack-lg">
      <div className="mx-auto max-w-[560px]">
        <p className="label-caps mb-4 text-center text-secondary">{t.track.eyebrow}</p>
        <h1 className="text-center font-display text-headline-md sm:text-display-sm">{t.track.title}</h1>
        <p className="mt-4 text-center text-body-sm text-secondary sm:text-body-md">{t.track.hint}</p>
        <OrderLookupForm locale={locale} t={t} currencySymbol={symbol} />
      </div>
    </div>
  );
}
