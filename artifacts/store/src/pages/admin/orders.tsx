import { useState } from 'react';
import { Link } from 'wouter';
import { useListAdminOrders } from '@workspace/api-client-react';
import { statusLabel } from '@/lib/order-status';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';

const PAYMENT_FILTERS = [
  'pending',
  'submitted',
  'verified',
  'paid',
  'failed',
  'awaiting_collection',
] as const;

export function AdminOrders() {
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const verifyQueue = paymentStatus === 'submitted';

  const { data, isLoading, isError, error } = useListAdminOrders({
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    search: search || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-2 text-ink-muted">
          Filter, open an order, then update status and tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPaymentStatus('submitted');
            setStatus('');
            setPage(1);
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
            verifyQueue
              ? 'bg-accent text-accent-foreground'
              : 'border border-hairline bg-background text-foreground hover:border-accent',
          )}
        >
          Payments to Verify
        </button>
        {verifyQueue && (
          <button
            type="button"
            onClick={() => {
              setPaymentStatus('');
              setPage(1);
            }}
            className="rounded-full border border-hairline px-4 py-2 text-sm text-ink-muted"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by order id, user, or MoMo ref…"
          className="flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {[
            'order_received',
            'payment_confirmed',
            'payment_on_delivery',
            'processing',
            'ready_for_dispatch',
            'out_for_delivery',
            'delivered',
            'cancelled',
          ].map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        >
          <option value="">All payments</option>
          {PAYMENT_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-hairline bg-background p-8 text-center">
          <p className="font-medium text-foreground">Could not load orders</p>
          <p className="mt-2 text-sm text-ink-muted">
            {error instanceof Error ? error.message : 'Check that you are signed in as an admin.'}
          </p>
        </div>
      ) : !data?.orders.length ? (
        <div className="rounded-2xl border border-hairline bg-background p-8 text-center text-ink-muted">
          {verifyQueue ? 'No payments waiting for verification.' : 'No orders yet.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-background">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  {verifyQueue ? (
                    <>
                      <th className="px-4 py-3 font-medium">MoMo reference</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Payment</th>
                      <th className="px-4 py-3 font-medium">Region</th>
                    </>
                  )}
                  <th className="px-4 py-3 font-medium">Total</th>
                  {!verifyQueue && (
                    <th className="px-4 py-3 font-medium">Created</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-accent-ink hover:underline"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <span className="line-clamp-1 max-w-[12rem]">
                        {order.userId ?? 'Guest'}
                      </span>
                    </td>
                    {verifyQueue ? (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[13px] font-semibold">
                              {order.momoReference || '—'}
                            </span>
                            {order.duplicateMomoReference && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                Duplicate
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {order.paymentSubmittedAt
                            ? new Date(order.paymentSubmittedAt).toLocaleString('en-GH')
                            : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{statusLabel(order.status)}</td>
                        <td className="px-4 py-3 capitalize">{order.paymentStatus}</td>
                        <td className="px-4 py-3">
                          {[order.region, order.district].filter(Boolean).join(' · ') || '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      GHS {order.total.toLocaleString('en-GH')}
                    </td>
                    {!verifyQueue && (
                      <td className="px-4 py-3 text-ink-muted">
                        {new Date(order.createdAt).toLocaleString('en-GH')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              Page {data.page} of {Math.max(1, data.totalPages)} · {data.total} orders
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-full border border-hairline px-4 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full border border-hairline px-4 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
