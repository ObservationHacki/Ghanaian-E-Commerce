import { useState } from 'react';
import { Link } from 'wouter';
import {
  useListAdminProducts,
  useBulkUpdateAdminProducts,
  useUpdateAdminProduct,
  useDeleteAdminProduct,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ImageOff, Loader2 } from 'lucide-react';
import { productErrorMessage } from '@/lib/product-error';

export function AdminProducts() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data, isLoading } = useListAdminProducts({
    search: search || undefined,
    page,
    limit: 20,
  });
  const bulk = useBulkUpdateAdminProducts();
  const update = useUpdateAdminProduct();
  const remove = useDeleteAdminProduct();
  const qc = useQueryClient();
  const { toast } = useToast();

  const refresh = () => qc.invalidateQueries({ queryKey: ['/api/admin/products'] });

  const onDelete = async (id: number, name: string) => {
    if (
      !window.confirm(
        `Delete “${name}”? This removes the product and its variants for good.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await remove.mutateAsync({ id });
      toast({ title: 'Product deleted' });
      setSelected((prev) => prev.filter((s) => s !== id));
      await refresh();
    } catch (err) {
      toast({
        title: 'Could not delete product',
        description: productErrorMessage(err),
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>
          <p className="mt-2 text-ink-muted">
            Catalog CRUD and bulk edits. Excel import remains available via{' '}
            <code className="text-xs">pnpm catalog:import</code>.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          New product
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search products…"
          className="flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!selected.length || bulk.isPending}
          onClick={async () => {
            await bulk.mutateAsync({
              data: {
                updates: selected.map((id) => ({ id, published: true })),
              },
            });
            toast({ title: `Published ${selected.length} products` });
            setSelected([]);
            await refresh();
          }}
          className="rounded-full border border-hairline px-4 py-2 text-sm disabled:opacity-40"
        >
          Publish selected
        </button>
        <button
          type="button"
          disabled={!selected.length || bulk.isPending}
          onClick={async () => {
            await bulk.mutateAsync({
              data: {
                updates: selected.map((id) => ({ id, featured: true })),
              },
            });
            toast({ title: `Featured ${selected.length} products` });
            setSelected([]);
            await refresh();
          }}
          className="rounded-full border border-hairline px-4 py-2 text-sm disabled:opacity-40"
        >
          Feature selected
        </button>
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
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      data.products.length > 0 &&
                      selected.length === data.products.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? data.products.map((p) => p.id) : [],
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Flags</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, p.id]
                            : prev.filter((id) => id !== p.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="aspect-square h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            alt=""
                            className="h-full w-full object-contain object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-ink-subtle">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-ink-subtle">
                          {[p.brandName, p.categoryName].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">GHS {p.basePrice.toLocaleString('en-GH')}</td>
                  <td className="px-4 py-3">{p.stockTotal}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.published ? 'Published' : 'Draft'}
                    {p.featured ? ' · Featured' : ''}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="mr-3 text-ink-muted"
                      onClick={async () => {
                        await update.mutateAsync({
                          id: p.id,
                          data: { published: !p.published },
                        });
                        await refresh();
                      }}
                    >
                      {p.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-accent-ink hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === p.id}
                      className="ml-3 text-destructive hover:underline disabled:opacity-40"
                      onClick={() => onDelete(p.id, p.name)}
                    >
                      {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data ? (
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
      ) : null}
    </div>
  );
}
