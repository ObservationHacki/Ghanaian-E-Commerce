import { useState } from 'react';
import {
  useListAdminBrands,
  useCreateAdminBrand,
  useUpdateAdminBrand,
  useDeleteAdminBrand,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminBrands() {
  const { data, isLoading } = useListAdminBrands();
  const create = useCreateAdminBrand();
  const update = useUpdateAdminBrand();
  const del = useDeleteAdminBrand();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['/api/admin/brands'] });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Brands</h1>
        <p className="mt-2 text-ink-muted">Manage brand labels on products.</p>
      </div>

      <form
        className="flex gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await create.mutateAsync({ data: { name } });
          setName('');
          toast({ title: 'Brand created' });
          await refresh();
        }}
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New brand name"
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
          {data.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-ink-subtle">{b.slug}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const next = window.prompt('Rename brand', b.name);
                    if (!next) return;
                    await update.mutateAsync({ id: b.id, data: { name: next } });
                    await refresh();
                  }}
                  className="text-accent-ink"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`Delete ${b.name}?`)) return;
                    await del.mutateAsync({ id: b.id });
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
