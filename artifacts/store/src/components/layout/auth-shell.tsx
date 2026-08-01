import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Check } from 'lucide-react';

const BENEFITS = [
  'Track every order from dispatch to doorstep',
  'Save addresses for one-tap checkout',
  'Member-only pricing and early access to drops',
];

/** Split layout shared by sign in and register so both feel like one product. */
export function AuthShell({
  title,
  subtitle,
  banner,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  banner?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex items-center justify-center px-5 py-16 md:px-10 lg:py-24">
        <div className="w-full max-w-md">
          {banner}

          <h1 className="mt-2 text-headline text-foreground">{title}</h1>
          <p className="mt-3 text-lede text-ink-muted text-pretty">{subtitle}</p>

          <div className="mt-10">{children}</div>

          <div className="mt-8 border-t border-hairline pt-6">{footer}</div>

          <p className="mt-8 text-caption leading-relaxed text-ink-subtle">
            By continuing you agree to our{' '}
            <Link href="/info/terms" className="underline underline-offset-2 hover:text-foreground">
              terms of service
            </Link>{' '}
            and{' '}
            <Link
              href="/info/privacy"
              className="underline underline-offset-2 hover:text-foreground"
            >
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>

      {/* Editorial side */}
      <aside className="relative hidden overflow-hidden bg-surface-sunken lg:block">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=75"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20"
        />

        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="text-caption font-semibold uppercase tracking-[0.18em] text-white/60">
            VBUY
          </p>
          <h2 className="mt-4 max-w-md text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            Shopping in Ghana, without the guesswork.
          </h2>

          <ul className="mt-9 space-y-3.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[15px] text-white/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

export function AuthField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-medium text-foreground">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}
