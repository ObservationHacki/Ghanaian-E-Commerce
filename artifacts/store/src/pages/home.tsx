import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Truck,
  Mail,
} from 'lucide-react';
import {
  useListProducts,
  useListFeaturedProducts,
  useListCategories,
  useListBrands,
  useListPublicContent,
} from '@workspace/api-client-react';
import { Section, SectionHeader } from '@/components/commerce/section';
import { Reveal } from '@/components/commerce/reveal';
import { ProductGrid, ProductRail } from '@/components/commerce/product-grid';
import { CategoryCard, CategoryCardSkeleton } from '@/components/commerce/category-card';
import { CollectionCard, type Collection } from '@/components/commerce/collection-card';
import { Countdown, useEndOfDay } from '@/components/commerce/countdown';
import { TrustBar } from '@/components/commerce/trust-bar';
import { BrandStrip } from '@/components/commerce/brand-strip';
import { FALLBACK_CATEGORIES, FEATURED_BRANDS } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/seo/page-meta';

const COLLECTIONS: Collection[] = [
  {
    eyebrow: 'Level up',
    title: 'Gaming essentials',
    copy: 'Consoles, headsets and the accessories that win rounds.',
    href: '/shop?category=gaming',
    image:
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=75',
  },
  {
    eyebrow: 'Connected living',
    title: 'Smart home',
    href: '/shop?category=smart-home',
    image:
      'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=900&q=75',
  },
  {
    eyebrow: 'Warm season',
    title: 'Summer collection',
    href: '/shop?category=fashion',
    image:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=75',
  },
  {
    eyebrow: 'Productivity',
    title: 'Work from home',
    href: '/shop?category=laptops',
    image:
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=900&q=75',
    tone: 'light',
  },
  {
    eyebrow: 'Just landed',
    title: 'New tech',
    href: '/shop?sort=newest',
    image:
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=75',
  },
  {
    eyebrow: 'Style edit',
    title: 'Fashion picks',
    href: '/shop?category=fashion',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=75',
  },
];

