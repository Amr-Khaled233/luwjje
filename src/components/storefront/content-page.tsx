import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Prose } from '@/components/storefront/prose';
import { prisma } from '@/lib/prisma';
import { getI18n } from '@/i18n/server';
import { pick } from '@/i18n/config';

export async function getContentPage(slug: string) {
  const page = await prisma.page.findUnique({ where: { slug } });
  return page?.published ? page : null;
}

export async function contentPageMetadata(slug: string): Promise<Metadata> {
  const [page, { locale }] = await Promise.all([getContentPage(slug), getI18n()]);
  if (!page) return { title: 'Not found' };

  const title = pick(locale, page.title, page.titleAr);
  const description = pick(locale, page.excerpt, page.excerptAr);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: page.heroImage ? [{ url: page.heroImage }] : undefined,
    },
  };
}

/** Shared body for `/pages/[slug]`, `/about` and `/journal`. */
export async function ContentPage({ slug }: { slug: string }) {
  const [page, { locale }] = await Promise.all([getContentPage(slug), getI18n()]);
  if (!page) notFound();

  const title = pick(locale, page.title, page.titleAr);
  const excerpt = pick(locale, page.excerpt, page.excerptAr);
  const body = pick(locale, page.body, page.bodyAr);

  return (
    <article>
      {page.heroImage && (
        <div className="relative h-[46vh] min-h-[280px] w-full">
          <Image
            src={page.heroImage}
            alt={title}
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
            <h1 className="font-display text-display-sm md:text-display-md">{title}</h1>
            {excerpt && (
              <p className="mx-auto mt-5 max-w-[52ch] text-body-lg text-secondary">{excerpt}</p>
            )}
          </header>

          <Prose body={body} />
        </div>
      </div>
    </article>
  );
}
