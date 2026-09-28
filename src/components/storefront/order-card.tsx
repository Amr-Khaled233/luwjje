import Image from 'next/image';
import { Banknote } from 'lucide-react';
import { Divider } from '@/components/ui/primitives';
import { OrderProgress } from '@/components/storefront/order-progress';
import { formatPrice, formatDate } from '@/lib/utils';
import { pick, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

// Border + ink per delivery state, so the status badge reads at a glance.
const STATUS_TONE: Record<string, string> = {
  PENDING: 'border-navy text-navy',
  SHIPPED: 'border-warning text-warning-ink',
  DELIVERED: 'border-success text-success',
  CANCELLED: 'border-error text-error',
};

interface OrderItemRow {
  id: string;
  name: string;
  nameAr: string;
  colorName: string;
  size: string | null;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderCardOrder {
  orderNumber: string;
  status: string;
  createdAt: Date;
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  promoCode: string | null;
  fullName: string;
  street: string;
  area: string | null;
  phone: string | null;
  items: OrderItemRow[];
}

/**
 * The order, laid out: its number and current delivery state, the progress
 * steps, the lines and totals, how it is paid and where it is going. Shared by
 * the order page and the email-confirmation page so both read identically.
 */
export function OrderCard({
  order,
  symbol,
  locale,
  t,
  governorateLabel,
}: {
  order: OrderCardOrder;
  symbol: string;
  locale: Locale;
  t: Dictionary;
  governorateLabel: string;
}) {
  return (
    <div className="border border-outline-variant bg-surface-lowest">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant p-5 md:p-6">
        <div>
          <p className="label-caps text-secondary">{t.order.orderNumber}</p>
          <p className="mt-1 font-display text-title-md sm:text-headline-sm" dir="ltr">
            {order.orderNumber}
          </p>
        </div>
        <div>
          <p className="label-caps mb-2 text-secondary">{t.order.status}</p>
          <span
            className={`label-caps inline-flex items-center border px-2.5 py-1 ${
              STATUS_TONE[order.status] ?? 'border-navy text-navy'
            }`}
          >
            {t.order.statuses[order.status] ?? order.status}
          </span>
        </div>
        <div>
          <p className="label-caps text-secondary">{t.order.placed}</p>
          <p className="mt-1 text-body-md">{formatDate(order.createdAt, locale)}</p>
        </div>
      </div>

      {/* Where the order is on its way to the door. */}
      <div className="border-b border-outline-variant px-5 py-7 md:px-8">
        <OrderProgress status={order.status} labels={t.order.statuses} />
      </div>

      <div className="p-5 md:p-6">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex gap-3 border-b border-outline-variant py-4 last:border-b-0 sm:gap-4"
          >
            {item.imageUrl && (
              <div className="relative h-20 w-[60px] shrink-0 overflow-hidden bg-surface-low">
                <Image src={item.imageUrl} alt={item.name} fill sizes="60px" className="object-cover" />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div>
                <p className="font-display text-body-md sm:text-body-lg">
                  {pick(locale, item.name, item.nameAr)}
                </p>
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
              {order.shippingCost === 0 ? t.cart.free : formatPrice(order.shippingCost, symbol, locale)}
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
            <dd className="text-headline-sm font-medium tabular-nums">
              {formatPrice(order.total, symbol, locale)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-outline-variant px-6 pt-6">
        <p className="label-caps text-secondary">{t.order.payment}</p>
        <span className="inline-flex items-center gap-2 border border-navy bg-navy/5 px-3 py-1.5 text-body-md font-medium text-navy">
          <Banknote className="h-4 w-4 shrink-0" aria-hidden />
          {t.order.cashOnDelivery}
        </span>
      </div>

      <div className="p-6">
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
  );
}
