import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  adminUsersTable,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  auditLogsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export const ALL_PERMISSIONS = [
  { code: "dashboard:read", description: "View admin dashboard" },
  { code: "orders:read", description: "View orders" },
  { code: "orders:write", description: "Update orders and fulfillment" },
  { code: "products:read", description: "View products and inventory" },
  { code: "products:write", description: "Create and edit products" },
  { code: "categories:read", description: "View categories" },
  { code: "categories:write", description: "Manage categories" },
  { code: "brands:read", description: "View brands" },
  { code: "brands:write", description: "Manage brands" },
  { code: "customers:read", description: "View customers" },
  { code: "customers:write", description: "Manage customers and notes" },
  { code: "inventory:read", description: "View inventory" },
  { code: "inventory:write", description: "Adjust stock levels" },
  { code: "promotions:read", description: "View promotions" },
  { code: "promotions:write", description: "Manage promotions" },
  { code: "reviews:read", description: "View reviews" },
  { code: "reviews:write", description: "Moderate reviews" },
  { code: "analytics:read", description: "View analytics" },
  { code: "content:read", description: "View content blocks" },
  { code: "content:write", description: "Edit storefront content" },
  { code: "settings:read", description: "View admin settings" },
  { code: "settings:write", description: "Change admin settings" },
  { code: "admins:manage", description: "Manage administrators and roles" },
] as const;

export type PermissionCode = (typeof ALL_PERMISSIONS)[number]["code"];

const ROLE_SEEDS = [
  {
    name: "Super Admin",
    slug: "super_admin",
    description: "Full access to every admin capability",
    permissions: ALL_PERMISSIONS.map((p) => p.code),
  },
  {
    name: "Operations",
    slug: "ops",
    description: "Orders, catalog, inventory and content",
    permissions: [
      "dashboard:read",
      "orders:read",
      "orders:write",
      "products:read",
      "products:write",
      "categories:read",
      "categories:write",
      "brands:read",
      "brands:write",
      "inventory:read",
      "inventory:write",
      "promotions:read",
      "promotions:write",
      "content:read",
      "content:write",
      "analytics:read",
      "settings:read",
    ] as PermissionCode[],
  },
  {
    name: "Support",
    slug: "support",
    description: "Orders and customers, read-only catalog",
    permissions: [
      "dashboard:read",
      "orders:read",
      "orders:write",
      "customers:read",
      "customers:write",
      "products:read",
      "reviews:read",
      "reviews:write",
      "settings:read",
    ] as PermissionCode[],
  },
];

export async function ensureRbacSeeded(): Promise<void> {
  for (const perm of ALL_PERMISSIONS) {
    await db
      .insert(permissionsTable)
      .values(perm)
      .onConflictDoNothing({ target: permissionsTable.code });
  }

  const allPerms = await db.select().from(permissionsTable);
  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  for (const role of ROLE_SEEDS) {
    const existing = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.slug, role.slug))
      .limit(1);

    let roleId = existing[0]?.id;
    if (!roleId) {
      const [created] = await db
        .insert(rolesTable)
        .values({
          name: role.name,
          slug: role.slug,
          description: role.description,
        })
        .returning();
      roleId = created.id;
    }

    const desiredIds = role.permissions
      .map((code) => permByCode.get(code))
      .filter((id): id is number => id != null);

    const current = await db
      .select()
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleId, roleId));

    const currentIds = new Set(current.map((row) => row.permissionId));
    const toAdd = desiredIds.filter((id) => !currentIds.has(id));

    if (toAdd.length > 0) {
      await db.insert(rolePermissionsTable).values(
        toAdd.map((permissionId) => ({ roleId: roleId!, permissionId })),
      );
    }
  }
}

