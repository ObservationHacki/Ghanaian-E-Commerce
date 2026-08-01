import { useState } from 'react';
import {
  useListAdminInventory,
  useUpdateAdminInventory,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminInventory() {
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(true);
  const { data, isLoading } = useListAdminInventory({
    search: search || undefined,
    lowStock: lowOnly ? '5' : undefined,
  });
  const update = useUpdateAdminInventory();
  const qc = useQueryClient();
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-2 text-ink-muted">Adjust variant stock levels.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU or product…"
          className="flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(e) => setLowOnly(e.target.checked)}
          />
          Low stock only (≤ 5)
        </label>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-background">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Update</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.productName}</div>
                    <div className="text-xs text-ink-subtle">{row.variantName}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                  <td className="px-4 py-3">{row.stockCount}</td>
                  <td className="px-4 py-3">
                    <form
                      className="flex gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const stockCount = Number(fd.get('stock'));
                        await update.mutateAsync({
                          variantId: row.id,
                          data: { stockCount },
                        });
                        toast({ title: 'Stock updated' });
                        await qc.invalidateQueries({
                          queryKey: ['/api/admin/inventory'],
                        });
                      }}
                    >
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue={row.stockCount}
                        className="w-24 rounded-lg border border-hairline bg-surface-sunken px-2 py-1"
                      />
                      <button type="submit" className="text-accent-ink">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
