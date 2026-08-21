'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { EmptyState, Divider } from '@/components/ui/primitives';
import { useCart } from '@/lib/cart-store';
import { shippingSchema, type ShippingInput } from '@/lib/validations';
import { formatPrice, cn } from '@/lib/utils';
import { useCartPricing, CHECKOUT_STORAGE_KEY } from '@/lib/use-cart-pricing';
import { fmt } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

export interface GovernorateOption {
  value: string;
  label: string;
  shippingCost: number;
  estimatedDays: string;
}

export function CartView({
  governorates,
  currencySymbol,
  locale,
  t,
}: {
  governorates: GovernorateOption[];
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const { items, setQuantity, removeItem, hydrated } = useCart();

  const form = useForm<ShippingInput>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      street: '',
      area: '',
      governorate: '',
      notes: '',
    },
  });

  const governorate = form.watch('governorate');
  const [promoInput, setPromoInput] = React.useState('');
  const [appliedCode, setAppliedCode] = React.useState('');

  const pricing = useCartPricing({ items, governorate, promoCode: appliedCode });

  function applyPromo(e: React.FormEvent) {
    e.preventDefault();
    setAppliedCode(promoInput.trim().toUpperCase());
  }

  function proceed(values: ShippingInput) {
    // Carried to /checkout; the server re-validates everything before writing.
    sessionStorage.setItem(
      CHECKOUT_STORAGE_KEY,
      JSON.stringify({ shipping: values, promoCode: pricing.promo?.ok ? appliedCode : '' }),
    );
    router.push('/checkout');
  }

  if (!hydrated) {
    return (
      <div className="container-luwjje flex justify-center py-stack-lg">
        <Loader2 className="h-6 w-6 animate-spin text-secondary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-luwjje py-10 md:py-stack-lg">
        <h1 className="mb-8 font-display text-headline-md sm:text-display-sm md:mb-stack-md">{t.cart.title}</h1>
        <EmptyState
          title={t.cart.empty}
          body={t.cart.emptyHint}
          action={<ButtonLink href="/shop">{t.cart.browse}</ButtonLink>}
        />
      </div>
    );
  }

  // The threshold comes back with the priced cart, because which rule applies
  // depends on the basket and on the date.
  const freeShippingOver = pricing.freeShippingOver ?? 0;
  const remainingForFree = Math.max(0, freeShippingOver - pricing.subtotal);

  return (
    <div className="container-luwjje py-10 md:py-stack-lg">
      <h1 className="mb-8 font-display text-headline-md sm:text-display-sm md:mb-stack-md">{t.cart.title}</h1>

      <form onSubmit={form.handleSubmit(proceed)} noValidate>
        <div className="grid grid-cols-1 gap-10 md:gap-stack-md lg:grid-cols-12 lg:gap-gutter">
          {/* ------------------------------------------------- items + form */}
          <div className="lg:col-span-8">
            <div className="border-t border-outline-variant">
              {items.map((item) => {
                const line = pricing.lines.find((l) => l.variantId === item.variantId);
                const unitPrice = line?.unitPrice ?? item.unitPrice;
                const maxStock = line?.maxStock ?? item.maxStock;

                return (
                  <div
                    key={item.variantId}
                    className="flex gap-3 border-b border-outline-variant py-5 sm:gap-4 md:gap-6 md:py-6"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      className="relative h-[110px] w-20 shrink-0 overflow-hidden bg-surface-low sm:h-[132px] sm:w-24"
                    >
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <div className="min-w-0">
                          <Link
                            href={`/product/${item.slug}`}
                            className="font-display text-body-lg leading-7 hover:underline sm:text-headline-sm sm:leading-8"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-body-sm text-secondary">
                            {item.colorName}
                            {item.size && ` · ${t.product.size} ${item.size}`}
                          </p>
                          <p className="mt-1 text-body-sm text-tertiary">
                            {formatPrice(unitPrice, currencySymbol, locale)} {t.cart.each}
                          </p>
                        </div>
                        <span className="shrink-0 text-body-md tabular-nums sm:text-body-lg">
                          {formatPrice(unitPrice * item.quantity, currencySymbol, locale)}
                        </span>
                      </div>

                      {line?.notice && <p className="mt-2 text-body-sm text-error">{line.notice}</p>}

                      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 sm:gap-6">
                        <div className="flex items-center border border-outline-variant">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                            className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-surface-low"
                            aria-label={t.product.decreaseQty}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-10 text-center text-body-md">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                            className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
                            aria-label={t.product.increaseQty}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="text-body-sm text-secondary underline-offset-4 transition-colors hover:text-error hover:underline"
                        >
                          {t.cart.remove}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* delivery details */}
            <section className="mt-10 md:mt-stack-md">
              <h2 className="font-display text-title-md sm:text-headline-sm">
                {t.cart.shippingDetails}
              </h2>
              <p className="mt-2 text-body-sm text-secondary">{t.cart.shippingDetailsHint}</p>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:gap-6 md:mt-8 md:grid-cols-2">
                <Input
                  label={t.fields.fullName}
                  required
                  autoComplete="name"
                  error={form.formState.errors.fullName?.message}
                  {...form.register('fullName')}
                />
                <Input
                  label={t.fields.email}
                  type="email"
                  required
                  autoComplete="email"
                  dir="ltr"
                  error={form.formState.errors.email?.message}
                  {...form.register('email')}
                />
                <Input
                  label={t.fields.phone}
                  type="tel"
                  required
                  autoComplete="tel"
                  dir="ltr"
                  error={form.formState.errors.phone?.message}
                  {...form.register('phone')}
                />
                <Select
                  label={t.fields.governorate}
                  required
                  error={form.formState.errors.governorate?.message}
                  {...form.register('governorate')}
                >
                  <option value="">{t.cart.selectGovernorate}</option>
                  {governorates.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t.fields.area}
                  autoComplete="address-level2"
                  error={form.formState.errors.area?.message}
                  {...form.register('area')}
                />
                <Input
                  label={t.fields.street}
                  required
                  autoComplete="street-address"
                  error={form.formState.errors.street?.message}
                  {...form.register('street')}
                />
              </div>
            </section>
          </div>

          {/* --------------------------------------------------- summary */}
          <aside className="lg:col-span-4">
            <div className="border border-outline-variant bg-surface-lowest p-5 sm:p-6 lg:sticky lg:top-24 md:p-8">
              <h2 className="font-display text-headline-sm">{t.cart.summary}</h2>

              <dl className="mt-6 flex flex-col gap-3 text-body-md">
                <div className="flex justify-between">
                  <dt className="text-secondary">{t.cart.subtotal}</dt>
                  <dd>{formatPrice(pricing.subtotal, currencySymbol, locale)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary">{t.cart.shipping}</dt>
                  <dd>
                    {!governorate ? (
                      <span className="text-secondary">{t.cart.selectGovernorate}</span>
                    ) : pricing.shipping?.free ? (
                      <span className="uppercase tracking-wider">{t.cart.free}</span>
                    ) : (
                      formatPrice(pricing.shipping?.cost ?? 0, currencySymbol, locale)
                    )}
                  </dd>
                </div>
                {pricing.promo?.ok && (
                  <div className="flex justify-between text-error">
                    <dt>
                      {t.cart.discount} ({pricing.promo.code})
                    </dt>
                    <dd>−{formatPrice(pricing.promo.discount, currencySymbol, locale)}</dd>
                  </div>
                )}
              </dl>

              <Divider className="my-5" />

              <div className="flex items-baseline justify-between">
                <span className="label-caps text-secondary">{t.cart.total}</span>
                <span className="text-headline-sm font-medium tabular-nums sm:text-headline-md">
                  {formatPrice(pricing.total, currencySymbol, locale)}
                </span>
              </div>

              {/* promo */}
              <div className="mt-6">
                <label htmlFor="promo" className="label-caps mb-2 block text-secondary">
                  {t.cart.promoCode}
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyPromo(e);
                      }
                    }}
                    placeholder={t.cart.promoPlaceholder}
                    dir="ltr"
                    className="h-11 min-w-0 flex-1 border border-outline-variant bg-background px-4 text-body-md uppercase transition-colors placeholder:normal-case placeholder:text-tertiary focus:border-navy focus:outline-none"
                  />
                  <Button type="button" variant="secondary" onClick={applyPromo}>
                    {t.cart.apply}
                  </Button>
                </div>
                {appliedCode && pricing.promo && (
                  <p
                    className={cn(
                      'mt-2 text-body-sm',
                      pricing.promo.ok ? 'text-on-surface' : 'text-error',
                    )}
                  >
                    {pricing.promo.message}
                  </p>
                )}
              </div>

              {/*
                Only ever a nudge towards a threshold that is actually within
                reach. With no rule set at all it used to announce "free
                shipping over EGP 0 — applied", which is not a thing.
              */}
              {remainingForFree > 0 && (
                <div className="mt-6 border border-outline-variant bg-surface-low p-4">
                  <p className="text-body-sm text-secondary">
                    {fmt(t.cart.spendMore, {
                      amount: formatPrice(remainingForFree, currencySymbol, locale),
                    })}
                  </p>
                  <div className="mt-3 h-px w-full bg-outline-variant">
                    <div
                      className="h-px bg-navy transition-all duration-500 ease-scandi"
                      style={{
                        width: `${Math.min(100, (pricing.subtotal / Math.max(1, freeShippingOver)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={pricing.loading || items.length === 0}
              >
                {pricing.loading ? t.cart.updating : t.cart.proceed}
              </Button>

              {!form.formState.isValid && form.formState.isSubmitted && (
                <p className="mt-3 text-body-sm text-error">{t.cart.completeDetails}</p>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
