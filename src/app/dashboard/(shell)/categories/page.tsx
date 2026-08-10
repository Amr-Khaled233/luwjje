import { PageTitle } from '@/components/dashboard/page-title';
import { CategoriesManager } from '@/components/dashboard/categories-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageTitle section="categories" />

      <CategoriesManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          nameAr: c.nameAr,
          slug: c.slug,
          description: c.description,
          descriptionAr: c.descriptionAr,
          visible: c.visible,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}
