import { Truck, ShieldCheck, BadgeCheck, RotateCcw, Headset, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from './reveal';

const PILLARS = [
  { icon: Truck, title: 'Nationwide delivery', copy: 'All 16 regions, doorstep to doorstep' },
  { icon: ShieldCheck, title: 'Secure payments', copy: 'Manual Mobile Money verification' },
  { icon: BadgeCheck, title: 'Verified products', copy: 'Sourced from authorised sellers' },
  { icon: RotateCcw, title: 'Easy returns', copy: '7-day no-questions returns' },
  { icon: Headset, title: 'Customer support', copy: 'WhatsApp & phone, 7 days a week' },
  { icon: Zap, title: 'Fast shipping', copy: 'Same-day dispatch before 2pm' },
];

export function TrustBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-6',
        className,
      )}
    >
      {PILLARS.map((pillar, i) => (
        <Reveal key={pillar.title} delay={i * 0.05}>
          <div className="flex flex-col items-start">
            <pillar.icon
              className="h-6 w-6 text-accent-ink"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <h3 className="mt-4 text-[15px] font-medium tracking-[-0.01em] text-foreground">
              {pillar.title}
            </h3>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">{pillar.copy}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
