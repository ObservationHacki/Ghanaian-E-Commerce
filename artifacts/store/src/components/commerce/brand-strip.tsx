import { Link } from 'wouter';
import { cn } from '@/lib/utils';

type BrandItem = { name: string; slug: string };

/**
 * Wordmarks rather than logo images: no third-party asset licensing, no broken
 * images, and the uniform monochrome treatment reads cleaner than mixed logos.
 */
const WORDMARK_STYLE: Record<string, string> = {
  apple: 'font-medium tracking-[-0.03em]',
  samsung: 'font-semibold tracking-[0.06em] uppercase',
  sony: 'font-bold tracking-[0.16em] uppercase',
  hp: 'font-bold tracking-[0.04em] uppercase',
  nike: 'font-black tracking-[-0.02em] uppercase italic',
  xiaomi: 'font-semibold tracking-[-0.01em]',
  dell: 'font-semibold tracking-[0.1em] uppercase',
  lg: 'font-bold tracking-[0.08em] uppercase',
  anker: 'font-semibold tracking-[0.14em] uppercase',
  jbl: 'font-black tracking-[0.02em] uppercase',
};

function Wordmark({ brand }: { brand: BrandItem }) {
  return (
    <Link
      href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
      className="group flex h-16 shrink-0 items-center justify-center px-8"
      aria-label={`Shop ${brand.name}`}
    >
      <span
        className={cn(
          'text-xl text-ink-subtle transition-colors duration-300 group-hover:text-foreground sm:text-[22px]',
          WORDMARK_STYLE[brand.slug.toLowerCase()] ?? 'font-semibold tracking-[0.06em] uppercase',
        )}
      >
        {brand.name}
      </span>
    </Link>
  );
}

export function BrandStrip({ brands }: { brands: BrandItem[] }) {
  if (!brands.length) return null;

  // Duplicated once so the marquee can loop seamlessly at -50%.
  const track = [...brands, ...brands];

  return (
    <div className="mask-fade-x group/marquee relative overflow-hidden">
      <div className="flex w-max animate-marquee group-hover/marquee:[animation-play-state:paused]">
        {track.map((brand, i) => (
          <Wordmark key={`${brand.slug}-${i}`} brand={brand} />
        ))}
      </div>
    </div>
  );
}
