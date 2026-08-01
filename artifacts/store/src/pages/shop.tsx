import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { useListProducts, useListCategories, useListBrands } from '@workspace/api-client-react';
import type { ListProductsSort } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import { PageMeta } from '@/components/seo/page-meta';
import { ProductCard, ProductCardSkeleton } from '@/components/commerce/product-card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  SlidersHorizontal,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from 'lucide-react';

const PAGE_SIZE = 24;
const PRICE_CEILING = 20000;

const SORTS: Array<{ value: ListProductsSort; label: string }> = [
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'popular', label: 'Most popular' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

const PRICE_PRESETS: Array<[number, number]> = [
  [0, 1000],
  [1000, 3000],
  [3000, 6000],
  [6000, 10000],
  [10000, PRICE_CEILING],
];

export function Shop() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const category = params.get('category') || undefined;
  const brand = params.get('brand') || undefined;
  const query = params.get('q') || undefined;
  const dealsOnly = params.get('deals') === '1';
  const sort = (params.get('sort') as ListProductsSort) || 'newest';
  const page = Number(params.get('page')) || 1;
  const minPrice = params.get('minPrice') ? Number(params.get('minPrice')) : undefined;
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;

  const [priceRange, setPriceRange] = useState<[number, number]>([
    minPrice ?? 0,
    maxPrice ?? PRICE_CEILING,
  ]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setPriceRange([minPrice ?? 0, maxPrice ?? PRICE_CEILING]);
  }, [minPrice, maxPrice]);

  const { data, isLoading, isFetching } = useListProducts({
    category,
    brand,
    search: query,
    sort,
    minPrice,
    maxPrice,
    page,
    limit: PAGE_SIZE,
  });
  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();

  // Deals filtering needs real compare-at prices from the API — show the catalog as-is for now.
  const products = data?.products ?? [];

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // ── URL helpers ───────────────────────────────────────────────────────────

  const setParams = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchString);
    mutate(next);
    next.delete('page'); // any filter change returns to page one
    const qs = next.toString();
    setLocation(qs ? `${location}?${qs}` : location);
  };

  const setParam = (key: string, value: string | null) =>
    setParams((p) => (value ? p.set(key, value) : p.delete(key)));

  const goToPage = (next: number) => {
    const p = new URLSearchParams(searchString);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    const qs = p.toString();
    setLocation(qs ? `${location}?${qs}` : location);
  };

  const applyPrice = (range: [number, number]) => {
    setParams((p) => {
      range[0] > 0 ? p.set('minPrice', String(range[0])) : p.delete('minPrice');
      range[1] < PRICE_CEILING ? p.set('maxPrice', String(range[1])) : p.delete('maxPrice');
    });
    setMobileFiltersOpen(false);
  };

  const clearAll = () => {
    setLocation(location);
    setPriceRange([0, PRICE_CEILING]);
  };

  const categoryLabel = categories?.find((c) => c.slug === category)?.name;
  const brandLabel = brands?.find((b) => b.slug === brand)?.name;
  const hasPriceFilter = minPrice != null || maxPrice != null;
  const hasFilters = !!(category || brand || query || dealsOnly || hasPriceFilter);

  const heading = query
    ? `Results for “${query}”`
    : dealsOnly
      ? 'Flash deals'
      : categoryLabel || brandLabel || 'All products';

  // ── Filter rail (shared between desktop column and mobile sheet) ──────────
  // Built as an element, not a nested component, so the slider isn't remounted
  // — and doesn't lose the drag — on every parent render.

  const filters = (
    <div className="space-y-9">
      <FilterGroup title="Category">
        <OptionRow
          label="All categories"
          active={!category}
          onSelect={() => {
            setParam('category', null);
            setMobileFiltersOpen(false);
          }}
        />
        {categories?.map((c) => (
          <OptionRow
            key={c.id}
            label={c.name}
            meta={String(c.productCount)}
            active={category === c.slug}
            onSelect={() => {
              setParam('category', c.slug);
              setMobileFiltersOpen(false);
            }}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Brand">
        <OptionRow
          label="All brands"
          active={!brand}
          onSelect={() => {
            setParam('brand', null);
            setMobileFiltersOpen(false);
          }}
        />
        {brands?.map((b) => (
          <OptionRow
            key={b.id}
            label={b.name}
            active={brand === b.slug}
            onSelect={() => {
              setParam('brand', b.slug);
              setMobileFiltersOpen(false);
            }}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="px-1 pt-2">
          <div className="flex items-center justify-between text-caption font-medium tabular-nums text-foreground">
            <span>{formatCurrency(priceRange[0])}</span>
            <span>{formatCurrency(priceRange[1])}</span>
          </div>
          <Slider
            value={priceRange}
            max={PRICE_CEILING}
            step={100}
            onValueChange={(v) => setPriceRange(v as [number, number])}
            className="my-5"
            aria-label="Price range"
          />

          <div className="flex flex-wrap gap-2">
            {PRICE_PRESETS.map(([lo, hi]) => (
              <button
                key={`${lo}-${hi}`}
                type="button"
                onClick={() => {
                  setPriceRange([lo, hi]);
                  applyPrice([lo, hi]);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                  minPrice === lo && maxPrice === hi
                    ? 'border-transparent bg-accent text-accent-foreground'
                    : 'border-hairline text-ink-muted hover:border-transparent hover:bg-surface-sunken hover:text-foreground',
                )}
              >
                {lo === 0 ? 'Under' : formatCurrency(lo).replace('.00', '')}
                {lo === 0 ? ` ${formatCurrency(hi).replace('.00', '')}` : ` – ${formatCurrency(hi).replace('.00', '')}`}
              </button>
            ))}
          </div>

          <Button
            variant="hairline"
            size="pill-sm"
            className="mt-4 w-full"
            onClick={() => applyPrice(priceRange)}
          >
            Apply price
          </Button>
        </div>
      </FilterGroup>

      <FilterGroup title="Offers">
        <OptionRow
          label="Discounted only"
          active={dealsOnly}
          onSelect={() => {
            setParam('deals', dealsOnly ? null : '1');
            setMobileFiltersOpen(false);
          }}
        />
      </FilterGroup>
    </div>
  );

  return (
    <div className="container-page py-8 md:py-12">
      <PageMeta
        title={heading}
        description={`Shop ${heading} at VBUY — verified products with nationwide delivery across Ghana.`}
        path={`/shop${searchString ? `?${searchString}` : ''}`}
      />
      {/* ── Header ── */}
      <div className="border-b border-hairline pb-8">
        <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-2 text-caption text-ink-muted">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
          <span className="text-foreground">Shop</span>
        </nav>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-headline text-foreground">{heading}</h1>
            <p className="mt-2.5 text-[15px] text-ink-muted">
              {isLoading
                ? 'Loading products…'
                : `${total.toLocaleString()} ${total === 1 ? 'product' : 'products'} available`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="hairline" size="pill" className="lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {hasFilters && (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                      •
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[21rem] overflow-y-auto sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="py-8">{filters}</div>
              </SheetContent>
            </Sheet>

            <Select value={sort} onValueChange={(v) => setParam('sort', v)}>
              <SelectTrigger className="h-11 w-[13rem] rounded-full border-hairline px-5 text-[14px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {SORTS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-xl">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {query && <Chip label={`“${query}”`} onRemove={() => setParam('q', null)} />}
            {categoryLabel && (
              <Chip label={categoryLabel} onRemove={() => setParam('category', null)} />
            )}
            {brandLabel && <Chip label={brandLabel} onRemove={() => setParam('brand', null)} />}
            {dealsOnly && <Chip label="Discounted" onRemove={() => setParam('deals', null)} />}
            {hasPriceFilter && (
              <Chip
                label={`${formatCurrency(minPrice ?? 0)} – ${formatCurrency(maxPrice ?? PRICE_CEILING)}`}
                onRemove={() =>
                  setParams((p) => {
                    p.delete('minPrice');
                    p.delete('maxPrice');
                  })
                }
              />
            )}
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-caption font-medium text-ink-muted underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex gap-12 pt-10">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-32">{filters}</div>
        </aside>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 md:gap-y-12 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl bg-surface-sunken px-6 py-24 text-center">
              <SearchX className="h-10 w-10 text-ink-subtle" strokeWidth={1.4} />
              <h2 className="mt-6 text-title text-foreground">No products found</h2>
              <p className="mt-3 max-w-sm text-[15px] text-ink-muted text-pretty">
                {query
                  ? `We couldn't find anything matching “${query}”. Try a different term or clear your filters.`
                  : 'Nothing matches these filters yet. Try widening your search.'}
              </p>
              <Button variant="accent" size="pill" className="mt-8" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'grid grid-cols-2 gap-x-5 gap-y-10 transition-opacity duration-200 md:grid-cols-3 md:gap-y-12 xl:grid-cols-4',
                  isFetching && 'opacity-60',
                )}
              >
                {products.map((product, i) => (
                  <ProductCard key={product.id} product={product} priority={i < 8} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-16 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {pageWindow(page, totalPages).map((p, i) =>
                    p === null ? (
                      <span key={`gap-${i}`} className="px-1 text-ink-subtle">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-current={p === page ? 'page' : undefined}
                        className={cn(
                          'h-10 min-w-10 rounded-full px-3 text-[14px] font-medium tabular-nums transition-colors',
                          p === page
                            ? 'bg-foreground text-background'
                            : 'text-ink-muted hover:bg-surface-sunken hover:text-foreground',
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-35 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact page list: first, last, and a window around the current page. */
function pageWindow(current: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | null> = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-caption font-semibold uppercase tracking-[0.14em] text-foreground">
        {title}
      </h2>
      <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}

function OptionRow({
  label,
  meta,
  active,
  onSelect,
}: {
  label: string;
  meta?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors',
        active
          ? 'bg-accent-soft font-medium text-accent-ink'
          : 'text-ink-muted hover:bg-surface-sunken hover:text-foreground',
      )}
    >
      <span className="truncate">{label}</span>
      {active ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : (
        meta && <span className="shrink-0 text-[12px] tabular-nums text-ink-subtle">{meta}</span>
      )}
    </button>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken py-1.5 pl-3.5 pr-2 text-[13px] font-medium text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-background hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
