import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requirePermission } from "../../lib/rbac";

const router: IRouter = Router();

router.get("/me", async (req, res): Promise<void> => {
  const admin = req.admin!;
  res.json({
    id: admin.id,
    userId: admin.userId,
    email: admin.email,
    roleId: admin.roleId,
    roleSlug: admin.roleSlug,
    permissions: admin.permissions,
  });
});

router.get(
  "/audit-logs",
  requirePermission("admins:manage"),
  async (req, res): Promise<void> => {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "50"), 10) || 50);
    const rows = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit);

    res.json(
      rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

router.get(
  "/audit-logs/mine",
  requirePermission("settings:read"),
  async (req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.actorUserId, req.admin!.userId))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(20);

    res.json(
      rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        action: r.action,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  },
);

export default router;
