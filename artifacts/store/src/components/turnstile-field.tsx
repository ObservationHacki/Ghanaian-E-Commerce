import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';

const SITE_KEY = String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();

export function isTurnstileConfigured(): boolean {
  return SITE_KEY.length > 0;
}

type TurnstileFieldProps = {
  onToken: (token: string | null) => void;
  className?: string;
};

/** Managed Turnstile (interaction-only). Does not block form render — only token readiness. */
export function TurnstileField({ onToken, className }: TurnstileFieldProps) {
  const ref = useRef<TurnstileInstance>(null);

  if (!SITE_KEY) return null;

  return (
    <div className={className}>
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        options={{ appearance: 'interaction-only', size: 'flexible' }}
        onSuccess={(token) => onToken(token)}
        onExpire={() => {
          onToken(null);
          ref.current?.reset();
        }}
        onError={() => onToken(null)}
      />
    </div>
  );
}