export function Home() {
  const reduced = useReducedMotion();
  const dealsEnd = useEndOfDay();

  const { data: featured, isLoading: featuredLoading } = useListFeaturedProducts();
  const { data: newest, isLoading: newestLoading } = useListProducts(
    { sort: 'newest', limit: 8 },
    { query: { queryKey: ['products', 'newest'] } },
  );
  const { data: popular, isLoading: popularLoading } = useListProducts(
    { sort: 'popular', limit: 10 },
    { query: { queryKey: ['products', 'popular'] } },
  );
  const { data: categories, isLoading: categoriesLoading } = useListCategories();
  const { data: brands } = useListBrands();
  const { data: contentBlocks } = useListPublicContent();

  const hero = contentBlocks?.find((b) => b.key === 'hero');
  const announcement = contentBlocks?.find((b) => b.key === 'announcement');

  /** Featured picks for the deals rail (real markdowns are not in the API yet). */
  const dealProducts = useMemo(() => {
    const pool = featured?.length ? featured : (popular?.products ?? []);
    return pool.slice(0, 4);
  }, [featured, popular]);

  const categoryCards: Array<{ name: string; slug: string; productCount?: number }> =
    categories?.length
      ? categories.slice(0, 8).map((c) => ({
          name: c.name,
          slug: c.slug,
          productCount: c.productCount,
        }))
      : FALLBACK_CATEGORIES;

  const brandItems = brands?.length
    ? brands.map((b) => ({ name: b.name, slug: b.slug }))
    : FEATURED_BRANDS;

  return (
    <>
      <PageMeta
        title="Premium tech, fashion & home in Ghana"
        description="Shop verified electronics, fashion and home essentials with nationwide delivery. Pay with MTN MoMo or Telecel Cash."
        path="/"
      />
      {/* ─────────────── 3. Hero ─────────────── */}
      <section className="relative overflow-hidden bg-surface-sunken">
        <div className="container-page">
          <div className="grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-32">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {announcement ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-1.5 text-caption font-medium text-accent-ink shadow-[var(--shadow-sm)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {announcement.title}
                  {announcement.body ? ` — ${announcement.body}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-1.5 text-caption font-medium text-accent-ink shadow-[var(--shadow-sm)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Trusted by 10,000+ shoppers in Ghana
                </span>
              )}

              <p className="mt-7 text-display tracking-[-0.04em] text-foreground">VBUY</p>

              <h1 className="mt-4 text-headline text-foreground md:text-[2.75rem] md:leading-[1.1]">
                {hero?.title ? (
                  hero.title
                ) : (
                  <>
                    Premium picks.
                    <br />
                    <span className="text-ink-muted">Delivered nationwide.</span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-md text-lede text-ink-muted text-pretty">
                {hero?.body ||
                  'Verified electronics, fashion and home essentials — with same-day dispatch and payment on your terms.'}
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={hero?.ctaHref || '/shop'}
                  className="inline-flex h-[3.25rem] items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  {hero?.ctaLabel || 'Shop now'}
                </Link>
                <Link
                  href="#categories"
                  className="group inline-flex h-[3.25rem] items-center justify-center gap-2 rounded-full border border-hairline bg-background px-8 text-base font-semibold text-foreground transition-colors hover:bg-background/60"
                >
                  Explore categories
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-5">
                {[
                  { value: '16', label: 'Regions served' },
                  { value: '48h', label: 'Typical delivery' },
                  { value: 'MoMo', label: 'Manual verification' },
                ].map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block text-2xl font-semibold tracking-[-0.02em] text-foreground">
                        {stat.value}
                      </span>
                      <span className="mt-0.5 block text-caption text-ink-muted">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>

            <motion.div
              className="relative"
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="relative overflow-hidden rounded-[2rem] bg-background shadow-[var(--shadow-xl)]">
                <img
                  src={
                    hero?.imageUrl ||
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt={hero?.title || 'Premium wireless headphones'}
                  width={1200}
                  height={900}
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              {/* Floating proof chips */}
              <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-background px-4 py-3 shadow-[var(--shadow-lg)] sm:left-8">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                  <Truck className="h-[18px] w-[18px]" />
                </span>
                <span>
                  <span className="block text-caption font-semibold text-foreground">
                    Nationwide delivery
                  </span>
                  <span className="block text-caption text-ink-muted">Flat fee shown at checkout</span>
                </span>
              </div>

              <div className="absolute -top-4 right-4 hidden items-center gap-2 rounded-2xl bg-background px-4 py-3 shadow-[var(--shadow-lg)] sm:flex">
                <ShieldCheck className="h-[18px] w-[18px] text-accent-ink" />
                <span className="text-caption font-semibold text-foreground">
                  100% verified
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────── Trust ─────────────── */}
      <Section compact>
        <TrustBar />
      </Section>

      {/* ─────────────── 4. Featured categories ─────────────── */}
      <Section tone="sunken" id="categories">
        <SectionHeader
          eyebrow="Browse"
          title="Shop by category"
          description="Eight departments, thousands of verified products — find what you need in a couple of taps."
          href="/shop"
          linkLabel="All departments"
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {categoriesLoading
            ? Array.from({ length: 8 }).map((_, i) => <CategoryCardSkeleton key={i} />)
            : categoryCards.map((cat, i) => (
                <Reveal key={cat.slug} delay={Math.min(i * 0.05, 0.35)} className="h-full">
                  <CategoryCard
                    name={cat.name}
                    slug={cat.slug}
                    productCount={cat.productCount}
                    className="h-full"
                  />
                </Reveal>
              ))}
        </div>
      </Section>

      {/* ─────────────── 5. New arrivals ─────────────── */}
      <Section>
        <SectionHeader
          eyebrow="Just landed"
          title="New arrivals"
          description="The latest additions to the shelves, restocked every week."
          href="/shop?sort=newest"
        />
        <ProductGrid
          products={newest?.products?.slice(0, 4)}
          isLoading={newestLoading}
          columns={4}
        />
      </Section>

      {/* ─────────────── 7. Flash deals ─────────────── */}
      <Section tone="ink">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="text-caption font-semibold uppercase tracking-[0.18em] text-white/55">
                Limited time
              </p>
              <h2 className="mt-3 text-headline text-white">
                Featured picks,
                <br />
                ready to ship
              </h2>
              <p className="mt-4 max-w-sm text-lede text-white/60 text-pretty">
                Hand-picked products from the catalogue. Stock moves quickly — order while they last.
              </p>

              <Countdown target={dealsEnd} invert className="mt-9" />

              <Link
                href="/shop?deals=1"
                className="mt-9 inline-flex h-[3.25rem] items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-[hsl(240_6%_10%)] transition-transform duration-300 hover:-translate-y-0.5"
              >
                Shop all deals
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {(dealProducts.length ? dealProducts : (featured?.slice(0, 4) ?? [])).map(
                (product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="group relative overflow-hidden rounded-3xl bg-white/[0.06] p-5 transition-colors hover:bg-white/[0.1]"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-black/20 p-2">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-contain object-center transition-transform duration-700 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <p className="mt-2 line-clamp-1 text-[14px] font-medium text-white">
                      {product.name}
                    </p>
                    <p className="mt-1 text-caption text-white/50">
                      {product.brandName || product.categoryName}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ─────────────── 6. Best sellers ─────────────── */}
      <Section>
        <SectionHeader
          eyebrow="Loved by Ghana"
          title="Best sellers"
          description="The products our customers keep coming back for."
          href="/shop?sort=popular"
        />
        <ProductRail products={popular?.products?.slice(0, 5)} isLoading={popularLoading} />
      </Section>

      {/* ─────────────── 8. Lifestyle collections ─────────────── */}
      <Section tone="sunken">
        <SectionHeader
          eyebrow="Curated"
          title="Collections to shop"
          description="Edits built around how you actually live, work and play."
        />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Reveal className="md:col-span-2 lg:row-span-2">
            <CollectionCard collection={COLLECTIONS[0]} size="lg" className="h-full" />
          </Reveal>
          {COLLECTIONS.slice(1).map((collection, i) => (
            <Reveal key={collection.title} delay={0.06 * (i + 1)} className="h-full">
              <CollectionCard collection={collection} className="h-full" />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ─────────────── 9. Featured brands ─────────────── */}
      <Section compact>
        <SectionHeader
          eyebrow="Authorised"
          title="Brands we carry"
          description="Every unit sourced through official distributors and verified before dispatch."
          align="center"
        />
        <Reveal>
          <BrandStrip brands={brandItems} />
        </Reveal>
      </Section>

      {/* ─────────────── Newsletter ─────────────── */}
      <Newsletter />
    </>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  return (
    <Section>
      <Reveal>
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink">
            <Mail className="h-5 w-5" strokeWidth={1.6} />
          </span>

          <h2 className="mt-7 text-headline text-foreground">Early access, first dibs</h2>
          <p className="mt-4 text-lede text-ink-muted text-pretty">
            Drops, restocks and member-only pricing — one email a week, no noise.
          </p>

          {subscribed ? (
            <p
              role="status"
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-accent-soft px-5 py-3 text-[15px] font-medium text-accent-ink"
            >
              <Check className="h-4 w-4" />
              You're on the list. Check your inbox to confirm.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSubscribed(true);
              }}
              className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  'h-[3.25rem] flex-1 rounded-full border border-hairline bg-background px-6 text-[15px] text-foreground outline-none transition-colors',
                  'placeholder:text-ink-subtle focus:border-accent',
                )}
              />
              <button
                type="submit"
                className="h-[3.25rem] shrink-0 rounded-full bg-foreground px-8 text-[15px] font-semibold text-background transition-opacity hover:opacity-90"
              >
                Subscribe
              </button>
            </form>
          )}

          <p className="mt-5 text-caption text-ink-subtle">
            Unsubscribe any time. We never share your details.
          </p>
        </div>
      </Reveal>
    </Section>
  );
}
