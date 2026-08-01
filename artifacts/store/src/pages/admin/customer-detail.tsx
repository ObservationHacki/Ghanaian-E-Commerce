import { useState } from 'react';
import { Link, useRoute } from 'wouter';
import {
  useGetAdminCustomer,
  useUpdateAdminCustomer,
  useAddAdminCustomerNote,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { statusLabel } from '@/lib/order-status';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminCustomerDetail() {
  const [, params] = useRoute('/admin/customers/:userId');
  const userId = decodeURIComponent(params?.userId ?? '');
  const { data, isLoading } = useGetAdminCustomer(userId);
  const update = useUpdateAdminCustomer();
  const addNote = useAddAdminCustomerNote();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [note, setNote] = useState('');

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const refresh = () =>
    qc.invalidateQueries({
      queryKey: [`/api/admin/customers/${userId}`],
    });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/customers" className="text-sm text-accent-ink hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {data.email ?? data.userId}
        </h1>
        <p className="mt-1 text-ink-muted">
          {data.orderCount} orders · GHS {data.totalSpent.toLocaleString('en-GH')} spent
        </p>
      </div>

      <section className="rounded-2xl border border-hairline bg-background p-5">
        <h2 className="font-semibold">Account status</h2>
        <select
          value={data.status}
          onChange={async (e) => {
            await update.mutateAsync({
              userId,
              data: { status: e.target.value as 'active' | 'flagged' | 'disabled' },
            });
            toast({ title: 'Customer status updated' });
            await refresh();
          }}
          className="mt-3 rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="flagged">Flagged</option>
          <option value="disabled">Disabled</option>
        </select>
      </section>

      <section className="rounded-2xl border border-hairline bg-background p-5">
        <h2 className="font-semibold">Orders</h2>
        <ul className="mt-4 divide-y divide-hairline text-sm">
          {data.orders.map((o) => (
            <li key={o.id} className="flex justify-between py-3">
              <Link href={`/admin/orders/${o.id}`} className="text-accent-ink hover:underline">
                #{o.id} · {statusLabel(o.status)}
              </Link>
              <span>GHS {o.total.toLocaleString('en-GH')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-hairline bg-background p-5">
        <h2 className="font-semibold">Addresses</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {data.addresses.map((a) => (
            <li key={a.id}>
              {a.digitalAddress} — {a.region}, {a.district}
            </li>
          ))}
          {data.addresses.length === 0 ? (
            <li className="text-ink-muted">No saved addresses.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-hairline bg-background p-5">
        <h2 className="font-semibold">Support notes</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {data.notes.map((n) => (
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
            await addNote.mutateAsync({ userId, data: { body: note.trim() } });
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
      </section>
    </div>
  );
}
