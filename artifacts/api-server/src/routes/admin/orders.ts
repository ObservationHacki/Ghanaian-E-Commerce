import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  addressesTable,
  productVariantsTable,
  productsTable,
  orderNotesTable,
  orderStatusHistoryTable,
} from "@workspace/db";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { requirePermission, writeAudit } from "../../lib/rbac";
import { releaseStockForOrder, shouldReleaseStockOnCancel } from "../../lib/stock";

const router: IRouter = Router();

const ORDER_STATUSES = [
  "order_received",
  "payment_confirmed",
  "payment_on_delivery",
  "processing",
  "ready_for_dispatch",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "awaiting_collection",
  "submitted",
  "verified",
] as const;

async function isDuplicateMomoReference(
  reference: string | null | undefined,
  excludeOrderId: number,
): Promise<boolean> {
  const ref = reference?.trim();
  if (!ref) return false;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(
      and(eq(ordersTable.momoReference, ref), ne(ordersTable.id, excludeOrderId)),
    );
  return (row?.count ?? 0) > 0;
}

async function buildAdminOrder(orderId: number) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  if (!order) return null;

  const [address] = order.addressId
    ? await db
        .select()
        .from(addressesTable)
        .where(eq(addressesTable.id, order.addressId))
        .limit(1)
    : [null];

  const items = await db
    .select({
      id: orderItemsTable.id,
      productVariantId: orderItemsTable.productVariantId,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      productName: productsTable.name,
      productImage: sql<string | null>`${productsTable.images}[1]`,
      variantName: productVariantsTable.name,
    })
    .from(orderItemsTable)
    .innerJoin(
      productVariantsTable,
      eq(productVariantsTable.id, orderItemsTable.productVariantId),
    )
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(orderItemsTable.orderId, orderId));

  const notes = await db
    .select()
    .from(orderNotesTable)
    .where(eq(orderNotesTable.orderId, orderId))
    .orderBy(desc(orderNotesTable.createdAt));

  const history = await db
    .select()
    .from(orderStatusHistoryTable)
    .where(eq(orderStatusHistoryTable.orderId, orderId))
    .orderBy(desc(orderStatusHistoryTable.createdAt));

  const duplicateMomoReference = await isDuplicateMomoReference(
    order.momoReference,
    order.id,
  );

  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    total: parseFloat(order.total),
    deliveryFee: parseFloat(order.deliveryFee),
    deliveryRegion: order.deliveryRegion,
    userId: order.userId,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    momoReference: order.momoReference,
    paymentSubmittedAt: order.paymentSubmittedAt?.toISOString() ?? null,
    paymentVerifiedAt: order.paymentVerifiedAt?.toISOString() ?? null,
    duplicateMomoReference,
    createdAt: order.createdAt.toISOString(),
    address: address
      ? {
          id: address.id,
          digitalAddress: address.digitalAddress,
          region: address.region,
          district: address.district,
          notes: address.notes,
          userId: address.userId,
        }
      : null,
    items: items.map((i) => ({ ...i, unitPrice: parseFloat(i.unitPrice) })),
    notes: notes.map((n) => ({
      id: n.id,
      authorUserId: n.authorUserId,
      body: n.body,
      createdAt: n.createdAt.toISOString(),
    })),
    history: history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorUserId: h.actorUserId,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

