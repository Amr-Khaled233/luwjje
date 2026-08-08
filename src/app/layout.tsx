import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { getSettings } from '@/lib/settings';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
    title: {
      default: s.metaTitle || `${s.storeName} — ${s.tagline}`,
      template: `%s — ${s.storeName}`,
    },
    description: s.metaDescription,
    openGraph: {
      type: 'website',
      siteName: s.storeName,
      title: s.metaTitle,
      description: s.metaDescription,
      images: s.ogImageUrl ? [{ url: s.ogImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: s.metaTitle,
      description: s.metaDescription,
      images: s.ogImageUrl ? [s.ogImageUrl] : undefined,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
