import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Rating({
  value,
  count,
  size = 'sm',
  showValue = false,
  className,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const px = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      aria-label={`Rated ${value} out of 5${count ? ` from ${count} reviews` : ''}`}
    >
      <div className="flex items-center gap-px" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, value - i));
          return (
            <span key={i} className={cn('relative block', px)}>
              <Star className={cn(px, 'absolute inset-0 text-ink-subtle/35')} />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={cn(px, 'fill-warning text-warning')} />
              </span>
            </span>
          );
        })}
      </div>
      {showValue && (
        <span className="text-caption font-medium tabular-nums text-foreground">
          {value.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-caption tabular-nums text-ink-subtle">({count})</span>
      )}
    </div>
  );
}
