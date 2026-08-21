'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Checkbox } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { BilingualField } from '@/components/dashboard/bilingual-field';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { bannerSchema } from '@/lib/validations';
import { saveBanner, deleteBanner, savePaletteSwatches } from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type BannerInput = z.infer<typeof bannerSchema>;

interface Swatch {
  name: string;
  hex: string;
}

const EMPTY_BANNER: BannerInput = {
  slot: 'HERO',
  eyebrow: '',
  eyebrowAr: '',
  heading: '',
  headingAr: '',
  subheading: '',
  subheadingAr: '',
  body: '',
  bodyAr: '',
  ctaLabel: 'Shop Now',
  ctaLabelAr: '',
  imageUrl: '',
  badge: '',
  badgeAr: '',
  active: true,
  startsAt: '',
  endsAt: '',
  position: 0,
};


export function OffersManager({
  banners,
  swatches: initialSwatches,
}: {
  banners: BannerInput[];
  swatches: Swatch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [bannerModal, setBannerModal] = React.useState<{ open: boolean; data: BannerInput | null }>({
    open: false,
    data: null,
  });
  const [confirm, setConfirm] = React.useState<{ kind: 'banner'; id: string } | null>(null);
  const [pending, setPending] = React.useState(false);

  const bannerForm = useForm<BannerInput>({
    resolver: zodResolver(bannerSchema),
    defaultValues: EMPTY_BANNER,
  });

  const [swatches, setSwatches] = React.useState<Swatch[]>(initialSwatches);
  const [swatchState, setSwatchState] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (!result.ok) {
      toast(result.error ?? d.common.somethingWrong, 'error');
      return false;
    }
    toast(success);
    router.refresh();
    return true;
  }

  function openBanner(data: BannerInput | null, slot: 'HERO' | 'OFFER' = 'HERO') {
    bannerForm.reset(data ?? { ...EMPTY_BANNER, slot });
    setBannerModal({ open: true, data });
  }

  const bannerSlot = bannerForm.watch('slot');
  const bannerImage = bannerForm.watch('imageUrl');

  const heroBanners = banners.filter((b) => b.slot === 'HERO');
  const offerBanners = banners.filter((b) => b.slot === 'OFFER');

  function bannerCard(b: BannerInput) {
    return (
      <li key={b.id} className="flex flex-col gap-4 border border-outline-variant p-4 sm:flex-row">
        <div className="relative aspect-[16/9] w-full shrink-0 bg-surface-low sm:w-56">
          {b.imageUrl && (
            <Image src={b.imageUrl} alt="" fill sizes="224px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            {b.eyebrow && <span className="label-caps text-secondary">{b.eyebrow}</span>}
            <StatusBadge status={b.active ? 'ACTIVE' : 'DISABLED'} />
          </div>
          <p className="mt-2 font-display text-headline-sm">{b.heading || d.offers.untitled}</p>
          {b.body && <p className="mt-2 line-clamp-2 text-body-sm text-secondary">{b.body}</p>}
          <p className="mt-3 text-body-sm text-tertiary">
            {b.ctaLabel}
            {(b.startsAt || b.endsAt) && ` · ${b.startsAt || '…'} to ${b.endsAt || '…'}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col">
          <button
            onClick={() => openBanner(b)}
            aria-label={`${d.common.edit} — ${d.offers.heroTitle}`}
            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirm({ kind: 'banner', id: b.id! })}
            aria-label={`${d.common.delete} — ${d.offers.heroTitle}`}
            className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      {/* -------------------------------------------------------- hero */}
      <section className="border border-outline-variant bg-surface-lowest">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">{d.offers.heroTitle}</h2>
            <p className="mt-1.5 text-body-sm text-secondary">
              {d.offers.heroHint}
            </p>
          </div>
          {/*
            The home page renders one hero. A second would be written, listed
            here, and never shown — so it is refused rather than accepted and
            silently ignored.
          */}
          <Button
            size="sm"
            onClick={() => openBanner(null, 'HERO')}
            disabled={heroBanners.length > 0}
            title={heroBanners.length > 0 ? d.offers.heroExists : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            {d.offers.addHero}
          </Button>
        </header>
        <div className="p-6">
          {heroBanners.length === 0 ? (
            <p className="text-body-sm text-secondary">{d.offers.noHero}</p>
          ) : (
            <ul className="flex flex-col gap-4">{heroBanners.map(bannerCard)}</ul>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- offer */}
      <section className="border border-outline-variant bg-surface-lowest">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">
              {d.offers.offerTitle}
            </h2>
            <p className="mt-1.5 text-body-sm text-secondary">
              {d.offers.offerHint}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => openBanner(null, 'OFFER')}
            disabled={offerBanners.length > 0}
            title={offerBanners.length > 0 ? d.offers.blockExists : undefined}
          >
            <Plus className="h-3.5 w-3.5" />
            {d.offers.addBlock}
          </Button>
        </header>
        <div className="p-6">
          {offerBanners.length === 0 ? (
            <p className="text-body-sm text-secondary">{d.offers.noOffer}</p>
          ) : (
            <ul className="flex flex-col gap-4">{offerBanners.map(bannerCard)}</ul>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- palette */}
      <section className="border border-outline-variant bg-surface-lowest">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">{d.offers.paletteTitle}</h2>
            <p className="mt-1.5 text-body-sm text-secondary">
              {d.offers.paletteHint}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {swatchState === 'saved' && <Check className="h-4 w-4 text-navy" />}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSwatches([...swatches, { name: 'New tone', hex: '#c4c7c9' }])}
              disabled={swatches.length >= 12}
            >
              <Plus className="h-3.5 w-3.5" />{d.offers.addSwatch}</Button>
            <Button
              size="sm"
              disabled={swatchState === 'saving'}
              onClick={async () => {
                setSwatchState('saving');
                const result = await savePaletteSwatches({ swatches });
                setSwatchState('idle');
                if (!result.ok) {
                  toast(result.error ?? d.offers.couldNotSavePalette, 'error');
                  return;
                }
                setSwatchState('saved');
                toast(d.offers.paletteUpdated);
                router.refresh();
                setTimeout(() => setSwatchState('idle'), 1600);
              }}
            >
              {swatchState === 'saving' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.offers.savePalette
              )}
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-5">
          {swatches.map((s, i) => (
            <div key={i} className="border border-outline-variant">
              <div className="aspect-square w-full" style={{ backgroundColor: s.hex }} />
              <div className="border-t border-outline-variant p-2">
                <input
                  value={s.name}
                  onChange={(e) =>
                    setSwatches(swatches.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  aria-label={d.offers.swatchName}
                  className="w-full bg-transparent text-body-sm outline-none"
                />
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={s.hex}
                    onChange={(e) =>
                      setSwatches(swatches.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                    }
                    aria-label={d.offers.swatchColour}
                    className="h-5 w-5 shrink-0 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    value={s.hex}
                    onChange={(e) =>
                      setSwatches(swatches.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                    }
                    aria-label="Swatch hex"
                    className="w-full min-w-0 bg-transparent text-body-sm uppercase text-tertiary outline-none"
                  />
                  <button
                    onClick={() => setSwatches(swatches.filter((_, j) => j !== i))}
                    aria-label={d.offers.removeSwatch}
                    className="shrink-0 text-tertiary transition-colors hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- banner modal */}
      <Modal
        open={bannerModal.open}
        onClose={() => setBannerModal({ open: false, data: null })}
        title={bannerModal.data ? d.offers.editBanner : d.offers.newBanner}
        description={d.offers.bannerLive}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBannerModal({ open: false, data: null })}>{d.common.cancel}</Button>
            <Button
              disabled={bannerForm.formState.isSubmitting}
              onClick={bannerForm.handleSubmit(async (values) => {
                const ok = await run(() => saveBanner(values), d.offers.bannerSaved);
                if (ok) setBannerModal({ open: false, data: null });
              })}
            >
              {bannerForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.offers.saveBanner
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Controller
              control={bannerForm.control}
              name="eyebrow"
              render={({ field: en }) => (
                <Controller
                  control={bannerForm.control}
                  name="eyebrowAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label={d.offers.eyebrow}
                      placeholder="Autumn / Winter 2026"
                      placeholderAr="خريف / شتاء ٢٠٢٦"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={bannerForm.control}
              name="heading"
              render={({ field: en }) => (
                <Controller
                  control={bannerForm.control}
                  name="headingAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label={d.offers.heading}
                      required
                      className="md:col-span-2"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                      errorEn={bannerForm.formState.errors.heading?.message}
                      errorAr={bannerForm.formState.errors.headingAr?.message}
                    />
                  )}
                />
              )}
            />
            <Controller
              control={bannerForm.control}
              name="body"
              render={({ field: en }) => (
                <Controller
                  control={bannerForm.control}
                  name="bodyAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label={d.settings.body}
                      rows={3}
                      className="md:col-span-2"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                    />
                  )}
                />
              )}
            />
            {bannerSlot === 'OFFER' && (
              <Controller
                control={bannerForm.control}
                name="badge"
                render={({ field: en }) => (
                  <Controller
                    control={bannerForm.control}
                    name="badgeAr"
                    render={({ field: ar }) => (
                      <BilingualField
                        label={d.offers.badge}
                        placeholder="Limited Release"
                        placeholderAr="إصدار محدود"
                        english={{ value: en.value, onChange: en.onChange }}
                        arabic={{ value: ar.value, onChange: ar.onChange }}
                      />
                    )}
                  />
                )}
              />
            )}
            <Controller
              control={bannerForm.control}
              name="ctaLabel"
              render={({ field: en }) => (
                <Controller
                  control={bannerForm.control}
                  name="ctaLabelAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label={d.offers.buttonLabel}
                      placeholder="Shop Now"
                      placeholderAr="تسوّق الآن"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                    />
                  )}
                />
              )}
            />
            <Input
              label={d.common.startsOn}
              type="date"
              hint={d.common.blankNoStart}
              {...bannerForm.register('startsAt')}
            />
            <Input
              label={d.common.endsOn}
              type="date"
              hint={d.common.blankNoEnd}
              {...bannerForm.register('endsAt')}
            />
          </div>

          <Controller
            control={bannerForm.control}
            name="imageUrl"
            render={({ field }) => (
              <ImageUploader
                label={d.offers.bannerImage}
                value={bannerImage ? [{ url: bannerImage, alt: '' }] : []}
                onChange={(images) => field.onChange(images[images.length - 1]?.url ?? '')}
              />
            )}
          />

          <Controller
            control={bannerForm.control}
            name="active"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                label={d.common.active}
              />
            )}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        pending={pending}
        title={d.offers.deleteBanner}
        body={d.offers.deleteBannerBody}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(
            () => deleteBanner(confirm.id),
            d.common.deleted,
          );
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
