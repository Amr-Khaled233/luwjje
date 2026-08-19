'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Checkbox, FieldLabel } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { BilingualField } from '@/components/dashboard/bilingual-field';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { bannerSchema, discountSchema } from '@/lib/validations';
import {
  saveBanner,
  deleteBanner,
  saveDiscount,
  deleteDiscount,
  savePaletteSwatches,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type BannerInput = z.infer<typeof bannerSchema>;
type DiscountInput = z.infer<typeof discountSchema>;

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

const EMPTY_DISCOUNT: DiscountInput = {
  name: '',
  nameAr: '',
  discountType: 'PERCENT',
  discountValue: 10,
  scope: 'PRODUCTS',
  categoryId: '',
  productIds: [],
  startsAt: '',
  endsAt: '',
  active: true,
};

export function OffersManager({
  banners,
  discounts,
  products,
  categories,
  swatches: initialSwatches,
}: {
  banners: BannerInput[];
  discounts: DiscountInput[];
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  swatches: Swatch[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();

  const [bannerModal, setBannerModal] = React.useState<{ open: boolean; data: BannerInput | null }>({
    open: false,
    data: null,
  });
  const [discountModal, setDiscountModal] = React.useState<{
    open: boolean;
    data: DiscountInput | null;
  }>({ open: false, data: null });
  const [confirm, setConfirm] = React.useState<{ kind: 'banner' | 'discount'; id: string } | null>(
    null,
  );
  const [pending, setPending] = React.useState(false);

  const bannerForm = useForm<BannerInput>({
    resolver: zodResolver(bannerSchema),
    defaultValues: EMPTY_BANNER,
  });
  const discountForm = useForm<DiscountInput>({
    resolver: zodResolver(discountSchema),
    defaultValues: EMPTY_DISCOUNT,
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

  function openDiscount(data: DiscountInput | null) {
    discountForm.reset(data ?? EMPTY_DISCOUNT);
    setDiscountModal({ open: true, data });
  }

  const scope = discountForm.watch('scope');
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
          <Button size="sm" onClick={() => openBanner(null, 'HERO')}>
            <Plus className="h-3.5 w-3.5" />{d.offers.addHero}</Button>
        </header>
        <div className="p-6">
          {heroBanners.length === 0 ? (
            <p className="text-body-sm text-secondary">
              {d.offers.noHero}
            </p>
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
          <Button size="sm" onClick={() => openBanner(null, 'OFFER')}>
            <Plus className="h-3.5 w-3.5" />{d.offers.addBlock}</Button>
        </header>
        <div className="p-6">
          {offerBanners.length === 0 ? (
            <p className="text-body-sm text-secondary">{d.offers.noOffer}</p>
          ) : (
            <ul className="flex flex-col gap-4">{offerBanners.map(bannerCard)}</ul>
          )}
        </div>
      </section>

      {/* -------------------------------------------------- campaigns */}
      <section className="border border-outline-variant bg-surface-lowest">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-5">
          <div>
            <h2 className="font-display text-headline-sm">{d.offers.campaigns}</h2>
            <p className="mt-1.5 text-body-sm text-secondary">
              {d.offers.campaignsHint}
              pick, for the window you set.
            </p>
          </div>
          <Button size="sm" onClick={() => openDiscount(null)}>
            <Plus className="h-3.5 w-3.5" />{d.offers.newCampaign}</Button>
        </header>

        <div className="p-6">
          {discounts.length === 0 ? (
            <EmptyState
              title={d.offers.noCampaigns}
              body={d.offers.noCampaignsBody}
              className="border-0"
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {discounts.map((campaign) => (
                <li
                  key={campaign.id}
                  className="flex flex-wrap items-center gap-4 border border-outline-variant p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-3 text-label-md">
                      {campaign.name}
                      <StatusBadge status={campaign.active ? 'ACTIVE' : 'DISABLED'} />
                    </p>
                    <p className="mt-1 text-body-sm text-secondary">
                      {campaign.discountType === 'PERCENT'
                        ? `${campaign.discountValue}% off`
                        : `$${campaign.discountValue.toFixed(2)} off`}{' '}
                      ·{' '}
                      {campaign.scope === 'ALL'
                        ? 'the whole catalogue'
                        : campaign.scope === 'CATEGORY'
                          ? categories.find((c) => c.id === campaign.categoryId)?.name ?? 'a category'
                          : `${campaign.productIds.length} products`}
                      {(campaign.startsAt || campaign.endsAt) && ` · ${campaign.startsAt || '…'} to ${campaign.endsAt || '…'}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDiscount(campaign)}
                      aria-label={`${d.common.edit} — ${d.offers.campaignName}`}
                      className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirm({ kind: 'discount', id: campaign.id! })}
                      aria-label={`${d.common.delete} — ${d.offers.campaignName}`}
                      className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
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
            <Select label={d.offers.slot} {...bannerForm.register('slot')}>
              <option value="HERO">{d.offers.slotHero}</option>
              <option value="OFFER">{d.offers.slotOffer}</option>
            </Select>
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

      {/* -------------------------------------------------- discount modal */}
      <Modal
        open={discountModal.open}
        onClose={() => setDiscountModal({ open: false, data: null })}
        title={discountModal.data ? `${d.common.edit} — ${d.offers.campaignName}` : d.offers.newCampaign}
        description={d.offers.campaignHint}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDiscountModal({ open: false, data: null })}
            >{d.common.cancel}</Button>
            <Button
              disabled={discountForm.formState.isSubmitting}
              onClick={discountForm.handleSubmit(async (values) => {
                const ok = await run(() => saveDiscount(values), d.offers.campaignSaved);
                if (ok) setDiscountModal({ open: false, data: null });
              })}
            >
              {discountForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.offers.saveCampaign
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Controller
              control={discountForm.control}
              name="name"
              render={({ field: en }) => (
                <Controller
                  control={discountForm.control}
                  name="nameAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label={d.offers.campaignName}
                      required
                      className="md:col-span-2"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                      errorEn={discountForm.formState.errors.name?.message}
                      errorAr={discountForm.formState.errors.nameAr?.message}
                    />
                  )}
                />
              )}
            />
            <Select label={d.common.type} {...discountForm.register('discountType')}>
              <option value="PERCENT">{d.common.percentOff}</option>
              <option value="FIXED">{d.common.fixedOff}</option>
            </Select>
            <Input
              label={d.common.value}
              type="number"
              step="0.01"
              min="0"
              required
              error={discountForm.formState.errors.discountValue?.message}
              {...discountForm.register('discountValue')}
            />
            <Select label={d.offers.appliesTo} {...discountForm.register('scope')}>
              <option value="PRODUCTS">{d.offers.selectedProducts}</option>
              <option value="CATEGORY">{d.offers.wholeCategory}</option>
              <option value="ALL">{d.offers.entireCatalogue}</option>
            </Select>
            {scope === 'CATEGORY' && (
              <Select label={d.products.category} {...discountForm.register('categoryId')}>
                <option value="">{d.offers.chooseCategory}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
            <Input label={d.common.startsOn} type="date" {...discountForm.register('startsAt')} />
            <Input label={d.common.endsOn} type="date" {...discountForm.register('endsAt')} />
          </div>

          {scope === 'PRODUCTS' && (
            <div>
              <FieldLabel>{d.offers.productsLabel}</FieldLabel>
              <Controller
                control={discountForm.control}
                name="productIds"
                render={({ field }) => (
                  <div className="max-h-64 overflow-y-auto border border-outline-variant">
                    {products.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 border-b border-outline-variant px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-low',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={field.value.includes(p.id)}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, p.id]
                                : field.value.filter((id: string) => id !== p.id),
                            )
                          }
                          className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-outline-variant checked:border-navy checked:bg-navy"
                        />
                        <span className="text-body-md">{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

          <Controller
            control={discountForm.control}
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
        title={confirm?.kind === 'banner' ? d.offers.deleteBanner : d.offers.deleteCampaign}
        body={
          confirm?.kind === 'banner'
            ? d.offers.deleteBannerBody
            : d.offers.deleteCampaignBody
        }
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await run(
            () => (confirm.kind === 'banner' ? deleteBanner(confirm.id) : deleteDiscount(confirm.id)),
            d.common.deleted,
          );
          if (ok) setConfirm(null);
        }}
      />
    </>
  );
}
