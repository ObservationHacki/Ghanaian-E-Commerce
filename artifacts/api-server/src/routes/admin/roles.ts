import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";

const router: IRouter = Router();

const patchRoleSchema = z.object({
  permissionCodes: z.array(z.string()),
});

router.get(
  "/roles",
  requirePermission("admins:manage"),
  async (_req, res): Promise<void> => {
    const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);
    const perms = await db.select().from(permissionsTable).orderBy(permissionsTable.code);
    const joins = await db.select().from(rolePermissionsTable);

    const permById = new Map(perms.map((p) => [p.id, p.code]));
    const codesByRole = new Map<number, string[]>();
    for (const join of joins) {
      const code = permById.get(join.permissionId);
      if (!code) continue;
      const list = codesByRole.get(join.roleId) ?? [];
      list.push(code);
      codesByRole.set(join.roleId, list);
    }

    res.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        permissionCodes: codesByRole.get(r.id) ?? [],
      })),
      permissions: perms.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
      })),
    });
  },
);

router.patch(
  "/roles/:id",
  requirePermission("admins:manage"),
  async (req, res): Promise<void> => {
    if (req.admin!.roleSlug !== "super_admin") {
      res.status(403).json({ error: "Only super admins can edit role permissions" });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = patchRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id)).limit(1);
    if (!role) {
      res.status(404).json({ error: "Role not found" });
      return;
    }

    if (role.slug === "super_admin") {
      res.status(400).json({ error: "Cannot edit super_admin permissions" });
      return;
    }

    const allPerms = await db.select().from(permissionsTable);
    const byCode = new Map(allPerms.map((p) => [p.code, p.id]));
    const desiredIds = parsed.data.permissionCodes
      .map((code) => byCode.get(code))
      .filter((pid): pid is number => pid != null);

    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
    if (desiredIds.length > 0) {
      await db.insert(rolePermissionsTable).values(
        desiredIds.map((permissionId) => ({ roleId: id, permissionId })),
      );
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "role.permissions_update",
      resourceType: "role",
      resourceId: id,
      metadata: { permissionCodes: parsed.data.permissionCodes },
    });

    res.json({
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissionCodes: parsed.data.permissionCodes.filter((c) => byCode.has(c)),
    });
  },
);

export default router;
