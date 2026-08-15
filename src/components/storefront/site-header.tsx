'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Menu, X, PackageSearch } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { cn } from '@/lib/utils';
import { useScrollLock, useFocusTrap, useExitAnimation } from '@/components/ui/motion';
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

  useScrollLock(mobileOpen);
  const menuRef = useFocusTrap(mobileOpen);
  const menu = useExitAnimation(mobileOpen, 300);

  // The header sheds its bottom rule while the page is at the top, so the hero
  // meets the viewport edge cleanly, and gains it back as soon as you scroll.
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes whichever overlay is open.
  React.useEffect(() => {
    if (!mobileOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMobileOpen(false);
      setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, searchOpen]);

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
      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm transition-colors duration-300 ease-scandi',
          scrolled ? 'border-outline-variant' : 'border-transparent',
        )}
      >
        {/*
          Three zones on one row. The middle one is `min-w-0` so a long store
          name truncates instead of pushing the icons off a narrow phone.
        */}
        <div className="container-luwjje flex h-16 items-center justify-between gap-2 md:h-[72px] md:gap-6">
          <div className="flex min-w-0 items-center gap-2 md:gap-10">
            <button
              className="tap-target -ms-2.5 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={t.nav.menu}
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* The wordmark is a Latin logotype in both languages. */}
            <Link
              href="/"
              className="truncate font-latin text-[22px] font-medium leading-none tracking-tight transition-opacity hover:opacity-70 sm:text-[26px]"
            >
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

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 md:gap-5">
            {showLanguageSwitcher && (
              <LanguageSwitcher locale={locale} className="hidden sm:flex" />
            )}

            {showSearch && (
              <button
                className="tap-target"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label={t.nav.search}
                aria-expanded={searchOpen}
              >
                <Search className="h-5 w-5 transition-opacity hover:opacity-60" />
              </button>
            )}

            <Link
              href="/orders"
              className="tap-target"
              aria-label={t.nav.trackOrder}
              title={t.nav.trackOrder}
            >
              <PackageSearch className="h-5 w-5 transition-opacity hover:opacity-60" />
            </Link>

            <button
              onClick={openCart}
              className="tap-target -me-2.5 md:me-0"
              aria-label={`${t.nav.bag} (${count})`}
            >
              <ShoppingBag className="h-5 w-5 transition-opacity hover:opacity-60" />
              {count > 0 && (
                <span
                  // `key` restarts the pop each time the count changes, so
                  // adding to the bag is visible even with the drawer closed.
                  key={count}
                  className="absolute top-1.5 flex h-4 min-w-4 animate-scale-in items-center justify-center bg-navy px-1 text-[10px] font-semibold leading-none text-background ltr:right-1.5 rtl:left-1.5 md:top-[-6px] md:ltr:right-[-8px] md:rtl:left-[-8px]"
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="animate-fade-down border-t border-outline-variant bg-surface-lowest">
            <form
              onSubmit={submitSearch}
              className="container-luwjje flex items-center gap-3 py-4 md:gap-4 md:py-5"
            >
              <Search className="h-5 w-5 shrink-0 text-secondary" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.nav.searchPlaceholder}
                className="h-8 min-w-0 flex-1 bg-transparent text-body-md outline-none placeholder:text-tertiary md:text-body-lg"
              />
              <button
                type="button"
                className="tap-target shrink-0"
                onClick={() => setSearchOpen(false)}
                aria-label={t.nav.close}
              >
                <X className="h-5 w-5 text-secondary" />
              </button>
            </form>
          </div>
        )}
      </header>

      {menu.mounted && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className={cn('scrim absolute inset-0', menu.closing ? 'animate-fade-out' : 'animate-fade-in')}
            onClick={() => setMobileOpen(false)}
          />
          {/*
            The panel slides from the leading edge, which is the right in
            Arabic — hence the negative --slide-from override under RTL.
          */}
          <div
            ref={menuRef}
            style={{ ['--slide-from' as string]: 'var(--menu-from)' }}
            className={cn(
              'absolute inset-y-0 flex w-[84vw] max-w-sm flex-col overflow-y-auto overscroll-contain border-outline-variant bg-background p-margin-mobile pb-safe',
              'ltr:left-0 ltr:border-e rtl:right-0 rtl:border-s',
              '[--menu-from:-100%] rtl:[--menu-from:100%]',
              menu.closing ? 'animate-fade-out' : 'animate-slide-in',
            )}
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="truncate font-latin text-[24px] font-medium">{storeName}</span>
              <button
                className="tap-target -me-2.5 shrink-0"
                onClick={() => setMobileOpen(false)}
                aria-label={t.nav.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col">
              {[...NAV, { href: '/orders', label: t.nav.trackOrder }].map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ animationDelay: `${80 + i * 45}ms` }}
                  className={cn(
                    'animate-fade-up border-b border-outline-variant py-4 font-display text-headline-sm transition-colors hover:text-secondary',
                    pathname.startsWith(item.href) && 'text-navy',
                  )}
                >
                  {item.label}
                </Link>
              ))}
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
