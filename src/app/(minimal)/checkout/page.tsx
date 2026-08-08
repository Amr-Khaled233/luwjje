import type { Metadata } from 'next';
import { CheckoutView } from '@/components/storefront/checkout-view';
import { getShippingRegions } from '@/lib/commerce';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false },
};

export default async function CheckoutPage() {
  const [settings, regions] = await Promise.all([getSettings(), getShippingRegions()]);

  return (
    <CheckoutView
      regions={regions}
      currencySymbol={settings.currencySymbol}
      stripeEnabled={Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
    />
  );
}
