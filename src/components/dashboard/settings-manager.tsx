'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Loader2, ExternalLink, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Checkbox } from '@/components/ui/field';
import { StatusBadge, EmptyState } from '@/components/ui/primitives';
import { TableWrap, Th, Td } from '@/components/dashboard/admin-ui';
import { Modal, ConfirmDialog } from '@/components/dashboard/modal';
import { ImageUploader } from '@/components/dashboard/image-uploader';
import { useToast } from '@/components/ui/toast';
import { settingsSchema, pageSchema, changePasswordSchema } from '@/lib/validations';
import {
  saveSettings,
  savePage,
  deletePage,
  changeDashboardPassword,
} from '@/app/actions/dashboard';
import { cn } from '@/lib/utils';

type SettingsInput = z.infer<typeof settingsSchema>;
type PageInput = z.infer<typeof pageSchema>;
type PasswordInput = z.infer<typeof changePasswordSchema>;

const TABS = ['Store', 'Content Pages', 'Password'] as const;
type Tab = (typeof TABS)[number];

const EMPTY_PAGE: PageInput = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  heroImage: '',
  published: true,
  showInFooter: false,
  position: 0,
};

export function SettingsManager({
  settings,
  pages,
  usingEnvPassword,
}: {
  settings: SettingsInput;
  pages: PageInput[];
  /** True while the password still comes from DASHBOARD_PASSWORD in .env. */
  usingEnvPassword: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>('Store');
  const [pending, setPending] = React.useState(false);

  const settingsForm = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  const pageForm = useForm<PageInput>({
    resolver: zodResolver(pageSchema),
    defaultValues: EMPTY_PAGE,
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
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
      toast(result.error ?? 'Something went wrong.', 'error');
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
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'label-caps relative px-5 py-4 transition-colors',
              tab === t ? 'text-on-surface' : 'text-secondary hover:text-on-surface',
            )}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-navy" />}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ store */}
      {tab === 'Store' && (
        <form
          onSubmit={settingsForm.handleSubmit(async (values) => {
            await run(() => saveSettings(values), 'Settings saved — the storefront is updated.');
          })}
          noValidate
          className="flex flex-col gap-8"
        >
          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">Identity</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Store name"
                required
                hint="Appears as the wordmark in the header and footer."
                error={settingsForm.formState.errors.storeName?.message}
                {...settingsForm.register('storeName')}
              />
              <Input
                label="Tagline"
                error={settingsForm.formState.errors.tagline?.message}
                {...settingsForm.register('tagline')}
              />
              <Input
                label="Support email"
                type="email"
                required
                error={settingsForm.formState.errors.supportEmail?.message}
                {...settingsForm.register('supportEmail')}
              />
              <Input
                label="Support phone"
                error={settingsForm.formState.errors.supportPhone?.message}
                {...settingsForm.register('supportPhone')}
              />
              <div className="md:col-span-2">
                <Controller
                  control={settingsForm.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <ImageUploader
                      label="Logo (optional)"
                      value={logoUrl ? [{ url: logoUrl, alt: '' }] : []}
                      onChange={(images) => field.onChange(images[images.length - 1]?.url ?? '')}
                    />
                  )}
                />
              </div>
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">Commerce defaults</h2>
            <p className="mt-2 text-body-sm text-secondary">
              Zones in{' '}
              <Link href="/dashboard/shipping" className="underline underline-offset-4">
                Shipping
              </Link>{' '}
              override these per destination.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
              <Input
                label="Currency symbol"
                required
                error={settingsForm.formState.errors.currencySymbol?.message}
                {...settingsForm.register('currencySymbol')}
              />
              <Input
                label="Free shipping over"
                type="number"
                step="0.01"
                min="0"
                required
                hint="Shown in the cart."
                error={settingsForm.formState.errors.freeShippingOver?.message}
                {...settingsForm.register('freeShippingOver')}
              />
              <Input
                label="Default shipping rate"
                type="number"
                step="0.01"
                min="0"
                required
                error={settingsForm.formState.errors.defaultShippingRate?.message}
                {...settingsForm.register('defaultShippingRate')}
              />
              <Input
                label="Default low-stock mark"
                type="number"
                min="0"
                required
                hint="Applied to new SKUs."
                error={settingsForm.formState.errors.lowStockThreshold?.message}
                {...settingsForm.register('lowStockThreshold')}
              />
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">Social links</h2>
            <p className="mt-2 text-body-sm text-secondary">
              Blank fields are hidden from the footer.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input label="Instagram" placeholder="https://instagram.com/luwjje" {...settingsForm.register('instagramUrl')} />
              <Input label="Pinterest" placeholder="https://pinterest.com/luwjje" {...settingsForm.register('pinterestUrl')} />
              <Input label="TikTok" placeholder="https://tiktok.com/@luwjje" {...settingsForm.register('tiktokUrl')} />
              <Input label="Facebook" placeholder="https://facebook.com/luwjje" {...settingsForm.register('facebookUrl')} />
            </div>
          </section>

          <section className="border border-outline-variant bg-surface-lowest p-6">
            <h2 className="font-display text-headline-sm">Newsletter &amp; SEO</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input label="Newsletter heading" {...settingsForm.register('newsletterHeading')} />
              <Input label="Newsletter body" {...settingsForm.register('newsletterBody')} />
              <Input
                label="Meta title"
                hint="Used as the browser tab title and in search results."
                {...settingsForm.register('metaTitle')}
              />
              <Input
                label="Open Graph image URL"
                hint="Shown when a link is shared."
                {...settingsForm.register('ogImageUrl')}
              />
              <Textarea
                label="Meta description"
                rows={3}
                containerClassName="md:col-span-2"
                {...settingsForm.register('metaDescription')}
              />
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={settingsForm.formState.isSubmitting}>
              {settingsForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save settings'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------ pages */}
      {tab === 'Content Pages' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[70ch] text-body-md text-secondary">
              About and Journal are reachable at <code>/about</code> and <code>/journal</code>;
              everything else lives at <code>/pages/&lt;slug&gt;</code>. Tick &ldquo;show in
              footer&rdquo; to list a page under Customer Care.
            </p>
            <Button
              onClick={() => {
                pageForm.reset(EMPTY_PAGE);
                setPageModal({ open: true, data: null });
              }}
            >
              <Plus className="h-4 w-4" />
              New page
            </Button>
          </div>

          <section className="border border-outline-variant bg-surface-lowest">
            {pages.length === 0 ? (
              <EmptyState title="No pages yet." body="Create About and Journal to start." className="border-0" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>URL</Th>
                    <Th>In footer</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
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
                          <div className="flex justify-end gap-2">
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

      {/* ---------------------------------------------------------- password */}
      {tab === 'Password' && (
        <div className="max-w-[560px]">
          {usingEnvPassword && (
            <div className="mb-6 border border-outline-variant bg-surface-low p-5">
              <p className="label-caps mb-2 text-secondary">Heads up</p>
              <p className="text-body-md text-secondary">
                The dashboard is still using <code>DASHBOARD_PASSWORD</code> from your{' '}
                <code>.env</code> file. Set a password here and it is stored hashed in the
                database instead — the env value then becomes irrelevant.
              </p>
            </div>
          )}

          <form
            onSubmit={passwordForm.handleSubmit(async (values) => {
              const ok = await run(
                () => changeDashboardPassword(values),
                'Password changed. Use the new one next time you sign in.',
              );
              if (ok) passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
            })}
            noValidate
            className="border border-outline-variant bg-surface-lowest p-6"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-secondary" />
              <h2 className="font-display text-headline-sm">Dashboard password</h2>
            </div>
            <p className="mt-2 text-body-sm text-secondary">
              One password protects <code>/dashboard</code>. There are no customer accounts, so
              this is the only login in the store.
            </p>

            <div className="mt-8 flex flex-col gap-6">
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                required
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register('currentPassword')}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 8 characters."
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register('newPassword')}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register('confirmPassword')}
              />
            </div>

            <Button type="submit" size="lg" className="mt-8" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Change password'
              )}
            </Button>
          </form>

          <p className="mt-6 text-body-sm text-tertiary">
            Sessions last 12 hours. Signing out from the sidebar ends the current one; changing
            the password does not close sessions already open elsewhere.
          </p>
        </div>
      )}

      {/* -------------------------------------------------------- page modal */}
      <Modal
        open={pageModal.open}
        onClose={() => setPageModal({ open: false, data: null })}
        size="lg"
        title={pageModal.data ? `Edit — ${pageModal.data.title}` : 'New page'}
        description="Use “## ” at the start of a line for a subheading, and a blank line between paragraphs."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPageModal({ open: false, data: null })}>
              Cancel
            </Button>
            <Button
              disabled={pageForm.formState.isSubmitting}
              onClick={pageForm.handleSubmit(async (values) => {
                const ok = await run(() => savePage(values), 'Page saved.');
                if (ok) setPageModal({ open: false, data: null });
              })}
            >
              {pageForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save page'
              )}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-6" noValidate>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Title"
              required
              error={pageForm.formState.errors.title?.message}
              {...pageForm.register('title')}
            />
            <Input
              label="Slug"
              required
              placeholder="about"
              hint="Lowercase letters, numbers and hyphens."
              error={pageForm.formState.errors.slug?.message}
              {...pageForm.register('slug')}
            />
            <Input
              label="Excerpt"
              containerClassName="md:col-span-2"
              error={pageForm.formState.errors.excerpt?.message}
              {...pageForm.register('excerpt')}
            />
          </div>

          <Textarea
            label="Body"
            rows={16}
            className="font-mono text-body-sm"
            error={pageForm.formState.errors.body?.message}
            {...pageForm.register('body')}
          />

          <Controller
            control={pageForm.control}
            name="heroImage"
            render={({ field }) => (
              <ImageUploader
                label="Hero image (optional)"
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
                  label="Published"
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
                  label="Show in the footer under Customer Care"
                />
              )}
            />
            <Input
              label="Footer order"
              type="number"
              min="0"
              containerClassName="w-32"
              {...pageForm.register('position')}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmPage)}
        onClose={() => setConfirmPage(null)}
        pending={pending}
        title="Delete this page?"
        body="Any link to it will 404. This cannot be undone."
        onConfirm={async () => {
          if (!confirmPage) return;
          const ok = await run(() => deletePage(confirmPage), 'Page deleted.');
          if (ok) setConfirmPage(null);
        }}
      />

    </>
  );
}
