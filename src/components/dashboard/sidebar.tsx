'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/dashboard-session';
import {
  BadgePercent,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDash } from './dashboard-i18n';
import { useScrollLock, useFocusTrap } from '@/components/ui/motion';
import { DashboardLanguageToggle } from './language-toggle';
import type { Locale } from '@/i18n/config';
import type { DashboardDictionary } from '@/i18n/dashboard-dictionary';

const LINKS: { href: string; key: keyof DashboardDictionary['nav']; icon: typeof Package }[] = [
  { href: '/dashboard/orders', key: 'orders', icon: ShoppingCart },
  { href: '/dashboard/products', key: 'products', icon: Package },
  { href: '/dashboard/categories', key: 'categories', icon: FolderTree },
  { href: '/dashboard/stock', key: 'stock', icon: Boxes },
  { href: '/dashboard/offers', key: 'offers', icon: Megaphone },
  { href: '/dashboard/shipping', key: 'shipping', icon: Truck },
  { href: '/dashboard/free-shipping', key: 'freeShipping', icon: BadgePercent },
  { href: '/dashboard/filters', key: 'filters', icon: SlidersHorizontal },
  { href: '/dashboard/promo-codes', key: 'promoCodes', icon: Ticket },
  { href: '/dashboard/analytics', key: 'analytics', icon: BarChart3 },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
];

export function DashboardSidebar({ storeName, locale }: { storeName: string; locale: Locale }) {
  const pathname = usePathname();
  const { d } = useDash();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);
  useScrollLock(open);
  const panelRef = useFocusTrap(open);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const nav = (
    // Scrolls independently: ten links plus the header and footer overflow a
    // short phone in landscape.
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-4">
      {LINKS.map((link) => {
        // `/dashboard` redirects to Orders, so treat the bare path as Orders.
        const active =
          pathname.startsWith(link.href) ||
          (pathname === '/dashboard' && link.href === '/dashboard/orders');

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-3 px-4 py-3 text-label-md transition-colors duration-200 ease-scandi',
              active
                ? 'bg-surface-container text-on-surface'
                : 'text-secondary hover:bg-surface-low hover:text-on-surface',
            )}
          >
            {/* 2px navy rule marks the active route, on the reading-side edge */}
            {active && <span className="absolute inset-y-0 start-0 w-0.5 animate-fade-in bg-navy" />}
            <link.icon className="h-4 w-4 shrink-0" />
            {d.nav[link.key]}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/*
        Phone: a real top bar rather than a floating button. The old version
        was pinned over the page and covered the heading beneath it.
      */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-outline-variant bg-background/95 px-margin-mobile backdrop-blur-sm md:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label={d.nav.openMenu}
          aria-expanded={open}
          className="tap-target -ms-2.5"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard/orders" className="min-w-0 flex-1 truncate">
          <span className="font-latin text-[18px] font-medium leading-none">{storeName}</span>
        </Link>
        {/* Also on the bar, so switching language on a phone does not mean
            opening the menu first. */}
        <DashboardLanguageToggle locale={locale} className="shrink-0" />
      </header>

      {open && (
        <div
          className="scrim fixed inset-0 z-40 animate-fade-in md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/*
        The off-canvas transform is scoped to `max-md:` rather than being
        undone by `md:translate-x-0`. Tailwind compiles `ltr:` to a `:where()`
        selector, which adds no specificity, so the two rules tie at (0,1,0)
        and whichever Tailwind emits last wins — `ltr:` does, which pinned the
        sidebar off-screen on desktop as well. Two ranges that cannot overlap
        cannot tie.
      */}
      <aside
        ref={panelRef}
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-[min(84vw,280px)] flex-col border-e border-outline-variant bg-background transition-transform duration-300 ease-scandi md:w-[280px]',
          !open && 'max-md:ltr:-translate-x-full max-md:rtl:translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 py-6 md:px-8 md:py-8">
          <Link href="/dashboard/orders" className="min-w-0">
            <span className="block truncate font-latin text-[22px] font-medium leading-none md:text-[24px]">
              {storeName}
            </span>
            <span className="label-caps mt-2 block text-secondary">{d.nav.subtitle}</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label={d.nav.close}
            className="tap-target -me-2.5 shrink-0 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {nav}

        <div className="shrink-0 border-t border-outline-variant p-4 pb-safe">
          {/*
            Always shown, unlike the storefront switcher. `enableArabic` decides
            what shoppers get; whoever runs the store still needs to read the
            dashboard in their own language either way.
          */}
          <div className="mb-2 px-4 pt-1">
            <DashboardLanguageToggle locale={locale} />
          </div>
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
