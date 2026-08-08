import type { Metadata } from 'next';
import { CartView } from '@/components/storefront/cart-view';
import { getShippingRegions } from '@/lib/commerce';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Bag',
  robots: { index: false },
};

export default async function CartPage() {
  const [settings, regions] = await Promise.all([getSettings(), getShippingRegions()]);

  return (
    <CartView
      regions={regions}
      freeShippingOver={settings.freeShippingOver}
      currencySymbol={settings.currencySymbol}
    />
  );
}
