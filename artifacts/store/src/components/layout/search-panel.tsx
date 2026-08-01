import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useLocation } from 'wouter';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Tag,
} from 'lucide-react';
import { useListProducts, useListFeaturedProducts } from '@workspace/api-client-react';
import type { ProductSummary } from '@workspace/api-client-react';
import { cn, formatCurrency } from '@/lib/utils';
import { POPULAR_SEARCHES, TRENDING_SEARCHES } from '@/lib/catalog';
import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
} from '@/lib/recent-searches';

type Option =
  | { kind: 'term'; value: string }
  | { kind: 'product'; value: string; product: ProductSummary };

export function SearchPanel({
  variant = 'desktop',
  autoFocus = false,
  onDismiss,
  className,
}: {
  variant?: 'desktop' | 'mobile';
  autoFocus?: boolean;
  onDismiss?: () => void;
  className?: string;
}) {
  const [, navigate] = useLocation();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounce so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(id);
  }, [query]);

  const hasQuery = debounced.length >= 2;

  const { data: results, isFetching } = useListProducts(
    { search: debounced, limit: 6 },
    { query: { enabled: open && hasQuery, queryKey: ['search', debounced] } },
  );

  const { data: featured } = useListFeaturedProducts({
    query: { enabled: open && !hasQuery, queryKey: ['featured-products'] },
  });

  const products = results?.products ?? [];
  const trendingProducts = useMemo(() => featured?.slice(0, 4) ?? [], [featured]);

  /** Term suggestions completed from the popular list as the shopper types. */
  const suggestions = useMemo(() => {
    if (!hasQuery) return [];
    const q = debounced.toLowerCase();
    return POPULAR_SEARCHES.filter((t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(
      0,
      4,
    );
  }, [debounced, hasQuery]);

  /** Flattened list drives arrow-key navigation across both groups. */
  const options = useMemo<Option[]>(() => {
    if (!hasQuery) return [];
    return [
      ...suggestions.map((value) => ({ kind: 'term' as const, value })),
      ...products.map((product) => ({
        kind: 'product' as const,
        value: product.name,
        product,
      })),
    ];
  }, [hasQuery, suggestions, products]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [debounced]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    onDismiss?.();
  }, [onDismiss]);

  const runSearch = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) return;
      setRecent(addRecentSearch(clean));
      setQuery('');
      close();
      navigate(`/shop?q=${encodeURIComponent(clean)}`);
    },
    [close, navigate],
  );

  const openProduct = useCallback(
    (product: ProductSummary) => {
      setRecent(addRecentSearch(product.name));
      setQuery('');
      close();
      navigate(`/product/${product.id}`);
    },
    [close, navigate],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      query ? setQuery('') : close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((i) => (i + dir + options.length) % options.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const active = options[activeIndex];
      if (active?.kind === 'product') openProduct(active.product);
      else if (active?.kind === 'term') runSearch(active.value);
      else runSearch(query);
    }
  };

  // Dismiss on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {/* ── Input ── */}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
      >
        <div
          className={cn(
            'relative flex items-center rounded-full border transition-all duration-300',
            open
              ? 'border-accent bg-background shadow-[var(--shadow-md)]'
              : 'border-transparent bg-surface-sunken hover:bg-surface-sunken/70',
          )}
        >
          <Search
            className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-ink-subtle"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={
              variant === 'mobile'
                ? 'Search products'
                : 'Search products, brands and categories'
            }
            aria-label="Search products"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
            role="combobox"
            className="h-12 w-full bg-transparent pl-12 pr-24 text-[15px] text-foreground outline-none placeholder:text-ink-subtle"
          />

          <div className="absolute right-2 flex items-center gap-1">
            {isFetching && hasQuery && (
              <Loader2 className="h-4 w-4 animate-spin text-ink-subtle" aria-hidden="true" />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="flex h-9 items-center rounded-full bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* ── Suggestion panel ── */}
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          className={cn(
            'absolute inset-x-0 top-[calc(100%+0.625rem)] z-50 overflow-hidden rounded-3xl border border-hairline bg-popover shadow-[var(--shadow-xl)]',
            'max-h-[min(32rem,70vh)] overflow-y-auto',
          )}
        >
          {hasQuery ? (
            <div className="p-2">
              {suggestions.length > 0 && (
                <Group label="Suggestions">
                  {suggestions.map((term, i) => (
                    <Row
                      key={term}
                      id={`${listboxId}-opt-${i}`}
                      active={activeIndex === i}
                      onSelect={() => runSearch(term)}
                      onHover={() => setActiveIndex(i)}
                      icon={<Search className="h-4 w-4 text-ink-subtle" />}
                    >
                      <Highlight text={term} query={debounced} />
                    </Row>
                  ))}
                </Group>
              )}

              {products.length > 0 && (
                <Group label="Products">
                  {products.map((product, i) => {
                    const index = suggestions.length + i;
                    return (
                      <Row
                        key={product.id}
                        id={`${listboxId}-opt-${index}`}
                        active={activeIndex === index}
                        onSelect={() => openProduct(product)}
                        onHover={() => setActiveIndex(index)}
                        icon={
                          product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt=""
                              className="h-10 w-10 rounded-lg bg-surface-sunken object-contain p-1"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded-lg bg-surface-sunken" />
                          )
                        }
                        trailing={
                          <span className="text-[13px] font-semibold tabular-nums text-foreground">
                            {formatCurrency(product.basePrice)}
                          </span>
                        }
                      >
                        <span className="block truncate">
                          <Highlight text={product.name} query={debounced} />
                        </span>
                        {product.brandName && (
                          <span className="mt-0.5 block text-caption text-ink-subtle">
                            {product.brandName}
                          </span>
                        )}
                      </Row>
                    );
                  })}
                </Group>
              )}

              {!isFetching && !products.length && !suggestions.length && (
                <div className="px-4 py-10 text-center">
                  <p className="text-[15px] font-medium text-foreground">
                    No matches for “{debounced}”
                  </p>
                  <p className="mt-1.5 text-caption text-ink-muted">
                    Try a different spelling or browse all products.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => runSearch(query)}
                className="mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-[14px] font-medium text-accent-ink transition-colors hover:bg-accent-soft"
              >
                See all results for “{debounced}”
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="p-2">
              {recent.length > 0 && (
                <Group
                  label="Recent"
                  action={
                    <button
                      type="button"
                      onClick={() => setRecent(clearRecentSearches())}
                      className="text-[12px] font-medium text-ink-subtle transition-colors hover:text-foreground"
                    >
                      Clear
                    </button>
                  }
                >
                  {recent.map((term) => (
                    <Row
                      key={term}
                      onSelect={() => runSearch(term)}
                      icon={<Clock className="h-4 w-4 text-ink-subtle" />}
                    >
                      {term}
                    </Row>
                  ))}
                </Group>
              )}

              <Group label="Trending searches">
                <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
                  {TRENDING_SEARCHES.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runSearch(term)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:border-transparent hover:bg-accent-soft hover:text-accent-ink"
                    >
                      <TrendingUp className="h-3.5 w-3.5 text-ink-subtle" />
                      {term}
                    </button>
                  ))}
                </div>
              </Group>

              <Group label="Popular right now">
                <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
                  {POPULAR_SEARCHES.slice(0, 6).map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runSearch(term)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-accent-ink"
                    >
                      <Tag className="h-3.5 w-3.5 text-ink-subtle" />
                      {term}
                    </button>
                  ))}
                </div>
              </Group>

              {trendingProducts.length > 0 && (
                <Group label="Trending products">
                  {trendingProducts.map((product) => (
                    <Row
                      key={product.id}
                      onSelect={() => openProduct(product)}
                      icon={
                        product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt=""
                            className="h-10 w-10 rounded-lg bg-surface-sunken object-contain p-1"
                          />
                        ) : (
                          <span className="h-10 w-10 rounded-lg bg-surface-sunken" />
                        )
                      }
                      trailing={
                        <span className="text-[13px] font-semibold tabular-nums text-foreground">
                          {formatCurrency(product.basePrice)}
                        </span>
                      }
                    >
                      <span className="block truncate">{product.name}</span>
                    </Row>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between px-4 pb-1.5 pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          {label}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  id,
  active,
  icon,
  trailing,
  children,
  onSelect,
  onHover,
}: {
  id?: string;
  active?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  onSelect: () => void;
  onHover?: () => void;
}) {
  return (
    <button
      id={id}
      role="option"
      aria-selected={!!active}
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-[14px] text-foreground transition-colors',
        active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
    </button>
  );
}

/** Bolds the matched span so scanning results feels instant. */
function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-foreground">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}
