import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  Moon,
  Sun,
  X,
  Heart,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import { useGetCart, useListCategories } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { getCartSessionId } from '@/lib/cart';
import { useWishlist } from '@/lib/wishlist';
import { useTheme } from '@/hooks/use-theme';
import { getCategoryIcon, FALLBACK_CATEGORIES } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { SearchPanel } from './search-panel';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Deals', href: '/shop?deals=1' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
];

const MEGA_FEATURE = {
  title: 'Flash deals end at midnight',
  copy: 'Up to 40% off across tech and home.',
  href: '/shop?deals=1',
  image:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=70',
};

export function Navbar() {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { count: wishlistCount } = useWishlist();

  const sessionId = getCartSessionId();
  const { data: cart } = useGetCart(sessionId, {
    query: { enabled: !!sessionId, queryKey: ['cart', sessionId] },
  });
  const cartCount = cart?.itemCount || 0;

  const { data: apiCategories } = useListCategories();
  const categories =
    apiCategories?.length
      ? apiCategories.map((c) => ({ name: c.name, slug: c.slug, productCount: c.productCount }))
      : FALLBACK_CATEGORIES.map((c) => ({ ...c, productCount: undefined }));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setMegaOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMegaOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (megaTimer.current) clearTimeout(megaTimer.current);
    };
  }, []);

  // Small delay stops the mega menu flickering as the pointer crosses the gap.
  const openMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMegaOpen(true);
  };
  const closeMega = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => setMegaOpen(false), 120);
  };

  const isActive = (href: string) => {
    const [path] = href.split('?');
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'sticky top-0 z-40 w-full glass transition-shadow duration-300',
          scrolled ? 'shadow-[0_1px_0_hsl(var(--hairline)),var(--shadow-sm)]' : 'shadow-[0_1px_0_hsl(var(--hairline))]',
        )}
      >
        {/* ── Primary row ── */}
        <div className="container-page flex h-16 items-center gap-3 md:h-[4.5rem] md:gap-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="VBUY home"
          >
            <span className="text-[19px] font-semibold tracking-[-0.04em] text-foreground md:text-xl">
              VBUY
            </span>
            <span className="hidden h-[18px] items-center rounded-md bg-accent px-1.5 text-[10px] font-bold tracking-[0.1em] text-accent-foreground sm:inline-flex">
              GH
            </span>
          </Link>

          {/* Categories trigger + mega menu */}
          <div
            className="relative hidden lg:block"
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
          >
            <button
              type="button"
              onClick={() => setMegaOpen((v) => !v)}
              aria-expanded={megaOpen}
              aria-haspopup="true"
              className={cn(
                'flex h-10 items-center gap-2 rounded-full px-4 text-[15px] font-medium transition-colors',
                megaOpen
                  ? 'bg-surface-sunken text-foreground'
                  : 'text-foreground hover:bg-surface-sunken',
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Categories
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-ink-subtle transition-transform duration-300',
                  megaOpen && 'rotate-180',
                )}
              />
            </button>
          </div>

          {/* Search — the visual centre of gravity on desktop */}
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchPanel className="mx-auto max-w-2xl" />
          </div>

          <div className="flex-1 md:hidden" />

          {/* Utility icons */}
          <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken sm:flex"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <Link
              href="/wishlist"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} saved` : ''}`}
              className="relative hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken sm:flex"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && <Pip>{wishlistCount}</Pip>}
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-sunken"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-accent-soft text-[11px] font-bold text-accent-ink">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold text-foreground">My account</p>
                    <p className="truncate text-caption text-ink-muted">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders" className="cursor-pointer rounded-xl">
                      My orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer rounded-xl">
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/addresses" className="cursor-pointer rounded-xl">
                      Saved addresses
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings" className="cursor-pointer rounded-xl">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer rounded-xl text-destructive focus:text-destructive"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/auth/login"
                aria-label="Sign in"
                className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken"
                data-testid="button-login"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            <Link
              href="/cart"
              aria-label={`Bag${cartCount ? `, ${cartCount} items` : ', empty'}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken"
              data-testid="button-cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <Pip>{cartCount}</Pip>}
            </Link>
          </div>
        </div>

        {/* ── Secondary row: primary nav ── */}
        <nav
          aria-label="Primary"
          className="hidden border-t border-hairline lg:block"
          onMouseEnter={closeMega}
        >
          <div className="container-page flex h-11 items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors',
                  isActive(link.href)
                    ? 'bg-foreground text-background'
                    : 'text-ink-muted hover:bg-surface-sunken hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}

            <span className="mx-2 h-4 w-px bg-hairline" aria-hidden="true" />

            {categories.slice(0, 5).map((cat) => (
              <Link
                key={cat.slug}
                href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                className="rounded-full px-3.5 py-1.5 text-[14px] font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* ── Mega menu ── */}
        {megaOpen && (
          <div
            className="absolute inset-x-0 top-full hidden border-t border-hairline bg-popover shadow-[var(--shadow-lg)] lg:block"
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
          >
            <div className="container-page grid grid-cols-[1fr_auto] gap-12 py-10">
              <div>
                <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                  Shop by category
                </p>
                <ul className="grid grid-cols-4 gap-x-6 gap-y-1">
                  {categories.map((cat) => {
                    const Icon = getCategoryIcon(cat.slug, cat.name);
                    return (
                      <li key={cat.slug}>
                        <Link
                          href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                          className="group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-surface-sunken"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-medium text-foreground">
                              {cat.name}
                            </span>
                            {cat.productCount !== undefined && (
                              <span className="block text-[12px] text-ink-subtle">
                                {cat.productCount} items
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/shop"
                  className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-ink hover:text-accent"
                >
                  Browse everything
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <Link
                href={MEGA_FEATURE.href}
                className="group relative flex w-72 flex-col justify-end overflow-hidden rounded-3xl p-6"
              >
                <img
                  src={MEGA_FEATURE.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
                />
                <span className="relative text-[17px] font-semibold leading-snug text-white">
                  {MEGA_FEATURE.title}
                </span>
                <span className="relative mt-1.5 text-caption text-white/70">
                  {MEGA_FEATURE.copy}
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* ── Mobile search drawer ── */}
        {mobileSearchOpen && (
          <div className="border-t border-hairline bg-background px-5 py-3 md:hidden">
            <SearchPanel
              variant="mobile"
              autoFocus
              onDismiss={() => setMobileSearchOpen(false)}
            />
          </div>
        )}
      </header>

      {/* ── Mobile navigation drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 flex h-full w-[21rem] max-w-[88vw] flex-col bg-background shadow-[var(--shadow-xl)]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-5">
              <span className="text-[19px] font-semibold tracking-[-0.04em] text-foreground">
                VBUY
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-sunken"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-3">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[16px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-ink-subtle" />
                  </Link>
                ))}
                <Link
                  href="/wishlist"
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[16px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
                >
                  Wishlist
                  <span className="flex items-center gap-2 text-ink-subtle">
                    {wishlistCount > 0 && (
                      <span className="text-caption font-semibold text-accent-ink">
                        {wishlistCount}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>

              <div className="border-t border-hairline p-3">
                <p className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                  Categories
                </p>
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.slug, cat.name);
                  return (
                    <Link
                      key={cat.slug}
                      href={`/shop?category=${encodeURIComponent(cat.slug)}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </span>
                      {cat.name}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-hairline p-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
                >
                  {isDark ? 'Light appearance' : 'Dark appearance'}
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="shrink-0 border-t border-hairline p-5">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent-ink">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption font-semibold text-foreground">My account</p>
                    <p className="truncate text-caption text-ink-subtle">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="text-caption font-medium text-destructive"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/auth/login')}
                    className="h-11 flex-1 rounded-full border border-hairline text-[14px] font-semibold text-foreground transition-colors hover:bg-surface-sunken"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth/register')}
                    className="h-11 flex-1 rounded-full bg-accent text-[14px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Pip({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums text-accent-foreground ring-2 ring-background">
      {children}
    </span>
  );
}
