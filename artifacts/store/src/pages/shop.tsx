import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useListProducts, useListCategories, useListBrands } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'wouter';

export function Shop() {
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  
  const category = searchParams.get('category') || undefined;
  const brand = searchParams.get('brand') || undefined;
  const sort = (searchParams.get('sort') as any) || 'newest';
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
  
  const [priceRange, setPriceRange] = useState<[number, number]>([minPrice || 0, maxPrice || 20000]);

  const { data: productsData, isLoading } = useListProducts({
    category, brand, sort, minPrice, maxPrice, limit: 20
  });

  const { data: categories } = useListCategories();
  const { data: brands } = useListBrands();

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchString);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setLocation(`${location}?${params.toString()}`);
  };

  const handlePriceApply = () => {
    const params = new URLSearchParams(searchString);
    if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
    else params.delete('minPrice');
    
    if (priceRange[1] < 20000) params.set('maxPrice', priceRange[1].toString());
    else params.delete('maxPrice');
    
    setLocation(`${location}?${params.toString()}`);
  };

  const clearFilters = () => {
    setLocation(location);
    setPriceRange([0, 20000]);
  };

  const hasFilters = category || brand || minPrice || maxPrice;

  const FiltersContent = () => (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Filters</h3>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
              <X className="mr-2 h-3 w-3" /> Clear all
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-sm">Categories</h4>
        <div className="space-y-2">
          <div 
            className={`text-sm cursor-pointer hover:text-primary ${!category ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
            onClick={() => updateFilters('category', null)}
          >
            All Categories
          </div>
          {categories?.map(c => (
            <div 
              key={c.id}
              className={`text-sm cursor-pointer hover:text-primary ${category === c.slug ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
              onClick={() => updateFilters('category', c.slug)}
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
            className={`text-sm cursor-pointer hover:text-primary ${!brand ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
            onClick={() => updateFilters('brand', null)}
          >
            All Brands
          </div>
          {brands?.map(b => (
            <div 
              key={b.id}
              className={`text-sm cursor-pointer hover:text-primary ${brand === b.slug ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
              onClick={() => updateFilters('brand', b.slug)}
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
            {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
          </span>
        </h4>
        <Slider
          defaultValue={[0, 20000]}
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

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row gap-8">
      {/* Mobile Filters */}
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
              <FiltersContent />
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

      {/* Desktop Sidebar Filters */}
      <div className="hidden md:block w-64 flex-shrink-0 border-r pr-8">
        <FiltersContent />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="hidden md:flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop Products</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Showing {productsData?.products.length || 0} of {productsData?.total || 0} results
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => (
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
  );
}