router.get(
  "/orders",
  requirePermission("orders:read"),
  async (req, res): Promise<void> => {
    const {
      status,
      paymentStatus,
      search,
      from,
      to,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, parseInt(limit, 10) || 20);
    const offset = (pageNum - 1) * pageSize;

    const conditions = [];
    if (status) conditions.push(eq(ordersTable.status, status as typeof ORDER_STATUSES[number]));
    if (paymentStatus) {
      conditions.push(
        eq(ordersTable.paymentStatus, paymentStatus as typeof PAYMENT_STATUSES[number]),
      );
    }
    if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
    if (to) conditions.push(lte(ordersTable.createdAt, new Date(to)));
    if (search) {
      const asId = parseInt(search, 10);
      conditions.push(
        or(
          !isNaN(asId) ? eq(ordersTable.id, asId) : undefined,
          ilike(ordersTable.userId, `%${search}%`),
          ilike(ordersTable.momoReference, `%${search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderBy =
      paymentStatus === "submitted"
        ? asc(ordersTable.paymentSubmittedAt)
        : desc(ordersTable.createdAt);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: ordersTable.id,
          status: ordersTable.status,
          paymentMethod: ordersTable.paymentMethod,
          paymentStatus: ordersTable.paymentStatus,
          total: ordersTable.total,
          userId: ordersTable.userId,
          carrier: ordersTable.carrier,
          trackingNumber: ordersTable.trackingNumber,
          momoReference: ordersTable.momoReference,
          paymentSubmittedAt: ordersTable.paymentSubmittedAt,
          createdAt: ordersTable.createdAt,
          region: addressesTable.region,
          district: addressesTable.district,
        })
        .from(ordersTable)
        .leftJoin(addressesTable, eq(addressesTable.id, ordersTable.addressId))
        .where(where)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(ordersTable).where(where),
    ]);

    const refs = rows
      .map((r) => r.momoReference?.trim())
      .filter((r): r is string => Boolean(r));

    const duplicateSet = new Set<string>();
    if (refs.length) {
      const dupRows = await db
        .select({
          ref: ordersTable.momoReference,
          count: sql<number>`count(*)::int`,
        })
        .from(ordersTable)
        .where(inArray(ordersTable.momoReference, refs))
        .groupBy(ordersTable.momoReference);

      for (const d of dupRows) {
        if (d.ref && d.count > 1) duplicateSet.add(d.ref);
      }
    }

    const total = totalRows[0]?.total ?? 0;
    res.json({
      orders: rows.map((r) => ({
        id: r.id,
        status: r.status,
        paymentMethod: r.paymentMethod,
        paymentStatus: r.paymentStatus,
        total: parseFloat(r.total),
        userId: r.userId,
        carrier: r.carrier,
        trackingNumber: r.trackingNumber,
        momoReference: r.momoReference,
        paymentSubmittedAt: r.paymentSubmittedAt?.toISOString() ?? null,
        duplicateMomoReference: Boolean(
          r.momoReference && duplicateSet.has(r.momoReference.trim()),
        ),
        createdAt: r.createdAt.toISOString(),
        region: r.region,
        district: r.district,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  },
);

router.get(
  "/orders/:id",
  requirePermission("orders:read"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const order = await buildAdminOrder(id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  },
);

const patchOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  note: z.string().optional(),
  carrier: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  trackingUrl: z.string().nullable().optional(),
});

router.patch(
  "/orders/:id",
  requirePermission("orders:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = patchOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const updates: Partial<typeof ordersTable.$inferInsert> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.paymentStatus) updates.paymentStatus = parsed.data.paymentStatus;
    if (parsed.data.carrier !== undefined) {
      updates.carrier = parsed.data.carrier?.trim() || null;
    }
    if (parsed.data.trackingNumber !== undefined) {
      updates.trackingNumber = parsed.data.trackingNumber?.trim() || null;
    }
    if (parsed.data.trackingUrl !== undefined) {
      updates.trackingUrl = parsed.data.trackingUrl?.trim() || null;
    }

    const cancelling =
      parsed.data.status === "cancelled" &&
      existing.status !== "cancelled" &&
      shouldReleaseStockOnCancel(existing);

    await db.transaction(async (tx) => {
      if (Object.keys(updates).length > 0) {
        await tx.update(ordersTable).set(updates).where(eq(ordersTable.id, id));
      }

      if (cancelling) {
        await releaseStockForOrder(tx, id);
      }

      if (parsed.data.status && parsed.data.status !== existing.status) {
        await tx.insert(orderStatusHistoryTable).values({
          orderId: id,
          fromStatus: existing.status,
          toStatus: parsed.data.status,
          actorUserId: req.admin!.userId,
          note:
            (parsed.data.note ?? null) ||
            (cancelling ? "Cancelled — reserved stock released" : null),
        });
      }
    });

    const trackingChanged =
      parsed.data.carrier !== undefined ||
      parsed.data.trackingNumber !== undefined ||
      parsed.data.trackingUrl !== undefined;

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: trackingChanged ? "order.tracking_update" : "order.update",
      resourceType: "order",
      resourceId: id,
      metadata: { ...parsed.data, stockReleased: cancelling },
    });

    res.json(await buildAdminOrder(id));
  },
);

router.post(
  "/orders/:id/verify-payment",
  requirePermission("orders:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [existing] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (existing.paymentMethod !== "momo_manual") {
      res.status(400).json({ error: "Order is not a Mobile Money order" });
      return;
    }

    if (existing.paymentStatus !== "submitted") {
      res.status(400).json({
        error: "Only orders with a submitted MoMo reference can be verified",
      });
      return;
    }

    if (!existing.momoReference?.trim()) {
      res.status(400).json({ error: "Order has no MoMo reference" });
      return;
    }

    const duplicateReference = await isDuplicateMomoReference(
      existing.momoReference,
      id,
    );

    await db
      .update(ordersTable)
      .set({
        paymentStatus: "verified",
        paymentVerifiedAt: new Date(),
        paymentVerifiedBy: req.admin!.id,
        status: "payment_confirmed",
      })
      .where(eq(ordersTable.id, id));

    await db.insert(orderStatusHistoryTable).values({
      orderId: id,
      fromStatus: existing.status,
      toStatus: "payment_confirmed",
      actorUserId: req.admin!.userId,
      note: `MoMo payment verified (ref: ${existing.momoReference})${
        duplicateReference ? " — DUPLICATE REFERENCE WARNING" : ""
      }`,
    });

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "order.verify_payment",
      resourceType: "order",
      resourceId: id,
      metadata: {
        momoReference: existing.momoReference,
        duplicateReference,
      },
    });

    const order = await buildAdminOrder(id);
    res.json({
      order,
      duplicateReference,
      warning: duplicateReference
        ? "This MoMo reference also appears on another order."
        : null,
    });
  },
);

const noteSchema = z.object({ body: z.string().min(1) });

router.post(
  "/orders/:id/notes",
  requirePermission("orders:write"),
  async (req, res): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [order] = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const [note] = await db
      .insert(orderNotesTable)
      .values({
        orderId: id,
        authorUserId: req.admin!.userId,
        body: parsed.data.body,
      })
      .returning();

    await writeAudit({
      actorUserId: req.admin!.userId,
      action: "order.note",
      resourceType: "order",
      resourceId: id,
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
