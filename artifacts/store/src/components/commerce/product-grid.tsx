import type { ProductSummary } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { ProductCard, ProductCardSkeleton } from './product-card';
import { Reveal } from './reveal';

/** Responsive grid used by the homepage rails, shop listing and PDP. */
export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 4,
  columns = 4,
  animate = true,
  className,
}: {
  products?: ProductSummary[];
  isLoading?: boolean;
  skeletonCount?: number;
  columns?: 3 | 4 | 5;
  animate?: boolean;
  className?: string;
}) {
  const cols = {
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  }[columns];

  const grid = cn('grid gap-x-5 gap-y-10 sm:gap-x-6 md:gap-y-12', cols, className);

  if (isLoading) {
    return (
      <div className={grid}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products?.length) return null;

  return (
    <div className={grid}>
      {products.map((product, i) =>
        animate ? (
          <Reveal key={product.id} delay={Math.min(i * 0.06, 0.36)} className="h-full">
            <ProductCard product={product} priority={i < 4} />
          </Reveal>
        ) : (
          <ProductCard key={product.id} product={product} priority={i < 4} />
        ),
      )}
    </div>
  );
}

/**
 * Horizontal snap rail — keeps long merchandising rows browsable on phones
 * without collapsing them into a tall grid.
 */
export function ProductRail({
  products,
  isLoading,
  skeletonCount = 5,
}: {
  products?: ProductSummary[];
  isLoading?: boolean;
  skeletonCount?: number;
}) {
  const items = isLoading
    ? Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className="w-[68vw] shrink-0 snap-start sm:w-64 lg:w-auto">
          <ProductCardSkeleton />
        </div>
      ))
    : products?.map((product, i) => (
        <div key={product.id} className="w-[68vw] shrink-0 snap-start sm:w-64 lg:w-auto">
          <ProductCard product={product} priority={i < 4} />
        </div>
      ));

  if (!isLoading && !products?.length) return null;

  return (
    <div className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-x-6 lg:gap-y-12 lg:overflow-visible lg:px-0">
      {items}
    </div>
  );
}
