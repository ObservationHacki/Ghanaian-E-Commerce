import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

type Tone = 'default' | 'sunken' | 'ink';

const TONE: Record<Tone, string> = {
  default: 'bg-background text-foreground',
  sunken: 'bg-surface-sunken text-foreground',
  ink: 'bg-[hsl(240_6%_10%)] text-white dark:bg-[hsl(240_5%_11%)]',
};

export function Section({
  children,
  tone = 'default',
  compact = false,
  className,
  id,
}: {
  children: ReactNode;
  tone?: Tone;
  compact?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(TONE[tone], compact ? 'section-y-sm' : 'section-y', className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel = 'View all',
  align = 'left',
  invert = false,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  className?: string;
}) {
  const centered = align === 'center';

  return (
    <Reveal>
      <div
        className={cn(
          'mb-10 gap-6 md:mb-14',
          centered
            ? 'flex flex-col items-center text-center'
            : 'flex flex-col items-start justify-between sm:flex-row sm:items-end',
          className,
        )}
      >
        <div className={cn('max-w-2xl', centered && 'flex flex-col items-center')}>
          {eyebrow && (
            <p
              className={cn(
                'mb-3 text-caption font-semibold uppercase tracking-[0.18em]',
                invert ? 'text-white/55' : 'text-accent-ink',
              )}
            >
              {eyebrow}
            </p>
          )}
          <h2 className={cn('text-headline', invert ? 'text-white' : 'text-foreground')}>
            {title}
          </h2>
          {description && (
            <p
              className={cn(
                'mt-4 text-lede text-pretty',
                invert ? 'text-white/65' : 'text-ink-muted',
              )}
            >
              {description}
            </p>
          )}
        </div>

        {href && (
          <Link
            href={href}
            className={cn(
              'group inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium transition-colors',
              invert ? 'text-white/80 hover:text-white' : 'text-accent-ink hover:text-accent',
            )}
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </Reveal>
  );
}
