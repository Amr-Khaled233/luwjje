import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/primitives';
import { ProductGrid } from '@/components/storefront/product-card';
import { getBestSellers } from '@/lib/queries';
import { getActiveBanners, getPaletteSwatches, getSettings, getCurrencySymbol } from '@/lib/settings';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { locale, t } = await getI18n();

  const [heroes, offers, bestSellers, swatches, settings, symbol] = await Promise.all([
    getActiveBanners('HERO', locale),
    getActiveBanners('OFFER', locale),
    getBestSellers(locale, 4),
    getPaletteSwatches(),
    getSettings(),
    getCurrencySymbol(locale),
  ]);

  const hero = heroes[0];
  const offer = offers[0];

  return (
    <>
      {/* ------------------------------------------------------------- hero */}
      {hero && (
        <section className="relative h-[80vh] min-h-[540px] w-full">
          {hero.imageUrl && (
            <Image
              src={hero.imageUrl}
              alt={hero.heading || settings.storeName}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-navy/15" />

          <div className="container-luwjje relative flex h-full items-center">
            <div className="w-full max-w-[560px] border border-background/30 bg-background/80 p-8 backdrop-blur-[20px] md:p-12">
              {hero.eyebrow && <p className="label-caps mb-5 text-secondary">{hero.eyebrow}</p>}
              <h1 className="font-display text-display-sm leading-[1.1] md:text-display-lg">
                {hero.heading}
              </h1>
              {hero.body && (
                <p className="mt-6 max-w-[46ch] text-body-lg text-secondary">{hero.body}</p>
              )}
              <ButtonLink href={hero.ctaHref || '/shop'} size="lg" className="mt-8">
                {hero.ctaLabel}
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ best sellers */}
      <section className="container-luwjje pt-stack-lg">
        <SectionHeading
          eyebrow={t.home.bestSellersEyebrow}
          title={t.home.bestSellers}
          action={
            bestSellers.length > 0 ? (
              <Link
                href="/shop?sort=best"
                className="label-caps group flex items-center gap-2 text-secondary transition-colors hover:text-on-surface"
              >
                {t.home.viewAll}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-scandi group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            ) : null
          }
        />
        <div className="mt-stack-md">
          {bestSellers.length ? (
            <ProductGrid products={bestSellers} currencySymbol={symbol} locale={locale} t={t} />
          ) : (
            <div className="border border-dashed border-outline-variant px-6 py-16 text-center">
              <p className="font-display text-headline-sm">{t.home.emptyCatalogue}</p>
              <p className="mt-2 text-body-md text-secondary">{t.home.emptyCatalogueHint}</p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ offer */}
      {offer && (
        <section className="container-luwjje pt-stack-lg">
          <div className="grid grid-cols-1 border border-outline-variant bg-surface-container md:grid-cols-2">
            <div className="relative order-2 min-h-[300px] md:order-1 md:min-h-[420px]">
              {offer.imageUrl && (
                <Image
                  src={offer.imageUrl}
                  alt={offer.heading}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              )}
            </div>

            <div className="order-1 flex flex-col justify-center p-8 md:order-2 md:p-14">
              {offer.badge && (
                <span className="label-caps mb-6 w-fit border border-navy px-3 py-1.5">
                  {offer.badge}
                </span>
              )}
              <h2 className="font-display text-headline-md md:text-headline-lg">{offer.heading}</h2>
              {offer.body && (
                <p className="mt-4 max-w-[46ch] text-body-lg text-secondary">{offer.body}</p>
              )}
              {offer.endsAt && (
                <p className="mt-4 text-body-sm text-tertiary">
                  {t.home.endsOn}{' '}
                  {offer.endsAt.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              <ButtonLink href={offer.ctaHref || '/shop'} size="lg" className="mt-8 w-fit">
                {offer.ctaLabel}
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- palette */}
      {swatches.length > 0 && (
        <section className="container-luwjje pt-stack-lg">
          <SectionHeading eyebrow={t.home.paletteEyebrow} title={t.home.palette} />
          <div className="mt-stack-md grid grid-cols-2 gap-x-gutter gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {swatches.map((s) => (
              <div key={s.id}>
                <div
                  className="aspect-square w-full border border-outline-variant"
                  style={{ backgroundColor: s.hex }}
                />
                <p className="mt-3 text-body-sm">{pick(locale, s.name, s.nameAr)}</p>
                <p className="mt-0.5 text-body-sm uppercase text-tertiary" dir="ltr">
                  {s.hex}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
