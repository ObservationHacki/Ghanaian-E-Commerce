import { useEffect, useState } from 'react';
import {
  useListAdminContent,
  useUpdateAdminContent,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminContent() {
  const { data, isLoading } = useListAdminContent();
  const update = useUpdateAdminContent();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        title: string;
        body: string;
        imageUrl: string;
        ctaLabel: string;
        ctaHref: string;
        published: boolean;
      }
    >
  >({});

  useEffect(() => {
    if (!data) return;
    const next: typeof drafts = {};
    for (const block of data) {
      next[block.id] = {
        title: block.title,
        body: block.body,
        imageUrl: block.imageUrl ?? '',
        ctaLabel: block.ctaLabel ?? '',
        ctaHref: block.ctaHref ?? '',
        published: block.published,
      };
    }
    setDrafts(next);
  }, [data]);

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
        <h1 className="text-3xl font-semibold tracking-tight">Content</h1>
        <p className="mt-2 text-ink-muted">
          Homepage hero and announcements wired into the storefront.
        </p>
      </div>

      {data.map((block) => {
        const draft = drafts[block.id];
        if (!draft) return null;
        return (
          <form
            key={block.id}
            className="space-y-3 rounded-2xl border border-hairline bg-background p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              await update.mutateAsync({
                id: block.id,
                data: {
                  title: draft.title,
                  body: draft.body,
                  imageUrl: draft.imageUrl || null,
                  ctaLabel: draft.ctaLabel || null,
                  ctaHref: draft.ctaHref || null,
                  published: draft.published,
                },
              });
              toast({ title: `${block.key} saved` });
              await qc.invalidateQueries({ queryKey: ['/api/admin/content'] });
              await qc.invalidateQueries({ queryKey: ['/api/content'] });
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold capitalize">{block.key}</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.published}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [block.id]: { ...draft, published: e.target.checked },
                    }))
                  }
                />
                Published
              </label>
            </div>
            <input
              value={draft.title}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [block.id]: { ...draft, title: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              placeholder="Title"
            />
            <textarea
              value={draft.body}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [block.id]: { ...draft, body: e.target.value },
                }))
              }
              rows={3}
              className="w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              placeholder="Body"
            />
            <input
              value={draft.imageUrl}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [block.id]: { ...draft, imageUrl: e.target.value },
                }))
              }
              className="w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
              placeholder="Image URL"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={draft.ctaLabel}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [block.id]: { ...draft, ctaLabel: e.target.value },
                  }))
                }
                className="rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
                placeholder="CTA label"
              />
              <input
                value={draft.ctaHref}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [block.id]: { ...draft, ctaHref: e.target.value },
                  }))
                }
                className="rounded-lg border border-hairline bg-surface-sunken px-3 py-2 text-sm"
                placeholder="CTA href"
              />
            </div>
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              Save
            </button>
          </form>
        );
      })}
    </div>
  );
}
