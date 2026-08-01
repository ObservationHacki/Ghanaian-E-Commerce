import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCart,
  useUpdateCartItem,
  useRemoveCartItem,
  getGetCartQueryKey,
} from '@workspace/api-client-react';
import { getCartSessionId } from '@/lib/cart';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  ImageOff,
} from 'lucide-react';

export function Cart() {
  const sessionId = getCartSessionId();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: cart, isLoading } = useGetCart(sessionId, {
    query: { enabled: !!sessionId, queryKey: ['cart', sessionId] },
  });

  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const refreshCart = () => {
    queryClient.invalidateQueries({ queryKey: getGetCartQueryKey(sessionId) });
    queryClient.invalidateQueries({ queryKey: ['cart', sessionId] });
  };

  const setQuantity = (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    updateItem.mutate({ sessionId, itemId, data: { quantity } }, { onSuccess: refreshCart });
  };

  const remove = (itemId: number) => {
    removeItem.mutate({ sessionId, itemId }, { onSuccess: refreshCart });
  };

  if (isLoading) {
    return (
      <div className="container-narrow py-12">
        <Skeleton className="h-10 w-56" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-narrow flex flex-col items-center py-28 text-center md:py-36">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
          <ShoppingBag className="h-8 w-8" strokeWidth={1.4} />
        </span>
        <h1 className="mt-8 text-headline text-foreground">Your bag is empty</h1>
        <p className="mt-4 max-w-md text-lede text-ink-muted text-pretty">
          Once you add something you love, it will show up here ready for checkout.
        </p>
        <Button variant="accent" size="pill-lg" className="mt-9" asChild>
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  const subtotal = cart.total;

  return (
    <div className="container-narrow py-8 md:py-12">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <span className="text-foreground">Bag</span>
      </nav>

      <h1 className="text-headline text-foreground">
        Your bag
        <span className="ml-3 align-middle text-lede font-normal text-ink-muted">
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
        </span>
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-14">
        {/* ── Line items ── */}
        <ul className="divide-y divide-hairline border-y border-hairline">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-5 py-7 sm:gap-7">
              <Link
                href={`/product/${item.productId}`}
                className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-sunken p-1.5 sm:h-32 sm:w-32"
              >
                {item.productImage ? (
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="h-full w-full object-contain object-center"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                    <ImageOff className="h-6 w-6" />
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/product/${item.productId}`}
                      className="text-[17px] font-medium leading-snug text-foreground transition-colors hover:text-accent-ink"
                    >
                      {item.productName}
                    </Link>
                    {item.variantName && (
                      <p className="mt-1 text-caption text-ink-muted">{item.variantName}</p>
                    )}
                    <p className="mt-1 text-caption text-ink-subtle">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-[17px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                  <div className="flex h-10 items-center rounded-full border border-hairline">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updateItem.isPending}
                      aria-label={`Decrease quantity of ${item.productName}`}
                      className="flex h-full w-10 items-center justify-center rounded-l-full text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-30"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-[14px] font-semibold tabular-nums text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stockCount || updateItem.isPending}
                      aria-label={`Increase quantity of ${item.productName}`}
                      className="flex h-full w-10 items-center justify-center rounded-r-full text-foreground transition-colors hover:bg-surface-sunken disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={removeItem.isPending}
                    className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-muted transition-colors hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* ── Summary ── */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-3xl bg-surface-sunken p-7 md:p-8">
            <h2 className="text-title text-foreground">Order summary</h2>

            <dl className="mt-7 space-y-3.5 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {formatCurrency(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Delivery</dt>
                <dd className="font-medium text-ink-muted">Calculated at checkout</dd>
              </div>
            </dl>

            <div className="mt-7 border-t border-hairline pt-6">
              <div className="flex items-baseline justify-between">
                <span className="text-[17px] font-medium text-foreground">Subtotal</span>
                <span className="text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-foreground">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-1.5 text-right text-caption text-ink-subtle">
                Delivery fee added at checkout (Accra / Outside Accra)
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(user ? '/checkout' : '/auth/login?redirect=/checkout')
              }
              className="mt-7 inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              {user ? 'Proceed to checkout' : 'Sign in to checkout'}
              <ArrowRight className="h-[18px] w-[18px]" />
            </button>

            <Link
              href="/shop"
              className="mt-3.5 block text-center text-[14px] font-medium text-ink-muted transition-colors hover:text-foreground"
            >
              Continue shopping
            </Link>
          </div>

          <ul className="mt-6 space-y-3.5 px-2">
            {[
              { Icon: Truck, text: 'Nationwide delivery — flat fee at checkout' },
              { Icon: ShieldCheck, text: 'Secure Mobile Money payments' },
              { Icon: RotateCcw, text: '7-day returns on eligible items' },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-caption text-ink-muted">
                <Icon className="h-4 w-4 shrink-0 text-accent-ink" strokeWidth={1.6} />
                {text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
