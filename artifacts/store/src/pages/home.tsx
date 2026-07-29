import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useListFeaturedProducts } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Smartphone, Laptop, Headphones, Gamepad, Shirt, Home as HomeIcon, Watch, ShieldCheck, Truck, HeadphonesIcon, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = [
  { name: 'Phones', slug: 'phones', icon: Smartphone },
  { name: 'Laptops', slug: 'laptops', icon: Laptop },
  { name: 'Accessories', slug: 'accessories', icon: Headphones },
  { name: 'Gaming', slug: 'gaming', icon: Gamepad },
  { name: 'Fashion', slug: 'fashion', icon: Shirt },
  { name: 'Smart Home', slug: 'smart-home', icon: HomeIcon },
  { name: 'Watches', slug: 'watches', icon: Watch },
];

const TRUST_FEATURES = [
  { title: 'Secure Payments', description: 'Your money is safe with us.', icon: ShieldCheck },
  { title: 'Genuine Products', description: '100% authentic items.', icon: Award },
  { title: 'Nationwide Delivery', description: 'Anywhere in Ghana.', icon: Truck },
  { title: 'Customer Support', description: '24/7 dedicated help.', icon: HeadphonesIcon },
];

export function Home() {
  const { data: featuredProducts, isLoading } = useListFeaturedProducts();

  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full py-24 md:py-32 lg:py-40 bg-secondary overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground mb-6 leading-tight">
              Shop Premium Products <br/> at Great Prices
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              Experience the best in electronics, fashion, and lifestyle. Curated for you, delivered fast across Ghana.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/shop">
                <Button size="lg" className="h-14 px-8 text-base font-semibold rounded-full hover-elevate">
                  Shop Now
                </Button>
              </Link>
              <Link href="/shop?category=phones">
                <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold rounded-full hover-elevate bg-transparent">
                  Explore Phones
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none hidden md:block">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
            <circle cx="50" cy="50" r="40" />
          </svg>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex items-center justify-between"
          >
            <h2 className="text-3xl font-bold tracking-tight">Shop by Category</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <Link href={`/shop?category=${cat.slug}`}>
                  <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group bg-secondary/50 hover:bg-secondary">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-4">
                      <div className="p-4 rounded-full bg-background group-hover:scale-110 transition-transform shadow-sm">
                        <cat.icon className="h-6 w-6 text-foreground" />
                      </div>
                      <span className="font-medium text-sm">{cat.name}</span>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-12 flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Trending Products</h2>
            <Link href="/shop" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse bg-muted rounded-2xl h-80 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts?.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Link href={`/product/${product.id}`} className="block h-full group">
                    <Card className="h-full border-none shadow-sm overflow-hidden bg-background hover:shadow-lg transition-all rounded-2xl">
                      <div className="aspect-square bg-secondary/50 relative overflow-hidden flex items-center justify-center p-6">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">No image</div>
                        )}
                      </div>
                      <CardContent className="p-5">
                        <div className="text-xs text-muted-foreground mb-2 font-medium tracking-wide uppercase">
                          {product.categoryName || 'Product'}
                        </div>
                        <h3 className="font-semibold text-lg line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-4">
                          <span className="font-bold text-lg">{formatCurrency(product.basePrice)}</span>
                          <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full">
                            {product.inStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upgrade Section */}
      <section className="py-20 md:py-28" style={{ background: '#F5F5F7' }}>
        <div className="container mx-auto px-4 md:px-8 flex flex-col items-center text-center">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="flex items-center gap-3 mb-4"
          >
            {/* Inline brand icon */}
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </span>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
              Upgrade
            </h2>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-base md:text-lg text-gray-500 font-medium mb-8 tracking-wide"
          >
            Love it. Lease it. Upgrade it.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.14 }}
          >
            <Link href="/shop?category=phones">
              <button className="px-8 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm tracking-wide transition-colors shadow-md hover:shadow-lg">
                Learn more
              </button>
            </Link>
          </motion.div>

          {/* Phone + Fan Graphic */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="relative mt-14 flex items-center justify-center w-full max-w-md mx-auto"
            style={{ height: '480px' }}
          >
            {/* Multi-colored petal fan — centered behind phone */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
              <svg
                viewBox="0 0 400 400"
                className="w-[380px] h-[380px] md:w-[440px] md:h-[440px]"
                style={{ filter: 'blur(0px)' }}
              >
                <defs>
                  {/* Petal gradients */}
                  <radialGradient id="p1" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0.2" />
                  </radialGradient>
                  <radialGradient id="p2" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#f87171" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                  </radialGradient>
                  <radialGradient id="p3" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.2" />
                  </radialGradient>
                  <radialGradient id="p4" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
                  </radialGradient>
                  <radialGradient id="p5" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.15" />
                  </radialGradient>
                  <radialGradient id="p6" cx="50%" cy="0%" r="100%">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
                  </radialGradient>
                  <filter id="petalBlur">
                    <feGaussianBlur stdDeviation="6" />
                  </filter>
                </defs>

                {/* 6 petals evenly rotated around center (200,200), each is an ellipse stretched upward */}
                {[
                  { grad: 'p1', rot: 0 },
                  { grad: 'p2', rot: 60 },
                  { grad: 'p3', rot: 120 },
                  { grad: 'p4', rot: 180 },
                  { grad: 'p5', rot: 240 },
                  { grad: 'p6', rot: 300 },
                ].map(({ grad, rot }) => (
                  <ellipse
                    key={rot}
                    cx="200"
                    cy="200"
                    rx="58"
                    ry="150"
                    fill={`url(#${grad})`}
                    filter="url(#petalBlur)"
                    transform={`rotate(${rot} 200 200) translate(0 -70)`}
                    opacity="0.82"
                  />
                ))}

                {/* Soft central glow */}
                <circle cx="200" cy="200" r="80" fill="white" opacity="0.45" filter="url(#petalBlur)" />
              </svg>
            </div>

            {/* Phone image — floating above the fan */}
            <div
              className="relative z-10 select-none"
              style={{
                filter: 'drop-shadow(0 32px 48px rgba(0,0,0,0.22)) drop-shadow(0 8px 16px rgba(0,0,0,0.14))',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=320&q=90&auto=format&fit=crop"
                alt="Premium smartphone"
                className="w-[160px] md:w-[190px] object-contain rounded-[2rem]"
                draggable={false}
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Trust Grid */}
      <section className="py-24 bg-background border-t">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {TRUST_FEATURES.map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-2">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground max-w-[200px]">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
