import type { Metadata } from 'next';
import { ContentPage, contentPageMetadata } from '@/components/storefront/content-page';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return contentPageMetadata(params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ContentPage slug={params.slug} />;
}
