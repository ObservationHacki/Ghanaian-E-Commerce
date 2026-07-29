import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useListProducts, useListCategories, useListBrands } from '@workspace/api-client-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SideDrawer } from '@/components/ui/side-drawer';
import { Filter, SlidersHorizontal, X, ChevronRight, Check, Tag, Layers, DollarSign } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'wouter';

type DrawerType = 'categories' | 'brands' | 'price' | null;

export function Shop() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);

  const category = searchParams.get('category') || undefined;
  const brand = searchParams.get('brand') || undefined;
  const sort = (searchParams.get('sort') as string) || 'newest';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;

  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice ?? 0, maxPrice ?? 20000]);
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  const { data: productsData, isLoading } = useListProducts({
    category, brand, sort, minPrice, maxPrice, limit: 20,
  });
  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();

  // ─── filter helpers ────────────────────────────────────────────────────────

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchString);
    if (value) params.set(key, value);
    else params.delete(key);
    setLocation(`${location}?${params.toString()}`);
  };

  const selectCategory = (slug: string | null) => {
    updateFilters('category', slug);
    setActiveDrawer(null);
  };

  const selectBrand = (slug: string | null) => {
    updateFilters('brand', slug);
    setActiveDrawer(null);
  };

  const handlePriceApply = () => {
    const params = new URLSearchParams(searchString);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
    else params.delete('minPrice');
    if (priceRange[1] < 20000) params.set('maxPrice', priceRange[1].toString());
    else params.delete('maxPrice');
    setLocation(`${location}?${params.toString()}`);
    setActiveDrawer(null);
  };

  const clearFilters = () => {
    setLocation(location);
    setPriceRange([0, 20000]);
  };

  const hasFilters = category || brand || minPrice || maxPrice;

  const activeCategoryLabel = categories?.find((c) => c.slug === category)?.name;
  const activeBrandLabel = brands?.find((b) => b.slug === brand)?.name;
  const hasPriceFilter = minPrice != null || maxPrice != null;

  // ─── desktop sidebar ────────────────────────────────────────────────────────

  const SidebarTriggerRow = ({
    icon: Icon,
    label,
    drawer,
    activeLabel,
  }: {
    icon: React.ElementType;
    label: string;
    drawer: DrawerType;
    activeLabel?: string;
  }) => (
    <button
      onClick={() => setActiveDrawer(drawer)}
      className={cn(
        'w-full flex items-center justify-between group px-3 py-2.5 rounded-xl transition-colors text-left',
        activeLabel
          ? 'bg-primary/8 hover:bg-primary/12'
          : 'hover:bg-secondary',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
          activeLabel ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground group-hover:text-foreground',
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className={cn('text-sm font-medium leading-tight', activeLabel ? 'text-primary' : 'text-foreground')}>
            {label}
          </p>
          {activeLabel && (
            <p className="text-xs text-primary/80 truncate mt-0.5">{activeLabel}</p>
          )}
        </div>
      </div>
      <ChevronRight className={cn(
        'w-4 h-4 shrink-0 transition-transform',
        activeLabel ? 'text-primary' : 'text-muted-foreground',
      )} />
    </button>
  );

  const DesktopSidebar = () => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-base tracking-tight">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      <SidebarTriggerRow
        icon={Layers}
        label="Categories"
        drawer="categories"
        activeLabel={activeCategoryLabel}
      />
      <SidebarTriggerRow
        icon={Tag}
        label="Brands"
        drawer="brands"
        activeLabel={activeBrandLabel}
      />
      <SidebarTriggerRow
        icon={DollarSign}
        label="Price Range"
        drawer="price"
        activeLabel={hasPriceFilter ? `${formatCurrency(minPrice ?? 0)} – ${formatCurrency(maxPrice ?? 20000)}` : undefined}
      />
    </div>
  );

  // ─── mobile sheet (kept as-is) ──────────────────────────────────────────────

  const MobileFiltersContent = () => (
    <div className="space-y-8">
      <div className="space-y-4">
        <h4 className="font-medium text-sm">Categories</h4>
        <div className="space-y-2">
          <div
            className={cn('text-sm cursor-pointer hover:text-primary', !category ? 'font-semibold text-primary' : 'text-muted-foreground')}
            onClick={() => selectCategory(null)}
          >
            All Categories
          </div>
          {categories?.map((c) => (
            <div
              key={c.id}
              className={cn('text-sm cursor-pointer hover:text-primary', category === c.slug ? 'font-semibold text-primary' : 'text-muted-foreground')}
              onClick={() => selectCategory(c.slug)}
            >
              {c.name}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm">Brands</h4>
        <div className="space-y-2">
          <div
            className={cn('text-sm cursor-pointer hover:text-primary', !brand ? 'font-semibold text-primary' : 'text-muted-foreground')}
            onClick={() => selectBrand(null)}
          >
            All Brands
          </div>
          {brands?.map((b) => (
            <div
              key={b.id}
              className={cn('text-sm cursor-pointer hover:text-primary', brand === b.slug ? 'font-semibold text-primary' : 'text-muted-foreground')}
              onClick={() => selectBrand(b.slug)}
            >
              {b.name}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm flex justify-between">
          Price Range
          <span className="text-xs text-muted-foreground font-normal">
            {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
          </span>
        </h4>
        <Slider
          value={[priceRange[0], priceRange[1]]}
          max={20000}
          step={100}
          onValueChange={(val) => setPriceRange(val as [number, number])}
          className="my-6"
        />
        <Button onClick={handlePriceApply} variant="outline" className="w-full">Apply Price</Button>
      </div>
    </div>
  );

  // ─── option row used inside drawers ────────────────────────────────────────

  const OptionRow = ({
    label,
    active,
    onClick,
  }: {
    label: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors text-left',
        active
          ? 'bg-primary text-primary-foreground font-semibold'
          : 'hover:bg-secondary text-foreground',
      )}
    >
      <span>{label}</span>
      {active && <Check className="w-4 h-4 shrink-0" />}
    </button>
  );

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Side drawers (desktop) ─────────────────────────────────────── */}

      {/* Categories drawer */}
      <SideDrawer
        open={activeDrawer === 'categories'}
        onClose={() => setActiveDrawer(null)}
        title="Categories"
      >
        <div className="space-y-1">
          <OptionRow
            label="All Categories"
            active={!category}
            onClick={() => selectCategory(null)}
          />
          {categories?.map((c) => (
            <OptionRow
              key={c.id}
              label={c.name}
              active={category === c.slug}
              onClick={() => selectCategory(c.slug)}
            />
          ))}
        </div>
      </SideDrawer>

      {/* Brands drawer */}
      <SideDrawer
        open={activeDrawer === 'brands'}
        onClose={() => setActiveDrawer(null)}
        title="Brands"
      >
        <div className="space-y-1">
          <OptionRow
            label="All Brands"
            active={!brand}
            onClick={() => selectBrand(null)}
          />
          {brands?.map((b) => (
            <OptionRow
              key={b.id}
              label={b.name}
              active={brand === b.slug}
              onClick={() => selectBrand(b.slug)}
            />
          ))}
        </div>
      </SideDrawer>

      {/* Price drawer */}
      <SideDrawer
        open={activeDrawer === 'price'}
        onClose={() => setActiveDrawer(null)}
        title="Price Range"
      >
        <div className="space-y-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>{formatCurrency(priceRange[0])}</span>
              <span>{formatCurrency(priceRange[1])}</span>
            </div>
            <Slider
              value={[priceRange[0], priceRange[1]]}
              max={20000}
              step={100}
              onValueChange={(val) => setPriceRange(val as [number, number])}
              className="my-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>GH₵0</span>
              <span>GH₵20,000</span>
            </div>
          </div>

          <div className="space-y-3">
            {([
              [0, 1000],
              [1000, 3000],
              [3000, 6000],
              [6000, 10000],
              [10000, 20000],
            ] as [number, number][]).map(([lo, hi]) => (
              <button
                key={`${lo}-${hi}`}
                onClick={() => setPriceRange([lo, hi])}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors border',
                  priceRange[0] === lo && priceRange[1] === hi
                    ? 'border-primary bg-primary/8 text-primary font-semibold'
                    : 'border-transparent hover:bg-secondary text-muted-foreground',
                )}
              >
                {formatCurrency(lo)} – {formatCurrency(hi)}
              </button>
            ))}
          </div>

          <Button onClick={handlePriceApply} className="w-full rounded-full">
            Apply Price Filter
          </Button>

          {hasPriceFilter && (
            <button
              onClick={() => { clearFilters(); setActiveDrawer(null); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear price filter
            </button>
          )}
        </div>
      </SideDrawer>

      {/* ── Page layout ───────────────────────────────────────────────── */}
      <div className="container mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">

        {/* Mobile filter bar */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filters {hasFilters && '(Active)'}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="py-6">
                <MobileFiltersContent />
              </div>
            </SheetContent>
          </Sheet>

          <Select value={sort} onValueChange={(val) => updateFilters('sort', val)}>
            <SelectTrigger className="w-[180px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest Arrivals</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <DesktopSidebar />
        </div>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          <div className="hidden md:flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Shop Products</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Showing {productsData?.products.length ?? 0} of {productsData?.total ?? 0} results
              </p>
            </div>
            <Select value={sort} onValueChange={(val) => updateFilters('sort', val)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Arrivals</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category && activeCategoryLabel && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  {activeCategoryLabel}
                  <button onClick={() => selectCategory(null)} aria-label="Remove category filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {brand && activeBrandLabel && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  {activeBrandLabel}
                  <button onClick={() => selectBrand(null)} aria-label="Remove brand filter">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {hasPriceFilter && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                  {formatCurrency(minPrice ?? 0)} – {formatCurrency(maxPrice ?? 20000)}
                  <button
                    onClick={() => { clearFilters(); }}
                    aria-label="Remove price filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : productsData?.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-secondary/30 rounded-2xl border border-dashed">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                We couldn't find any products matching your current filters. Try adjusting your search criteria.
              </p>
              <Button onClick={clearFilters}>Clear All Filters</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productsData?.products.map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="block h-full group">
                  <Card className="h-full border-none shadow-sm overflow-hidden bg-background hover:shadow-lg transition-all rounded-2xl">
                    <div className="aspect-square bg-secondary/50 relative overflow-hidden flex items-center justify-center p-6">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest bg-muted">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <div className="text-xs text-muted-foreground mb-2 font-medium tracking-wide uppercase">
                        {product.brandName}
                      </div>
                      <h3 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors min-h-[40px]">
                        {product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-4">
                        <span className="font-bold">{formatCurrency(product.basePrice)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
