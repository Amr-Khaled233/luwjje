import type { Metadata } from 'next';
import { OrderLookupForm } from '@/components/storefront/order-lookup-form';

export const metadata: Metadata = {
  title: 'Track an Order',
  description: 'Look up a luwjje order with your order number and email address.',
};

export default function OrderLookupPage() {
  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <div className="mx-auto max-w-[480px]">
        <p className="label-caps mb-4 text-center text-secondary">Customer Care</p>
        <h1 className="text-center font-display text-display-sm">Track an Order</h1>
        <p className="mt-4 text-center text-body-md text-secondary">
          No account needed. Enter the order number from your confirmation, plus the email you
          used.
        </p>
        <OrderLookupForm />
      </div>
    </div>
  );
}
