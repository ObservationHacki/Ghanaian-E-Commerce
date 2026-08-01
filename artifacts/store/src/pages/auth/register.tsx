import { useMemo, useState } from 'react';
import { Link, useSearch } from 'wouter';
import { supabase } from '@/lib/supabase';
import { safeRedirectPath } from '@/lib/auth-oauth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AuthShell, AuthField } from '@/components/layout/auth-shell';
import { AuthDivider, GoogleButton } from '@/components/auth/google-button';
import { cn } from '@/lib/utils';
import { Loader2, ArrowRight, MailCheck, Eye, EyeOff } from 'lucide-react';

function strengthOf(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

export function Register() {
  const { toast } = useToast();
  const search = useSearch();
  const redirect = safeRedirectPath(new URLSearchParams(search).get('redirect'));
  const loginHref =
    redirect === '/'
      ? '/auth/login'
      : `/auth/login?redirect=${encodeURIComponent(redirect)}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => strengthOf(password), [password]);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <MailCheck className="h-8 w-8" strokeWidth={1.5} />
        </span>
        <h1 className="mt-8 text-headline text-foreground">Check your email</h1>
        <p className="mt-4 max-w-md text-lede text-ink-muted text-pretty">
          We sent a confirmation link to{' '}
          <span className="font-medium text-foreground">{email}</span>. Open it to activate your
          account.
        </p>
        <Button variant="accent" size="pill-lg" className="mt-9" asChild>
          <Link href={loginHref}>Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes under a minute and makes every future order faster."
      footer={
        <p className="text-center text-[15px] text-ink-muted">
          Already have an account?{' '}
          <Link
            href={loginHref}
            className="font-medium text-accent-ink underline underline-offset-4 hover:text-accent"
          >
            Sign in
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
              autoComplete="new-password"
              placeholder="At least 6 characters"
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

          {password.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      i <= strength ? 'bg-accent' : 'bg-hairline',
                    )}
                  />
                ))}
              </div>
              <span className="text-caption text-ink-muted">{STRENGTH_LABELS[strength]}</span>
            </div>
          )}
        </AuthField>

        <AuthField id="confirmPassword" label="Confirm password">
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-invalid={mismatch}
            className={cn(
              'h-[3.25rem] rounded-2xl border-hairline px-5 text-base',
              mismatch && 'border-destructive',
            )}
          />
          {mismatch && (
            <p className="text-caption text-destructive">Passwords don't match yet.</p>
          )}
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
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
