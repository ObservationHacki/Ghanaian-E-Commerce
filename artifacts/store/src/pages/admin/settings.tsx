import { useAdmin } from './admin-context';
import { useAuth } from '@/lib/auth-context';

export function AdminSettings() {
  const admin = useAdmin();
  const { signOut } = useAuth();

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-ink-muted">Your administrator profile.</p>
      </div>

      <dl className="divide-y divide-hairline rounded-2xl border border-hairline bg-background">
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr]">
          <dt className="text-sm text-ink-muted">Email</dt>
          <dd className="font-medium">{admin.email}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr]">
          <dt className="text-sm text-ink-muted">Role</dt>
          <dd className="font-medium capitalize">{admin.roleSlug.replaceAll('_', ' ')}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[8rem_1fr]">
          <dt className="text-sm text-ink-muted">Permissions</dt>
          <dd className="text-sm text-ink-muted">{admin.permissions.length} granted</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
