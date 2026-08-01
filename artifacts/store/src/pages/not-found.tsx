import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

const SUGGESTIONS = [
  { label: 'Shop all products', href: '/shop' },
  { label: 'New arrivals', href: '/shop?sort=newest' },
  { label: 'Flash deals', href: '/shop?deals=1' },
  { label: 'Help centre', href: '/info/faq' },
];

export function NotFound() {
  return (
    <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
      <p className="text-caption font-semibold uppercase tracking-[0.18em] text-accent-ink">
        Error 404
      </p>
      <h1 className="mt-4 text-headline text-foreground">This page has moved on</h1>
      <p className="mt-5 max-w-md text-lede text-ink-muted text-pretty">
        The link may be old or the product may no longer be listed. Let's get you back to
        shopping.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button variant="accent" size="pill-lg" asChild>
          <Link href="/shop">Browse the store</Link>
        </Button>
        <Button variant="hairline" size="pill-lg" asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>

      <div className="mt-14 w-full border-t border-hairline pt-10">
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Popular destinations
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {SUGGESTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-hairline px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotFound;
