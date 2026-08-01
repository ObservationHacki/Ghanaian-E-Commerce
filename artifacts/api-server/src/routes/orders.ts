import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  addressesTable,
  cartSessionsTable,
  cartItemsTable,
  productVariantsTable,
  productsTable,
} from "@workspace/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { CreateOrderBody } from "@workspace/api-zod";
import { optionalAuth, requireAuth, getAuthUserId } from "../lib/auth";
import {
  checkoutMutationLimiter,
  momoReferenceLimiter,
} from "../lib/rate-limit";
import { reserveStock } from "../lib/stock";
import { verifyTurnstile } from "../lib/turnstile";
import {
  isDeliveryZone,
  resolveDeliveryFee,
} from "../lib/delivery-fee";

const router: IRouter = Router();
const BOT_CHECK_FAILED = "Bot check failed, please try again";

async function isDuplicateMomoReference(
  reference: string | null | undefined,
  excludeOrderId?: number,
): Promise<boolean> {
  const ref = reference?.trim();
  if (!ref) return false;
  const conditions = [eq(ordersTable.momoReference, ref)];
  if (excludeOrderId != null) {
    conditions.push(ne(ordersTable.id, excludeOrderId));
  }
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(and(...conditions));
  return (row?.count ?? 0) > 0;
}

function canAccessOrder(
  orderUserId: string | null | undefined,
  authUserId: string | null,
): boolean {
  if (!authUserId) return false;
  if (!orderUserId) return false;
  return orderUserId === authUserId;
}

async function buildOrderResponse(orderId: number) {
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
    .innerJoin(productVariantsTable, eq(productVariantsTable.id, orderItemsTable.productVariantId))
    .innerJoin(productsTable, eq(productsTable.id, productVariantsTable.productId))
    .where(eq(orderItemsTable.orderId, orderId));

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
    items: items.map((i) => ({
      ...i,
      unitPrice: parseFloat(i.unitPrice),
    })),
  };
}

// GET /users/me/orders — must be declared before /orders/:id
router.get("/users/me/orders", requireAuth, async (req, res): Promise<void> => {
  const userId = getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, userId))
    .orderBy(ordersTable.createdAt);

  const results = await Promise.all(orders.map((o) => buildOrderResponse(o.id)));
  res.json(results.filter(Boolean));
});

