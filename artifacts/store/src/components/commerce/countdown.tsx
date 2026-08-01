import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

function remaining(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    total: diff,
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

/** Deals reset at local midnight, so the timer is always genuinely live. */
export function useEndOfDay() {
  return useMemo(() => {
    const end = new Date();
    end.setHours(24, 0, 0, 0);
    return end.getTime();
  }, []);
}

export function Countdown({
  target,
  invert = false,
  className,
}: {
  target: number;
  invert?: boolean;
  className?: string;
}) {
  const [time, setTime] = useState(() => remaining(target));

  useEffect(() => {
    setTime(remaining(target));
    const id = setInterval(() => setTime(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { label: 'Hours', value: time.hours },
    { label: 'Mins', value: time.minutes },
    { label: 'Secs', value: time.seconds },
  ];

  return (
    <div
      className={cn('flex items-start gap-2.5', className)}
      role="timer"
      aria-live="off"
      aria-label={`${time.hours} hours ${time.minutes} minutes ${time.seconds} seconds remaining`}
    >
      {units.map((unit, i) => (
        <div key={unit.label} className="flex items-start gap-2.5">
          <div className="text-center">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-semibold tabular-nums tracking-tight sm:h-[4.5rem] sm:w-[4.5rem] sm:text-[28px]',
                invert ? 'bg-white/10 text-white' : 'bg-surface-sunken text-foreground',
              )}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            <div
              className={cn(
                'mt-2 text-[11px] font-medium uppercase tracking-[0.14em]',
                invert ? 'text-white/50' : 'text-ink-subtle',
              )}
            >
              {unit.label}
            </div>
          </div>
          {i < units.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                'mt-4 text-2xl font-light',
                invert ? 'text-white/30' : 'text-ink-subtle/50',
              )}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
