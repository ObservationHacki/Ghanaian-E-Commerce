import { Link } from 'wouter';
import { useListMyOrders } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  order_received: 'Order Received',
  payment_confirmed: 'Payment Confirmed',
  payment_on_delivery: 'Pay on Delivery',
  processing: 'Processing',
  dispatch: 'Ready for Dispatch',
  delivering: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  order_received: 'bg-blue-100 text-blue-700',
  payment_confirmed: 'bg-green-100 text-green-700',
  payment_on_delivery: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-purple-100 text-purple-700',
  dispatch: 'bg-orange-100 text-orange-700',
  delivering: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function Orders() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useListMyOrders({
    query: { enabled: !!user },
  });

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Skeleton className="h-10 w-40 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-4xl text-center">
        <h1 className="text-2xl font-bold mb-4">Sign in to view your orders</h1>
        <p className="text-muted-foreground mb-8">
          Create an account or sign in to track your orders.
        </p>
        <Link href="/auth/login">
          <Button size="lg" className="rounded-full">Sign In</Button>
        </Link>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-4xl text-center">
        <div className="w-20 h-20 bg-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-9 h-9 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-3">No orders yet</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          You haven't placed any orders. Start shopping to see your order history here.
        </p>
        <Link href="/shop">
          <Button size="lg" className="rounded-full">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="block group">
            <Card className="rounded-2xl border-none shadow-sm hover:shadow-md transition-all bg-card cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-base">Order #{order.id}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')} · {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        STATUS_COLORS[order.status] ?? 'bg-secondary text-foreground'
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
