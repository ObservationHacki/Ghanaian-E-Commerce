import { Link, useRoute } from 'wouter';
import { ChevronRight, MessageCircle, Mail, Phone } from 'lucide-react';
import { NotFound } from './not-found';
import { PageMeta } from '@/components/seo/page-meta';

type Topic = {
  title: string;
  intro: string;
  draft?: boolean;
  sections: Array<{ heading: string; body: string }>;
};

const CONTACT_PHONE =
  (import.meta.env.VITE_CONTACT_PHONE as string | undefined)?.trim() || '+233 XX XXX XXXX';
const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || 'hello@example.com';
const CONTACT_WHATSAPP =
  (import.meta.env.VITE_CONTACT_WHATSAPP as string | undefined)?.trim() ||
  CONTACT_PHONE.replace(/\D/g, '');

const TOPICS: Record<string, Topic> = {
  shipping: {
    title: 'Shipping & delivery',
    intro: 'How and when your order reaches you, wherever you are in Ghana.',
    sections: [
      {
        heading: 'Delivery times',
        body: 'Orders with verified Mobile Money payment are prepared for dispatch. Greater Accra and Ashanti typically arrive within 24–48 hours; other regions take 2–4 working days once dispatched.',
      },
      {
        heading: 'Delivery charges',
        body: 'At checkout, choose Accra or Outside Accra. A flat delivery fee is added to your order total before you pay with Mobile Money.',
      },
      {
        heading: 'Tracking your order',
        body: 'You will receive an update when your parcel leaves our warehouse. Live status is always visible under My orders.',
      },
    ],
  },
  returns: {
    title: 'Returns & refunds',
    draft: true,
    intro: 'Changed your mind or received the wrong item? Here is how to put it right.',
    sections: [
      {
        heading: 'The 7-day window',
        body: 'You may return most items within 7 days of delivery, provided they are unused and in their original packaging with all accessories included.',
      },
      {
        heading: 'How to start a return',
        body: `Message us on WhatsApp (${CONTACT_PHONE}) with your order number and a short description. We arrange collection when the fault is ours.`,
      },
      {
        heading: 'Refund timing',
        body: 'Once the item reaches us and passes inspection, refunds are issued to your original Mobile Money wallet within 3–5 working days.',
      },
      {
        heading: 'What cannot be returned',
        body: 'For hygiene reasons, earphones, cosmetics and undergarments cannot be returned once opened, unless they arrived faulty.',
      },
    ],
  },
  payments: {
    title: 'Payment options',
    intro: 'VBUY uses manual Mobile Money verification — no card gateway at checkout.',
    sections: [
      {
        heading: 'Mobile money',
        body: 'Send the exact order amount to the merchant MoMo number shown at checkout (MTN MoMo, Telecel Cash or AT Money via *170# or your wallet app), then paste your transaction reference so our team can verify it.',
      },
      {
        heading: 'Verification',
        body: 'Orders stay pending until an admin confirms your transaction reference. We do not mark an order as paid until that check is complete.',
      },
      {
        heading: 'Unpaid orders',
        body: 'Orders without a submitted MoMo reference may be cancelled automatically after 24 hours so inventory and fulfilment stay accurate.',
      },
    ],
  },
  faq: {
    title: 'Help centre',
    intro: 'Quick answers to the questions we hear most.',
    sections: [
      {
        heading: 'Are your products genuine?',
        body: 'Yes. Every unit is sourced through authorised distributors and inspected before dispatch. Serial numbers are checked on all electronics.',
      },
      {
        heading: 'Do I need an account to order?',
        body: 'You can browse and build a bag as a guest, but an account is required at checkout so we can attach the order to you and keep you updated.',
      },
      {
        heading: 'Can I change my delivery address?',
        body: 'Yes, as long as the order has not been dispatched. Contact us on WhatsApp as soon as possible with your order number.',
      },
      {
        heading: 'Do you offer warranties?',
        body: 'Electronics carry the manufacturer warranty stated on the product page, backed by our own 7-day replacement guarantee.',
      },
    ],
  },
  about: {
    title: 'About VBUY',
    intro: 'A Ghanaian retailer built on trust, speed and genuine products.',
    sections: [
      {
        heading: 'Why we started',
        body: 'Buying online in Ghana too often meant guessing whether a product was real and hoping it would arrive. We built VBUY to remove that doubt.',
      },
      {
        heading: 'How we work',
        body: 'We hold our own stock, verify it on arrival and dispatch from our hub in Kumasi. No drop-shipping, no third-party surprises.',
      },
      {
        heading: 'Where we deliver',
        body: 'All 16 regions, through a courier network we manage directly so someone is always accountable for your parcel.',
      },
    ],
  },
  contact: {
    title: 'Contact us',
    intro: 'Real people, seven days a week. Replace placeholder numbers in your hosting env before launch.',
    sections: [
      {
        heading: 'WhatsApp',
        body: `The fastest way to reach us. Message ${CONTACT_PHONE} and expect a reply within minutes during business hours.`,
      },
      {
        heading: 'Phone',
        body: `Call ${CONTACT_PHONE} between 8am and 8pm, Monday to Sunday.`,
      },
      {
        heading: 'Email',
        body: `Write to ${CONTACT_EMAIL} for order issues, partnerships or press enquiries.`,
      },
      {
        heading: 'Visit us',
        body: 'Our pickup counter is in Adum, Kumasi, Ashanti Region. Open weekdays 9am to 6pm.',
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    draft: true,
    intro: 'DRAFT for review — what we collect, why we collect it, and the control you have. Have counsel review before publishing as final.',
    sections: [
      {
        heading: 'What we collect',
        body: 'Your name, email, phone number and GhanaPost GPS delivery address, plus the orders you place and MoMo transaction references you submit. We do not store card numbers.',
      },
      {
        heading: 'How we use it',
        body: 'To process orders, verify Mobile Money payments, arrange delivery, provide support and — only if you opt in — send occasional product emails.',
      },
      {
        heading: 'Who we share with',
        body: 'Couriers and payment verification staff only as needed to fulfil your order. We do not sell your personal data.',
      },
      {
        heading: 'Retention',
        body: 'Order and payment reference records are kept as required for accounting and dispute resolution under Ghanaian law.',
      },
      {
        heading: 'Your rights',
        body: `You may request a copy of your data or ask us to delete your account by emailing ${CONTACT_EMAIL}, subject to legal retention duties.`,
      },
    ],
  },
  terms: {
    title: 'Terms of service',
    draft: true,
    intro: 'DRAFT for review — the agreement between you and VBUY. Have counsel review before publishing as final.',
    sections: [
      {
        heading: 'Orders',
        body: 'An order is accepted once Mobile Money payment is verified by our team. We may cancel an order if an item is unavailable or was listed at a manifestly incorrect price; any verified payment would then be refunded.',
      },
      {
        heading: 'Pricing',
        body: 'All prices are shown in Ghana Cedis. The checkout total includes your selected delivery fee (Accra or Outside Accra).',
      },
      {
        heading: 'Payment',
        body: 'You must send the exact amount to the published merchant MoMo number and submit a valid transaction reference. Re-using a reference from another order is not allowed.',
      },
      {
        heading: 'Governing law',
        body: 'These terms are governed by the laws of the Republic of Ghana. Nothing here limits rights you have under Ghanaian consumer protection law.',
      },
      {
        heading: 'Liability',
        body: 'Our liability for any order is limited to the amount you paid for that order, except where Ghanaian law does not allow such a limit.',
      },
    ],
  },
};

const CONTACT_LINKS = [
  {
    label: 'WhatsApp us',
    href: `https://wa.me/${CONTACT_WHATSAPP}`,
    Icon: MessageCircle,
  },
  { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}`, Icon: Mail },
  { label: CONTACT_PHONE, href: `tel:${CONTACT_PHONE.replace(/\s/g, '')}`, Icon: Phone },
];

export function Info() {
  const [, params] = useRoute('/info/:slug');
  const topic = params?.slug ? TOPICS[params.slug] : undefined;

  if (!topic) return <NotFound />;

  return (
    <div className="container-narrow py-8 md:py-12">
      <PageMeta
        title={topic.title}
        description={topic.intro}
        path={`/info/${params?.slug ?? ''}`}
      />
      <nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-ink-subtle" />
        <span className="text-foreground">{topic.title}</span>
      </nav>

      {topic.draft ? (
        <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-[14px] text-foreground">
          <strong className="font-semibold">DRAFT — review before publish.</strong> This page is a
          starter template for legal/ops review and is not final counsel-approved copy.
        </div>
      ) : null}

      <header className="border-b border-hairline pb-10">
        <h1 className="text-headline text-foreground">{topic.title}</h1>
        <p className="mt-4 max-w-xl text-lede text-ink-muted text-pretty">{topic.intro}</p>
      </header>

      <div className="divide-y divide-hairline">
        {topic.sections.map((section) => (
          <section key={section.heading} className="grid gap-3 py-9 md:grid-cols-[14rem_1fr] md:gap-10">
            <h2 className="text-title text-foreground">{section.heading}</h2>
            <p className="max-w-2xl text-[16px] leading-relaxed text-ink-muted text-pretty">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <aside className="mt-6 rounded-3xl bg-surface-sunken p-8 md:p-10">
        <h2 className="text-title text-foreground">Still need help?</h2>
        <p className="mt-3 text-[16px] text-ink-muted">
          Our support team answers seven days a week.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {CONTACT_LINKS.map(({ label, href, Icon }) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-background/70"
            >
              <Icon className="h-4 w-4 text-accent-ink" />
              {label}
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
}
