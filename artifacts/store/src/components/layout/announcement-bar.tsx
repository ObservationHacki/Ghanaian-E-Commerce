import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';

const STORAGE_KEY = 'vbuy_announcement_dismissed';

const MESSAGES = [
  { text: 'Nationwide delivery across Ghana — fee shown at checkout', href: '/shop', cta: 'Shop now' },
  { text: 'Pay with MTN MoMo or Telecel Cash', href: '/shop', cta: 'Browse' },
  { text: '7-day easy returns on every verified product', href: '/shop', cta: 'Learn more' },
];

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 6000);
    return () => clearInterval(id);
  }, [dismissed]);

  if (dismissed) return null;

  const message = MESSAGES[index];

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="relative bg-[hsl(240_6%_10%)] text-white">
      <div className="container-page flex h-10 items-center justify-center">
        <p
          key={index}
          className="animate-in fade-in slide-in-from-bottom-1 truncate text-center text-[13px] font-medium text-white/85 duration-500"
        >
          {message.text}
          <Link
            href={message.href}
            className="ml-2 hidden underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white sm:inline"
          >
            {message.cta}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white md:right-6"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
