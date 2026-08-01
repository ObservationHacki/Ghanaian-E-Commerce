import { useQueries } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Heart, ChevronRight } from 'lucide-react';
import { getProduct } from '@workspace/api-client-react';
import type { ProductSummary } from '@workspace/api-client-react';
import { useWishlist } from '@/lib/wishlist';
import { ProductCard, ProductCardSkeleton } from '@/components/commerce/product-card';
import { Button } from '@/components/ui/button';

export function Wishlist() {
  const { ids, clear } = useWishlist();

  // Saved ids live in localStorage, so each product is fetched individually.
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['product', id],
      queryFn: () => getProduct(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);

  const products: ProductSummary[] = results
    .map((r) => r.data)
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      basePrice: p.basePrice,
      images: p.images,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      brandId: p.brandId,
      brandName: p.brandName,
      inStock: p.inStock,
      variantCount: p.variants?.length ?? 0,
    }));

  return (
    <div className="container-page py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <span className="text-foreground">Wishlist</span>
      </nav>

      <div className="flex flex-col gap-4 border-b border-hairline pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline text-foreground">Your wishlist</h1>
          <p className="mt-2.5 text-[15px] text-ink-muted">
            {ids.length === 0
              ? 'Nothing saved yet.'
              : `${ids.length} ${ids.length === 1 ? 'item' : 'items'} saved for later.`}
          </p>
        </div>

        {ids.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="self-start text-caption font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Clear wishlist
          </button>
        )}
      </div>

      <div className="pt-10">
        {ids.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-surface-sunken px-6 py-24 text-center">
            <Heart className="h-10 w-10 text-ink-subtle" strokeWidth={1.4} />
            <h2 className="mt-6 text-title text-foreground">Save what you love</h2>
            <p className="mt-3 max-w-sm text-[15px] text-ink-muted text-pretty">
              Tap the heart on any product to keep it here while you decide.
            </p>
            <Button variant="accent" size="pill" className="mt-8" asChild>
              <Link href="/shop">Start browsing</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-y-12 xl:grid-cols-4">
            {ids.map((id) => (
              <ProductCardSkeleton key={id} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-y-12 xl:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} priority={i < 8} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
