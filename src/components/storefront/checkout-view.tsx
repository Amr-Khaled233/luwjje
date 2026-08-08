'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2, CreditCard, Package } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/field';
import { Divider, EmptyState } from '@/components/ui/primitives';
import { useCart } from '@/lib/cart-store';
import { useCartPricing, CHECKOUT_STORAGE_KEY } from '@/lib/use-cart-pricing';
import { shippingSchema, type ShippingInput } from '@/lib/validations';
import { placeOrder } from '@/app/actions/checkout';
import { formatPrice, cn } from '@/lib/utils';

const STEPS = ['Review', 'Shipping', 'Payment'] as const;
type Step = (typeof STEPS)[number];

export function CheckoutView({
  regions,
  currencySymbol,
  stripeEnabled,
}: {
  regions: { zone: string; countries: string[] }[];
  currencySymbol: string;
  stripeEnabled: boolean;
}) {
  const router = useRouter();
  const { items, clear, hydrated } = useCart();
  const [step, setStep] = React.useState<Step>('Review');
  const [promoCode, setPromoCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cod'>('card');

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

  // Pick up whatever the cart page collected.
  React.useEffect(() => {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      if (saved.shipping) form.reset(saved.shipping);
      if (saved.promoCode) setPromoCode(saved.promoCode);
    } catch {
      /* corrupt payload — fall back to an empty form */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const region = form.watch('region');
  const pricing = useCartPricing({ items, region, promoCode });

  async function submit() {
    const valid = await form.trigger();
    if (!valid) {
      setStep('Shipping');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    const result = await placeOrder({
      shipping: form.getValues(),
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      promoCode,
      paymentMethod,
    });

    if (!result.ok) {
      setServerError(result.error ?? 'Something went wrong.');
      setSubmitting(false);
      return;
    }

    clear();
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
    router.push(`/order/${result.orderNumber}?new=1`);
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
        <h1 className="mb-stack-md font-display text-display-sm">Checkout</h1>
        <EmptyState
          title="There is nothing to check out."
          body="Your bag is empty."
          action={<ButtonLink href="/shop">Browse the collection</ButtonLink>}
        />
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <h1 className="font-display text-display-sm">Checkout</h1>

      {/* steps */}
      <ol className="mt-8 flex items-center gap-0 border-y border-outline-variant">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center">
            <button
              onClick={() => i <= stepIndex && setStep(s)}
              disabled={i > stepIndex}
              className={cn(
                'flex w-full items-center gap-3 py-5 text-left transition-colors',
                i <= stepIndex ? 'text-on-surface' : 'text-tertiary',
                i > stepIndex && 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center border text-label-sm',
                  i < stepIndex
                    ? 'border-navy bg-navy text-background'
                    : i === stepIndex
                      ? 'border-navy text-navy'
                      : 'border-outline-variant',
                )}
              >
                {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="label-caps">{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 shrink-0 bg-outline-variant" />}
          </li>
        ))}
      </ol>

      <div className="mt-stack-md grid grid-cols-1 gap-stack-md lg:grid-cols-12 lg:gap-gutter">
        <div className="lg:col-span-8">
          {/* ---------------------------------------------------- review */}
          {step === 'Review' && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">Review your order</h2>
              <div className="mt-6 border-t border-outline-variant">
                {pricing.lines.map((line) => (
                  <div key={line.variantId} className="flex gap-4 border-b border-outline-variant py-5">
                    <div className="relative h-24 w-[72px] shrink-0 overflow-hidden bg-surface-low">
                      <Image src={line.imageUrl} alt={line.name} fill sizes="72px" className="object-cover" />
                    </div>
                    <div className="flex flex-1 flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-body-lg">{line.name}</p>
                        <p className="mt-1 text-body-sm text-secondary">
                          {line.colorName}
                          {line.size && ` · Size ${line.size}`} · Qty {line.quantity}
                        </p>
                      </div>
                      <span className="text-body-md">
                        {formatPrice(line.unitPrice * line.quantity, currencySymbol)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex gap-3">
                <Button size="lg" onClick={() => setStep('Shipping')}>
                  Continue to shipping
                </Button>
                <ButtonLink href="/cart" variant="secondary" size="lg">
                  Edit bag
                </ButtonLink>
              </div>
            </section>
          )}

          {/* -------------------------------------------------- shipping */}
          {step === 'Shipping' && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">Shipping details</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <Textarea
                  label="Delivery notes"
                  containerClassName="md:col-span-2"
                  placeholder="Buzzer code, preferred time, anything useful."
                  error={form.formState.errors.notes?.message}
                  {...form.register('notes')}
                />
              </div>

              {pricing.shipping && region && (
                <p className="mt-6 text-body-sm text-secondary">
                  {pricing.shipping.zoneName} · {pricing.shipping.estimatedDays} ·{' '}
                  {pricing.shipping.free
                    ? 'Free shipping applied'
                    : formatPrice(pricing.shipping.cost, currencySymbol)}
                </p>
              )}

              <div className="mt-8 flex gap-3">
                <Button
                  size="lg"
                  onClick={async () => {
                    if (await form.trigger()) setStep('Payment');
                  }}
                >
                  Continue to payment
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setStep('Review')}>
                  Back
                </Button>
              </div>
            </section>
          )}

          {/* --------------------------------------------------- payment */}
          {step === 'Payment' && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">Payment</h2>

              {!stripeEnabled && (
                <div className="mt-6 border border-outline-variant bg-surface-low p-4">
                  <p className="text-body-sm text-secondary">
                    Running in test mode — no card is charged and no card details are collected.
                    Add <code className="text-on-surface">STRIPE_SECRET_KEY</code> and{' '}
                    <code className="text-on-surface">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to
                    switch on live payments.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {(
                  [
                    { id: 'card', label: 'Card', hint: 'Visa, Mastercard, Amex', icon: CreditCard },
                    { id: 'cod', label: 'Cash on delivery', hint: 'Pay the courier', icon: Package },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id)}
                    className={cn(
                      'flex items-center gap-4 border p-5 text-left transition-colors',
                      paymentMethod === option.id
                        ? 'border-navy bg-surface-lowest'
                        : 'border-outline-variant hover:border-outline',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        paymentMethod === option.id ? 'border-navy' : 'border-outline-variant',
                      )}
                    >
                      {paymentMethod === option.id && (
                        <span className="h-2 w-2 rounded-full bg-navy" />
                      )}
                    </span>
                    <option.icon className="h-5 w-5 text-secondary" />
                    <span className="flex-1">
                      <span className="block text-label-md">{option.label}</span>
                      <span className="block text-body-sm text-secondary">{option.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'card' && (
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label="Card Number"
                    placeholder="4242 4242 4242 4242"
                    containerClassName="md:col-span-2"
                    disabled={!stripeEnabled}
                    hint={stripeEnabled ? undefined : 'Disabled in test mode.'}
                  />
                  <Input label="Expiry" placeholder="12 / 29" disabled={!stripeEnabled} />
                  <Input label="CVC" placeholder="123" disabled={!stripeEnabled} />
                </div>
              )}

              {serverError && (
                <div className="mt-6 border border-error p-4 text-body-sm text-error">
                  {serverError}
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <Button size="lg" onClick={submit} disabled={submitting || pricing.loading}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                    </>
                  ) : (
                    `Pay ${formatPrice(pricing.total, currencySymbol)}`
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setStep('Shipping')}
                  disabled={submitting}
                >
                  Back
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------- summary */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 border border-outline-variant bg-surface-lowest p-6 md:p-8">
            <h2 className="font-display text-headline-sm">Summary</h2>
            <dl className="mt-6 flex flex-col gap-3 text-body-md">
              <div className="flex justify-between">
                <dt className="text-secondary">Subtotal</dt>
                <dd>{formatPrice(pricing.subtotal, currencySymbol)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">Shipping</dt>
                <dd>
                  {!region ? (
                    <span className="text-secondary">—</span>
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
            <p className="mt-6 text-body-sm text-tertiary">
              By placing this order you agree to our{' '}
              <Link href="/pages/terms" className="underline underline-offset-4">
                terms
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
