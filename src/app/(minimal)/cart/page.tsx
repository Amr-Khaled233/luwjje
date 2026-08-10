import type { Metadata } from 'next';
import { CartView } from '@/components/storefront/cart-view';
import { getGovernorates } from '@/lib/commerce';
import { getSettings, getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.cart.title, robots: { index: false } };
}

export default async function CartPage() {
  const { locale, t } = await getI18n();
  const [settings, governorates, symbol] = await Promise.all([
    getSettings(),
    getGovernorates(locale),
    getCurrencySymbol(locale),
  ]);

  return (
    <CartView
      governorates={governorates}
      freeShippingOver={settings.freeShippingOver}
      currencySymbol={symbol}
      locale={locale}
      t={t}
    />
  );
}
