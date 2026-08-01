import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  addressesTable,
  customerProfilesTable,
  customerNotesTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";

const router: IRouter = Router();

router.get(
  "/customers",
  requirePermission("customers:read"),
  async (req, res): Promise<void> => {
    const { search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * pageSize;

    const searchFilter = search
      ? sql`(${ordersTable.userId} ilike ${"%" + search + "%"} or coalesce(${customerProfilesTable.email}, '') ilike ${"%" + search + "%"})`
      : undefined;

    const rows = await db
      .select({
        userId: ordersTable.userId,
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
        lastOrderAt: sql<Date>`max(${ordersTable.createdAt})`,
        email: customerProfilesTable.email,
        status: customerProfilesTable.status,
      })
      .from(ordersTable)
      .leftJoin(
        customerProfilesTable,
        eq(customerProfilesTable.userId, ordersTable.userId),
      )
      .where(
        and(sql`${ordersTable.userId} is not null`, searchFilter),
      )
      .groupBy(
        ordersTable.userId,
        customerProfilesTable.email,
        customerProfilesTable.status,
      )
      .orderBy(desc(sql`max(${ordersTable.createdAt})`))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({
        total: sql<number>`count(distinct ${ordersTable.userId})::int`,
      })
      .from(ordersTable)
      .leftJoin(
        customerProfilesTable,
        eq(customerProfilesTable.userId, ordersTable.userId),
      )
      .where(and(sql`${ordersTable.userId} is not null`, searchFilter));

    const total = countRow?.total ?? 0;

    res.json({
      customers: rows.map((r) => ({
        userId: r.userId!,
        email: r.email,
        status: r.status ?? "active",
        orderCount: r.orderCount,
        totalSpent: parseFloat(r.totalSpent),
        lastOrderAt: r.lastOrderAt ? new Date(r.lastOrderAt).toISOString() : null,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  },
);

router.get(
  "/customers/:userId",
  requirePermission("customers:read"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.userId);

    const [profile] = await db
      .select()
      .from(customerProfilesTable)
      .where(eq(customerProfilesTable.userId, userId))
      .limit(1);

    const orders = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        paymentStatus: ordersTable.paymentStatus,
        total: ordersTable.total,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(50);

    const addresses = await db
      .select()
      .from(addressesTable)
      .where(eq(addressesTable.userId, userId))
      .orderBy(desc(addressesTable.createdAt));

    const notes = await db
      .select()
      .from(customerNotesTable)
      .where(eq(customerNotesTable.customerUserId, userId))
      .orderBy(desc(customerNotesTable.createdAt));

    const [rollup] = await db
      .select({
        orderCount: sql<number>`count(*)::int`,
        totalSpent: sql<string>`coalesce(sum(${ordersTable.total}), 0)`,
      })
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId));

    res.json({
      userId,
      email: profile?.email ?? null,
      status: profile?.status ?? "active",
      orderCount: rollup?.orderCount ?? 0,
      totalSpent: parseFloat(rollup?.totalSpent ?? "0"),
      orders: orders.map((o) => ({
        ...o,
        total: parseFloat(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
      addresses: addresses.map((a) => ({
        id: a.id,
        digitalAddress: a.digitalAddress,
        region: a.region,
        district: a.district,
        notes: a.notes,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        authorUserId: n.authorUserId,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  },
);

const statusSchema = z.object({
  status: z.enum(["active", "flagged", "disabled"]),
  email: z.string().email().optional(),
});

router.patch(
  "/customers/:userId",
  requirePermission("customers:write"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.userId);
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(customerProfilesTable)
      .where(eq(customerProfilesTable.userId, userId))
      .limit(1);

    let profile;
    if (existing) {
      [profile] = await db
        .update(customerProfilesTable)
        .set({
          status: parsed.data.status,
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
          updatedAt: new Date(),
        })
        .where(eq(customerProfilesTable.userId, userId))
        .returning();
    } else {
      [profile] = await db
        .insert(customerProfilesTable)
        .values({
          userId,
          status: parsed.data.status,
          email: parsed.data.email ?? null,
        })
        .returning();
    }

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "customer.update",
      resourceType: "customer",
      resourceId: userId,
      metadata: parsed.data,
    });

    res.json({
      userId: profile.userId,
      email: profile.email,
      status: profile.status,
    });
  },
);

const noteSchema = z.object({ body: z.string().min(1) });

router.post(
  "/customers/:userId/notes",
  requirePermission("customers:write"),
  async (req, res): Promise<void> => {
    const userId = String(req.params.userId);
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [note] = await db
      .insert(customerNotesTable)
      .values({
        customerUserId: userId,
        authorUserId: req.admin!.userId,
        body: parsed.data.body,
      })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "customer.note",
      resourceType: "customer",
      resourceId: userId,
      metadata: { noteId: note.id },
    });

    res.status(201).json({
      id: note.id,
      authorUserId: note.authorUserId,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
    });
  },
);

export default router;
