import { Link } from 'wouter';
import { Facebook, Instagram, Twitter, MessageCircle, MapPin } from 'lucide-react';

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', href: '/shop' },
      { label: 'New arrivals', href: '/shop?sort=newest' },
      { label: 'Flash deals', href: '/shop?deals=1' },
      { label: 'Best sellers', href: '/shop?sort=popular' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help centre', href: '/info/faq' },
      { label: 'Shipping & delivery', href: '/info/shipping' },
      { label: 'Returns & refunds', href: '/info/returns' },
      { label: 'Payment options', href: '/info/payments' },
      { label: 'Contact us', href: '/info/contact' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My orders', href: '/account/orders' },
      { label: 'Saved addresses', href: '/account/addresses' },
      { label: 'Settings', href: '/account/settings' },
      { label: 'Sign in', href: '/auth/login' },
      { label: 'Create account', href: '/auth/register' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About VBUY', href: '/info/about' },
      { label: 'Privacy policy', href: '/info/privacy' },
      { label: 'Terms of service', href: '/info/terms' },
    ],
  },
];

const PAYMENTS = ['MTN MoMo', 'Telecel Cash', 'AT Money'];

const WHATSAPP =
  (import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined)?.trim() ||
  (import.meta.env.VITE_CONTACT_PHONE as string | undefined)?.replace(/\D/g, '') ||
  '';

const SOCIALS = [
  ...(WHATSAPP
    ? [{ label: 'WhatsApp', href: `https://wa.me/${WHATSAPP}`, Icon: MessageCircle }]
    : []),
  { label: 'Instagram', href: 'https://instagram.com', Icon: Instagram },
  { label: 'Facebook', href: 'https://facebook.com', Icon: Facebook },
  { label: 'X', href: 'https://x.com', Icon: Twitter },
];

export function Footer() {
  return (
    <footer className="border-t border-hairline bg-background">
      <div className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.4fr)]">
          {/* Brand */}
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                VBUY
              </span>
              <span className="inline-flex h-[18px] items-center rounded-md bg-accent px-1.5 text-[10px] font-bold tracking-[0.1em] text-accent-foreground">
                GH
              </span>
            </Link>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-muted text-pretty">
              Ghana's destination for verified tech, fashion and home essentials — delivered to
              your door in every region.
            </p>
            <p className="mt-5 flex items-start gap-2 text-caption text-ink-subtle">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Adum, Kumasi · Ashanti Region, Ghana
            </p>

            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline text-ink-muted transition-colors hover:border-transparent hover:bg-foreground hover:text-background"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-foreground">
                  {column.title}
                </h2>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[15px] text-ink-muted transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
      </div>

      {/* Payments + legal */}
      <div className="border-t border-hairline">
        <div className="container-page flex flex-col gap-6 py-7 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENTS.map((method) => (
              <span
                key={method}
                className="rounded-lg border border-hairline px-2.5 py-1.5 text-[11px] font-medium text-ink-muted"
              >
                {method}
              </span>
            ))}
          </div>
          <p className="text-caption text-ink-subtle">
            © {new Date().getFullYear()} VBUY. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
