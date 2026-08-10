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
import { fmt } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import type { GovernorateOption } from './cart-view';

export function CheckoutView({
  governorates,
  currencySymbol,
  locale,
  t,
  stripeEnabled,
}: {
  governorates: GovernorateOption[];
  currencySymbol: string;
  locale: Locale;
  t: Dictionary;
  stripeEnabled: boolean;
}) {
  const router = useRouter();
  const { items, clear, hydrated } = useCart();

  const STEPS = [t.checkout.steps.review, t.checkout.steps.shipping, t.checkout.steps.payment];
  const [stepIndex, setStepIndex] = React.useState(0);

  const [promoCode, setPromoCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'card' | 'cod'>('cod');

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

  const governorate = form.watch('governorate');
  const pricing = useCartPricing({ items, governorate, promoCode });

  async function submit() {
    const valid = await form.trigger();
    if (!valid) {
      setStepIndex(1);
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
        <h1 className="mb-stack-md font-display text-display-sm">{t.checkout.title}</h1>
        <EmptyState
          title={t.checkout.nothingToCheckout}
          body={t.checkout.bagEmpty}
          action={<ButtonLink href="/shop">{t.cart.browse}</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="container-luwjje py-stack-md md:py-stack-lg">
      <h1 className="font-display text-display-sm">{t.checkout.title}</h1>

      {/* steps */}
      <ol className="mt-8 flex items-center gap-0 border-y border-outline-variant">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center">
            <button
              onClick={() => i <= stepIndex && setStepIndex(i)}
              disabled={i > stepIndex}
              className={cn(
                'flex w-full items-center gap-3 py-5 text-start transition-colors',
                i <= stepIndex ? 'text-on-surface' : 'cursor-not-allowed text-tertiary',
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
              <span className="label-caps">{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 shrink-0 bg-outline-variant" />}
          </li>
        ))}
      </ol>

      <div className="mt-stack-md grid grid-cols-1 gap-stack-md lg:grid-cols-12 lg:gap-gutter">
        <div className="lg:col-span-8">
          {/* ---------------------------------------------------- review */}
          {stepIndex === 0 && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">{t.checkout.reviewTitle}</h2>
              <div className="mt-6 border-t border-outline-variant">
                {pricing.lines.map((line) => (
                  <div
                    key={line.variantId}
                    className="flex gap-4 border-b border-outline-variant py-5"
                  >
                    <div className="relative h-24 w-[72px] shrink-0 overflow-hidden bg-surface-low">
                      {line.imageUrl && (
                        <Image
                          src={line.imageUrl}
                          alt={line.name}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-body-lg">{line.name}</p>
                        <p className="mt-1 text-body-sm text-secondary">
                          {line.colorName}
                          {line.size && ` · ${t.product.size} ${line.size}`} · ×{line.quantity}
                        </p>
                      </div>
                      <span className="text-body-md">
                        {formatPrice(line.unitPrice * line.quantity, currencySymbol, locale)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => setStepIndex(1)}>
                  {t.checkout.continueToShipping}
                </Button>
                <ButtonLink href="/cart" variant="secondary" size="lg">
                  {t.checkout.editBag}
                </ButtonLink>
              </div>
            </section>
          )}

          {/* -------------------------------------------------- shipping */}
          {stepIndex === 1 && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">{t.checkout.shippingTitle}</h2>
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <Textarea
                  label={t.fields.notes}
                  containerClassName="md:col-span-2"
                  placeholder={t.fields.notesPlaceholder}
                  error={form.formState.errors.notes?.message}
                  {...form.register('notes')}
                />
              </div>

              {pricing.shipping && governorate && (
                <p className="mt-6 text-body-sm text-secondary">
                  {governorates.find((g) => g.value === governorate)?.label} ·{' '}
                  {pricing.shipping.estimatedDays} ·{' '}
                  {pricing.shipping.free
                    ? t.cart.free
                    : formatPrice(pricing.shipping.cost, currencySymbol, locale)}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={async () => {
                    if (await form.trigger()) setStepIndex(2);
                  }}
                >
                  {t.checkout.continueToPayment}
                </Button>
                <Button size="lg" variant="secondary" onClick={() => setStepIndex(0)}>
                  {t.checkout.back}
                </Button>
              </div>
            </section>
          )}

          {/* --------------------------------------------------- payment */}
          {stepIndex === 2 && (
            <section className="animate-fade-in">
              <h2 className="font-display text-headline-sm">{t.checkout.paymentTitle}</h2>

              {!stripeEnabled && (
                <div className="mt-6 border border-outline-variant bg-surface-low p-4">
                  <p className="text-body-sm text-secondary">{t.checkout.testMode}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {(
                  [
                    { id: 'cod', label: t.checkout.cod, hint: t.checkout.codHint, icon: Package },
                    { id: 'card', label: t.checkout.card, hint: t.checkout.cardHint, icon: CreditCard },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setPaymentMethod(option.id)}
                    className={cn(
                      'flex items-center gap-4 border p-5 text-start transition-colors',
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
                    label={t.checkout.cardNumber}
                    placeholder="4242 4242 4242 4242"
                    containerClassName="md:col-span-2"
                    dir="ltr"
                    disabled={!stripeEnabled}
                    hint={stripeEnabled ? undefined : t.checkout.disabledInTest}
                  />
                  <Input label={t.checkout.expiry} placeholder="12 / 29" dir="ltr" disabled={!stripeEnabled} />
                  <Input label={t.checkout.cvc} placeholder="123" dir="ltr" disabled={!stripeEnabled} />
                </div>
              )}

              {serverError && (
                <div className="mt-6 border border-error p-4 text-body-sm text-error">
                  {serverError}
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={submit} disabled={submitting || pricing.loading}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {t.checkout.placing}
                    </>
                  ) : (
                    fmt(t.checkout.pay, {
                      amount: formatPrice(pricing.total, currencySymbol, locale),
                    })
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => setStepIndex(1)}
                  disabled={submitting}
                >
                  {t.checkout.back}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* ---------------------------------------------------- summary */}
        <aside className="lg:col-span-4">
          <div className="sticky top-6 border border-outline-variant bg-surface-lowest p-6 md:p-8">
            <h2 className="font-display text-headline-sm">{t.checkout.summary}</h2>
            <dl className="mt-6 flex flex-col gap-3 text-body-md">
              <div className="flex justify-between">
                <dt className="text-secondary">{t.cart.subtotal}</dt>
                <dd>{formatPrice(pricing.subtotal, currencySymbol, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-secondary">{t.cart.shipping}</dt>
                <dd>
                  {!governorate ? (
                    <span className="text-secondary">—</span>
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
              <span className="font-display text-headline-md">
                {formatPrice(pricing.total, currencySymbol, locale)}
              </span>
            </div>
            <p className="mt-6 text-body-sm text-tertiary">
              {t.checkout.agree}{' '}
              <Link href="/pages/terms" className="underline underline-offset-4">
                {t.checkout.terms}
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