export async function bootstrapAdminsFromEnv(): Promise<void> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) return;

  const [superRole] = await db
    .select()
    .from(rolesTable)
    .where(eq(rolesTable.slug, "super_admin"))
    .limit(1);

  if (!superRole) return;

  for (const email of emails) {
    const existing = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);

    if (existing[0]) continue;

    // userId unknown until first login — store placeholder that /admin/me will link
    await db.insert(adminUsersTable).values({
      userId: `pending:${email}`,
      email,
      roleId: superRole.id,
      status: "active",
    });
  }
}

export async function loadAdminContext(userId: string, email: string | null) {
  const normalizedEmail = email?.toLowerCase() ?? null;

  let [admin] = await db
    .select({
      id: adminUsersTable.id,
      userId: adminUsersTable.userId,
      email: adminUsersTable.email,
      roleId: adminUsersTable.roleId,
      status: adminUsersTable.status,
      roleSlug: rolesTable.slug,
    })
    .from(adminUsersTable)
    .innerJoin(rolesTable, eq(rolesTable.id, adminUsersTable.roleId))
    .where(eq(adminUsersTable.userId, userId))
    .limit(1);

  // Link a pending bootstrap row (pending:email) on first verified login.
  if (!admin && normalizedEmail) {
    const [pending] = await db
      .select({
        id: adminUsersTable.id,
        userId: adminUsersTable.userId,
        email: adminUsersTable.email,
        roleId: adminUsersTable.roleId,
        status: adminUsersTable.status,
        roleSlug: rolesTable.slug,
      })
      .from(adminUsersTable)
      .innerJoin(rolesTable, eq(rolesTable.id, adminUsersTable.roleId))
      .where(eq(adminUsersTable.email, normalizedEmail))
      .limit(1);

    if (pending && pending.userId.startsWith("pending:")) {
      const [updated] = await db
        .update(adminUsersTable)
        .set({ userId, updatedAt: new Date() })
        .where(eq(adminUsersTable.id, pending.id))
        .returning();

      admin = {
        id: updated.id,
        userId: updated.userId,
        email: updated.email,
        roleId: updated.roleId,
        status: updated.status,
        roleSlug: pending.roleSlug,
      };
    } else if (pending) {
      admin = pending;
    }
  }

  if (!admin || admin.status !== "active") return null;

  const rows = await db
    .select({ code: permissionsTable.code })
    .from(rolePermissionsTable)
    .innerJoin(
      permissionsTable,
      eq(permissionsTable.id, rolePermissionsTable.permissionId),
    )
    .where(eq(rolePermissionsTable.roleId, admin.roleId));

  return {
    id: admin.id,
    userId: admin.userId,
    email: admin.email,
    roleId: admin.roleId,
    roleSlug: admin.roleSlug,
    permissions: rows.map((r) => r.code),
  };
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const admin = await loadAdminContext(req.authUser.userId, req.authUser.email);
  if (!admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  req.admin = admin;
  next();
}

export function requirePermission(...codes: PermissionCode[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const allowed = codes.every((code) => req.admin!.permissions.includes(code));
    if (!allowed) {
      res.status(403).json({ error: "Missing permission", required: codes });
      return;
    }

    next();
  };
}

export async function writeAudit(input: {
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | number | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogsTable).values({
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId:
      input.resourceId === undefined || input.resourceId === null
        ? null
        : String(input.resourceId),
    metadata: input.metadata ?? {},
  });
}

export async function listPermissionCodesForRoles(roleIds: number[]) {
  if (roleIds.length === 0) return new Map<number, string[]>();

  const rows = await db
    .select({
      roleId: rolePermissionsTable.roleId,
      code: permissionsTable.code,
    })
    .from(rolePermissionsTable)
    .innerJoin(
      permissionsTable,
      eq(permissionsTable.id, rolePermissionsTable.permissionId),
    )
    .where(inArray(rolePermissionsTable.roleId, roleIds));

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const list = map.get(row.roleId) ?? [];
    list.push(row.code);
    map.set(row.roleId, list);
  }
  return map;
}

export { and, eq };
