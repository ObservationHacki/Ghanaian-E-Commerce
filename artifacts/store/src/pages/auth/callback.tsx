import { useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { safeRedirectPath } from '@/lib/auth-oauth';
import { Button } from '@/components/ui/button';

/**
 * Lands here after Google (or any Supabase OAuth provider) redirects back.
 * PKCE exchange is handled by the Supabase client; we wait for a session
 * then send the user to the original `redirect` query (default `/`).
 */
export function AuthCallback() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const redirect = safeRedirectPath(new URLSearchParams(search).get('redirect'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let settled = false;
    let timeoutId = 0;

    const finish = (sessionPresent: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (sessionPresent) navigate(redirect, { replace: true });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        finish(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        settled = true;
        window.clearTimeout(timeoutId);
        setError(sessionError.message);
        return;
      }
      if (session) finish(true);
    });

    // OAuth errors arrive as ?error= / ?error_description= on the callback URL.
    const params = new URLSearchParams(search);
    const oauthError = params.get('error_description') || params.get('error');
    if (oauthError) {
      settled = true;
      setError(oauthError);
    } else {
      timeoutId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          setError('Sign-in timed out. Please try again.');
        }
      }, 12_000);
    }

    return () => {
      settled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, redirect, search]);

  if (error) {
    return (
      <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
        <h1 className="text-headline text-foreground">Couldn’t finish sign-in</h1>
        <p className="mt-4 max-w-md text-lede text-ink-muted text-pretty">{error}</p>
        <Button variant="accent" size="pill-lg" className="mt-9" asChild>
          <Link href={`/auth/login?redirect=${encodeURIComponent(redirect)}`}>
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-narrow flex flex-col items-center py-28 text-center md:py-40">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="mt-6 text-[15px] text-ink-muted">Finishing sign-in…</p>
    </div>
  );
}
