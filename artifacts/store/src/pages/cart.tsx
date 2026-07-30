import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useGetCart, 
  useUpdateCartItem, 
  useRemoveCartItem, 
  getGetCartQueryKey 
} from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, LogIn } from 'lucide-react';

export function Cart() {
  const sessionId = getCartSessionId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: cart, isLoading } = useGetCart(sessionId, { 
    query: { enabled: !!sessionId } 
  });

  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateItem.mutate(
      { sessionId, itemId, data: { quantity: newQuantity } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey(sessionId) });
        }
      }
    );
  };

  const handleRemoveItem = (itemId: number) => {
    removeItem.mutate(
      { sessionId, itemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey(sessionId) });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
          <div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-4xl text-center">
        <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet. Discover our premium products and start shopping.
        </p>
        <Link href="/shop">
          <Button size="lg" className="rounded-full h-14 px-8 font-semibold">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart <span className="text-muted-foreground text-xl font-normal ml-2">({cart.itemCount} items)</span></h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.items.map((item) => (
            <Card key={item.id} className="rounded-2xl border-none shadow-sm bg-background overflow-hidden relative">
              <CardContent className="p-0 flex flex-col sm:flex-row">
                <div className="w-full sm:w-40 h-40 bg-secondary/30 flex items-center justify-center flex-shrink-0 p-4">
                  {item.productImage ? (
                    <img src={item.productImage} alt={item.productName} className="w-full h-full object-contain mix-blend-multiply" />
                  ) : (
                    <div className="text-xs text-muted-foreground uppercase">No image</div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <Link href={`/product/${item.productId}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
                        {item.productName}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.variantName}
                      </div>
                    </div>
                    <div className="text-right font-bold text-lg whitespace-nowrap">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center border rounded-full bg-background">
                      <button 
                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updateItem.isPending}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button 
                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stockCount || updateItem.isPending}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removeItem.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl border-none shadow-md bg-card sticky top-24">
            <CardContent className="p-8">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(cart.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium text-success">Free</span>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="flex justify-between items-end mb-2">
                <span className="font-bold text-lg">Total</span>
                <span className="font-black text-2xl">{formatCurrency(cart.total)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-8 text-right">All prices include VAT</p>

              <Button
                size="lg"
                className="w-full h-14 rounded-full font-bold text-base hover-elevate"
                onClick={() => user ? setLocation('/checkout') : setLocation('/auth/login?redirect=/checkout')}
              >
                {user ? (
                  <>Proceed to Checkout <ArrowRight className="w-5 h-5 ml-2" /></>
                ) : (
                  <>Sign in to Checkout <LogIn className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
