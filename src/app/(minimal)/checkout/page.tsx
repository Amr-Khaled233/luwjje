import type { Metadata } from 'next';
import { CheckoutView } from '@/components/storefront/checkout-view';
import { getGovernorates } from '@/lib/commerce';
import { getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.checkout.title, robots: { index: false } };
}

export default async function CheckoutPage() {
  const { locale, t } = await getI18n();
  const [governorates, symbol] = await Promise.all([
    getGovernorates(locale),
    getCurrencySymbol(locale),
  ]);

  return (
    <CheckoutView
      governorates={governorates}
      currencySymbol={symbol}
      locale={locale}
      t={t}
    />
  );
}
