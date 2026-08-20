'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { BilingualField } from '@/components/dashboard/bilingual-field';
import { useToast } from '@/components/ui/toast';
import { useDash } from './dashboard-i18n';
import { fmt } from '@/i18n/dictionaries';
import { settingsSchema, pageSchema } from '@/lib/validations';
import { saveSettings, savePage, deletePage } from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type SettingsInput = z.infer<typeof settingsSchema>;
type PageInput = z.infer<typeof pageSchema>;

const TAB_KEYS = ['store', 'pages'] as const;
type Tab = (typeof TAB_KEYS)[number];

const EMPTY_PAGE: PageInput = {
  slug: '',
  title: '',
  titleAr: '',
  excerpt: '',
  excerptAr: '',
  body: '',
  bodyAr: '',
  heroImage: '',
  published: true,
  showInFooter: false,
  position: 0,
};

export function SettingsManager({ settings, pages }: { settings: SettingsInput; pages: PageInput[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { d } = useDash();
  const [tab, setTab] = React.useState<Tab>('store');
  const TAB_LABELS: Record<Tab, string> = {
    store: d.settings.tabStore,
    pages: d.settings.tabPages,
  };
  const [pending, setPending] = React.useState(false);

  const settingsForm = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const pageForm = useForm<PageInput>({
    resolver: zodResolver(pageSchema),
    defaultValues: EMPTY_PAGE,
  });

  const [pageModal, setPageModal] = React.useState<{ open: boolean; data: PageInput | null }>({
    open: false,
    data: null,
  });
  const [confirmPage, setConfirmPage] = React.useState<string | null>(null);

  const heroImage = pageForm.watch('heroImage');
  const logoUrl = settingsForm.watch('logoUrl');

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

  return (
    <>
      {/* tabs */}
      <div className="flex flex-wrap border-b border-outline-variant">
        {TAB_KEYS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'label-caps relative px-5 py-4 transition-colors',
              tab === t ? 'text-on-surface' : 'text-secondary hover:text-on-surface',
            )}
          >
            {TAB_LABELS[t]}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-navy" />}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ store */}
      {tab === 'store' && (
        <form
          onSubmit={settingsForm.handleSubmit(async (values) => {
            await run(() => saveSettings(values), d.settings.saved);
          })}
          noValidate
          className="flex flex-col gap-8"
        >
          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">{d.settings.identity}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label={d.settings.storeName}
                required
                hint={d.settings.storeName}
                error={settingsForm.formState.errors.storeName?.message}
                {...settingsForm.register('storeName')}
              />
              <Input
                label={d.settings.tagline}
                error={settingsForm.formState.errors.tagline?.message}
                {...settingsForm.register('tagline')}
              />
              <Input
                label={`${d.settings.tagline} (${d.common.arabic})`}
                dir="rtl"
                containerClassName="md:col-span-2"
                hint={d.common.blankFallsBack}
                error={settingsForm.formState.errors.taglineAr?.message}
                {...settingsForm.register('taglineAr')}
              />
              <Input
                label={d.settings.supportEmail}
                type="email"
                required
                error={settingsForm.formState.errors.supportEmail?.message}
                {...settingsForm.register('supportEmail')}
              />
              <Input
                label={d.settings.supportPhone}
                error={settingsForm.formState.errors.supportPhone?.message}
                {...settingsForm.register('supportPhone')}
              />
              <div className="md:col-span-2">
                <Controller
                  control={settingsForm.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <ImageUploader
                      label={d.settings.logo}
                      value={logoUrl ? [{ url: logoUrl, alt: '' }] : []}
                      onChange={(images) => field.onChange(images[images.length - 1]?.url ?? '')}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">{d.settings.language}</h2>
            <p className="mt-2 text-body-sm text-secondary">
              Every product, category and page has an Arabic twin. Where one is left blank the
              English text is shown instead, so a half-translated catalogue still reads.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Select
                label={d.settings.defaultLanguage}
                hint={d.settings.defaultLanguage}
                error={settingsForm.formState.errors.defaultLocale?.message}
                {...settingsForm.register('defaultLocale')}
              >
                <option value="en">{d.common.english}</option>
                <option value="ar">العربية</option>
              </Select>
              <div className="flex items-end pb-3">
                <Controller
                  control={settingsForm.control}
                  name="enableArabic"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      label={d.settings.offerArabic}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">{d.settings.commerce}</h2>
            <p className="mt-2 text-body-sm text-secondary">
              Per-governorate prices in{' '}
              <Link href="/dashboard/shipping" className="underline underline-offset-4">
                Shipping
              </Link>{' '}
              override the default rate below.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
              <Input
                label={d.settings.currencySymbol}
                required
                hint={d.common.english}
                error={settingsForm.formState.errors.currencySymbol?.message}
                {...settingsForm.register('currencySymbol')}
              />
              <Input
                label={`${d.settings.currencySymbol} (${d.common.arabic})`}
                required
                dir="rtl"
                hint={d.common.arabic}
                error={settingsForm.formState.errors.currencySymbolAr?.message}
                {...settingsForm.register('currencySymbolAr')}
              />
              <Input
                label={d.settings.currencyCode}
                required
                hint={d.settings.currencyCode}
                error={settingsForm.formState.errors.currencyCode?.message}
                {...settingsForm.register('currencyCode')}
              />
              <Input
                label={d.settings.defaultRate}
                type="number"
                step="0.01"
                min="0"
                required
                error={settingsForm.formState.errors.defaultShippingRate?.message}
                {...settingsForm.register('defaultShippingRate')}
              />
              <Input
                label={d.settings.lowStockMark}
                type="number"
                min="0"
                required
                hint={d.settings.lowStockMark}
                error={settingsForm.formState.errors.lowStockThreshold?.message}
                {...settingsForm.register('lowStockThreshold')}
              />
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-title-md md:text-headline-sm">{d.settings.social}</h2>
            <p className="mt-2 text-body-sm text-secondary">{d.settings.socialHint}</p>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
              <Input
                label={d.settings.instagram}
                placeholder="https://www.instagram.com/luwjje"
                dir="ltr"
                error={settingsForm.formState.errors.instagramUrl?.message}
                {...settingsForm.register('instagramUrl')}
              />
              <Input
                label={d.settings.facebook}
                placeholder="https://www.facebook.com/luwjje"
                dir="ltr"
                error={settingsForm.formState.errors.facebookUrl?.message}
                {...settingsForm.register('facebookUrl')}
              />
            </div>
          </section>

          <div className="flex justify-start">
            <Button type="submit" size="lg" disabled={settingsForm.formState.isSubmitting}>
              {settingsForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.common.save
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------ pages */}
      {tab === 'pages' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[70ch] text-body-md text-secondary">
              About and Journal are reachable at <code>/about</code> and <code>/journal</code>;
              everything else lives at <code>/pages/&lt;slug&gt;</code>. Tick &ldquo;show in
              footer&rdquo; to list a page under Customer Care.
            </p>
          </div>

          <section className="border border-outline-variant bg-surface-lowest">
            {pages.length === 0 ? (
              <EmptyState title={d.settings.noPages} body={d.settings.noPagesBody} className="border-0" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>{d.settings.pageTitle}</Th>
                    <Th>{d.settings.url}</Th>
                    <Th>{d.settings.inFooter}</Th>
                    <Th>{d.common.status}</Th>
                    <Th>{d.common.actions}</Th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => {
                    const href =
                      p.slug === 'about' || p.slug === 'journal' ? `/${p.slug}` : `/pages/${p.slug}`;
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-surface-low">
                        <Td>
                          <p className="text-label-md">{p.title}</p>
                          {p.excerpt && (
                            <p className="mt-0.5 line-clamp-1 text-body-sm text-tertiary">
                              {p.excerpt}
                            </p>
                          )}
                        </Td>
                        <Td>
                          <code className="text-body-sm text-secondary">{href}</code>
                        </Td>
                        <Td className="text-secondary">{p.showInFooter ? 'Yes' : '—'}</Td>
                        <Td>
                          <StatusBadge status={p.published ? 'PUBLISHED' : 'DRAFT'} />
                        </Td>
                        <Td>
                          <div className="flex justify-start gap-2">
                            <Link
                              href={href}
                              target="_blank"
                              aria-label={`View ${p.title}`}
                              className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => {
                                pageForm.reset(p);
                                setPageModal({ open: true, data: p });
                              }}
                              aria-label={`Edit ${p.title}`}
                              className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-navy"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmPage(p.id!)}
                              aria-label={`Delete ${p.title}`}
                              className="flex h-9 w-9 items-center justify-center border border-outline-variant transition-colors hover:border-error hover:text-error"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </section>
        </>
      )}

      {/* -------------------------------------------------------- page modal */}
      <Modal
        open={pageModal.open}
        onClose={() => setPageModal({ open: false, data: null })}
        size="lg"
        title={pageModal.data ? `${d.common.edit} — ${pageModal.data.title}` : d.settings.newPageTitle}
        description={d.settings.bodyHint}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPageModal({ open: false, data: null })}>{d.common.cancel}</Button>
            <Button
              disabled={pageForm.formState.isSubmitting}
              onClick={pageForm.handleSubmit(async (values) => {
                const ok = await run(() => savePage(values), d.settings.pageSaved);
                if (ok) setPageModal({ open: false, data: null });
              })}
            >
              {pageForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {d.common.saving}
                </>
              ) : (
                d.settings.savePage
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Controller
              control={pageForm.control}
              name="title"
              render={({ field: en }) => (
                <Controller
                  control={pageForm.control}
                  name="titleAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label="Title"
                      required
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                      errorEn={pageForm.formState.errors.title?.message}
                      errorAr={pageForm.formState.errors.titleAr?.message}
                    />
                  )}
                />
              )}
            />
            <Input
              label={d.settings.slug}
              required
              placeholder="about"
              hint={d.settings.slugHint}
              error={pageForm.formState.errors.slug?.message}
              {...pageForm.register('slug')}
            />
            <Controller
              control={pageForm.control}
              name="excerpt"
              render={({ field: en }) => (
                <Controller
                  control={pageForm.control}
                  name="excerptAr"
                  render={({ field: ar }) => (
                    <BilingualField
                      label="Excerpt"
                      className="md:col-span-2"
                      english={{ value: en.value, onChange: en.onChange }}
                      arabic={{ value: ar.value, onChange: ar.onChange }}
                      errorEn={pageForm.formState.errors.excerpt?.message}
                      errorAr={pageForm.formState.errors.excerptAr?.message}
                    />
                  )}
                />
              )}
            />
          </div>

          <Controller
            control={pageForm.control}
            name="body"
            render={({ field: en }) => (
              <Controller
                control={pageForm.control}
                name="bodyAr"
                render={({ field: ar }) => (
                  <BilingualField
                    label="Body"
                    rows={16}
                    hint="Start a line with “## ” for a subheading; leave a blank line between paragraphs."
                    english={{ value: en.value, onChange: en.onChange }}
                    arabic={{ value: ar.value, onChange: ar.onChange }}
                    errorEn={pageForm.formState.errors.body?.message}
                    errorAr={pageForm.formState.errors.bodyAr?.message}
                  />
                )}
              />
            )}
          />

          <Controller
            control={pageForm.control}
            name="heroImage"
            render={({ field }) => (
              <ImageUploader
                label={d.settings.heroImage}
                value={heroImage ? [{ url: heroImage, alt: '' }] : []}
                onChange={(images) => field.onChange(images[images.length - 1]?.url ?? '')}
              />
            )}
          />

          <div className="flex flex-wrap gap-8">
            <Controller
              control={pageForm.control}
              name="published"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  label={d.settings.publishedLabel}
                />
              )}
            />
            <Controller
              control={pageForm.control}
              name="showInFooter"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  label={d.settings.showInFooter}
                />
              )}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmPage)}
        onClose={() => setConfirmPage(null)}
        pending={pending}
        title={d.settings.deletePage}
        body={d.settings.deletePageBody}
        onConfirm={async () => {
          if (!confirmPage) return;
          const ok = await run(() => deletePage(confirmPage), d.settings.pageDeleted);
          if (ok) setConfirmPage(null);
        }}
      />

    </>
  );
}
