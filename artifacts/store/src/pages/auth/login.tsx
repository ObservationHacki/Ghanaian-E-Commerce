import { useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { supabase } from '@/lib/supabase';
import { safeRedirectPath } from '@/lib/auth-oauth';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AuthShell, AuthField } from '@/components/layout/auth-shell';
import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
import { Loader2, ArrowRight, ShoppingBag, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const redirect = safeRedirectPath(new URLSearchParams(search).get('redirect'));
  const fromCheckout = redirect === '/checkout';
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
    } else {
      navigate(redirect);
    }
  };

  const registerHref =
    redirect === '/'
      ? '/auth/register'
      : `/auth/register?redirect=${encodeURIComponent(redirect)}`;

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        fromCheckout
          ? 'Sign in to complete your order — your bag is saved.'
          : 'Sign in to track orders, save addresses and check out faster.'
      }
      banner={
        fromCheckout ? (
          <div className="mb-8 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3.5">
            <ShoppingBag className="h-[18px] w-[18px] shrink-0 text-accent-ink" />
            <p className="text-[14px] font-medium text-accent-ink">
              You're one step from placing your order
            </p>
          </div>
        ) : null
      }
      footer={
        <p className="text-center text-[15px] text-ink-muted">
          New to VBUY?{' '}
          <Link
            href={registerHref}
            className="font-medium text-accent-ink underline underline-offset-4 hover:text-accent"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <GoogleButton redirect={redirect} label="Continue with Google" />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField id="email" label="Email address">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-[3.25rem] rounded-2xl border-hairline px-5 text-base"
          />
        </AuthField>

        <AuthField id="password" label="Password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-[3.25rem] rounded-2xl border-hairline px-5 pr-14 text-base"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
