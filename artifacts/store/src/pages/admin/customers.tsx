import { useState } from 'react';
import { Link } from 'wouter';
import { useListAdminCustomers } from '@workspace/api-client-react';
import { Loader2 } from 'lucide-react';

export function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAdminCustomers({
    search: search || undefined,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-2 text-ink-muted">Profiles rolled up from order history.</p>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search by user id or email…"
        className="w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
      />

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-hairline bg-background">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-hairline text-ink-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Spent</th>
                  <th className="px-4 py-3 font-medium">Last order</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.userId} className="border-b border-hairline last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${encodeURIComponent(c.userId)}`}
                        className="font-medium text-accent-ink hover:underline"
                      >
                        {c.email ?? c.userId.slice(0, 8) + '…'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.status}</td>
                    <td className="px-4 py-3">{c.orderCount}</td>
                    <td className="px-4 py-3">
                      GHS {c.totalSpent.toLocaleString('en-GH')}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {c.lastOrderAt
                        ? new Date(c.lastOrderAt).toLocaleDateString('en-GH')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-muted">
              Page {data.page} / {Math.max(1, data.totalPages)}
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
