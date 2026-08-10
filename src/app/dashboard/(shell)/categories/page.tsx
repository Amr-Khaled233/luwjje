import { PageHeader } from '@/components/dashboard/admin-ui';
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
      <PageHeader
        title="Categories"
        description="What appears in the Shop category filter, in what order, and in both languages. Hiding a category keeps its products on sale — it only drops out of the filter."
      />

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
