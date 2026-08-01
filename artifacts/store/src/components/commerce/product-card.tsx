import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Heart, Plus, Check, Truck, ImageOff, Loader2 } from 'lucide-react';
import type { ProductSummary } from '@workspace/api-client-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useWishlist } from '@/lib/wishlist';
import { useQuickAdd } from '@/lib/use-quick-add';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductSummary;
  priority?: boolean;
  className?: string;
}) {
  const { has, toggle } = useWishlist();
  const { quickAdd, pendingId } = useQuickAdd();
  const [imgFailed, setImgFailed] = useState(false);

  const image = product.images?.[0];
  const wished = has(product.id);
  const adding = pendingId === product.id;

  useEffect(() => {
    setImgFailed(false);
  }, [product.id, image]);

  return (
    <article className={cn('group relative flex h-full flex-col', className)}>
      {/* Media */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-sunken">
        <Link
          href={`/product/${product.id}`}
          className="block focus-visible:outline-none"
          aria-label={product.name}
        >
          <div className="aspect-square w-full overflow-hidden bg-surface-sunken p-3 sm:p-4">
            {image && !imgFailed ? (
              <img
                src={image}
                alt={product.name}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                onError={() => setImgFailed(true)}
                className="h-full w-full object-contain object-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-subtle">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {!product.inStock && (
            <span className="rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-background">
              Sold out
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => toggle(product.id)}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={wished}
          className={cn(
            'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition-all duration-300',
            'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
            wished
              ? 'bg-background text-destructive opacity-100 md:opacity-100'
              : 'bg-background/80 text-ink-muted hover:text-foreground',
          )}
        >
          <Heart className={cn('h-4 w-4', wished && 'fill-current')} />
        </button>

        {/* Quick add — slides up on hover, always visible on touch */}
        <div
          className={cn(
            'absolute inset-x-3 bottom-3 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            'md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100',
          )}
        >
          {product.variantCount > 1 ? (
            <Link
              href={`/product/${product.id}`}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-[13px] font-semibold text-background shadow-md transition-opacity hover:opacity-90"
            >
              Choose options
            </Link>
          ) : (
            <button
              type="button"
              disabled={!product.inStock || adding}
              onClick={() => quickAdd(product.id, product.name)}
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-[13px] font-semibold text-background shadow-md transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {adding ? 'Adding…' : 'Add to bag'}
            </button>
          )}
        </div>
      </div>

      {/* Copy */}
      <div className="flex flex-1 flex-col px-1 pt-4">
        {(product.brandName || product.categoryName) && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            {product.brandName || product.categoryName}
          </p>
        )}

        <h3 className="text-[17px] font-medium leading-snug tracking-[-0.01em] text-foreground">
          <Link href={`/product/${product.id}`} className="hover:text-accent-ink">
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h3>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[19px] font-semibold tracking-[-0.02em] text-foreground">
            {formatCurrency(product.basePrice)}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-muted">
          {product.inStock ? (
            <>
              <Truck className="h-3.5 w-3.5 shrink-0" />
              Delivery in 24–48h
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" />
              Notify me when back
            </>
          )}
        </p>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="px-1 pt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-4 w-4/5" />
        <Skeleton className="mt-2 h-4 w-2/5" />
        <Skeleton className="mt-3 h-5 w-24" />
      </div>
    </div>
  );
}
