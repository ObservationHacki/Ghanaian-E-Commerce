import { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useGetOrder, useSubmitMomoReference } from '@workspace/api-client-react';
import { cn, formatCurrency } from '@/lib/utils';
import { STATUS_FLOW, statusLabel, statusTone } from '@/lib/order-status';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Check,
  ArrowLeft,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  XCircle,
  Truck,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting payment',
  submitted: 'Verification pending',
  verified: 'Verified',
  paid: 'Paid',
  failed: 'Failed',
  awaiting_collection: 'Pay on delivery',
};

export function OrderDetail() {
  const [, params] = useRoute('/orders/:id');
  const id = params?.id ? Number(params.id) : 0;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [momoReference, setMomoReference] = useState('');
  const submitMomo = useSubmitMomoReference();

  const { data: order, isLoading } = useGetOrder(id, {
    query: { enabled: !!id, queryKey: ['order', id] },
  });

  if (isLoading) {
    return (
      <div className="container-narrow space-y-8 py-12">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
        <h1 className="text-headline text-foreground">Order not found</h1>
        <p className="mt-4 max-w-md text-lede text-ink-muted">
          This order may belong to another account.
        </p>
        <Button variant="accent" size="pill-lg" className="mt-9" asChild>
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const activeStep = currentIndex >= 0 ? currentIndex : 0;
  const paid =
    order.paymentStatus === 'paid' || order.paymentStatus === 'verified';
  const canSubmitMomo =
    order.paymentMethod === 'momo_manual' &&
    (order.paymentStatus === 'pending' || order.paymentStatus === 'submitted');

  const onSubmitMomo = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = momoReference.trim();
    if (ref.length < 3) {
      toast({
        title: 'Reference required',
        description: 'Paste the MoMo transaction ID from your payment.',
        variant: 'destructive',
      });
      return;
    }
    submitMomo.mutate(
      { id: order.id, data: { momoReference: ref } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['order', id] });
          setMomoReference('');
          toast({ title: 'Reference submitted for verification' });
        },
        onError: () => {
          toast({
            title: 'Could not save reference',
            variant: 'destructive',
          });
        },
      },
    );
  };

  return (
    <div className="container-narrow py-8 md:py-12">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-caption font-medium text-ink-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="mt-6 flex flex-col gap-5 border-b border-hairline pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-headline text-foreground">Order #{order.id}</h1>
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-caption font-semibold',
                statusTone(order.status),
              )}
            >
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="mt-2.5 text-[15px] text-ink-muted">
            Placed on {format(new Date(order.createdAt), "d MMMM yyyy 'at' h:mm a")}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-caption text-ink-muted">Order total</p>
          <p className="mt-1 text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-foreground">
            {formatCurrency(order.total)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <section className="mt-10 rounded-3xl bg-surface-sunken p-7 md:p-9">
        <h2 className="text-title text-foreground">
          {cancelled ? 'Order cancelled' : 'Delivery progress'}
        </h2>

        {cancelled ? (
          <p className="mt-4 flex items-center gap-2 text-[15px] text-destructive">
            <XCircle className="h-4 w-4" />
            This order was cancelled. Contact support if you were charged.
          </p>
        ) : (
          <ol className="mt-9 flex flex-col gap-7 md:flex-row md:gap-0">
            {STATUS_FLOW.map((status, i) => {
              const done = i <= activeStep;
              const current = i === activeStep;
              return (
                <li key={status} className="flex flex-1 items-start gap-4 md:flex-col md:gap-0">
                  {/* Marker + connector */}
                  <div className="flex flex-col items-center md:w-full md:flex-row">
                    <span
                      className={cn(
                        'z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                        done
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-background text-ink-subtle',
                      )}
                    >
                      {done ? (
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-current" />
                      )}
                    </span>

                    {i < STATUS_FLOW.length - 1 && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'w-0.5 flex-1 md:h-0.5 md:w-full',
                          i < activeStep ? 'bg-accent' : 'bg-hairline',
                        )}
                        style={{ minHeight: '1.75rem' }}
                      />
                    )}
                  </div>

                  <p
                    className={cn(
                      'text-[14px] md:mt-4 md:pr-4',
                      current
                        ? 'font-semibold text-foreground'
                        : done
                          ? 'text-foreground'
                          : 'text-ink-subtle',
                    )}
                  >
                    {statusLabel(status)}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Items + details */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-14">
        <section>
          <h2 className="text-title text-foreground">
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </h2>

          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-5 py-6">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-surface-sunken p-1">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName ?? ''}
                      className="h-full w-full object-contain object-center"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                      <Package className="h-6 w-6" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-medium text-foreground">{item.productName}</p>
                  {item.variantName && (
                    <p className="mt-1 text-caption text-ink-muted">{item.variantName}</p>
                  )}
                  <p className="mt-1 text-caption text-ink-subtle">Qty {item.quantity}</p>
                </div>

                <p className="whitespace-nowrap text-[16px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-3 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular-nums text-foreground">
                {formatCurrency(
                  Math.max(0, order.total - (order.deliveryFee ?? 0)),
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">
                Delivery
                {order.deliveryRegion === 'accra'
                  ? ' · Accra'
                  : order.deliveryRegion === 'outside_accra'
                    ? ' · Outside Accra'
                    : ''}
              </dt>
              <dd className="tabular-nums text-foreground">
                {formatCurrency(order.deliveryFee ?? 0)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-hairline pt-3">
              <dt className="font-medium text-foreground">Total</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(order.total)}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-8">
          {order.carrier || order.trackingNumber ? (
            <section className="rounded-3xl border border-hairline p-6">
              <h2 className="flex items-center gap-2 text-[16px] font-medium text-foreground">
                <Truck className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.7} />
                Shipment tracking
              </h2>
              <dl className="mt-5 space-y-4">
                {order.carrier ? (
                  <div>
                    <dt className="text-caption text-ink-muted">Carrier</dt>
                    <dd className="mt-1.5 text-[15px] font-medium text-foreground">
                      {order.carrier}
                    </dd>
                  </div>
                ) : null}
                {order.trackingNumber ? (
                  <div>
                    <dt className="text-caption text-ink-muted">Tracking number</dt>
                    <dd className="mt-1.5 font-mono text-[15px] font-semibold tracking-wide text-foreground">
                      {order.trackingNumber}
                    </dd>
                  </div>
                ) : null}
                {order.trackingUrl ? (
                  <div>
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-ink hover:underline"
                    >
                      Track shipment
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}

          <section className="rounded-3xl border border-hairline p-6">
            <h2 className="flex items-center gap-2 text-[16px] font-medium text-foreground">
              <MapPin className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.7} />
              Delivery address
            </h2>
            {order.address ? (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-caption text-ink-muted">Region</p>
                  <p className="mt-1.5 text-[15px] font-medium text-foreground">
                    {order.address.region}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-ink-muted">District</p>
                  <p className="mt-1.5 text-[15px] font-medium text-foreground">
                    {order.address.district}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-ink-muted">GhanaPost GPS</p>
                  <p className="mt-1.5 font-mono text-[15px] font-semibold tracking-wide text-foreground">
                    {order.address.digitalAddress}
                  </p>
                </div>
                {order.address.notes && (
                  <div>
                    <p className="text-caption text-ink-muted">Notes</p>
                    <p className="mt-1.5 text-[14px] text-foreground text-pretty">
                      {order.address.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-[14px] text-ink-muted">No address on file.</p>
            )}
          </section>

          <section className="rounded-3xl border border-hairline p-6">
            <h2 className="flex items-center gap-2 text-[16px] font-medium text-foreground">
              {order.paymentMethod === 'momo_manual' ? (
                <Smartphone className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.7} />
              ) : order.paymentMethod === 'paystack' ? (
                <CreditCard className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.7} />
              ) : (
                <Banknote className="h-[18px] w-[18px] text-accent-ink" strokeWidth={1.7} />
              )}
              Payment
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-caption text-ink-muted">Method</dt>
                <dd className="mt-1.5 text-[15px] text-foreground">
                  {order.paymentMethod === 'momo_manual'
                    ? 'Mobile Money (manual)'
                    : order.paymentMethod === 'paystack'
                      ? 'Mobile money or card'
                      : 'Pay on delivery'}
                </dd>
              </div>
              <div>
                <dt className="text-caption text-ink-muted">Status</dt>
                <dd className="mt-1.5">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                      paid
                        ? 'bg-accent text-accent-foreground'
                        : order.paymentStatus === 'submitted'
                          ? 'bg-accent-soft text-accent-ink'
                          : 'bg-surface-sunken text-ink-muted',
                    )}
                  >
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </span>
                </dd>
              </div>
              {order.momoReference ? (
                <div>
                  <dt className="text-caption text-ink-muted">MoMo reference</dt>
                  <dd className="mt-1.5 font-mono text-[15px] font-semibold text-foreground">
                    {order.momoReference}
                  </dd>
                </div>
              ) : null}
            </dl>

            {canSubmitMomo && (
              <form onSubmit={onSubmitMomo} className="mt-6 space-y-3 border-t border-hairline pt-5">
                <Label htmlFor="order-momo-ref" className="text-[14px] font-medium">
                  {order.momoReference
                    ? 'Update MoMo transaction ID'
                    : 'Submit MoMo transaction ID'}
                </Label>
                <Input
                  id="order-momo-ref"
                  value={momoReference}
                  onChange={(e) => setMomoReference(e.target.value)}
                  placeholder="Transaction / reference ID"
                  className="font-mono"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  variant="accent"
                  size="pill"
                  disabled={submitMomo.isPending}
                  className="w-full"
                >
                  {submitMomo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit for verification
                </Button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
