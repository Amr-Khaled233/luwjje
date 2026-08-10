'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, X, PackageSearch } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { cn } from '@/lib/utils';
import { CartDrawer } from './cart-drawer';
import { LanguageSwitcher } from './language-switcher';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';

/**
 * There are no customer accounts — shoppers check out as guests, so the
 * account icon is replaced by order lookup.
 */
export function SiteHeader({
  storeName,
  locale,
  t,
  showSearch,
  showLanguageSwitcher,
}: {
  storeName: string;
  locale: Locale;
  t: Dictionary;
  showSearch: boolean;
  showLanguageSwitcher: boolean;
}) {
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

  const NAV = [
    { href: '/shop', label: t.nav.shop },
    { href: '/about', label: t.nav.about },
    { href: '/journal', label: t.nav.journal },
  ];

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
            <button className="md:hidden" onClick={() => setMobileOpen(true)} aria-label={t.nav.menu}>
              <Menu className="h-5 w-5" />
            </button>

            {/* The wordmark is a Latin logotype in both languages. */}
            <Link href="/" className="font-latin text-[26px] font-medium leading-none tracking-tight">
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
            {showLanguageSwitcher && (
              <LanguageSwitcher locale={locale} className="hidden sm:flex" />
            )}

            {showSearch && (
              <button onClick={() => setSearchOpen((v) => !v)} aria-label={t.nav.search}>
                <Search className="h-5 w-5 transition-opacity hover:opacity-60" />
              </button>
            )}

            <Link href="/orders" aria-label={t.nav.trackOrder} title={t.nav.trackOrder}>
              <PackageSearch className="h-5 w-5 transition-opacity hover:opacity-60" />
            </Link>

            <button onClick={openCart} className="relative" aria-label={`${t.nav.bag} (${count})`}>
              <ShoppingBag className="h-5 w-5 transition-opacity hover:opacity-60" />
              {count > 0 && (
                <span className="absolute -top-1.5 flex h-4 min-w-4 items-center justify-center bg-navy px-1 text-[10px] font-semibold leading-none text-background ltr:-right-2 rtl:-left-2">
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
                placeholder={t.nav.searchPlaceholder}
                className="h-8 flex-1 bg-transparent text-body-lg outline-none placeholder:text-tertiary"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label={t.nav.close}>
                <X className="h-5 w-5 text-secondary" />
              </button>
            </form>
          </div>
        )}
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="scrim absolute inset-0" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 w-[82vw] max-w-sm animate-fade-in border-outline-variant bg-background p-margin-mobile ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l">
            <div className="mb-10 flex items-center justify-between">
              <span className="font-latin text-[26px] font-medium">{storeName}</span>
              <button onClick={() => setMobileOpen(false)} aria-label={t.nav.close}>
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
                {t.nav.trackOrder}
              </Link>
            </nav>
            {showLanguageSwitcher && (
              <div className="mt-8">
                <LanguageSwitcher locale={locale} />
              </div>
            )}
          </div>
        </div>
      )}

      <CartDrawer locale={locale} t={t} />
    </>
  );
}
