import { useEffect, useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  useGetAdminOrder,
  useUpdateAdminOrder,
  useAddAdminOrderNote,
  useVerifyAdminOrderPayment,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { statusLabel } from '@/lib/order-status';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Loader2 } from 'lucide-react';

const STATUSES = [
  'order_received',
  'payment_confirmed',
  'payment_on_delivery',
  'processing',
  'ready_for_dispatch',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export function AdminOrderDetail() {
  const [, params] = useRoute('/admin/orders/:id');
  const id = Number(params?.id);
  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useGetAdminOrder(id, {
    query: {
      queryKey: [`/api/admin/orders/${id}`],
      enabled: Number.isFinite(id) && id > 0,
    },
  });
  const update = useUpdateAdminOrder();
  const addNote = useAddAdminOrderNote();
  const verifyPayment = useVerifyAdminOrderPayment();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!order) return;
    setStatus(order.status);
    setCarrier(order.carrier ?? '');
    setTrackingNumber(order.trackingNumber ?? '');
    setTrackingUrl(order.trackingUrl ?? '');
  }, [order]);

  const refresh = () =>
    qc.invalidateQueries({ queryKey: [`/api/admin/orders/${id}`] });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-background p-8 text-center">
        <p className="font-medium">Invalid order</p>
        <Link href="/admin/orders" className="mt-3 inline-block text-accent-ink hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="rounded-2xl border border-hairline bg-background p-8 text-center">
        <p className="font-medium">Could not load order</p>
        <p className="mt-2 text-sm text-ink-muted">
          {error instanceof Error ? error.message : 'Order not found or access denied.'}
        </p>
        <Link href="/admin/orders" className="mt-3 inline-block text-accent-ink hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/orders" className="text-sm text-accent-ink hover:underline">
          ← Orders
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Order #{order.id}</h1>
        <p className="mt-1 text-ink-muted">
          {statusLabel(order.status)} · {order.paymentStatus} · GHS{' '}
          {order.total.toLocaleString('en-GH')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-hairline bg-background p-5">
          <h2 className="font-semibold">Customer & delivery</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-ink-muted">User</dt>
              <dd>{order.userId ?? 'Guest'}</dd>
            </div>
            {order.address ? (
              <>
                <div>
                  <dt className="text-ink-muted">Digital address</dt>
                  <dd>{order.address.digitalAddress}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Region / district</dt>
                  <dd>
                    {order.address.region} · {order.address.district}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Delivery zone</dt>
                  <dd>
                    {order.deliveryRegion === 'accra'
                      ? 'Accra'
                      : order.deliveryRegion === 'outside_accra'
                        ? 'Outside Accra'
                        : (order.deliveryRegion ?? '—')}
                  </dd>
                </div>
                {order.address.notes ? (
                  <div>
                    <dt className="text-ink-muted">Delivery notes</dt>
                    <dd>{order.address.notes}</dd>
                  </div>
                ) : null}
              </>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-hairline bg-background p-5">
          <h2 className="font-semibold">Tracking</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Update fulfillment status and shipment tracking for the customer.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <label className="text-sm">
              <span className="text-ink-muted">Fulfillment status</span>
              <select
                value={status || order.status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Carrier</span>
              <input
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. Ghana Post, in-house courier"
                className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Tracking number</span>
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Parcel / waybill code"
                className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="text-ink-muted">Tracking URL (optional)</span>
              <input
                type="url"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={update.isPending}
              onClick={async () => {
                try {
                  await update.mutateAsync({
                    id,
                    data: {
                      status: status || order.status,
                      carrier: carrier.trim() || null,
                      trackingNumber: trackingNumber.trim() || null,
                      trackingUrl: trackingUrl.trim() || null,
                    },
                  });
                  toast({ title: 'Tracking saved' });
                  await refresh();
                } catch (err) {
                  toast({
                    title: 'Update failed',
                    description: err instanceof Error ? err.message : undefined,
                    variant: 'destructive',
                  });
                }
              }}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
            >
              Save tracking
            </button>
          </div>
        </section>
      </div>

      {order.paymentMethod === 'momo_manual' && (
        <section className="rounded-2xl border border-hairline bg-background p-5">
          <h2 className="font-semibold">Mobile Money payment</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Payment status</dt>
              <dd className="mt-1 font-medium capitalize">{order.paymentStatus}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">MoMo reference</dt>
              <dd className="mt-1 font-mono font-semibold">
                {order.momoReference || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Submitted at</dt>
              <dd className="mt-1">
                {order.paymentSubmittedAt
                  ? new Date(order.paymentSubmittedAt).toLocaleString('en-GH')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Verified at</dt>
              <dd className="mt-1">
                {order.paymentVerifiedAt
                  ? new Date(order.paymentVerifiedAt).toLocaleString('en-GH')
                  : '—'}
              </dd>
            </div>
          </dl>

          {order.duplicateMomoReference && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              This MoMo reference also appears on another order. Verify carefully before
              confirming.
            </p>
          )}

          {order.paymentStatus === 'submitted' && (
            <button
              type="button"
              disabled={verifyPayment.isPending}
              onClick={async () => {
                try {
                  const result = await verifyPayment.mutateAsync({ id });
                  toast({
                    title: result.warning
                      ? 'Payment verified (duplicate reference)'
                      : 'Payment verified',
                    description: result.warning ?? undefined,
                  });
                  await refresh();
                  await qc.invalidateQueries({ queryKey: ['/api/admin/orders'] });
                } catch (err) {
                  toast({
                    title: 'Verification failed',
                    description: err instanceof Error ? err.message : undefined,
                    variant: 'destructive',
                  });
                }
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              {verifyPayment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify Payment
            </button>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-hairline bg-background p-5">
        <h2 className="font-semibold">Line items</h2>
        <ul className="mt-4 divide-y divide-hairline">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {item.productName} · {item.variantName} × {item.quantity}
              </span>
              <span>GHS {(item.unitPrice * item.quantity).toLocaleString('en-GH')}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-hairline pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd>
              GHS{' '}
              {Math.max(0, order.total - (order.deliveryFee ?? 0)).toLocaleString('en-GH')}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">
              Delivery
              {order.deliveryRegion === 'accra'
                ? ' (Accra)'
                : order.deliveryRegion === 'outside_accra'
                  ? ' (Outside Accra)'
                  : ''}
            </dt>
            <dd>GHS {(order.deliveryFee ?? 0).toLocaleString('en-GH')}</dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold">
            <dt>Total</dt>
            <dd>GHS {order.total.toLocaleString('en-GH')}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-background p-5">
          <h2 className="font-semibold">Internal notes</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(order.notes ?? []).map((n) => (
              <li key={n.id} className="rounded-lg bg-surface-sunken px-3 py-2">
                <p>{n.body}</p>
                <p className="mt-1 text-xs text-ink-subtle">
                  {new Date(n.createdAt).toLocaleString('en-GH')}
                </p>
              </li>
            ))}
          </ul>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!note.trim()) return;
              await addNote.mutateAsync({ id, data: { body: note.trim() } });
              setNote('');
              await refresh();
            }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add note…"
              className="flex-1 rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            >
              Add
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-hairline bg-background p-5">
          <h2 className="font-semibold">Status history</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {(order.history ?? []).map((h) => (
              <li key={h.id}>
                <span className="font-medium">
                  {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ''}
                  {statusLabel(h.toStatus)}
                </span>
                <span className="ml-2 text-ink-subtle">
                  {new Date(h.createdAt).toLocaleString('en-GH')}
                </span>
              </li>
            ))}
            {(order.history ?? []).length === 0 ? (
              <li className="text-ink-muted">No transitions yet.</li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
