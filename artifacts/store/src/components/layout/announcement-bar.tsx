import { useState } from 'react';
import { X, Truck } from 'lucide-react';
import { Link } from 'wouter';

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-[#1D1D1F] text-white relative z-50">
      <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-medium tracking-wide">
        <Truck className="h-3.5 w-3.5 shrink-0 text-blue-400" />
        <span className="text-center">
          🇬🇭 Free nationwide delivery on orders over{' '}
          <span className="font-bold">GH₵500</span>
          {' · '}
          <Link href="/shop" className="underline underline-offset-2 hover:no-underline transition-all">
            Shop Now
          </Link>
          {' · '}
          Pay with <span className="font-bold">MTN MoMo</span>, cards & more
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
