import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useListFeaturedProducts } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import {
  Smartphone, Laptop, Headphones, Gamepad, Shirt,
  Home as HomeIcon, Watch, ShieldCheck, Truck,
  HeadphonesIcon, Award, Zap, RefreshCw, Star,
  ArrowRight, ChevronLeft, ChevronRight, Clock,
  MessageCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Phones', slug: 'phones', icon: Smartphone, color: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-600' },
  { name: 'Laptops', slug: 'laptops', icon: Laptop, color: 'bg-indigo-50 dark:bg-indigo-950/40', iconColor: 'text-indigo-600' },
  { name: 'Accessories', slug: 'accessories', icon: Headphones, color: 'bg-purple-50 dark:bg-purple-950/40', iconColor: 'text-purple-600' },
  { name: 'Gaming', slug: 'gaming', icon: Gamepad, color: 'bg-red-50 dark:bg-red-950/40', iconColor: 'text-red-500' },
  { name: 'Fashion', slug: 'fashion', icon: Shirt, color: 'bg-pink-50 dark:bg-pink-950/40', iconColor: 'text-pink-500' },
  { name: 'Smart Home', slug: 'smart-home', icon: HomeIcon, color: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600' },
  { name: 'Watches', slug: 'watches', icon: Watch, color: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600' },
];

const TRUST = [
  { icon: Truck, label: 'Nationwide Delivery', sub: 'All regions of Ghana' },
  { icon: ShieldCheck, label: 'Secure Payments', sub: 'MoMo, cards & more' },
  { icon: Award, label: 'Verified Products', sub: '100% authentic items' },
  { icon: RefreshCw, label: 'Easy Returns', sub: '7-day hassle-free' },
  { icon: HeadphonesIcon, label: '24/7 Support', sub: 'Always here to help' },
  { icon: Zap, label: 'Fast Shipping', sub: 'Same-day in Kumasi' },
];

const BRANDS = [
  'Apple', 'Samsung', 'Sony', 'HP', 'Lenovo', 'Nike', 'Xiaomi', 'JBL',
];

const COLLECTIONS = [
  {
    title: 'Gaming Essentials',
    sub: 'Level up your setup',
    href: '/shop?category=gaming',
    img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&q=80&auto=format&fit=crop',
    accent: 'from-red-900/80',
  },
  {
    title: 'Smart Home',
    sub: 'Make life effortless',
    href: '/shop?category=smart-home',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop',
    accent: 'from-emerald-900/80',
  },
  {
    title: 'Fashion Picks',
    sub: 'Style for every moment',
    href: '/shop?category=fashion',
    img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80&auto=format&fit=crop',
    accent: 'from-pink-900/80',
  },
];

const REVIEWS = [
  {
    name: 'Kwame Asante',
    location: 'Kumasi, Ghana',
    rating: 5,
    text: 'Ordered a Samsung Galaxy and it arrived the next morning. Packaging was perfect and the phone is 100% genuine. Best online store in Ghana!',
    initials: 'KA',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    name: 'Abena Mensah',
    location: 'Accra, Ghana',
    rating: 5,
    text: 'I was skeptical about shopping online but Kumasi Store changed everything. Paid with MTN MoMo, got my laptop in 2 days. Will always shop here.',
    initials: 'AM',
    color: 'bg-pink-100 text-pink-700',
  },
  {
    name: 'Kofi Boateng',
    location: 'Takoradi, Ghana',
    rating: 5,
    text: 'The Nike shoes I ordered are the real deal — not some fake. Customer service replied on WhatsApp in minutes. Highly recommended.',
    initials: 'KB',
    color: 'bg-emerald-100 text-emerald-700',
  },
];

// ─── Countdown timer hook ─────────────────────────────────────────────────────
function useCountdown(targetMs: number) {
  const [timeLeft, setTimeLeft] = useState(targetMs);
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(timeLeft / 3_600_000);
  const m = Math.floor((timeLeft % 3_600_000) / 60_000);
  const s = Math.floor((timeLeft % 60_000) / 1_000);
  return { h, m, s };
}

// ─── Reusable fade-in wrapper ─────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <FadeIn className="flex items-end justify-between mb-10 gap-4">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1D1D1F] dark:text-white leading-tight">
          {title}
        </h2>
        {sub && <p className="mt-1.5 text-gray-500 dark:text-gray-400 text-sm">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </FadeIn>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: any; index: number }) {
  const stars = 4 + Math.round((product.id?.charCodeAt?.(0) ?? 0) % 2);
  return (
    <FadeIn delay={index * 0.07}>
      <Link href={`/product/${product.id}`} className="group block">
        <div className="rounded-2xl overflow-hidden bg-[#F5F5F7] dark:bg-white/5 hover:shadow-xl transition-all duration-300">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden bg-[#F5F5F7] dark:bg-white/5 flex items-center justify-center p-6">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                loading="lazy"
                className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-white/10" />
            )}
            {/* Badge */}
            {product.inStock && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide">
                In Stock
              </span>
            )}
          </div>

          {/* Info */}
          <div className="px-5 py-4 bg-white dark:bg-[#1D1D1F]/60">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              {product.categoryName || product.brandName || 'Product'}
            </p>
            <h3 className="font-semibold text-sm text-[#1D1D1F] dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-blue-600 transition-colors">
              {product.name}
            </h3>

            {/* Stars */}
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < stars ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-white/20'}`} />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">{stars}.0</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-[#1D1D1F] dark:text-white">
                {formatCurrency(product.basePrice)}
              </span>
              <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Fast delivery
              </span>
            </div>
          </div>
        </div>
      </Link>
    </FadeIn>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Home() {
  const { data: featuredProducts = [], isLoading } = useListFeaturedProducts();
  const newArrivals = featuredProducts.slice(0, 4);
  const bestSellers = featuredProducts.slice(0, 5);

  // Flash deal countdown: 11h 47m from "now"
  const { h, m, s } = useCountdown(11 * 3_600_000 + 47 * 60_000 + 33_000);

  return (
    <div className="flex flex-col w-full overflow-hidden">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative w-full min-h-[88vh] flex items-center bg-[#1D1D1F] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=80&auto=format&fit=crop"
            alt="Hero background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1D1D1F] via-[#1D1D1F]/80 to-transparent" />
        </div>

        <div className="container mx-auto px-4 md:px-8 relative z-10 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-8 backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Now shipping nationwide · 🇬🇭 Ghana's #1 Premium Store
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
              Premium Tech
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
                & Fashion.
              </span>
            </h1>

            <p className="text-lg text-white/60 mb-10 leading-relaxed max-w-md">
              Ghana's finest electronics, fashion, and lifestyle products. Curated, trusted, and delivered to your door.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/shop">
                <button className="h-13 px-8 py-3.5 rounded-full bg-white text-[#1D1D1F] font-bold text-sm hover:bg-white/90 active:scale-[.98] transition-all shadow-lg hover:shadow-xl">
                  Shop Now
                </button>
              </Link>
              <Link href="/shop">
                <button className="h-13 px-8 py-3.5 rounded-full border border-white/30 text-white font-semibold text-sm hover:bg-white/10 active:scale-[.98] transition-all backdrop-blur-sm">
                  Explore Categories
                </button>
              </Link>
            </div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex items-center gap-6 mt-12 pt-8 border-t border-white/10"
            >
              {[['10K+', 'Happy customers'], ['500+', 'Premium products'], ['48h', 'Delivery time']].map(([val, label]) => (
                <div key={val} className="text-center">
                  <p className="text-2xl font-bold text-white">{val}</p>
                  <p className="text-xs text-white/50 mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Floating product image (desktop) */}
        <motion.div
          initial={{ opacity: 0, x: 60, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute right-8 lg:right-20 top-1/2 -translate-y-1/2 hidden lg:block"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-3xl scale-110" />
            <img
              src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=380&q=90&auto=format&fit=crop"
              alt="Featured product"
              className="relative w-64 xl:w-80 object-contain drop-shadow-2xl rounded-3xl"
            />
          </div>
        </motion.div>
      </section>

      {/* ── 2. TRUST STRIP ──────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1D1D1F] border-b border-gray-100 dark:border-white/10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-100 dark:divide-white/10">
            {TRUST.map((item, i) => (
              <FadeIn key={item.label} delay={i * 0.05}>
                <div className="flex flex-col items-center text-center px-4 py-6 gap-2">
                  <div className="h-9 w-9 rounded-full bg-[#F5F5F7] dark:bg-white/10 flex items-center justify-center">
                    <item.icon className="h-4.5 w-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
                  </div>
                  <p className="text-xs font-bold text-[#1D1D1F] dark:text-white leading-tight">{item.label}</p>
                  <p className="text-[11px] text-gray-400 leading-tight">{item.sub}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#F5F5F7] dark:bg-black/20">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader
            title="Shop by Category"
            sub="Curated selections across every lifestyle"
            href="/shop"
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {CATEGORIES.map((cat, i) => (
              <FadeIn key={cat.slug} delay={i * 0.06}>
                <Link href={`/shop?category=${cat.slug}`} className="group block">
                  <div className={`rounded-2xl p-5 flex flex-col items-center gap-3 text-center cursor-pointer ${cat.color} hover:shadow-md transition-all duration-200 group-hover:-translate-y-1`}>
                    <div className={`h-12 w-12 rounded-2xl bg-white dark:bg-white/10 flex items-center justify-center shadow-sm`}>
                      <cat.icon className={`h-6 w-6 ${cat.iconColor}`} />
                    </div>
                    <span className="text-xs font-semibold text-[#1D1D1F] dark:text-white">{cat.name}</span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. NEW ARRIVALS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-[#1D1D1F]">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader title="New Arrivals" sub="Fresh picks added this week" href="/shop?sort=newest" />

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[1,2,3,4].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100 dark:bg-white/5" />
                  <div className="p-4 space-y-2 bg-white dark:bg-[#1D1D1F]/60">
                    <div className="h-3 bg-gray-100 dark:bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-3/4" />
                    <div className="h-5 bg-gray-100 dark:bg-white/10 rounded w-1/2 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {newArrivals.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. FLASH DEALS ──────────────────────────────────────────────────── */}
      <section className="py-0 overflow-hidden">
        <div className="bg-[#1D1D1F] dark:bg-black">
          <div className="container mx-auto px-4 md:px-8 py-16 md:py-20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              {/* Left */}
              <div className="flex-1 text-center md:text-left">
                <FadeIn>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-5">
                    <Zap className="h-3.5 w-3.5 fill-red-400" />
                    Flash Deal
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
                    Up to <span className="text-red-400">40% Off</span>
                    <br />Today Only
                  </h2>
                  <p className="text-gray-400 mb-8 max-w-sm">
                    Limited stock. Once it's gone, it's gone. Grab the best deals in Ghana before time runs out.
                  </p>
                  <Link href="/shop?sort=price_asc">
                    <button className="px-8 py-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors shadow-lg shadow-red-500/25">
                      Shop Deals Now
                    </button>
                  </Link>
                </FadeIn>
              </div>

              {/* Countdown */}
              <FadeIn delay={0.15}>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Ends in</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3">
                    {[
                      { val: h, label: 'HRS' },
                      { val: m, label: 'MIN' },
                      { val: s, label: 'SEC' },
                    ].map(({ val, label }, i) => (
                      <div key={label} className="flex items-center gap-2 md:gap-3">
                        {i > 0 && <span className="text-3xl font-bold text-gray-600 -mt-2">:</span>}
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                            <span className="text-3xl md:text-4xl font-black text-white tabular-nums">
                              {String(val).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 mt-2 tracking-widest">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. COLLECTIONS ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#F5F5F7] dark:bg-black/20">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader title="Collections" sub="Editorial picks for every lifestyle" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {COLLECTIONS.map((col, i) => (
              <FadeIn key={col.title} delay={i * 0.1}>
                <Link href={col.href} className="group block">
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer">
                    <img
                      src={col.img}
                      alt={col.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${col.accent} to-transparent`} />
                    <div className="absolute bottom-0 left-0 p-6">
                      <p className="text-white/70 text-xs font-medium mb-1">{col.sub}</p>
                      <h3 className="text-white text-xl font-bold mb-3">{col.title}</h3>
                      <span className="inline-flex items-center gap-1.5 text-white text-xs font-semibold border border-white/30 rounded-full px-4 py-1.5 hover:bg-white/10 transition-colors">
                        Shop now <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. BEST SELLERS ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-[#1D1D1F]">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader title="Best Sellers" sub="The products everyone's talking about" href="/shop" />

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100 dark:bg-white/5" />
                  <div className="p-4 space-y-2 bg-white dark:bg-[#1D1D1F]/60">
                    <div className="h-3 bg-gray-100 dark:bg-white/10 rounded" />
                    <div className="h-4 bg-gray-100 dark:bg-white/10 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
              {bestSellers.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 8. UPGRADE PROMO ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28" style={{ background: '#F5F5F7' }}>
        <div className="container mx-auto px-4 md:px-8 flex flex-col items-center text-center">
          <FadeIn className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#1D1D1F] dark:text-white" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
              Upgrade
            </h2>
          </FadeIn>
          <FadeIn delay={0.08}>
            <p className="text-base md:text-lg text-gray-500 font-medium mb-8 tracking-wide">
              Love it. Lease it. Upgrade it.
            </p>
          </FadeIn>
          <FadeIn delay={0.14}>
            <Link href="/shop?category=phones">
              <button className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm tracking-wide transition-colors shadow-md hover:shadow-lg">
                Learn more
              </button>
            </Link>
          </FadeIn>

          <FadeIn delay={0.2} className="relative mt-14 flex items-center justify-center w-full max-w-md mx-auto" style={{ height: '480px' } as React.CSSProperties}>
            {/* Petal fan */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <svg viewBox="0 0 400 400" className="w-[380px] h-[380px] md:w-[440px] md:h-[440px]">
                <defs>
                  <radialGradient id="p1" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" /><stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" /></radialGradient>
                  <radialGradient id="p2" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#f87171" stopOpacity="0.9" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" /></radialGradient>
                  <radialGradient id="p3" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" /><stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" /></radialGradient>
                  <radialGradient id="p4" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" /></radialGradient>
                  <radialGradient id="p5" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#fb923c" stopOpacity="0.85" /><stop offset="100%" stopColor="#f97316" stopOpacity="0.15" /></radialGradient>
                  <radialGradient id="p6" cx="50%" cy="0%" r="100%"><stop offset="0%" stopColor="#34d399" stopOpacity="0.85" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.15" /></radialGradient>
                  <filter id="petalBlur"><feGaussianBlur stdDeviation="6" /></filter>
                </defs>
                {[{ g: 'p1', r: 0 }, { g: 'p2', r: 60 }, { g: 'p3', r: 120 }, { g: 'p4', r: 180 }, { g: 'p5', r: 240 }, { g: 'p6', r: 300 }].map(({ g, r }) => (
                  <ellipse key={r} cx="200" cy="200" rx="58" ry="150" fill={`url(#${g})`} filter="url(#petalBlur)" transform={`rotate(${r} 200 200) translate(0 -70)`} opacity="0.82" />
                ))}
                <circle cx="200" cy="200" r="80" fill="white" opacity="0.45" filter="url(#petalBlur)" />
              </svg>
            </div>
            <div className="relative z-10 select-none" style={{ filter: 'drop-shadow(0 32px 48px rgba(0,0,0,0.22)) drop-shadow(0 8px 16px rgba(0,0,0,0.14))' }}>
              <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=320&q=90&auto=format&fit=crop" alt="Premium smartphone" className="w-[160px] md:w-[190px] object-contain rounded-[2rem]" draggable={false} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 9. BRANDS ───────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-[#1D1D1F] border-t border-gray-100 dark:border-white/10">
        <div className="container mx-auto px-4 md:px-8">
          <FadeIn className="text-center mb-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.25em] mb-2">Trusted Brands</p>
            <h2 className="text-2xl font-bold text-[#1D1D1F] dark:text-white">We carry the world's best</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
              {BRANDS.map((brand) => (
                <Link key={brand} href={`/shop?brand=${brand.toLowerCase()}`}>
                  <div className="px-6 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-[#F5F5F7] dark:bg-white/5 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:-translate-y-0.5 transition-all cursor-pointer">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{brand}</span>
                  </div>
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 10. REVIEWS ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#F5F5F7] dark:bg-black/20">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader title="What Customers Say" sub="Real reviews from real Ghanaian shoppers" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((review, i) => (
              <FadeIn key={review.name} delay={i * 0.1}>
                <div className="bg-white dark:bg-[#1D1D1F] rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${review.color}`}>
                      {review.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1D1D1F] dark:text-white">{review.name}</p>
                      <p className="text-xs text-gray-400">{review.location}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. WHATSAPP SUPPORT BANNER ─────────────────────────────────────── */}
      <section className="py-12 bg-emerald-600">
        <FadeIn>
          <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Need help? Chat with us on WhatsApp</h3>
                <p className="text-emerald-100 text-sm">Our team replies in minutes. Available 8AM – 10PM daily.</p>
              </div>
            </div>
            <a
              href="https://wa.me/233200000000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Chat Now
            </a>
          </div>
        </FadeIn>
      </section>

    </div>
  );
}
