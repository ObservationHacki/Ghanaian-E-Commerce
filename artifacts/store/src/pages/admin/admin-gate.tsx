import { Link } from 'wouter';
import { useGetAdminMe } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth-context';
import { AdminProvider } from './admin-context';
import { AdminShell } from './admin-shell';
import { Loader2 } from 'lucide-react';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const {
    data: admin,
    isLoading,
    error,
    isError,
  } = useGetAdminMe({
    query: {
      queryKey: ['admin', 'me'],
      enabled: Boolean(user),
      retry: false,
    },
  });

  if (authLoading || (user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-sunken">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Admin sign-in required</h1>
        <p className="max-w-md text-ink-muted">
          Sign in with an administrator account to open the operations console.
        </p>
        <Link
          href="/auth/login?redirect=/admin"
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isError || !admin) {
    const status = (error as { status?: number } | null)?.status;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {status === 403 ? 'Not an administrator' : 'Unable to load admin access'}
        </h1>
        <p className="max-w-md text-ink-muted">
          {status === 403
            ? 'This account is signed in but is not on the admin roster. Ask a super admin to invite your email.'
            : 'Check that the API is running and your session is still valid.'}
        </p>
        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-full border border-hairline bg-background px-6 py-3 text-sm font-semibold"
          >
            Back to store
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminProvider admin={admin}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
