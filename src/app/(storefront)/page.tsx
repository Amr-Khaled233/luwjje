import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/primitives';
import { ProductGrid } from '@/components/storefront/product-card';
import { Reveal } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
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
        // The banner is as tall as the image is: it is shown whole, the same
        // as every other photo in the shop. The copy sits over it, which is
        // why the section is a positioning context and the image is in flow.
        <section className="hero relative w-full overflow-hidden bg-surface-low">
          {hero.imageUrl && (
            <Image
              src={hero.imageUrl}
              alt={hero.heading || settings.storeName}
              width={0}
              height={0}
              priority
              sizes="100vw"
              // A slow drift in gives the still image some life. When the card
              // itself is hovered it eases in a little more, so the photograph
              // comes forward as the text card softens — hovering the bare
              // image does nothing.
              className="hero-img block h-auto w-full animate-fade-in transition-transform duration-700 ease-scandi"
            />
          )}
          {/* The dim lifts when the card is hovered, so the image reads clearer. */}
          {hero.imageUrl && (
            <div className="hero-dim absolute inset-0 hidden bg-navy/15 transition-colors duration-500 md:block" />
          )}

          {/*
            On a phone the copy sits under the photo rather than on top of it:
            a card wide enough to be read covers a portrait banner almost
            entirely, and the picture is the reason the banner exists. From
            md up there is room for both, and it goes back over the image.

            With no image at all it is simply in flow — a text-only banner
            positioned over a section with no height would disappear.
          */}
          {hero.showText && (
          <div
            className={cn(
              'container-luwjje flex items-center',
              hero.imageUrl ? 'py-6 md:absolute md:inset-0 md:py-0' : 'py-16 md:py-stack-lg',
            )}
          >
            {/*
              A touch see-through at rest so the photo behind is still felt;
              on hover it softens further and blurs more, letting the image
              take over while the words recede.
            */}
            {/*
              At rest the card is 50% — the photo behind is felt. On hover
              (only where a pointer really hovers, so never a phone or a
              touch tablet, where :hover would stick after a tap) it all but
              disappears — 10%, border and blur fading with it — so the banner
              becomes the image and only a faint trace of the card remains.
            */}
            <div className="hero-card w-full max-w-[560px] animate-fade-up border border-background/30 bg-background/50 p-6 backdrop-blur-[20px] transition-[background-color,backdrop-filter,border-color] duration-500 ease-scandi hoverable:hover:border-background/10 hoverable:hover:bg-background/10 hoverable:hover:backdrop-blur-0 sm:p-8 md:p-12">
              {hero.eyebrow && (
                <p className="label-caps mb-4 text-secondary md:mb-5">{hero.eyebrow}</p>
              )}
              <h1 className="font-display text-headline-md leading-[1.15] xs:text-display-sm md:text-display-lg md:leading-[1.1]">
                {hero.heading}
              </h1>
              {hero.body && (
                <p className="mt-4 max-w-[46ch] text-body-md text-secondary md:mt-6 md:text-body-lg">
                  {hero.body}
                </p>
              )}
              <ButtonLink
                href={hero.ctaHref}
                size="lg"
                className="mt-6 w-full sm:w-auto md:mt-8"
              >
                {hero.ctaLabel}
              </ButtonLink>
            </div>
          </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------ best sellers */}
      <section className="container-luwjje pt-12 md:pt-stack-lg">
        <SectionHeading
          eyebrow={t.home.bestSellersEyebrow}
          title={t.home.bestSellers}
          action={
            bestSellers.length > 0 ? (
              <Link
                href="/shop"
                className="label-caps group flex items-center gap-2 text-secondary transition-colors hover:text-on-surface"
              >
                {t.home.viewAll}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-scandi group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
              </Link>
            ) : null
          }
        />
        <div className="mt-8 md:mt-stack-md">
          {bestSellers.length ? (
            <ProductGrid products={bestSellers} currencySymbol={symbol} locale={locale} t={t} />
          ) : (
            <div className="border border-dashed border-outline-variant px-5 py-12 text-center sm:px-6 sm:py-16">
              <p className="font-display text-title-md sm:text-headline-sm">
                {t.home.emptyCatalogue}
              </p>
              <p className="mt-2 text-body-sm text-secondary sm:text-body-md">
                {t.home.emptyCatalogueHint}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ offer */}
      {offer && (
        <section className="container-luwjje pt-12 md:pt-stack-lg">
          <Reveal className="grid grid-cols-1 border border-outline-variant bg-surface-container md:grid-cols-2">
            <div className="order-2 bg-surface-low md:order-1">
              {offer.imageUrl && (
                <Image
                  src={offer.imageUrl}
                  alt={offer.heading}
                  width={0}
                  height={0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="block h-auto w-full"
                />
              )}
            </div>

            <div className="order-1 flex flex-col justify-center p-6 sm:p-8 md:order-2 md:p-14">
              {offer.badge && (
                <span className="label-caps mb-4 w-fit border border-navy px-3 py-1.5 md:mb-6">
                  {offer.badge}
                </span>
              )}
              <h2 className="font-display text-headline-sm sm:text-headline-md md:text-headline-lg">
                {offer.heading}
              </h2>
              {offer.body && (
                <p className="mt-3 max-w-[46ch] text-body-md text-secondary md:mt-4 md:text-body-lg">
                  {offer.body}
                </p>
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
              <ButtonLink
                href={offer.ctaHref}
                size="lg"
                className="mt-6 w-full sm:w-fit md:mt-8"
              >
                {offer.ctaLabel}
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      )}

      {/* ---------------------------------------------------------- palette */}
      {swatches.length > 0 && (
        <section className="container-luwjje pt-12 md:pt-stack-lg">
          <SectionHeading eyebrow={t.home.paletteEyebrow} title={t.home.palette} />
          <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-6 md:mt-stack-md md:grid-cols-5 md:gap-x-gutter md:gap-y-8 lg:grid-cols-7">
            {swatches.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i, 6) * 50}>
                <div
                  className="aspect-square w-full border border-outline-variant transition-transform duration-300 ease-scandi hover:scale-[1.03]"
                  style={{ backgroundColor: s.hex }}
                />
                <p className="mt-2.5 truncate text-body-sm md:mt-3">
                  {pick(locale, s.name, s.nameAr)}
                </p>
                <p className="mt-0.5 text-body-sm uppercase text-tertiary" dir="ltr">
                  {s.hex}
                </p>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
