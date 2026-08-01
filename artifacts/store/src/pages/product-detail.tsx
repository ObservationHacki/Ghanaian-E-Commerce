import { useEffect, useMemo, useState } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetProduct,
  useListRelatedProducts,
  useAddCartItem,
} from '@workspace/api-client-react';
import type { ProductVariant } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { cn, formatCurrency } from '@/lib/utils';
import { PageMeta } from '@/components/seo/page-meta';
import { useAuth } from '@/lib/auth-context';
import { useWishlist } from '@/lib/wishlist';
import { useToast } from '@/hooks/use-toast';
import { ProductGrid } from '@/components/commerce/product-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Heart,
  ShoppingBag,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  Check,
  AlertCircle,
  Minus,
  Plus,
  ImageOff,
} from 'lucide-react';

const ATTRIBUTES = [
  { key: 'color', label: 'Colour' },
  { key: 'storage', label: 'Storage' },
  { key: 'ram', label: 'Memory' },
  { key: 'size', label: 'Size' },
] as const;

/** Splits enriched catalog copy into overview, Specs rows, and footnotes. */
function parseProductCopy(description: string) {
  const parts = description.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const overview = parts[0] ?? '';
  const specsIdx = parts.findIndex((p) => /^specifications$/i.test(p));
  const specs: Array<{ label: string; value: string }> = [];
  let idealFor = '';
  let note = '';

  if (specsIdx >= 0 && parts[specsIdx + 1]) {
    for (const line of parts[specsIdx + 1].split('\n')) {
      const m = line.match(/^([^:]+):\s*(.+)$/);
      if (m) specs.push({ label: m[1].trim(), value: m[2].trim() });
    }
  }

  for (const part of parts) {
    if (/^ideal for:/i.test(part)) idealFor = part.replace(/^ideal for:\s*/i, '');
    if (/^note:/i.test(part)) note = part.replace(/^note:\s*/i, '');
  }

  // Legacy single-paragraph descriptions fall back to the full text as overview.
  if (!specs.length && parts.length === 1) {
    return { overview: description, specs, idealFor, note };
  }

  return { overview, specs, idealFor, note };
}

function ProductOverview({ description }: { description: string }) {
  const { overview } = useMemo(() => parseProductCopy(description), [description]);
  if (!overview) return null;
  return (
    <p className="mt-6 text-[16px] leading-relaxed text-ink-muted text-pretty">{overview}</p>
  );
}

