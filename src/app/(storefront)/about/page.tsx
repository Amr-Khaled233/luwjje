import type { Metadata } from 'next';
import { ContentPage, contentPageMetadata } from '@/components/storefront/content-page';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return contentPageMetadata('about');
}

export default function AboutPage() {
  return <ContentPage slug="about" />;
}
