import { PageHeader } from '@/components/dashboard/admin-ui';
import { PromoManager } from '@/components/dashboard/promo-manager';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminPromoCodesPage() {
  const [codes, settings] = await Promise.all([
    prisma.promoCode.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] }),
    getSettings(),
  ]);

  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Promo Codes"
        description="Codes customers type in the cart. Every code entered at checkout is validated against this table — value, minimum spend, window and usage limit."
      />

      <PromoManager
        codes={codes.map((c) => ({
          id: c.id,
          code: c.code,
          description: c.description,
          discountType: c.discountType as 'PERCENT' | 'FIXED',
          discountValue: c.discountValue,
          minOrder: c.minOrder,
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          startsAt: iso(c.startsAt),
          expiresAt: iso(c.expiresAt),
          active: c.active,
        }))}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
}
