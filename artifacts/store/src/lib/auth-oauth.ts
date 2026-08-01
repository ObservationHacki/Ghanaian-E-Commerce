import { supabase } from '@/lib/supabase';

/** Only allow same-origin relative paths — never absolute URLs. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

function callbackUrl(redirectPath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const params = new URLSearchParams({ redirect: redirectPath });
  return `${window.location.origin}${base}/auth/callback?${params.toString()}`;
}

export async function signInWithGoogle(redirectPath = '/') {
  const redirectTo = callbackUrl(safeRedirectPath(redirectPath));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  return error;
}
