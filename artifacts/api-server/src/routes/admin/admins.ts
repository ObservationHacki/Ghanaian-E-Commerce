import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminUsersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";

const router: IRouter = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  roleId: z.number().int().positive(),
});

const patchSchema = z.object({
  roleId: z.number().int().positive().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

router.get(
  "/admins",
  requirePermission("admins:manage"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        id: adminUsersTable.id,
        userId: adminUsersTable.userId,
        email: adminUsersTable.email,
        roleId: adminUsersTable.roleId,
        status: adminUsersTable.status,
        createdAt: adminUsersTable.createdAt,
        roleName: rolesTable.name,
        roleSlug: rolesTable.slug,
      })
      .from(adminUsersTable)
      .innerJoin(rolesTable, eq(rolesTable.id, adminUsersTable.roleId))
      .orderBy(adminUsersTable.createdAt);

    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.post(
  "/admins",
  requirePermission("admins:manage"),
  async (req, res): Promise<void> => {
    const parsed = inviteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, parsed.data.roleId))
      .limit(1);

    if (!role) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    if (role.slug === "super_admin" && req.admin!.roleSlug !== "super_admin") {
      res.status(403).json({ error: "Only super admins can assign super_admin" });
      return;
    }

    const [existing] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Admin already exists for this email" });
      return;
    }

    const [created] = await db
      .insert(adminUsersTable)
      .values({
        userId: `pending:${email}`,
        email,
        roleId: role.id,
        status: "active",
      })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "admin.invite",
      resourceType: "admin_user",
      resourceId: created.id,
      metadata: { email, roleId: role.id },
    });

    res.status(201).json({
      id: created.id,
      userId: created.userId,
      email: created.email,
      roleId: created.roleId,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      roleName: role.name,
      roleSlug: role.slug,
    });
  },
);

router.patch(
  "/admins/:id",
  requirePermission("admins:manage"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [target] = await db
      .select({
        id: adminUsersTable.id,
        roleSlug: rolesTable.slug,
      })
      .from(adminUsersTable)
      .innerJoin(rolesTable, eq(rolesTable.id, adminUsersTable.roleId))
      .where(eq(adminUsersTable.id, id))
      .limit(1);

    if (!target) {
      res.status(404).json({ error: "Admin not found" });
      return;
    }

    if (target.roleSlug === "super_admin" && req.admin!.roleSlug !== "super_admin") {
      res.status(403).json({ error: "Cannot modify super admin" });
      return;
    }

    if (parsed.data.roleId) {
      const [role] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, parsed.data.roleId))
        .limit(1);
      if (!role) {
        res.status(400).json({ error: "Invalid role" });
        return;
      }
      if (role.slug === "super_admin" && req.admin!.roleSlug !== "super_admin") {
        res.status(403).json({ error: "Only super admins can assign super_admin" });
        return;
      }
    }

    const [updated] = await db
      .update(adminUsersTable)
      .set({
        ...(parsed.data.roleId ? { roleId: parsed.data.roleId } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        updatedAt: new Date(),
      })
      .where(eq(adminUsersTable.id, id))
      .returning();

    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, updated.roleId))
      .limit(1);

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "admin.update",
      resourceType: "admin_user",
      resourceId: updated.id,
      metadata: parsed.data,
    });

    res.json({
      id: updated.id,
      userId: updated.userId,
      email: updated.email,
      roleId: updated.roleId,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      roleName: role?.name ?? "",
      roleSlug: role?.slug ?? "",
    });
  },
);

export default router;
