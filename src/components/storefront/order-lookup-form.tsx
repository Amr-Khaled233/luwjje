'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2, ChevronRight } from 'lucide-react';
import { FieldLabel } from '@/components/ui/field';
import { lookupOrders, type LookupState } from '@/app/actions/order-lookup';
import { formatPrice, formatDate } from '@/lib/utils';
import { fmt } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

function SubmitButton({ t }: { t: Dictionary }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="label-caps mt-2 flex h-12 w-full items-center justify-center gap-2 border border-navy bg-navy text-background transition-[background-color,transform] hover:bg-[#060f1c] active:scale-[0.98] disabled:opacity-60 sm:h-14"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> {t.track.searching}
        </>
      ) : (
        t.track.find
      )}
    </button>
  );
}

export function OrderLookupForm({
  locale,
  t,
  currencySymbol,
}: {
  locale: Locale;
  t: Dictionary;
  currencySymbol: string;
}) {
  const [state, formAction] = useFormState<LookupState, FormData>(lookupOrders, {});

  // Once orders come back, the form is replaced by the picker.
  if (state.orders?.length) {
    return (
      <div className="mt-10 md:mt-stack-md">
        <div className="mb-6 text-center">
          <h2 className="font-display text-title-md sm:text-headline-sm">{t.track.yourOrders}</h2>
          <p className="mt-2 text-body-sm text-secondary">
            {fmt(t.track.ordersFound, { n: state.orders.length })}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {state.orders.map((order) => (
            <li key={order.orderNumber}>
              <Link
                href={`/order/${order.orderNumber}`}
                className="group flex items-center gap-3 border border-outline-variant bg-surface-lowest p-3 transition-colors hover:border-navy sm:gap-4 sm:p-4"
              >
                <div className="flex shrink-0 gap-1">
                  {order.thumbnails.length > 0 ? (
                    order.thumbnails.map((src, i) => (
                      <div key={i} className="relative h-14 w-11 overflow-hidden bg-surface-low">
                        <Image src={src} alt="" fill sizes="44px" className="object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="h-14 w-11 bg-surface-container" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-body-md sm:text-body-lg" dir="ltr">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-body-sm text-secondary">
                    {formatDate(order.createdAt, locale)} · {fmt(t.track.items, { n: order.itemCount })} ·{' '}
                    {formatPrice(order.total, currencySymbol, locale)}
                  </p>
                  <span className="label-caps mt-2 inline-flex border border-outline-variant px-2 py-0.5 text-secondary">
                    {t.order.statuses[order.status] ?? order.status}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-secondary transition-transform duration-300 ease-scandi group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.reload()}
            className="label-caps text-secondary underline-offset-4 hover:underline"
          >
            {t.track.searchAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-5 sm:gap-6 md:mt-stack-md">
      <div>
        <FieldLabel htmlFor="email" required>
          {t.track.email}
        </FieldLabel>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          dir="ltr"
          className="h-12 w-full border border-outline-variant bg-background px-4 text-body-md transition-colors focus:border-navy focus:outline-none"
        />
      </div>

      {state.error && (
        <p role="alert" className="border border-error p-3 text-body-sm text-error">
          {state.error === 'NOT_FOUND' ? t.track.notFound : state.error}
        </p>
      )}

      <SubmitButton t={t} />
    </form>
  );
}
