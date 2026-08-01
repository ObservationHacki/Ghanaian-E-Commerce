import { useState } from 'react';
import { Link } from 'wouter';
import { useGetAdminMe } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AccountShell } from '@/components/layout/account-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { data: adminMe } = useGetAdminMe({
    query: { queryKey: ['admin', 'me'], enabled: Boolean(user), retry: false },
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const hasEmailLogin = Boolean(
    user?.identities?.some((identity) => identity.provider === 'email'),
  );
  const signedInWithGoogle = Boolean(
    user?.identities?.some((identity) => identity.provider === 'google'),
  );

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({
        title: 'Could not update password',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Password updated' });
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <AccountShell title="Settings" description="Manage your profile and security">
      <div className="max-w-2xl space-y-14">
        {/* Profile */}
        <section>
          <h2 className="text-title text-foreground">Profile</h2>
          <dl className="mt-6 divide-y divide-hairline border-y border-hairline">
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-[14px] text-ink-muted">Email</dt>
              <dd className="text-[15px] font-medium text-foreground">{user?.email}</dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-[14px] text-ink-muted">Member since</dt>
              <dd className="text-[15px] text-foreground">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-GH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-[14px] text-ink-muted">Sign-in method</dt>
              <dd className="text-[15px] text-foreground">
                {[
                  hasEmailLogin ? 'Email & password' : null,
                  signedInWithGoogle ? 'Google' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </dd>
            </div>
            <div className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="text-[14px] text-ink-muted">Account ID</dt>
              <dd className="break-all font-mono text-[13px] text-ink-subtle">{user?.id}</dd>
            </div>
          </dl>
        </section>

        {/* Password — only when the account has an email/password identity */}
        <section>
          <h2 className="text-title text-foreground">
            {hasEmailLogin ? 'Change password' : 'Password'}
          </h2>
          {hasEmailLogin ? (
            <>
              <p className="mt-2.5 text-[15px] text-ink-muted">
                Use at least 6 characters. You'll stay signed in on this device.
              </p>

              <form onSubmit={changePassword} className="mt-7 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[14px] font-medium">
                    New password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-[3.25rem] max-w-md rounded-2xl border-hairline px-5 text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[14px] font-medium">
                    Confirm new password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-[3.25rem] max-w-md rounded-2xl border-hairline px-5 text-base"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-7 text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          ) : (
            <p className="mt-2.5 text-[15px] text-ink-muted">
              You sign in with Google, so there’s no password to change here. Manage your Google
              account security instead.
            </p>
          )}
        </section>

        {adminMe ? (
          <section>
            <h2 className="text-title text-foreground">Operations</h2>
            <p className="mt-2.5 text-[15px] text-ink-muted">
              You have administrator access for this store.
            </p>
            <Link
              href="/admin"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-hairline px-7 text-[15px] font-semibold text-foreground transition-colors hover:bg-surface-sunken"
            >
              Open admin console
            </Link>
          </section>
        ) : null}

        {/* Sign out */}
        <section className="rounded-3xl bg-surface-sunken p-7 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[17px] font-medium text-foreground">Sign out</h2>
              <p className="mt-1.5 text-[14px] text-ink-muted">
                End your session on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-destructive/30 px-7 text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </AccountShell>
  );
}
