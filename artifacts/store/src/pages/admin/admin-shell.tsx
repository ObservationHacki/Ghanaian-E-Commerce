import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Award,
  Users,
  Warehouse,
  BarChart3,
  FileText,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Megaphone,
  Star,
  Percent,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useAdmin } from './admin-context';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders:read' },
  { href: '/admin/products', label: 'Products', icon: Package, permission: 'products:read' },
  { href: '/admin/categories', label: 'Categories', icon: Tags, permission: 'categories:read' },
  { href: '/admin/brands', label: 'Brands', icon: Award, permission: 'brands:read' },
  { href: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers:read' },
  { href: '/admin/inventory', label: 'Inventory', icon: Warehouse, permission: 'inventory:read' },
  { href: '/admin/promotions', label: 'Promotions', icon: Percent, permission: 'promotions:read' },
  { href: '/admin/reviews', label: 'Reviews', icon: Star, permission: 'reviews:read' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:read' },
  { href: '/admin/content', label: 'Content', icon: FileText, permission: 'content:read' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings:read' },
  { href: '/admin/administrators', label: 'Administrators', icon: Shield, permission: 'admins:manage' },
];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const [location] = useLocation();
  const admin = useAdmin();
  const allowed =
    !item.permission || admin.permissions.includes(item.permission);
  if (!allowed) return null;

  const active =
    item.href === '/admin'
      ? location === '/admin'
      : location === item.href || location.startsWith(`${item.href}/`);

  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-ink-muted hover:bg-surface-sunken hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const admin = useAdmin();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-hairline bg-background">
      <div className="border-b border-hairline px-5 py-5">
        <Link href="/admin" className="block">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
            Operations
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            VBUY Admin
          </p>
        </Link>
        <p className="mt-2 truncate text-xs text-ink-muted">{admin.email}</p>
        <p className="text-xs text-ink-subtle">{admin.roleSlug.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-hairline p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-foreground"
        >
          <Megaphone className="h-4 w-4" />
          View storefront
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-surface-sunken text-foreground">
      <div className="hidden lg:block">{sidebar}</div>

      {open ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-hairline bg-background px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 hover:bg-surface-sunken"
            aria-label="Open menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold">VBUY Admin</span>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
