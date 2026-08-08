'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Minus, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { EmptyState, Divider } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { useCart } from '@/lib/cart-store';
import { shippingSchema, type ShippingInput } from '@/lib/validations';
import { formatPrice, cn } from '@/lib/utils';
import { useCartPricing, CHECKOUT_STORAGE_KEY } from '@/lib/use-cart-pricing';

export function CartView({
  regions,
  freeShippingOver,
  currencySymbol,
}: {
  regions: { zone: string; countries: string[] }[];
  freeShippingOver: number;
  currencySymbol: string;
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
      city: '',
      region: '',
      postalCode: '',
      notes: '',
    },
  });

  const region = form.watch('region');
  const [promoInput, setPromoInput] = React.useState('');
  const [appliedCode, setAppliedCode] = React.useState('');

  const pricing = useCartPricing({ items, region, promoCode: appliedCode });

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
      <div className="container-luwjje py-stack-md md:py-stack-lg">
        <h1 className="mb-stack-md font-display text-display-sm">Your Bag</h1>
        <EmptyState
          title="Your bag is empty."
          body="When you find something worth keeping, it will appear here."
          action={<ButtonLink href="/shop">Browse the collection</ButtonLink>}
        />
      </div>
    );
  }

  const remainingForFree = Math.max(0, freeShippingOver - pricing.subtotal);

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <h1 className="mb-stack-md font-display text-display-sm">Your Bag</h1>

      <form onSubmit={form.handleSubmit(proceed)} noValidate>
        <div className="grid grid-cols-1 gap-stack-md lg:grid-cols-12 lg:gap-gutter">
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
                    className="flex gap-4 border-b border-outline-variant py-6 md:gap-6"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      className="relative h-[132px] w-24 shrink-0 overflow-hidden bg-surface-low"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/product/${item.slug}`}
                            className="font-display text-headline-sm leading-8 hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-body-sm text-secondary">
                            {item.colorName}
                            {item.size && ` · Size ${item.size}`}
                          </p>
                          <p className="mt-1 text-body-sm text-tertiary">
                            {formatPrice(unitPrice, currencySymbol)} each
                          </p>
                        </div>
                        <span className="text-body-lg">
                          {formatPrice(unitPrice * item.quantity, currencySymbol)}
                        </span>
                      </div>

                      {line?.notice && (
                        <p className="mt-2 text-body-sm text-error">{line.notice}</p>
                      )}

                      <div className="mt-auto flex items-center gap-6 pt-4">
                        <div className="flex items-center border border-outline-variant">
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                            className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-surface-low"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-10 text-center text-body-md">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                            className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-surface-low disabled:opacity-30"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.variantId)}
                          className="text-body-sm text-secondary underline-offset-4 transition-colors hover:text-error hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* shipping details */}
            <section className="mt-stack-md">
              <h2 className="font-display text-headline-sm">Shipping Details</h2>
              <p className="mt-2 text-body-sm text-secondary">
                Where should this go? You can review everything before paying.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Full Name"
                  required
                  autoComplete="name"
                  error={form.formState.errors.fullName?.message}
                  {...form.register('fullName')}
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  autoComplete="email"
                  error={form.formState.errors.email?.message}
                  {...form.register('email')}
                />
                <Input
                  label="Phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  error={form.formState.errors.phone?.message}
                  {...form.register('phone')}
                />
                <Input
                  label="Postal Code"
                  required
                  autoComplete="postal-code"
                  error={form.formState.errors.postalCode?.message}
                  {...form.register('postalCode')}
                />
                <Input
                  label="Street Address"
                  required
                  autoComplete="street-address"
                  containerClassName="md:col-span-2"
                  error={form.formState.errors.street?.message}
                  {...form.register('street')}
                />
                <Input
                  label="City"
                  autoComplete="address-level2"
                  error={form.formState.errors.city?.message}
                  {...form.register('city')}
                />
                <Select
                  label="Region / Country"
                  required
                  error={form.formState.errors.region?.message}
                  {...form.register('region')}
                >
                  <option value="">Select a destination</option>
                  {regions.map((r) => (
                    <optgroup key={r.zone} label={r.zone}>
                      {r.countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </div>
            </section>
          </div>

          {/* --------------------------------------------------- summary */}
          <aside className="lg:col-span-4">
            <div className="sticky top-[92px] border border-outline-variant bg-surface-lowest p-6 md:p-8">
              <h2 className="font-display text-headline-sm">Order Summary</h2>

              <dl className="mt-6 flex flex-col gap-3 text-body-md">
                <div className="flex justify-between">
                  <dt className="text-secondary">Subtotal</dt>
                  <dd>{formatPrice(pricing.subtotal, currencySymbol)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary">Shipping</dt>
                  <dd>
                    {!region ? (
                      <span className="text-secondary">Select a region</span>
                    ) : pricing.shipping?.free ? (
                      <span className="uppercase tracking-wider">Free</span>
                    ) : (
                      formatPrice(pricing.shipping?.cost ?? 0, currencySymbol)
                    )}
                  </dd>
                </div>
                {pricing.promo?.ok && (
                  <div className="flex justify-between text-error">
                    <dt>Discount ({pricing.promo.code})</dt>
                    <dd>−{formatPrice(pricing.promo.discount, currencySymbol)}</dd>
                  </div>
                )}
              </dl>

              <Divider className="my-5" />

              <div className="flex items-baseline justify-between">
                <span className="label-caps text-secondary">Total</span>
                <span className="font-display text-headline-md">
                  {formatPrice(pricing.total, currencySymbol)}
                </span>
              </div>

              {/* promo */}
              <div className="mt-6">
                <label htmlFor="promo" className="label-caps mb-2 block text-secondary">
                  Promo Code
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
                    placeholder="Enter code"
                    className="h-11 min-w-0 flex-1 border border-outline-variant bg-background px-4 text-body-md uppercase transition-colors placeholder:normal-case placeholder:text-tertiary focus:border-navy focus:outline-none"
                  />
                  <Button type="button" variant="secondary" onClick={applyPromo}>
                    Apply
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

              {/* free shipping nudge */}
              <div className="mt-6 border border-outline-variant bg-surface-low p-4">
                {remainingForFree > 0 ? (
                  <p className="text-body-sm text-secondary">
                    Spend {formatPrice(remainingForFree, currencySymbol)} more for free shipping.
                  </p>
                ) : (
                  <p className="text-body-sm">
                    Free shipping on orders over{' '}
                    {formatPrice(freeShippingOver, currencySymbol)} — applied.
                  </p>
                )}
                <div className="mt-3 h-px w-full bg-outline-variant">
                  <div
                    className="h-px bg-navy transition-all duration-500 ease-scandi"
                    style={{
                      width: `${Math.min(100, (pricing.subtotal / Math.max(1, freeShippingOver)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-6 w-full"
                disabled={pricing.loading || items.length === 0}
              >
                {pricing.loading ? 'Updating…' : 'Proceed to Checkout'}
              </Button>

              {!form.formState.isValid && form.formState.isSubmitted && (
                <p className="mt-3 text-body-sm text-error">
                  Complete the shipping details above to continue.
                </p>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
