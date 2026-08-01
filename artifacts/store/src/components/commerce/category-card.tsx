import { Link } from 'wouter';
import { ArrowUpRight } from 'lucide-react';
import { getCategoryIcon } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function CategoryCard({
  name,
  slug,
  productCount,
  className,
}: {
  name: string;
  slug: string;
  productCount?: number;
  className?: string;
}) {
  const Icon = getCategoryIcon(slug, name);

  return (
    <Link
      href={`/shop?category=${encodeURIComponent(slug)}`}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-hairline bg-background p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-lg)]',
        className,
      )}
    >
      {/* Accent wash that blooms in on hover */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-accent-soft opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-sunken text-foreground transition-colors duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.6} />
      </span>

      <span className="relative mt-8 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-medium tracking-[-0.01em] text-foreground">
            {name}
          </span>
          {productCount !== undefined && (
            <span className="mt-0.5 block text-caption text-ink-muted">
              {productCount} {productCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 translate-y-1 text-ink-subtle opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:text-accent-ink group-hover:opacity-100" />
      </span>
    </Link>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="rounded-3xl border border-hairline p-6">
      <div className="h-12 w-12 animate-pulse rounded-2xl bg-surface-sunken" />
      <div className="mt-8 h-4 w-24 animate-pulse rounded bg-surface-sunken" />
      <div className="mt-2 h-3 w-14 animate-pulse rounded bg-surface-sunken" />
    </div>
  );
}
