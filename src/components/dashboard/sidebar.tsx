'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/actions/dashboard-session';
import {
  LayoutDashboard,
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

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/categories', label: 'Categories', icon: FolderTree },
  { href: '/dashboard/stock', label: 'Stock', icon: Boxes },
  { href: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/dashboard/offers', label: 'Offers', icon: Megaphone },
  { href: '/dashboard/shipping', label: 'Shipping', icon: Truck },
  { href: '/dashboard/filters', label: 'Shop Filters', icon: SlidersHorizontal },
  { href: '/dashboard/promo-codes', label: 'Promo Codes', icon: Ticket },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-4">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'relative flex items-center gap-3 px-4 py-3 text-label-md transition-colors',
              active ? 'bg-surface-container text-on-surface' : 'text-secondary hover:text-on-surface',
            )}
          >
            {/* 2px navy rule marks the active route */}
            {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-navy" />}
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center border border-outline-variant bg-background md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && <div className="scrim fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-outline-variant bg-background transition-transform duration-300 ease-scandi',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex items-start justify-between px-8 py-8">
          <Link href="/dashboard">
            <span className="block font-display text-[24px] leading-none">{storeName} Admin</span>
            <span className="label-caps mt-2 block text-secondary">Premium Management</span>
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {nav}

        <div className="border-t border-outline-variant p-4">
          <Link
            href="/"
            target="_blank"
            className="mb-1 flex items-center gap-3 px-4 py-3 text-label-md text-secondary transition-colors hover:text-on-surface"
          >
            <ExternalLink className="h-4 w-4" />
            View storefront
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-label-md text-secondary transition-colors hover:text-error"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
