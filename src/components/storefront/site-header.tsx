'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, X, PackageSearch } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { cn } from '@/lib/utils';
import { CartDrawer } from './cart-drawer';

const NAV = [
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/journal', label: 'Journal' },
];

/**
 * There are no customer accounts — shoppers check out as guests, so the
 * account icon is replaced by order lookup.
 */
export function SiteHeader({ storeName }: { storeName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.openCart);
  // Read after mount only — server render has no localStorage, so an
  // immediate count would mismatch and warn.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const count = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;

  React.useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/shop?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setQuery('');
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-outline-variant bg-background/95 backdrop-blur-sm">
        <div className="container-luwjje flex h-[72px] items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="font-display text-[26px] leading-none tracking-tight">
              {storeName}
            </Link>

            <nav className="hidden items-center gap-8 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'link-underline text-label-md text-secondary transition-colors hover:text-on-surface',
                    pathname.startsWith(item.href) && 'text-on-surface',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <button onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
              <Search className="h-5 w-5 transition-opacity hover:opacity-60" />
            </button>

            <Link href="/orders" aria-label="Track an order" title="Track an order">
              <PackageSearch className="h-5 w-5 transition-opacity hover:opacity-60" />
            </Link>

            <button onClick={openCart} className="relative" aria-label={`Cart, ${count} items`}>
              <ShoppingBag className="h-5 w-5 transition-opacity hover:opacity-60" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center bg-navy px-1 text-[10px] font-semibold leading-none text-background">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="animate-fade-in border-t border-outline-variant bg-surface-lowest">
            <form onSubmit={submitSearch} className="container-luwjje flex items-center gap-4 py-5">
              <Search className="h-5 w-5 shrink-0 text-secondary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the collection…"
                className="h-8 flex-1 bg-transparent text-body-lg outline-none placeholder:text-tertiary"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X className="h-5 w-5 text-secondary" />
              </button>
            </form>
          </div>
        )}
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="scrim absolute inset-0" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[82vw] max-w-sm animate-fade-in border-r border-outline-variant bg-background p-margin-mobile">
            <div className="mb-10 flex items-center justify-between">
              <span className="font-display text-[26px]">{storeName}</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="border-b border-outline-variant py-4 font-display text-headline-sm"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/orders"
                className="border-b border-outline-variant py-4 font-display text-headline-sm"
              >
                Track an order
              </Link>
            </nav>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  );
}
