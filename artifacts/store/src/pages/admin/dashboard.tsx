import { Link } from 'wouter';
import { useGetAdminDashboard } from '@workspace/api-client-react';
import { Loader2 } from 'lucide-react';

function Metric({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <div className="rounded-2xl border border-hairline bg-background p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 text-ink-muted">Live snapshot of store operations.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric
          label="Revenue (all time)"
          value={`GHS ${data.revenue.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`}
          href="/admin/analytics"
        />
        <Metric label="Total orders" value={data.totalOrders} href="/admin/orders" />
        <Metric label="Pending orders" value={data.pendingOrders} href="/admin/orders" />
        <Metric label="Products" value={data.productCount} href="/admin/products" />
        <Metric
          label="Unpublished products"
          value={data.unpublishedProducts}
          href="/admin/products"
        />
        <Metric
          label="Low-stock variants"
          value={data.lowStockVariants}
          href="/admin/inventory"
        />
      </div>
    </div>
  );
}
