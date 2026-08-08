import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Prose } from '@/components/storefront/prose';
import { prisma } from '@/lib/prisma';

export async function getContentPage(slug: string) {
  const page = await prisma.page.findUnique({ where: { slug } });
  return page?.published ? page : null;
}

export async function contentPageMetadata(slug: string): Promise<Metadata> {
  const page = await getContentPage(slug);
  if (!page) return { title: 'Not found' };

  return {
    title: page.title,
    description: page.excerpt,
    openGraph: {
      title: page.title,
      description: page.excerpt,
      images: page.heroImage ? [{ url: page.heroImage }] : undefined,
    },
  };
}

/** Shared body for `/pages/[slug]`, `/about` and `/journal`. */
export async function ContentPage({ slug }: { slug: string }) {
  const page = await getContentPage(slug);
  if (!page) notFound();

  return (
    <article>
      {page.heroImage && (
        <div className="relative h-[46vh] min-h-[280px] w-full">
          <Image
            src={page.heroImage}
            alt={page.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="container-luwjje py-stack-md md:py-stack-lg">
        <div className="mx-auto max-w-[760px]">
          <header className="mb-stack-md text-center">
            <p className="label-caps mb-4 text-secondary">luwjje</p>
            <h1 className="font-display text-display-sm md:text-display-md">{page.title}</h1>
            {page.excerpt && (
              <p className="mx-auto mt-5 max-w-[52ch] text-body-lg text-secondary">{page.excerpt}</p>
            )}
          </header>

          <Prose body={page.body} />
        </div>
      </div>
    </article>
  );
}
