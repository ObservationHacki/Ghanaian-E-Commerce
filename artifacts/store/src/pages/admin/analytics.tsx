import { useState } from 'react';
import { useGetAdminAnalyticsSummary } from '@workspace/api-client-react';
import { Loader2 } from 'lucide-react';

export function AdminAnalytics() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, isLoading } = useGetAdminAnalyticsSummary({
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 text-ink-muted">Revenue, bestsellers, and regional distribution.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className="text-ink-muted">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="ml-2 rounded-lg border border-hairline bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-ink-muted">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="ml-2 rounded-lg border border-hairline bg-background px-3 py-2"
          />
        </label>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Revenue',
                value: `GHS ${data.revenue.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`,
              },
              { label: 'Orders', value: data.orderCount },
              {
                label: 'AOV',
                value: `GHS ${data.aov.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`,
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-2xl border border-hairline bg-background p-5"
              >
                <p className="text-sm text-ink-muted">{m.label}</p>
                <p className="mt-2 text-3xl font-semibold">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-hairline bg-background p-5">
              <h2 className="font-semibold">Bestsellers</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {data.bestsellers.map((b) => (
                  <li key={b.productId} className="flex justify-between gap-4">
                    <span>{b.productName}</span>
                    <span className="text-ink-muted">
                      {b.unitsSold} sold · GHS {(b.revenue ?? 0).toLocaleString('en-GH')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-hairline bg-background p-5">
              <h2 className="font-semibold">By region</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {data.byRegion.map((r) => (
                  <li key={r.region} className="flex justify-between gap-4">
                    <span>{r.region}</span>
                    <span className="text-ink-muted">
                      {r.count} orders · GHS {(r.revenue ?? 0).toLocaleString('en-GH')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-hairline bg-background p-5">
            <h2 className="font-semibold">Daily revenue</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-ink-muted">
                  <tr>
                    <th className="py-2 font-medium">Day</th>
                    <th className="py-2 font-medium">Orders</th>
                    <th className="py-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.day} className="border-t border-hairline">
                      <td className="py-2">{d.day}</td>
                      <td className="py-2">{d.orderCount}</td>
                      <td className="py-2">
                        GHS {(d.revenue ?? 0).toLocaleString('en-GH')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
