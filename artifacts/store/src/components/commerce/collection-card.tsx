import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Collection = {
  title: string;
  eyebrow: string;
  copy?: string;
  href: string;
  image: string;
  /** Dark scrims work on busy photography; light suits airy product shots. */
  tone?: 'dark' | 'light';
};

export function CollectionCard({
  collection,
  size = 'md',
  className,
}: {
  collection: Collection;
  size?: 'md' | 'lg';
  className?: string;
}) {
  const dark = collection.tone !== 'light';

  return (
    <Link
      href={collection.href}
      className={cn(
        'group relative isolate flex flex-col justify-end overflow-hidden rounded-3xl',
        size === 'lg' ? 'min-h-[26rem] p-8 md:min-h-[34rem] md:p-12' : 'min-h-[22rem] p-8',
        className,
      )}
    >
      <img
        src={collection.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10',
          dark
            ? 'bg-gradient-to-t from-black/80 via-black/35 to-black/5'
            : 'bg-gradient-to-t from-white/90 via-white/50 to-white/10',
        )}
      />

      <div className={cn('relative max-w-md', dark ? 'text-white' : 'text-[hsl(240_6%_10%)]')}>
        <p
          className={cn(
            'text-caption font-semibold uppercase tracking-[0.18em]',
            dark ? 'text-white/65' : 'text-[hsl(240_6%_10%)]/60',
          )}
        >
          {collection.eyebrow}
        </p>
        <h3
          className={cn(
            'mt-3 font-semibold tracking-[-0.025em]',
            size === 'lg' ? 'text-3xl md:text-[2.5rem] md:leading-[1.1]' : 'text-2xl md:text-3xl',
          )}
        >
          {collection.title}
        </h3>
        {collection.copy && (
          <p
            className={cn(
              'mt-3 text-[15px] leading-relaxed text-pretty',
              dark ? 'text-white/75' : 'text-[hsl(240_6%_10%)]/70',
            )}
          >
            {collection.copy}
          </p>
        )}
        <span
          className={cn(
            'mt-6 inline-flex items-center gap-1.5 text-[15px] font-medium',
            dark ? 'text-white' : 'text-[hsl(240_6%_10%)]',
          )}
        >
          Explore
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
