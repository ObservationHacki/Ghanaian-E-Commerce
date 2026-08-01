import { useEffect, useState } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import {
  useGetAdminProduct,
  useCreateAdminProduct,
  useUpdateAdminProduct,
  useDeleteAdminProduct,
  useListAdminCategories,
  useListAdminBrands,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ImageOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { productErrorMessage } from '@/lib/product-error';
import { cn } from '@/lib/utils';

export function AdminProductEdit() {
  const [isNew] = useRoute('/admin/products/new');
  const [, params] = useRoute('/admin/products/:id');
  const id = isNew ? 0 : Number(params?.id);
  const [, setLocation] = useLocation();
  const { data: existing, isLoading } = useGetAdminProduct(id, {
    query: {
      queryKey: ['admin', 'product', id],
      enabled: !isNew && Number.isFinite(id) && id > 0,
    },
  });
  const { data: categories } = useListAdminCategories();
  const { data: brands } = useListAdminBrands();
  const create = useCreateAdminProduct();
  const update = useUpdateAdminProduct();
  const remove = useDeleteAdminProduct();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(true);
  const [sku, setSku] = useState('');
  const [stockCount, setStockCount] = useState('0');
  const [variantPrice, setVariantPrice] = useState('0');
  const [images, setImages] = useState<string[]>(['']);
  const [brokenPreviews, setBrokenPreviews] = useState<Record<number, boolean>>(
    {},
  );

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description);
    setBasePrice(String(existing.basePrice));
    setCompareAtPrice(
      existing.compareAtPrice != null ? String(existing.compareAtPrice) : '',
    );
    setCategoryId(existing.categoryId ?? '');
    setBrandId(existing.brandId ?? '');
    setFeatured(existing.featured);
    setPublished(existing.published);
    setImages(existing.images?.length ? [...existing.images] : ['']);
    setBrokenPreviews({});
    const v = existing.variants[0];
    if (v) {
      setSku(v.sku);
      setStockCount(String(v.stockCount));
      setVariantPrice(String(v.price));
    }
  }, [existing]);

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const setImageAt = (index: number, value: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? value : img)));
    setBrokenPreviews((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addImageRow = () => setImages((prev) => [...prev, '']);

  const removeImageRow = (index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [''];
    });
    setBrokenPreviews({});
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedImages = images.map((u) => u.trim()).filter(Boolean);
    const payload = {
      name,
      description,
      basePrice: Number(basePrice),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      categoryId: categoryId === '' ? null : categoryId,
      brandId: brandId === '' ? null : brandId,
      featured,
      published,
      images: cleanedImages,
      variants: [
        {
          ...(existing?.variants[0]?.id ? { id: existing.variants[0].id } : {}),
          name: 'Default',
          sku: sku || `SKU-${Date.now()}`,
          price: Number(variantPrice || basePrice),
          stockCount: Number(stockCount) || 0,
        },
      ],
    };

    try {
      if (isNew) {
        const created = await create.mutateAsync({ data: payload });
        toast({ title: 'Product created' });
        setLocation(`/admin/products/${created.id}`);
      } else {
        await update.mutateAsync({ id, data: payload });
        await qc.invalidateQueries({ queryKey: ['admin', 'product', id] });
        await qc.invalidateQueries({ queryKey: ['/api/admin/products'] });
        toast({ title: 'Product saved' });
      }
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm(
        `Delete “${name || 'this product'}”? This removes the product and its variants for good.`,
      )
    ) {
      return;
    }
    try {
      await remove.mutateAsync({ id });
      await qc.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({ title: 'Product deleted' });
      setLocation('/admin/products');
    } catch (err) {
      toast({
        title: 'Could not delete product',
        description: productErrorMessage(err),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-accent-ink hover:underline">
          ← Products
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isNew ? 'New product' : 'Edit product'}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-hairline bg-background p-5">
        <label className="block text-sm">
          <span className="text-ink-muted">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
          />
        </label>

        <fieldset className="space-y-3">
          <legend className="text-sm text-ink-muted">Images</legend>
          <p className="text-caption text-ink-subtle">
            Paste a local path (e.g. <code className="text-ink-muted">/products/12/large.webp</code>)
            or a full image URL. The first link is the primary storefront photo.
          </p>
          <ul className="space-y-3">
            {images.map((url, index) => {
              const trimmed = url.trim();
              const showPreview = Boolean(trimmed) && !brokenPreviews[index];
              return (
                <li
                  key={index}
                  className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface-sunken/40 p-3 sm:flex-row sm:items-start"
                >
                  <div className="aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                    {showPreview ? (
                      <img
                        src={trimmed}
                        alt=""
                        className="h-full w-full object-contain object-center"
                        onError={() =>
                          setBrokenPreviews((prev) => ({ ...prev, [index]: true }))
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-subtle">
                        <ImageOff className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block text-sm">
                      <span className="sr-only">
                        Image {index + 1}
                        {index === 0 ? ' (primary)' : ''}
                      </span>
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={
                          index === 0
                            ? 'Primary image URL or /products/… path'
                            : 'Additional image URL'
                        }
                        value={url}
                        onChange={(e) => setImageAt(index, e.target.value)}
                        className="w-full rounded-lg border border-hairline bg-background px-3 py-2 font-mono text-[13px]"
                      />
                    </label>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'text-[11px] font-medium uppercase tracking-wide',
                          index === 0 ? 'text-accent-ink' : 'text-ink-subtle',
                        )}
                      >
                        {index === 0 ? 'Primary' : `Image ${index + 1}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeImageRow(index)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption text-ink-muted transition-colors hover:bg-background hover:text-destructive"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={addImageRow}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-accent hover:text-accent-ink"
          >
            <Plus className="h-4 w-4" />
            Add image link
          </button>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-muted">Base price (GHS)</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Compare-at price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={compareAtPrice}
              onChange={(e) => setCompareAtPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-muted">Category</span>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : '')
              }
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            >
              <option value="">None</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Brand</span>
            <select
              value={brandId}
              onChange={(e) =>
                setBrandId(e.target.value ? Number(e.target.value) : '')
              }
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            >
              <option value="">None</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-ink-muted">SKU</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Variant price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Stock</span>
            <input
              type="number"
              min="0"
              value={stockCount}
              onChange={(e) => setStockCount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
            />
          </label>
        </div>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
        </div>
        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-foreground"
          >
            Save product
          </button>
          {isNew ? null : (
            <button
              type="button"
              disabled={remove.isPending}
              onClick={onDelete}
              className="rounded-full border border-destructive-border px-5 py-2.5 text-sm font-semibold text-destructive disabled:opacity-40"
            >
              {remove.isPending ? 'Deleting…' : 'Delete product'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
