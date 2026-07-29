import { Link } from 'wouter';
import { Facebook, Instagram, Twitter, Youtube, MessageCircle, Send } from 'lucide-react';

const SHOP_LINKS = [
  { label: 'All Products', href: '/shop' },
  { label: 'Phones & Tablets', href: '/shop?category=phones' },
  { label: 'Laptops & Computers', href: '/shop?category=laptops' },
  { label: 'Fashion', href: '/shop?category=fashion' },
  { label: 'Accessories', href: '/shop?category=accessories' },
  { label: 'Gaming', href: '/shop?category=gaming' },
  { label: 'Smart Home', href: '/shop?category=smart-home' },
];

const SUPPORT_LINKS = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Shipping & Delivery', href: '/shipping' },
  { label: 'Returns & Refunds', href: '/returns' },
  { label: 'Track Your Order', href: '/track' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'WhatsApp Support', href: 'https://wa.me/233200000000', external: true },
];

const COMPANY_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Careers', href: '/careers' },
  { label: 'Press', href: '/press' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
];

const PAYMENT_METHODS = ['MTN MoMo', 'Telecel Cash', 'Visa', 'Mastercard', 'Bank Transfer'];

const SOCIAL = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter / X' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: MessageCircle, href: 'https://wa.me/233200000000', label: 'WhatsApp' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#111] border-t border-gray-200 dark:border-white/10 mt-auto">

      {/* Newsletter band */}
      <div className="bg-[#1D1D1F] dark:bg-black py-14">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-white tracking-tight mb-1">Stay in the loop</h3>
            <p className="text-gray-400 text-sm">Exclusive deals, new arrivals, and Ghana's best prices — right to your inbox.</p>
          </div>
          <form
            className="flex gap-2 w-full max-w-md"
            onSubmit={e => e.preventDefault()}
          >
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="Your email address"
                className="w-full h-11 px-4 pr-12 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-blue-500 focus:bg-white/15 transition-all"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shrink-0 flex items-center gap-2 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main links grid */}
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-5">
            <div>
              <span className="text-xl font-black tracking-tight text-[#1D1D1F] dark:text-white" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>
                KUMASI
              </span>
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white tracking-wider">GH</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[220px]">
              Ghana's premium online store. Genuine products, fast delivery, and trusted service — everywhere in Ghana.
            </p>

            {/* Social icons */}
            <div className="flex gap-2">
              {SOCIAL.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="h-8 w-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[#1D1D1F] hover:text-white dark:hover:bg-white dark:hover:text-[#1D1D1F] transition-all"
                >
                  <s.icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-widest mb-5">Shop</h4>
            <ul className="space-y-3">
              {SHOP_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-widest mb-5">Support</h4>
            <ul className="space-y-3">
              {SUPPORT_LINKS.map(l => (
                <li key={l.href}>
                  {l.external ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-[#1D1D1F] dark:text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="space-y-3">
              {COMPANY_LINKS.map(l => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#1D1D1F] dark:hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-14 pt-8 border-t border-gray-200 dark:border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div>
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-widest">We accept</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(m => (
                  <span key={m} className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-white/10 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-white/5">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-1.5">
              <p className="text-xs text-gray-400">© {year} Kumasi Store. All rights reserved.</p>
              <div className="flex gap-4 text-xs text-gray-400">
                <Link href="/privacy" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Terms</Link>
                <Link href="/cookies" className="hover:text-[#1D1D1F] dark:hover:text-white transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
