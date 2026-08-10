'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/dashboard-session';
import {
  Package,
  Boxes,
  FolderTree,
  SlidersHorizontal,
  ShoppingCart,
  Megaphone,
  Truck,
  Ticket,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDash } from './dashboard-i18n';
import { LanguageSwitcher } from '@/components/storefront/language-switcher';
import type { Locale } from '@/i18n/config';
import type { DashboardDictionary } from '@/i18n/dashboard-dictionary';

const LINKS: { href: string; key: keyof DashboardDictionary['nav']; icon: typeof Package }[] = [
  { href: '/dashboard/orders', key: 'orders', icon: ShoppingCart },
  { href: '/dashboard/products', key: 'products', icon: Package },
  { href: '/dashboard/categories', key: 'categories', icon: FolderTree },
  { href: '/dashboard/stock', key: 'stock', icon: Boxes },
  { href: '/dashboard/offers', key: 'offers', icon: Megaphone },
  { href: '/dashboard/shipping', key: 'shipping', icon: Truck },
  { href: '/dashboard/filters', key: 'filters', icon: SlidersHorizontal },
  { href: '/dashboard/promo-codes', key: 'promoCodes', icon: Ticket },
  { href: '/dashboard/analytics', key: 'analytics', icon: BarChart3 },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
];

export function DashboardSidebar({
  storeName,
  locale,
  showLanguageSwitcher,
}: {
  storeName: string;
  locale: Locale;
  showLanguageSwitcher: boolean;
}) {
  const pathname = usePathname();
  const { d } = useDash();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-4">
      {LINKS.map((link) => {
        // `/dashboard` redirects to Orders, so treat the bare path as Orders.
        const active =
          pathname.startsWith(link.href) ||
          (pathname === '/dashboard' && link.href === '/dashboard/orders');

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative flex items-center gap-3 px-4 py-3 text-label-md transition-colors',
              active
                ? 'bg-surface-container text-on-surface'
                : 'text-secondary hover:text-on-surface',
            )}
          >
            {/* 2px navy rule marks the active route, on the reading-side edge */}
            {active && <span className="absolute inset-y-0 start-0 w-0.5 bg-navy" />}
            <link.icon className="h-4 w-4 shrink-0" />
            {d.nav[link.key]}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={d.nav.openMenu}
        className="fixed top-4 z-40 flex h-10 w-10 items-center justify-center border border-outline-variant bg-background start-4 md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && <div className="scrim fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-[280px] flex-col border-e border-outline-variant bg-background transition-transform duration-300 ease-scandi',
          open ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex items-start justify-between px-8 py-8">
          <Link href="/dashboard/orders">
            <span className="block font-latin text-[24px] font-medium leading-none">
              {storeName}
            </span>
            <span className="label-caps mt-2 block text-secondary">{d.nav.subtitle}</span>
          </Link>
          <button onClick={() => setOpen(false)} aria-label={d.nav.close} className="md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {nav}

        <div className="border-t border-outline-variant p-4">
          {showLanguageSwitcher && (
            <div className="mb-1 px-4 py-3">
              <LanguageSwitcher locale={locale} />
            </div>
          )}
          <Link
            href="/"
            target="_blank"
            className="mb-1 flex items-center gap-3 px-4 py-3 text-label-md text-secondary transition-colors hover:text-on-surface"
          >
            <ExternalLink className="h-4 w-4" />
            {d.nav.viewStorefront}
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-label-md text-secondary transition-colors hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              {d.nav.logout}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
