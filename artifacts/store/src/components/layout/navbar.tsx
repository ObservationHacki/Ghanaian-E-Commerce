import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { useGetCart } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import {
  ShoppingCart, Search, User, Menu, Moon, Sun, X,
  Smartphone, Laptop, Headphones, Shirt, Home as HomeIcon,
  Gamepad, Watch, ChevronRight, Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useRef, useState } from 'react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Shop All', href: '/shop' },
  { label: 'Deals', href: '/shop?sort=price_asc' },
  { label: 'New Arrivals', href: '/shop?sort=newest' },
  { label: 'Phones', href: '/shop?category=phones' },
  { label: 'Laptops', href: '/shop?category=laptops' },
  { label: 'Fashion', href: '/shop?category=fashion' },
];

const MOBILE_CATS = [
  { label: 'Phones', href: '/shop?category=phones', icon: Smartphone },
  { label: 'Laptops', href: '/shop?category=laptops', icon: Laptop },
  { label: 'Accessories', href: '/shop?category=accessories', icon: Headphones },
  { label: 'Gaming', href: '/shop?category=gaming', icon: Gamepad },
  { label: 'Fashion', href: '/shop?category=fashion', icon: Shirt },
  { label: 'Smart Home', href: '/shop?category=smart-home', icon: HomeIcon },
  { label: 'Watches', href: '/shop?category=watches', icon: Watch },
];

export function Navbar() {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const sessionId = getCartSessionId();
  const { data: cart } = useGetCart(sessionId, { query: { enabled: !!sessionId, queryKey: ['cart', sessionId] } });
  const cartCount = cart?.itemCount || 0;

  const [isDark, setIsDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Close mobile on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const toggleTheme = () => {
    const dark = document.documentElement.classList.toggle('dark');
    setIsDark(dark);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
      searchRef.current?.blur();
    }
  };

  return (
    <>
      {/* ── Main header ── */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#1D1D1F]/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-white/10">

        {/* ── Row 1: Logo · Search · Icons ── */}
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center gap-1.5 mr-2">
            <span className="text-xl font-black tracking-tight text-[#1D1D1F] dark:text-white" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
              KUMASI
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wider">GH</span>
          </Link>

          {/* Search bar – expands on focus */}
          <form
            onSubmit={handleSearch}
            className={`hidden md:flex flex-1 max-w-xl relative transition-all duration-300 ${searchFocused ? 'max-w-2xl' : ''}`}
          >
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search products, brands, categories…"
                className="w-full h-10 pl-10 pr-4 rounded-full bg-gray-100 dark:bg-white/10 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-white/20 text-sm text-[#1D1D1F] dark:text-white placeholder:text-gray-400 transition-all outline-none"
              />
            </div>
          </form>

          {/* Spacer on mobile */}
          <div className="flex-1 md:hidden" />

          {/* Right icons */}
          <div className="flex items-center gap-1">
            {/* Mobile search */}
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10" onClick={() => searchRef.current?.focus()}>
              <Search className="h-5 w-5 text-[#1D1D1F] dark:text-white" />
            </Button>

            {/* Theme toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10" data-testid="button-theme-toggle">
              {isDark ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-[#1D1D1F]" />}
            </Button>

            {/* Wishlist (visual) */}
            <Button variant="ghost" size="icon" className="hidden md:flex h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
              <Heart className="h-5 w-5 text-[#1D1D1F] dark:text-white" />
            </Button>

            {/* Cart */}
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10" data-testid="button-cart">
                <ShoppingCart className="h-5 w-5 text-[#1D1D1F] dark:text-white" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10" data-testid="button-user-menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-gray-100">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white">My Account</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/account/orders" className="cursor-pointer">My Orders</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/addresses" className="cursor-pointer">Saved Addresses</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/account/settings" className="cursor-pointer">Settings</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-500 focus:text-red-500 cursor-pointer">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10" data-testid="button-login">
                  <User className="h-5 w-5 text-[#1D1D1F] dark:text-white" />
                </Button>
              </Link>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost" size="icon"
              className="md:hidden h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5 text-[#1D1D1F] dark:text-white" />
            </Button>
          </div>
        </div>

        {/* ── Row 2: Category nav links (desktop only) ── */}
        <nav className="hidden md:block border-t border-gray-100 dark:border-white/10">
          <div className="container mx-auto px-4 md:px-8 h-10 flex items-center gap-1">
            {NAV_LINKS.map(link => {
              const active = location === link.href || (link.href !== '/' && location.startsWith(link.href.split('?')[0]));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F]'
                      : 'text-gray-600 dark:text-gray-400 hover:text-[#1D1D1F] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />

          {/* Panel */}
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-[#1D1D1F] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 dark:border-white/10 shrink-0">
              <span className="text-lg font-black tracking-tight text-[#1D1D1F] dark:text-white">KUMASI</span>
              <button onClick={() => setMobileOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10">
                <X className="h-4 w-4 text-[#1D1D1F] dark:text-white" />
              </button>
            </div>

            {/* Mobile search */}
            <form onSubmit={handleSearch} className="px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={e => setSearchValue(e.target.value)}
                  placeholder="Search products…"
                  className="w-full h-10 pl-9 pr-4 rounded-full bg-gray-100 dark:bg-white/10 text-sm outline-none border border-transparent focus:border-blue-500"
                />
              </div>
            </form>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-3 py-4">
                <p className="px-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Menu</p>
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-[#1D1D1F] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                ))}
              </div>

              <div className="px-3 py-2 border-t border-gray-100 dark:border-white/10">
                <p className="px-2 mb-2 mt-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Categories</p>
                {MOBILE_CATS.map(cat => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-[#1D1D1F] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <cat.icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Auth footer */}
            <div className="px-5 py-5 border-t border-gray-100 dark:border-white/10 shrink-0">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">My Account</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button onClick={signOut} className="text-xs text-red-500 font-medium hover:text-red-600">
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/auth/login" className="flex-1">
                    <button className="w-full h-10 rounded-full border border-gray-200 dark:border-white/20 text-sm font-semibold text-[#1D1D1F] dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      Sign in
                    </button>
                  </Link>
                  <Link href="/auth/register" className="flex-1">
                    <button className="w-full h-10 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] text-sm font-semibold hover:opacity-90 transition-opacity">
                      Register
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
