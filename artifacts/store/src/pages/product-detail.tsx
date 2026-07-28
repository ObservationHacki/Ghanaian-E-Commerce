import { useState } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useGetProduct, useListRelatedProducts, useAddCartItem } from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Zap, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductVariant } from '@workspace/api-client-react';

export function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const [, setLocation] = useLocation();
  const id = params?.id ? Number(params.id) : 0;
  const sessionId = getCartSessionId();
  const { toast } = useToast();

  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id } });
  const { data: relatedProducts } = useListRelatedProducts(id, { query: { enabled: !!id } });
  
  const addCartItem = useAddCartItem();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Auto-select first variant on load if none selected
  if (product?.variants?.length && !selectedVariantId) {
    setSelectedVariantId(product.variants[0].id);
  }

  const selectedVariant = product?.variants?.find(v => v.id === selectedVariantId) || product?.variants?.[0];
  const price = selectedVariant ? selectedVariant.price : product?.basePrice;
  const inStock = selectedVariant ? selectedVariant.stockCount > 0 : product?.inStock;
  const stockCount = selectedVariant?.stockCount || 0;

  const handleAddToCart = () => {
    if (!selectedVariantId) return;
    addCartItem.mutate(
      { sessionId, data: { productVariantId: selectedVariantId, quantity: 1 } },
      {
        onSuccess: () => {
          toast({
            title: "Added to cart",
            description: `${product?.name} has been added to your cart.`,
          });
        }
      }
    );
  };

  const handleBuyNow = () => {
    if (!selectedVariantId) return;
    addCartItem.mutate(
      { sessionId, data: { productVariantId: selectedVariantId, quantity: 1 } },
      {
        onSuccess: () => {
          setLocation('/checkout');
        }
      }
    );
  };

  const groupVariantsByAttribute = (attribute: 'color' | 'storage' | 'ram' | 'size') => {
    if (!product?.variants) return {};
    const groups: Record<string, ProductVariant[]> = {};
    product.variants.forEach(variant => {
      const val = variant.attributes?.[attribute];
      if (val) {
        if (!groups[val]) groups[val] = [];
        groups[val].push(variant);
      }
    });
    return groups;
  };

  const colors = groupVariantsByAttribute('color');
  const storages = groupVariantsByAttribute('storage');
  const rams = groupVariantsByAttribute('ram');
  const sizes = groupVariantsByAttribute('size');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-6">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="p-20 text-center">Product not found</div>;

  const hasAttributes = Object.keys(colors).length > 0 || Object.keys(storages).length > 0 || Object.keys(rams).length > 0 || Object.keys(sizes).length > 0;

  return (
    <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <Link href={`/shop?category=${product.categoryName?.toLowerCase()}`} className="hover:text-foreground">{product.categoryName}</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground font-medium truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 mb-24">
        {/* Images */}
        <div className="space-y-6">
          <div className="aspect-square bg-secondary/50 rounded-3xl overflow-hidden flex items-center justify-center p-8 relative">
            {product.images?.[activeImageIndex] ? (
              <img 
                src={product.images[activeImageIndex]} 
                alt={product.name} 
                className="w-full h-full object-contain mix-blend-multiply"
              />
            ) : (
              <div className="text-muted-foreground uppercase tracking-widest text-sm">No Image</div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all bg-secondary/30 p-2 ${activeImageIndex === i ? 'border-primary ring-2 ring-primary/20 ring-offset-2' : 'border-transparent hover:border-border'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="mb-2 text-primary font-bold tracking-wider text-sm uppercase">
            {product.brandName}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{product.name}</h1>
          <div className="text-3xl font-light tracking-tight mb-6">
            {formatCurrency(price || 0)}
          </div>

          <div className="prose prose-sm dark:prose-invert text-muted-foreground mb-8">
            <p>{product.description}</p>
          </div>

          {/* Variant Selectors */}
          {hasAttributes ? (
            <div className="space-y-6 mb-8 border-y py-6">
              {Object.keys(colors).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Color</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.keys(colors).map(color => {
                      // Find a variant that matches this color and currently selected other attributes if possible
                      const variant = colors[color][0]; 
                      const isSelected = selectedVariant?.attributes?.color === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${isSelected ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-input hover:border-foreground bg-background'}`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {Object.keys(storages).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Storage</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.keys(storages).map(storage => {
                      const variant = storages[storage][0];
                      const isSelected = selectedVariant?.attributes?.storage === storage;
                      return (
                        <button
                          key={storage}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:border-foreground bg-background'}`}
                        >
                          {storage}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {Object.keys(sizes).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Size</h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.keys(sizes).map(size => {
                      const variant = sizes[size][0];
                      const isSelected = selectedVariant?.attributes?.size === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedVariantId(variant.id)}
                          className={`min-w-12 h-10 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:border-foreground bg-background'}`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : product.variants?.length > 1 ? (
             <div className="space-y-4 mb-8 border-y py-6">
                <h3 className="text-sm font-medium mb-2">Options</h3>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-4 py-3 rounded-xl border text-sm text-left transition-all ${selectedVariantId === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-input hover:border-foreground bg-background'}`}
                    >
                      <div className="font-medium">{v.name}</div>
                      <div className="text-muted-foreground mt-1">{formatCurrency(v.price)}</div>
                    </button>
                  ))}
                </div>
             </div>
          ) : null}

          <div className="flex items-center gap-2 mb-8 text-sm">
            {inStock ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-success font-medium">In Stock</span>
                <span className="text-muted-foreground ml-2">({stockCount} available)</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">Out of Stock</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-auto">
            <Button 
              size="lg" 
              className="flex-1 h-14 rounded-full font-bold text-base bg-foreground text-background hover:bg-foreground/90 hover-elevate"
              disabled={!inStock || addCartItem.isPending}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
            </Button>
            <Button 
              size="lg" 
              className="flex-1 h-14 rounded-full font-bold text-base hover-elevate"
              disabled={!inStock || addCartItem.isPending}
              onClick={handleBuyNow}
            >
              <Zap className="mr-2 h-5 w-5" /> Buy Now
            </Button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="pt-16 border-t">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight">You Might Also Like</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.slice(0, 4).map((related) => (
              <Link key={related.id} href={`/product/${related.id}`} className="block h-full group">
                <Card className="h-full border-none shadow-sm overflow-hidden bg-background hover:shadow-lg transition-all rounded-2xl">
                  <div className="aspect-square bg-secondary/50 relative overflow-hidden flex items-center justify-center p-6">
                    {related.images?.[0] ? (
                      <img 
                        src={related.images[0]} 
                        alt={related.name} 
                        className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs uppercase tracking-widest bg-muted">No image</div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="text-xs text-muted-foreground mb-2 font-medium tracking-wide uppercase">
                      {related.brandName}
                    </div>
                    <h3 className="font-semibold text-base line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                      {related.name}
                    </h3>
                    <div className="font-bold">{formatCurrency(related.basePrice)}</div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
