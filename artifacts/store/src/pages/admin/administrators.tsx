import { useState } from 'react';
import {
  useListAdmins,
  useListRoles,
  useInviteAdmin,
  useUpdateAdmin,
  useUpdateRolePermissions,
  useListAuditLogs,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdmin } from './admin-context';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function AdminAdministrators() {
  const admin = useAdmin();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: admins, isLoading } = useListAdmins();
  const { data: rolesData } = useListRoles();
  const { data: auditLogs } = useListAuditLogs({ limit: 30 });
  const invite = useInviteAdmin();
  const updateAdmin = useUpdateAdmin();
  const updateRole = useUpdateRolePermissions();

  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const roles = rolesData?.roles ?? [];
  const permissions = rolesData?.permissions ?? [];
  const editingRole = roles.find((r) => r.id === editingRoleId);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['/api/admin/admins'] }),
      qc.invalidateQueries({ queryKey: ['/api/admin/roles'] }),
      qc.invalidateQueries({ queryKey: ['/api/admin/audit-logs'] }),
    ]);
  };

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleId) return;
    try {
      await invite.mutateAsync({ data: { email, roleId } });
      setEmail('');
      toast({ title: 'Administrator invited' });
      await refresh();
    } catch (err) {
      toast({
        title: 'Invite failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const openRoleEditor = (id: number) => {
    const role = roles.find((r) => r.id === id);
    if (!role || role.slug === 'super_admin') return;
    setEditingRoleId(id);
    setSelectedPerms([...role.permissionCodes]);
  };

  const saveRole = async () => {
    if (!editingRoleId) return;
    try {
      await updateRole.mutateAsync({
        id: editingRoleId,
        data: { permissionCodes: selectedPerms },
      });
      toast({ title: 'Role permissions updated' });
      setEditingRoleId(null);
      await refresh();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Administrators</h1>
        <p className="mt-2 text-ink-muted">Invite operators and manage role permissions.</p>
      </div>

      <form
        onSubmit={onInvite}
        className="flex flex-col gap-3 rounded-2xl border border-hairline bg-background p-5 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm">
          <span className="text-ink-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
          />
        </label>
        <label className="sm:w-48 text-sm">
          <span className="text-ink-muted">Role</span>
          <select
            required
            value={roleId}
            onChange={(e) => setRoleId(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-hairline bg-surface-sunken px-3 py-2"
          >
            <option value="">Select…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={invite.isPending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Invite
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(admins ?? []).map((row) => (
              <tr key={row.id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={row.roleId}
                    disabled={updateAdmin.isPending}
                    onChange={async (e) => {
                      try {
                        await updateAdmin.mutateAsync({
                          id: row.id,
                          data: { roleId: Number(e.target.value) },
                        });
                        await refresh();
                      } catch (err) {
                        toast({
                          title: 'Could not update role',
                          description: err instanceof Error ? err.message : undefined,
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="rounded-lg border border-hairline bg-surface-sunken px-2 py-1"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 capitalize">{row.status}</td>
                <td className="px-4 py-3">
                  {row.status === 'active' ? (
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={async () => {
                        await updateAdmin.mutateAsync({
                          id: row.id,
                          data: { status: 'disabled' },
                        });
                        await refresh();
                      }}
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-accent-ink"
                      onClick={async () => {
                        await updateAdmin.mutateAsync({
                          id: row.id,
                          data: { status: 'active' },
                        });
                        await refresh();
                      }}
                    >
                      Enable
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {admin.roleSlug === 'super_admin' ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Roles</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-2xl border border-hairline bg-background p-4"
              >
                <p className="font-semibold">{role.name}</p>
                <p className="mt-1 text-sm text-ink-muted">{role.description}</p>
                <p className="mt-2 text-xs text-ink-subtle">
                  {role.permissionCodes.length} permissions
                </p>
                {role.slug !== 'super_admin' ? (
                  <button
                    type="button"
                    onClick={() => openRoleEditor(role.id)}
                    className="mt-3 text-sm font-medium text-accent-ink"
                  >
                    Edit permissions
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {editingRole ? (
            <div className="rounded-2xl border border-hairline bg-background p-5">
              <h3 className="font-semibold">Edit {editingRole.name}</h3>
              <div className="mt-4 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {permissions.map((p) => {
                  const checked = selectedPerms.includes(p.code);
                  return (
                    <label key={p.code} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedPerms((prev) =>
                            checked
                              ? prev.filter((c) => c !== p.code)
                              : [...prev, p.code],
                          )
                        }
                      />
                      <span>
                        <span className="font-medium">{p.code}</span>
                        <span className="block text-ink-muted">{p.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void saveRole()}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRoleId(null)}
                  className="rounded-full border border-hairline px-5 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recent audit log</h2>
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-background">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-hairline text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
              </tr>
            </thead>
            <tbody>
              {(auditLogs ?? []).map((log) => (
                <tr key={log.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-3 text-ink-muted">
                    {new Date(log.createdAt).toLocaleString('en-GH')}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3">
                    {log.resourceType}
                    {log.resourceId ? ` #${log.resourceId}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
