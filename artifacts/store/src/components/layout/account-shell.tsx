import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Package, Heart, MapPin, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const NAV = [
  { label: 'Orders', href: '/account/orders', Icon: Package },
  { label: 'Wishlist', href: '/wishlist', Icon: Heart },
  { label: 'Addresses', href: '/account/addresses', Icon: MapPin },
  { label: 'Settings', href: '/account/settings', Icon: SettingsIcon },
];

/**
 * Wraps every signed-in page with the same nav and handles the loading and
 * signed-out states once, instead of in each page.
 */
export function AccountShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-10 w-52" />
        <div className="mt-10 grid gap-12 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <Skeleton className="hidden h-64 rounded-3xl lg:block" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
        <h1 className="text-headline text-foreground">Sign in to continue</h1>
        <p className="mt-4 max-w-md text-lede text-ink-muted text-pretty">
          Your orders, saved addresses and wishlist live behind your account.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button variant="accent" size="pill-lg" asChild>
            <Link href={`/auth/login?redirect=${encodeURIComponent(location)}`}>Sign in</Link>
          </Button>
          <Button variant="hairline" size="pill-lg" asChild>
            <Link href="/auth/register">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <span className="text-foreground">{title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="mb-6 flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[15px] font-bold text-accent-ink">
              {user.email?.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-medium text-foreground">My account</span>
              <span className="block truncate text-caption text-ink-muted">{user.email}</span>
            </span>
          </div>

          <nav aria-label="Account" className="hide-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 lg:flex-col lg:overflow-visible">
            {NAV.map(({ label, href, Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors',
                    active
                      ? 'bg-surface-sunken text-foreground'
                      : 'text-ink-muted hover:bg-surface-sunken hover:text-foreground',
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.7} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <div className="flex flex-col gap-4 border-b border-hairline pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-headline text-foreground">{title}</h1>
              {description && <p className="mt-2.5 text-[15px] text-ink-muted">{description}</p>}
            </div>
            {action}
          </div>

          <div className="pt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