// POST /orders
router.post(
  "/orders",
  checkoutMutationLimiter,
  optionalAuth,
  async (req, res): Promise<void> => {
    const parsed = CreateOrderBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const turnstileOk = await verifyTurnstile(
      parsed.data.turnstileToken,
      req.ip,
    );
    if (!turnstileOk) {
      res.status(400).json({ error: BOT_CHECK_FAILED });
      return;
    }

    const { sessionId, address, paymentMethod, deliveryZone } = parsed.data;
    const authUserId = getAuthUserId(req);

    if (!authUserId) {
      res.status(401).json({ error: "Sign in required to place an order" });
      return;
    }

    if (paymentMethod !== "momo_manual") {
      res.status(400).json({ error: "Invalid payment method" });
      return;
    }

    if (!isDeliveryZone(deliveryZone)) {
      res.status(400).json({
        error: "Select a delivery area (Accra or Outside Accra)",
      });
      return;
    }

    let deliveryFee: number;
    try {
      deliveryFee = resolveDeliveryFee(deliveryZone);
    } catch (err) {
      const status =
        err && typeof err === "object" && "status" in err
          ? Number((err as { status: number }).status)
          : 503;
      const message =
        err instanceof Error ? err.message : "Delivery fees not configured";
      res.status(status || 503).json({ error: message });
      return;
    }

    const [session] = await db
      .select()
      .from(cartSessionsTable)
      .where(eq(cartSessionsTable.sessionId, sessionId))
      .limit(1);

    if (!session) {
      res.status(400).json({ error: "Cart session not found" });
      return;
    }

    try {
      const orderId = await db.transaction(async (tx) => {
        const cartItems = await tx
          .select({
            id: cartItemsTable.id,
            productVariantId: cartItemsTable.productVariantId,
            quantity: cartItemsTable.quantity,
            price: productVariantsTable.price,
          })
          .from(cartItemsTable)
          .innerJoin(
            productVariantsTable,
            eq(productVariantsTable.id, cartItemsTable.productVariantId),
          )
          .where(eq(cartItemsTable.cartSessionId, session.id));

        if (cartItems.length === 0) {
          throw Object.assign(new Error("Cart is empty"), { status: 400 });
        }

        const reserved = await reserveStock(
          tx,
          cartItems.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
        );
        if (!reserved.ok) {
          throw Object.assign(
            new Error("Insufficient stock for one or more items"),
            { status: 400, productVariantId: reserved.productVariantId },
          );
        }

        const subtotal = cartItems.reduce(
          (sum, item) => sum + parseFloat(item.price) * item.quantity,
          0,
        );
        const total = subtotal + deliveryFee;

        const [savedAddress] = await tx
          .insert(addressesTable)
          .values({
            userId: authUserId,
            digitalAddress: address.digitalAddress,
            region: address.region,
            district: address.district,
            notes: address.notes ?? null,
          })
          .returning();

        const [order] = await tx
          .insert(ordersTable)
          .values({
            userId: authUserId,
            status: "order_received",
            paymentMethod: "momo_manual",
            paymentStatus: "pending",
            total: String(total.toFixed(2)),
            deliveryFee: String(deliveryFee.toFixed(2)),
            deliveryRegion: deliveryZone,
            addressId: savedAddress.id,
          })
          .returning();

        await tx.insert(orderItemsTable).values(
          cartItems.map((item) => ({
            orderId: order.id,
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        );

        await tx
          .delete(cartItemsTable)
          .where(eq(cartItemsTable.cartSessionId, session.id));

        return order.id;
      });

      const result = await buildOrderResponse(orderId);
      res.status(201).json(result);
    } catch (err) {
      const status =
        err && typeof err === "object" && "status" in err
          ? Number((err as { status: number }).status)
          : 500;
      const message =
        err instanceof Error ? err.message : "Could not place order";
      if (status >= 400 && status < 500) {
        res.status(status).json({ error: message });
        return;
      }
      throw err;
    }
  },
);

// GET /orders/:id — owner only (prevents IDOR)
router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid order id" });
    return;
  }

  const authUserId = getAuthUserId(req);
  const result = await buildOrderResponse(id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (!canAccessOrder(result.userId, authUserId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(result);
});

const momoReferenceSchema = z.object({
  momoReference: z.string().trim().min(3).max(120),
  turnstileToken: z.string().optional(),
});

// POST /orders/:id/momo-reference
router.post(
  "/orders/:id/momo-reference",
  momoReferenceLimiter,
  requireAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const parsed = momoReferenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const turnstileOk = await verifyTurnstile(
      parsed.data.turnstileToken,
      req.ip,
    );
    if (!turnstileOk) {
      res.status(400).json({ error: BOT_CHECK_FAILED });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const authUserId = getAuthUserId(req);
    if (!canAccessOrder(order.userId, authUserId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (order.paymentMethod !== "momo_manual") {
      res.status(400).json({ error: "Order is not a Mobile Money order" });
      return;
    }

    if (
      order.paymentStatus !== "pending" &&
      order.paymentStatus !== "submitted"
    ) {
      res.status(400).json({ error: "Payment reference can no longer be updated" });
      return;
    }

    const momoReference = parsed.data.momoReference;
    const duplicateReference = await isDuplicateMomoReference(momoReference, id);
    if (duplicateReference) {
      res.status(409).json({
        error: "This MoMo reference has already been used on another order",
        duplicateReference: true,
      });
      return;
    }

    await db
      .update(ordersTable)
      .set({
        momoReference,
        paymentStatus: "submitted",
        paymentSubmittedAt: new Date(),
      })
      .where(eq(ordersTable.id, id));

    const result = await buildOrderResponse(id);
    res.json({ order: result, duplicateReference: false });
  },
);

export default router;