function ProductSpecs({ description }: { description: string }) {
  const { specs, idealFor, note } = useMemo(
    () => parseProductCopy(description),
    [description],
  );
  if (!specs.length && !idealFor && !note) return null;

  return (
    <section className="mt-16 border-t border-hairline pt-12 md:mt-20 md:pt-16">
      <h2 className="text-headline text-foreground">Specifications</h2>
      {specs.length > 0 ? (
        <dl className="mt-8 divide-y divide-hairline rounded-2xl border border-hairline bg-background">
          {specs.map(({ label, value }) => (
            <div
              key={label}
              className="grid gap-1 px-4 py-3.5 sm:grid-cols-[14rem_1fr] sm:gap-8 sm:px-6 sm:py-4"
            >
              <dt className="text-[13px] font-medium text-ink-muted">{label}</dt>
              <dd className="text-[15px] leading-snug text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {idealFor ? (
        <p className="mt-6 text-[15px] leading-relaxed text-ink-muted">
          <span className="font-medium text-foreground">Ideal for: </span>
          {idealFor}
        </p>
      ) : null}
      {note ? (
        <p className="mt-3 max-w-3xl text-caption leading-relaxed text-ink-subtle">{note}</p>
      ) : null}
    </section>
  );
}

export function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, navigate] = useLocation();
  const id = params?.id ? Number(params.id) : 0;

  const sessionId = getCartSessionId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { has, toggle } = useWishlist();

  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: ['product', id] },
  });
  const { data: related } = useListRelatedProducts(id, {
    query: { enabled: !!id, queryKey: ['related-products', id] },
  });
  const addCartItem = useAddCartItem();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imgFailed, setImgFailed] = useState(false);

  // Reset per-product UI state when navigating between products.
  useEffect(() => {
    setActiveImage(0);
    setSelectedVariantId(null);
    setQuantity(1);
    setImgFailed(false);
  }, [id]);

  useEffect(() => {
    setImgFailed(false);
  }, [activeImage]);

  useEffect(() => {
    if (product?.variants?.length && selectedVariantId === null) {
      const first = product.variants.find((v) => v.stockCount > 0) ?? product.variants[0];
      setSelectedVariantId(first.id);
    }
  }, [product, selectedVariantId]);

  const selectedVariant =
    product?.variants?.find((v) => v.id === selectedVariantId) ?? product?.variants?.[0];

  const price = selectedVariant?.price ?? product?.basePrice ?? 0;
  const inStock = selectedVariant ? selectedVariant.stockCount > 0 : !!product?.inStock;
  const stockCount = selectedVariant?.stockCount ?? 0;

  const wished = has(id);

  /** Groups variants by each attribute so shoppers pick colour/size, not SKUs. */
  const attributeGroups = useMemo(() => {
    if (!product?.variants) return [];
    return ATTRIBUTES.map(({ key, label }) => {
      const values = new Map<string, ProductVariant>();
      product.variants.forEach((variant) => {
        const value = variant.attributes?.[key];
        if (value && !values.has(value)) values.set(value, variant);
      });
      return { key, label, values: [...values.entries()] };
    }).filter((group) => group.values.length > 0);
  }, [product]);

  const hasAttributes = attributeGroups.length > 0;

  const addToCart = async (then?: () => void) => {
    if (!selectedVariantId) return;
    try {
      await addCartItem.mutateAsync({
        sessionId,
        data: { productVariantId: selectedVariantId, quantity },
      });
      await queryClient.invalidateQueries({ queryKey: ['cart', sessionId] });
      if (then) then();
      else
        toast({
          title: 'Added to bag',
          description: `${product?.name} — ${quantity} ${quantity === 1 ? 'item' : 'items'}.`,
        });
    } catch {
      toast({
        title: "Couldn't add to bag",
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const buyNow = () => {
    if (!user) {
      navigate('/auth/login?redirect=/checkout');
      return;
    }
    addToCart(() => navigate('/checkout'));
  };

  if (isLoading) {
    return (
      <div className="container-page py-10 md:py-14">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-4/5" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page flex flex-col items-center py-32 text-center">
        <h1 className="text-headline text-foreground">Product not found</h1>
        <p className="mt-4 text-lede text-ink-muted">
          This item may have been removed or is no longer available.
        </p>
        <Button variant="accent" size="pill" className="mt-8" asChild>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];

  return (
    <div className="container-page py-8 md:py-12">
      <PageMeta
        title={product.name}
        description={
          product.description?.slice(0, 160) ||
          `Buy ${product.name} from VBUY with nationwide delivery across Ghana.`
        }
        path={`/product/${product.id}`}
        image={images[0]}
      />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <Link href="/shop" className="transition-colors hover:text-foreground">
          Shop
        </Link>
        {product.categoryName && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
            <Link
              href={`/shop?category=${encodeURIComponent(product.categoryName.toLowerCase())}`}
              className="transition-colors hover:text-foreground"
            >
              {product.categoryName}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-20">
        {/* ── Gallery ── */}
        <div className="lg:sticky lg:top-32 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl bg-surface-sunken">
            <div className="aspect-square w-full overflow-hidden bg-surface-sunken p-3 md:p-5">
              {images[activeImage] && !imgFailed ? (
                <img
                  src={images[activeImage]}
                  alt={product.name}
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-contain object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-subtle">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="hide-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveImage(i);
                    setImgFailed(false);
                  }}
                  aria-label={`View image ${i + 1}`}
                  aria-current={activeImage === i}
                  className={cn(
                    'aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-sunken p-2 transition-all',
                    activeImage === i
                      ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                      : 'opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={img} alt="" className="h-full w-full object-contain object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Buy panel ── */}
        <div className="flex flex-col">
          {product.brandName && (
            <Link
              href={`/shop?brand=${encodeURIComponent(product.brandName.toLowerCase())}`}
              className="text-caption font-semibold uppercase tracking-[0.16em] text-accent-ink"
            >
              {product.brandName}
            </Link>
          )}

          <h1 className="mt-3 text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-caption text-ink-muted">
              {product.variants?.length ?? 0} option
              {(product.variants?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-7 flex items-baseline gap-3">
            <span className="text-[2rem] font-semibold tracking-[-0.03em] text-foreground">
              {formatCurrency(price)}
            </span>
          </div>

          {product.description ? (
            <ProductOverview description={product.description} />
          ) : null}

          {/* Variants */}
          {hasAttributes ? (
            <div className="mt-9 space-y-7 border-y border-hairline py-8">
              {attributeGroups.map((group) => (
                <div key={group.key}>
                  <div className="mb-3 flex items-baseline gap-2">
                    <h2 className="text-[15px] font-medium text-foreground">{group.label}</h2>
                    <span className="text-caption text-ink-muted">
                      {selectedVariant?.attributes?.[group.key]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {group.values.map(([value, variant]) => {
                      const active = selectedVariant?.attributes?.[group.key] === value;
                      const soldOut = variant.stockCount <= 0;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSelectedVariantId(variant.id)}
                          aria-pressed={active}
                          className={cn(
                            'min-h-11 rounded-full border px-5 text-[14px] font-medium transition-all',
                            active
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-hairline text-foreground hover:border-foreground',
                            soldOut && 'opacity-40',
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (product.variants?.length ?? 0) > 1 ? (
            <div className="mt-9 border-y border-hairline py-8">
              <h2 className="mb-3 text-[15px] font-medium text-foreground">Options</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    aria-pressed={selectedVariantId === variant.id}
                    className={cn(
                      'rounded-2xl border px-4 py-3.5 text-left transition-all',
                      selectedVariantId === variant.id
                        ? 'border-foreground bg-surface-sunken'
                        : 'border-hairline hover:border-foreground',
                    )}
                  >
                    <span className="block text-[14px] font-medium text-foreground">
                      {variant.name}
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-muted">
                      {formatCurrency(variant.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-9 border-t border-hairline pt-8" />
          )}

          {/* Stock */}
          <p className="mt-6 flex items-center gap-2 text-[14px]">
            {inStock ? (
              <>
                <Check className="h-4 w-4 text-accent-ink" />
                <span className="font-medium text-accent-ink">In stock</span>
                {stockCount > 0 && stockCount <= 10 && (
                  <span className="text-ink-muted">Only {stockCount} left</span>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">Out of stock</span>
              </>
            )}
          </p>

          {/* Quantity + actions */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex h-[3.25rem] items-center rounded-full border border-hairline">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex h-full w-12 items-center justify-center rounded-l-full text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-[15px] font-semibold tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(stockCount, 1), q + 1))}
                disabled={stockCount > 0 && quantity >= stockCount}
                aria-label="Increase quantity"
                className="flex h-full w-12 items-center justify-center rounded-r-full text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={wished}
              aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              className={cn(
                'flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full border transition-colors',
                wished
                  ? 'border-transparent bg-accent-soft text-destructive'
                  : 'border-hairline text-foreground hover:bg-surface-sunken',
              )}
            >
              <Heart className={cn('h-5 w-5', wished && 'fill-current')} />
            </button>
          </div>

          <div className="mt-3.5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!inStock || addCartItem.isPending}
              onClick={() => addToCart()}
              className="inline-flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-40"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {addCartItem.isPending ? 'Adding…' : 'Add to bag'}
            </button>
            <button
              type="button"
              disabled={!inStock || addCartItem.isPending}
              onClick={buyNow}
              className="inline-flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-base font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Zap className="h-[18px] w-[18px]" />
              Buy now
            </button>
          </div>

          {/* Reassurance */}
          <ul className="mt-9 grid gap-4 rounded-3xl bg-surface-sunken p-6 sm:grid-cols-3">
            {[
              { Icon: Truck, title: 'Nationwide delivery', copy: 'Flat fee shown at checkout' },
              { Icon: RotateCcw, title: '7-day returns', copy: 'No questions asked' },
              { Icon: ShieldCheck, title: 'Verified stock', copy: 'Authorised sellers only' },
            ].map(({ Icon, title, copy }) => (
              <li key={title} className="flex gap-3 sm:flex-col sm:gap-2">
                <Icon className="h-5 w-5 shrink-0 text-accent-ink" strokeWidth={1.6} />
                <div>
                  <p className="text-[14px] font-medium text-foreground">{title}</p>
                  <p className="mt-0.5 text-caption text-ink-muted">{copy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {product.description ? <ProductSpecs description={product.description} /> : null}

      {/* ── Related ── */}
      {related && related.length > 0 && (
        <section className="mt-24 border-t border-hairline pt-16 md:mt-32 md:pt-20">
          <h2 className="mb-10 text-headline text-foreground md:mb-14">You might also like</h2>
          <ProductGrid products={related.slice(0, 4)} columns={4} animate={false} />
        </section>
      )}
    </div>
  );
}
