import { PageTitle } from '@/components/dashboard/page-title';
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
      <PageTitle section="settings" />

      <SettingsManager
        settings={{
          storeName: settings.storeName,
          tagline: settings.tagline,
          taglineAr: settings.taglineAr,
          logoUrl: settings.logoUrl,
          supportEmail: settings.supportEmail,
          supportPhone: settings.supportPhone,
          defaultLocale: settings.defaultLocale === 'ar' ? 'ar' : 'en',
          enableArabic: settings.enableArabic,
          currencyCode: settings.currencyCode,
          currencySymbol: settings.currencySymbol,
          currencySymbolAr: settings.currencySymbolAr,
          freeShippingOver: settings.freeShippingOver,
          defaultShippingRate: settings.defaultShippingRate,
          lowStockThreshold: settings.lowStockThreshold,
          instagramUrl: settings.instagramUrl,
          facebookUrl: settings.facebookUrl,
          metaTitle: settings.metaTitle,
          metaTitleAr: settings.metaTitleAr,
          metaDescription: settings.metaDescription,
          metaDescriptionAr: settings.metaDescriptionAr,
          ogImageUrl: settings.ogImageUrl,
          newsletterHeading: settings.newsletterHeading,
          newsletterHeadingAr: settings.newsletterHeadingAr,
          newsletterBody: settings.newsletterBody,
          newsletterBodyAr: settings.newsletterBodyAr,
        }}
        pages={pages.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          titleAr: p.titleAr,
          excerpt: p.excerpt,
          excerptAr: p.excerptAr,
          body: p.body,
          bodyAr: p.bodyAr,
          heroImage: p.heroImage,
          published: p.published,
          showInFooter: p.showInFooter,
          position: p.position,
        }))}
      />
    </div>
  );
}
