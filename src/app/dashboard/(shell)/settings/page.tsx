import { PageHeader } from '@/components/dashboard/admin-ui';
import { SettingsManager } from '@/components/dashboard/settings-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  const [settings, pages] = await Promise.all([
    getSettings(),
    prisma.page.findMany({ orderBy: [{ showInFooter: 'desc' }, { position: 'asc' }] }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Store identity, shipping defaults, social links, content pages and the dashboard password."
      />

      <SettingsManager
        settings={{
          storeName: settings.storeName,
          tagline: settings.tagline,
          logoUrl: settings.logoUrl,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
          currencySymbol: settings.currencySymbol,
          freeShippingOver: settings.freeShippingOver,
          defaultShippingRate: settings.defaultShippingRate,
          lowStockThreshold: settings.lowStockThreshold,
          instagramUrl: settings.instagramUrl,
          pinterestUrl: settings.pinterestUrl,
          tiktokUrl: settings.tiktokUrl,
          facebookUrl: settings.facebookUrl,
          metaTitle: settings.metaTitle,
          metaDescription: settings.metaDescription,
          ogImageUrl: settings.ogImageUrl,
          newsletterHeading: settings.newsletterHeading,
          newsletterBody: settings.newsletterBody,
        }}
        pages={pages.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          body: p.body,
          heroImage: p.heroImage,
          published: p.published,
          showInFooter: p.showInFooter,
          position: p.position,
        }))}
        usingEnvPassword={!settings.dashboardPasswordHash}
      />
    </div>
  );
}
