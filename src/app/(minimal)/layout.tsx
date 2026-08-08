import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSettings } from '@/lib/settings';

/**
 * Reduced chrome for cart / checkout — logo plus a single way back.
 */
export default async function MinimalLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-outline-variant">
        <div className="container-luwjje flex h-[72px] items-center justify-between">
          <Link href="/" className="font-display text-[26px] leading-none">
            {settings.storeName}
          </Link>
          <Link
            href="/shop"
            className="group flex items-center gap-2 text-label-md text-secondary transition-colors hover:text-on-surface"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-scandi group-hover:-translate-x-1" />
            Return to Shop
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-outline-variant py-8">
        <div className="container-luwjje flex flex-wrap items-center justify-between gap-4 text-body-sm text-tertiary">
          <span>
            © {new Date().getFullYear()} {settings.storeName}
          </span>
          <div className="flex gap-6">
            <Link href="/pages/privacy-policy" className="hover:text-on-surface">
              Privacy
            </Link>
            <Link href="/pages/terms" className="hover:text-on-surface">
              Terms
            </Link>
            <a href={`mailto:${settings.supportEmail}`} className="hover:text-on-surface">
              {settings.supportEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
