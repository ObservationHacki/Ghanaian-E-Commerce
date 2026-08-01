import { Link } from 'wouter';
import { format } from 'date-fns';
import { useListMyOrders } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { cn, formatCurrency } from '@/lib/utils';
import { statusLabel, statusTone } from '@/lib/order-status';
import { AccountShell } from '@/components/layout/account-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ChevronRight } from 'lucide-react';

export function Orders() {
  const { user } = useAuth();
  const { data: orders, isLoading } = useListMyOrders({
    query: { enabled: !!user, queryKey: ['my-orders'] },
  });

  return (
    <AccountShell
      title="Orders"
      description={
        orders?.length
          ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} placed`
          : 'Track everything you have bought'
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-surface-sunken px-6 py-24 text-center">
          <Package className="h-10 w-10 text-ink-subtle" strokeWidth={1.4} />
          <h2 className="mt-6 text-title text-foreground">No orders yet</h2>
          <p className="mt-3 max-w-sm text-[15px] text-ink-muted text-pretty">
            When you place your first order it will appear here with live delivery updates.
          </p>
          <Button variant="accent" size="pill" className="mt-8" asChild>
            <Link href="/shop">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="group flex items-center gap-5 rounded-3xl border border-hairline p-5 transition-all duration-300 hover:border-transparent hover:shadow-[var(--shadow-md)] sm:p-6"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-sunken text-ink-muted">
                  <Package className="h-5 w-5" strokeWidth={1.7} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="text-[16px] font-medium text-foreground">Order #{order.id}</p>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                        statusTone(order.status),
                      )}
                    >
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-caption text-ink-muted">
                    {format(new Date(order.createdAt), 'd MMM yyyy')} · {order.items.length}{' '}
                    {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="whitespace-nowrap text-[17px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(order.total)}
                  </span>
                  <ChevronRight className="h-5 w-5 text-ink-subtle transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
