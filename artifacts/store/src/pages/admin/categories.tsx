import { useState } from 'react';
import {
  useListAdminCategories,
  useCreateAdminCategory,
  useUpdateAdminCategory,
  useDeleteAdminCategory,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminCategories() {
  const { data, isLoading } = useListAdminCategories();
  const create = useCreateAdminCategory();
  const update = useUpdateAdminCategory();
  const del = useDeleteAdminCategory();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['/api/admin/categories'] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-2 text-ink-muted">Organize the catalogue tree.</p>
      </div>

      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await create.mutateAsync({ data: { name } });
          setName('');
          toast({ title: 'Category created' });
          await refresh();
        }}
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
        >
          Add
        </button>
      </form>

      {isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : (
        <ul className="divide-y divide-hairline rounded-2xl border border-hairline bg-background">
          {data.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-ink-subtle">
                  {c.slug} · {c.productCount} products
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const next = window.prompt('Rename category', c.name);
                    if (!next) return;
                    await update.mutateAsync({ id: c.id, data: { name: next } });
                    await refresh();
                  }}
                  className="text-accent-ink"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${c.name}?`)) return;
                    await del.mutateAsync({ id: c.id });
                    await refresh();
                  }}
                  className="text-destructive"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
