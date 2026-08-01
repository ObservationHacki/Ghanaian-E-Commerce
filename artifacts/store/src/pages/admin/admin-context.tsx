import { createContext, useContext } from 'react';
import type { AdminMe } from '@workspace/api-client-react';

const AdminContext = createContext<AdminMe | null>(null);

export function AdminProvider({
  admin,
  children,
}: {
  admin: AdminMe;
  children: React.ReactNode;
}) {
  return <AdminContext.Provider value={admin}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}

export function useHasPermission(...codes: string[]) {
  const admin = useAdmin();
  return codes.every((code) => admin.permissions.includes(code));
}
